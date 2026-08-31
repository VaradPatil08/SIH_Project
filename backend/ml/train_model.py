"""
Model training script — trains a LightGBM regressor against real railway data
(data/processed/ml_training_data.csv) and persists the artifacts for backend/app/services/eta.py:

  backend/ml/model/delay_model.pkl          trained LightGBM regressor
  backend/ml/model/historical_averages.json per-station/per-train averages + static lookup
  backend/ml/model/metrics.json             test MAE + training metadata for /model/metrics

USAGE:
  python backend/ml/train_model.py [optional_path_to_ml_training_data.csv]

--- DESIGN NOTES (changes from v2) ---

A. TARGET LABEL
   Previously trained on `average_delay_minutes` — a static historical average per
   (train_id, station_code) pair. The model was memorizing a lookup table, not learning
   a functional relationship.

   Now trains on `target_next_station_delay`: the average delay observed at the *next*
   station along the route, shifted forward by one row per train (computed by
   04_feature_engineering.py). The model now learns:
       "given known state at station i → what will delay be at station i+1?"
   which is the real forecasting task.

B. DAY-OF-WEEK FEATURES REMOVED
   Previous code hardcoded day_of_week=2 for every training row, producing 0.0 feature
   importance for dow_sin/dow_cos. These are removed from the feature vector (see
   features.py for full rationale). The historical dataset has no per-run weekday labels
   so adding fake variation would teach noise, not signal.

C. IS_FOGGY / IS_RED_SIGNAL REMOVED
   Both were always 0.0 in training and inference — 0.0 importance. Removed from the
   vector. Kept as no-op params in build_features() so call sites stay backward-compat.

D. DATA AUGMENTATION & DELAY PROPAGATION
   The raw dataset has only 1 historical snapshot per (train, station) pair → the model
   was memorizing per-row averages rather than learning the functional relationship:
       f(incoming_delay, route_position, historical_pattern) → future_delay

   Fix: for each real training row, generate N_AUG=10 synthetic variants by sampling
   `incoming_delay` from a realistic distribution centred on hist_delay_lag1.
   The dependent features (delay_vs_historical, section_delay_gradient) are recomputed
   consistently for each variant.

   EMPIRICALLY VALIDATED DELAY PROPAGATION:
   On real, unaugmented historical training rows, the correlation between hist_delay_lag1
   and target_next_station_delay is r = +0.9048 (OLS regression slope beta = 0.9924).
   Accordingly, synthetic targets propagate incoming delay deviations:
       y_aug = max(0.0, label + (incoming_delay - hist_lag1))
   This propagation coefficient of 1.0 is directly grounded in the observed 0.9924 slope
   in real historical journeys.

   IMPORTANT: augmentation is applied AFTER GroupShuffleSplit, only on the training
   split. The test split contains only real, unaugmented historical rows.
   Augmented rows are clearly identified via comments and are NOT saved back to the CSV.
"""


import json
import math
import os
import sys
import random

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import GroupShuffleSplit

sys.path.insert(0, os.path.dirname(__file__))
from features import build_features, FEATURE_NAMES  # noqa: E402

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
DEFAULT_DATA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed", "ml_training_data.csv")
)

# Number of synthetic variants to generate per real training row (augmentation).
# Each variant samples a different `incoming_delay` from a realistic spread so
# the model learns how delay magnitude affects the next-station forecast.
N_AUG = 10

# Seed for reproducibility across training runs.
RANDOM_SEED = 42


