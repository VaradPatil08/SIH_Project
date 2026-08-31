"""
Step 1: Load & index the Kaggle calibration data.
Goal: turn etrain_delays.csv into a clean lookup table of
(train_number, station_code) -> real-world delay statistics.
"""

import pandas as pd

RAW_PATH = "data/raw/etrain_delays.csv"
OUT_LOOKUP = "data/processed/calibration_lookup.csv"
OUT_STATION_FALLBACK = "data/processed/station_level_fallback.csv"
OUT_GLOBAL_FALLBACK = "data/processed/global_fallback.csv"


def load_raw(path):
    return pd.read_csv(path)


def handle_nulls(df):
    df = df.copy()
    is_null = df["average_delay_minutes"].isnull()
    high_on_time = is_null & (df["pct_right_time"] >= 90)
    df.loc[high_on_time, "average_delay_minutes"] = 0.0

    still_null = df["average_delay_minutes"].isnull()
    if still_null.sum() > 0:
        est = (
            df.loc[still_null, "pct_right_time"] / 100 * 7
            + df.loc[still_null, "pct_slight_delay"] / 100 * 37
            + df.loc[still_null, "pct_significant_delay"] / 100 * 90
        )
        df.loc[still_null, "average_delay_minutes"] = est
    return df


def dedupe(df):
    numeric_cols = [
        "average_delay_minutes", "pct_right_time",
        "pct_slight_delay", "pct_significant_delay", "pct_cancelled_unknown",
    ]
    agg = df.groupby(["train_number", "station_code"], as_index=False).agg(
        {**{c: "mean" for c in numeric_cols}, "train_name": "first", "station_name": "first"}
    )
    return agg


def build_station_fallback(df):
    numeric_cols = [
        "average_delay_minutes", "pct_right_time",
        "pct_slight_delay", "pct_significant_delay", "pct_cancelled_unknown",
    ]
    return df.groupby("station_code", as_index=False)[numeric_cols].mean()


def build_global_fallback(df):
    numeric_cols = [
        "average_delay_minutes", "pct_right_time",
        "pct_slight_delay", "pct_significant_delay", "pct_cancelled_unknown",
    ]
    return df[numeric_cols].mean()


def main():
    df = load_raw(RAW_PATH)
    print(f"Loaded {len(df)} rows, {df['train_number'].nunique()} trains, "
          f"{df['station_code'].nunique()} stations")

    df = handle_nulls(df)
    assert df["average_delay_minutes"].isnull().sum() == 0

    lookup = dedupe(df)
    print(f"After dedup: {len(lookup)} unique (train, station) rows")

    station_fallback = build_station_fallback(lookup)
    global_fallback = build_global_fallback(lookup)

    lookup.to_csv(OUT_LOOKUP, index=False)
    station_fallback.to_csv(OUT_STATION_FALLBACK, index=False)
    global_fallback.to_frame().T.to_csv(OUT_GLOBAL_FALLBACK, index=False)

    print("Saved calibration_lookup.csv, station_level_fallback.csv, global_fallback.csv")
    print(lookup.head())


if __name__ == "__main__":
    main()