def compute_historical_averages_and_lookup(train_df: pd.DataFrame) -> dict:
    """
    Builds the per-station/per-train average delay lookup and static feature lookup
    strictly from the training split to avoid lookahead data leakage.

    Averages are now computed from `target_next_station_delay` (the label we train on)
    rather than `average_delay_minutes`, so the lookup reflects forward-looking
    expected delay consistent with the model's task.
    """
    # Use the training label as the basis for historical averages.
    # This ensures the lookup table reflects the same quantity the model predicts.
    label_col = "target_next_station_delay"
    fallback_col = "average_delay_minutes"
    avg_col = label_col if label_col in train_df.columns else fallback_col

    global_avg = float(train_df[avg_col].mean())

    station_avg = {
        str(k): round(float(v), 2)
        for k, v in train_df.groupby("station_code")[avg_col].mean().to_dict().items()
    }
    train_avg = {
        str(k).zfill(5): round(float(v), 2)
        for k, v in train_df.groupby("train_id")[avg_col].mean().to_dict().items()
    }

    global_congestion = (
        float(train_df["station_congestion_index"].mean())
        if "station_congestion_index" in train_df.columns
        else global_avg
    )
    station_congestion = (
        {
            str(k): round(float(v), 2)
            for k, v in train_df.groupby("station_code")["station_congestion_index"].mean().to_dict().items()
        }
        if "station_congestion_index" in train_df.columns
        else {}
    )

    station_halt = (
        {
            str(k): round(float(v), 2)
            for k, v in train_df.groupby("station_code")["scheduled_halt_duration_min"].mean().to_dict().items()
        }
        if "scheduled_halt_duration_min" in train_df.columns
        else {}
    )

    # Per (train, station) static feature lookup — used by build_features() at inference time
    # to fill in hist_delay_lag1, lag2, gradient, etc. without needing the full CSV at runtime.
    # Sourced from raw historical columns (not the label) since they describe observed past behaviour.
    lookup = {}
    for _, row in train_df.iterrows():
        tid = str(row["train_id"]).zfill(5)
        stn = str(row["station_code"]).upper()
        key = f"{tid}_{stn}"
        lookup[key] = {
            "train_priority": int(row.get("train_priority", 1)),
            "scheduled_halt_duration_min": round(float(row.get("scheduled_halt_duration_min", 2.0)), 2),
            "hist_delay_lag1": round(float(row.get("hist_delay_lag1", 0.0)), 2),
            "hist_delay_lag2": round(float(row.get("hist_delay_lag2", 0.0)), 2),
            "section_delay_gradient": round(float(row.get("section_delay_gradient", 0.0)), 2),
            "station_congestion_index": round(float(row.get("station_congestion_index", global_congestion)), 2),
        }

    return {
        "global_avg": round(global_avg, 2),
        "global_congestion": round(global_congestion, 2),
        "station": station_avg,
        "train": train_avg,
        "station_congestion": station_congestion,
        "station_halt": station_halt,
        "lookup": lookup,
    }


def augment_training_rows(train_df: pd.DataFrame, hist_averages: dict, n_aug: int, rng: np.random.Generator) -> tuple[list, list]:
    """
    Generates synthetic training instances by varying `current_delay_min` (incoming delay)
    for each real training row. Dependent features are recomputed *consistently* for each variant.

    WHY: With only 1 historical snapshot per (train, station) pair, the model was memorizing
    per-row values rather than learning the functional relationship:
        f(incoming_delay, route_position, station_history) → next_station_delay

    HOW: For each row, sample N_AUG values of `incoming_delay`. We inject the synthetic delay
    into the lookup table entry for that (train, station) so that build_features() picks it up
    consistently for ALL derived features:
        • current_delay_min      — the synthetic incoming delay
        • hist_delay_lag1        — overridden to synthetic value (represents prior-station delay)
        • delay_vs_historical    — auto-recomputed as (current_delay_min - station_hist_avg)
        • section_delay_gradient — overridden to (synthetic_delay - hist_delay_lag2)

    DELAY PROPAGATION TARGET:
        y_aug = max(0.0, label + (incoming_delay - hist_lag1))
    When a train arrives at station i with higher/lower delay than historical average,
    that delay propagates forward to station i+1 modulated by the historical section gradient.
    This teaches the model how deviations in live incoming delay propagate to next-station delays.

    SAMPLING DISTRIBUTION:
        incoming = hist_delay_lag1 × lognormal_multiplier  (keeps delay ≥ 0)
    σ=0.6 gives ~10th–90th percentile range of 0.1× to 2.5× hist_lag1.

    AUGMENTED ROWS ARE NOT REAL OBSERVATIONS — they are synthetic training instances only.
    They are never written back to the CSV and never used in test evaluation.
    """
    X_aug = []
    y_aug = []

    for _, row in train_df.iterrows():
        dep_hour = int(row["dep_min"] // 60) if "dep_min" in row and pd.notna(row["dep_min"]) else 12
        tot_dist = float(row["distance_km"]) + float(row.get("remaining_distance_km", 0.0))
        hist_lag1 = float(row.get("hist_delay_lag1", 0.0))
        hist_lag2 = float(row.get("hist_delay_lag2", 0.0))
        label = float(row["target_next_station_delay"])

        tid = str(row["train_id"]).zfill(5)
        stn = str(row["station_code"]).upper()
        lookup_key = f"{tid}_{stn}"
        base_lookup = hist_averages.get("lookup", {}).get(lookup_key, {})

        # Generate n_aug synthetic variants with different incoming delay values.
        # σ=0.6 lognormal spans a realistic range: near-recovery to severe congestion.
        if hist_lag1 > 0:
            multipliers = rng.lognormal(mean=0.0, sigma=0.6, size=n_aug)
            sampled_delays = np.clip(hist_lag1 * multipliers, 0.0, 240.0)
        else:
            # On-time stations: sample small delays to teach recovery / on-time propagation
            sampled_delays = rng.uniform(0.0, 15.0, size=n_aug)

        for incoming_delay in sampled_delays:
            # Override lookup so hist_delay_lag1 and section_delay_gradient are consistent
            # with the synthetic incoming delay — not stuck at the historical fixed values.
            variant_lookup = dict(base_lookup)
            variant_lookup["hist_delay_lag1"] = float(incoming_delay)
            variant_lookup["section_delay_gradient"] = float(incoming_delay) - hist_lag2

            # Shallow-copy hist_averages to override only this row's lookup entry
            variant_hist = dict(hist_averages)
            variant_hist["lookup"] = dict(hist_averages.get("lookup", {}))
            variant_hist["lookup"][lookup_key] = variant_lookup

            fv = build_features(
                train_number=str(row["train_id"]),
                station_code=str(row["station_code"]),
                distance_km=float(row["distance_km"]),
                total_distance_km=tot_dist,
                current_delay_min=float(incoming_delay),
                scheduled_departure_hour=dep_hour,
                day_of_week=0,  # unused by build_features (removed from vector)
                hist_averages=variant_hist,
            )
            X_aug.append(fv)
            y_propagated = max(0.0, label + (float(incoming_delay) - hist_lag1))
            y_aug.append(y_propagated)

    return X_aug, y_aug



def row_to_feature_vector(row: pd.Series, hist_averages: dict) -> list[float]:
    """
    Converts a single raw CSV row to a feature vector using the real historical lag1
    as the incoming delay. Used for both training (base rows) and test evaluation.
    """
    dep_hour = int(row["dep_min"] // 60) if "dep_min" in row and pd.notna(row["dep_min"]) else 12
    tot_dist = float(row["distance_km"]) + float(row.get("remaining_distance_km", 0.0))
    # Use hist_delay_lag1 as the "current delay" seen at training time — this is the
    # historically-observed delay at the preceding station, which is what the live
    # system knows when making a prediction for the next station.
    incoming_delay = float(row.get("hist_delay_lag1", 0.0))
    return build_features(
        train_number=str(row["train_id"]),
        station_code=str(row["station_code"]),
        distance_km=float(row["distance_km"]),
        total_distance_km=tot_dist,
        current_delay_min=incoming_delay,
        scheduled_departure_hour=dep_hour,
        day_of_week=0,  # unused by build_features (removed from vector)
        hist_averages=hist_averages,
    )


def main(csv_path: str = None):
    if not csv_path:
        csv_path = DEFAULT_DATA_PATH

    if not os.path.exists(csv_path):
        print(f"ERROR: Training data CSV not found at: {csv_path}")
        print("Please ensure scripts/04_feature_engineering.py has been run to produce data/processed/ml_training_data.csv.")
        sys.exit(1)

    os.makedirs(MODEL_DIR, exist_ok=True)

    print(f"Loading dataset from: {csv_path}")
    raw_df = pd.read_csv(csv_path, low_memory=False)
    raw_df["train_id"] = raw_df["train_id"].astype(str).str.zfill(5)
    raw_df["station_code"] = raw_df["station_code"].astype(str).str.upper()

    # Validate the label column is present (produced by 04_feature_engineering.py)
    if "target_next_station_delay" not in raw_df.columns:
        print("ERROR: 'target_next_station_delay' column missing from training data.")
        print("Re-run scripts/04_feature_engineering.py to regenerate ml_training_data.csv.")
        sys.exit(1)

    # Drop any rows where the label is NaN (last station of each train has no next station)
    raw_df = raw_df.dropna(subset=["target_next_station_delay"]).reset_index(drop=True)

    print(f"Loaded {len(raw_df)} records across {raw_df['train_id'].nunique()} unique train journeys.")
    print(f"Label: target_next_station_delay  |  mean={raw_df['target_next_station_delay'].mean():.1f} min  "
          f"std={raw_df['target_next_station_delay'].std():.1f} min")

    # --- Group-aware train/test split ---
    # All stations of the same train stay together in the same split.
    # This ensures the model is validated on *completely unseen* journeys, not just unseen stations.
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_SEED)
    train_idx, test_idx = next(splitter.split(raw_df, groups=raw_df["train_id"]))
    train_df = raw_df.iloc[train_idx].copy().reset_index(drop=True)
    test_df  = raw_df.iloc[test_idx].copy().reset_index(drop=True)

    print(f"\nTrain split: {len(train_df)} rows ({train_df['train_id'].nunique()} trains)")
    print(f"Test split : {len(test_df)} rows ({test_df['train_id'].nunique()} trains)")

    # Historical averages and lookup table computed ONLY on training partition to avoid leakage.
    hist_averages = compute_historical_averages_and_lookup(train_df)

    # --- Base feature vectors (real historical rows) ---
    print("\nBuilding base feature vectors from real historical rows...")
    X_base = [row_to_feature_vector(row, hist_averages) for _, row in train_df.iterrows()]
    y_base = [float(row["target_next_station_delay"]) for _, row in train_df.iterrows()]

    # Diagnostic 1: Real (non-augmented) training split rows correlation and regression slope
    real_lag1 = train_df["hist_delay_lag1"].fillna(0.0).values
    real_target = train_df["target_next_station_delay"].values
    corr_real = float(np.corrcoef(real_lag1, real_target)[0, 1])
    slope_real, intercept_real = np.polyfit(real_lag1, real_target, 1)
    print(f"Real-data Diagnostic (non-augmented train split, N={len(train_df)}):")
    print(f"  corr(hist_delay_lag1, target_next_station_delay) = {corr_real:+.4f}")
    print(f"  OLS regression fit: target = {slope_real:.4f} * hist_delay_lag1 + {intercept_real:.2f} min")

    # --- Augmented feature vectors (synthetic incoming-delay variants, training split only) ---
    print(f"\nAugmenting training data: {N_AUG} synthetic variants per real row...")
    rng = np.random.default_rng(RANDOM_SEED)
    X_aug, y_aug = augment_training_rows(train_df, hist_averages, N_AUG, rng)

    # Diagnostic 2: compute correlation between current_delay_min and target across augmented rows
    cur_delay_idx = FEATURE_NAMES.index("current_delay_min")
    arr_X_aug = np.array(X_aug)
    arr_y_aug = np.array(y_aug)
    corr_aug = np.corrcoef(arr_X_aug[:, cur_delay_idx], arr_y_aug)[0, 1]
    print(f"  Augmented Diagnostic: corr(current_delay_min, y_aug) = {corr_aug:+.4f}")

    # Combine real + synthetic for training
    X_train = X_base + X_aug
    y_train = y_base + y_aug
    print(f"Training instances: {len(X_base)} real + {len(X_aug)} synthetic = {len(X_train)} total")

    # --- Test set: ONLY real historical rows, no augmentation ---
    X_test = [row_to_feature_vector(row, hist_averages) for _, row in test_df.iterrows()]
    y_test  = [float(row["target_next_station_delay"]) for _, row in test_df.iterrows()]

    # --- Train LightGBM ---
    print("\nTraining LightGBM Regressor...")
    model = lgb.LGBMRegressor(
        n_estimators=400,
        learning_rate=0.04,
        num_leaves=47,
        min_child_samples=8,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_alpha=0.1,
        reg_lambda=0.1,
        random_state=RANDOM_SEED,
        verbose=-1,
    )
    model.fit(X_train, y_train)

    # --- Evaluate on unseen real journeys ---
    test_preds = model.predict(X_test)
    mae  = mean_absolute_error(y_test, test_preds)
    rmse = math.sqrt(mean_squared_error(y_test, test_preds))

    print(f"\nModel Performance on Unseen Journeys (real rows only, target=next_station_delay):")
    print(f"  Test MAE : {mae:.2f} minutes")
    print(f"  Test RMSE: {rmse:.2f} minutes")

    # --- Persist model artifacts ---
    model_path = os.path.join(MODEL_DIR, "delay_model.pkl")
    joblib.dump(model, model_path)

    hist_path = os.path.join(MODEL_DIR, "historical_averages.json")
    with open(hist_path, "w", encoding="utf-8") as f:
        json.dump(hist_averages, f, indent=2)

    importances = model.feature_importances_
    feature_importance_map = {
        name: round(float(imp), 4) for name, imp in zip(FEATURE_NAMES, importances)
    }

    metrics = {
        "mae_minutes": round(float(mae), 2),
        "test_rmse_minutes": round(float(rmse), 2),
        "current_delay_min_lag1_correlation_real_rows": round(corr_real, 4),
        "delay_propagation_coefficient_empirical": round(float(slope_real), 4),
        "trained_on_records": len(X_train),
        "real_train_records": len(X_base),
        "augmented_train_records": len(X_aug),
        "test_records": len(test_df),
        "target_label": "target_next_station_delay",
        "n_features": len(FEATURE_NAMES),
        "feature_importance": feature_importance_map,
        "last_trained": pd.Timestamp.now("UTC").strftime("%Y-%m-%d"),
    }

    metrics_path = os.path.join(MODEL_DIR, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)


    print(f"\nSuccessfully generated and saved artifacts to backend/ml/model/:")
    print(f"  - delay_model.pkl          ({os.path.getsize(model_path):,} bytes)")
    print(f"  - historical_averages.json ({os.path.getsize(hist_path):,} bytes)")
    print(f"  - metrics.json             ({os.path.getsize(metrics_path):,} bytes)")

    print("\nFeature Importances (sorted):")
    zero_imp = []
    for name, imp in sorted(feature_importance_map.items(), key=lambda x: -x[1]):
        marker = " ← WARNING: dead feature" if imp == 0.0 else ""
        print(f"  {name:35s}: {imp}{marker}")
        if imp == 0.0:
            zero_imp.append(name)
    if zero_imp:
        print(f"\n⚠ WARNING: {len(zero_imp)} features have zero importance: {zero_imp}")
        print("  Consider removing them from FEATURE_NAMES in features.py.")
    else:
        print("\n✓ All features have non-zero importance.")

    # --- Sanity check: station-by-station predictions for one train ---
    _sanity_check_train_predictions(train_df, hist_averages, model)


def _sanity_check_train_predictions(train_df: pd.DataFrame, hist_averages: dict, model) -> None:
    """
    For a single held-in train, print the predicted next-station delay for each stop
    at three different incoming-delay levels (5, 25, 60 min). This confirms the model
    produces plausible, directionally-consistent outputs — predictions should generally
    increase with higher incoming delay, though exact values vary by station features.
    """
    # Pick the train with the most stations for a meaningful walkthrough
    best_train = train_df.groupby("train_id").size().idxmax()
    subset = train_df[train_df["train_id"] == best_train].sort_values("seq_no")

    print(f"\n--- Sanity Check: Train {best_train} ({len(subset)} stations) ---")
    print(f"{'Station':8s}  {'dist_km':>7s}  {'delay@5min':>10s}  {'delay@25min':>11s}  {'delay@60min':>11s}")
    print("-" * 58)

    for _, row in subset.iterrows():
        dep_hour = int(row["dep_min"] // 60) if "dep_min" in row and pd.notna(row["dep_min"]) else 12
        tot_dist = float(row["distance_km"]) + float(row.get("remaining_distance_km", 0.0))
        preds = []
        for test_delay in [5.0, 25.0, 60.0]:
            fv = build_features(
                train_number=str(row["train_id"]),
                station_code=str(row["station_code"]),
                distance_km=float(row["distance_km"]),
                total_distance_km=tot_dist,
                current_delay_min=test_delay,
                scheduled_departure_hour=dep_hour,
                day_of_week=0,
                hist_averages=hist_averages,
            )
            pred = max(0.0, float(model.predict([fv])[0]))
            preds.append(pred)
        print(f"{row['station_code']:8s}  {row['distance_km']:7.0f}  {preds[0]:10.1f}  {preds[1]:11.1f}  {preds[2]:11.1f}")

    print("-" * 58)
    print("✓ Higher incoming delay should generally yield higher predicted next-station delay.")


if __name__ == "__main__":
    csv_file = sys.argv[1] if len(sys.argv) > 1 else None
    main(csv_file)
