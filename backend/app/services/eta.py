"""
ETA prediction and delay diagnostic attribution service.

Loads the trained model from ml/model/delay_model.pkl if it exists.
If it doesn't exist yet (ML leads haven't trained it), falls back to
the original placeholder formula automatically — the app never
crashes or breaks the demo because a model file is missing, it just
runs on synthetic predictions until a real one is dropped in.

To go live: run ml/train_model.py once against the Kaggle dataset,
restart the server. Nothing else needs to change.
"""

import json
import os
import random
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "ml"))

_ML_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "ml")
_MODEL_PATH = os.path.join(_ML_DIR, "model", "delay_model.pkl")
_METRICS_PATH = os.path.join(_ML_DIR, "model", "metrics.json")

STATION_REASONS = {
    'BVI': ['Speed restriction of 30 km/h due to track renewal near Dahisar', 'Heavy suburban commuter peak section headway'],
    'ST': ['Section clearance delay following freight rake precedence at Sachin yard', 'Overhead Equipment (OHE) voltage fluctuation'],
    'BRC': ['Platform 2 line occupation by delayed 19015 Saurashtra Express', 'Yard junction signal interlocking wait at Makarpura'],
    'RTM': ['Crew changeover & brake continuity test extended by 6 mins', 'Single-line token exchange clearance at Morwani curve'],
    'KOTA': ['Speed restriction in Chambal bridge section for safety overhaul', 'Preceding goods train clearing Nagda-Kota quad line'],
    'SWM': ['Wildlife alert speed reduction (45 km/h) along Ranthambore corridor', 'Signal aspect caution between Gangapur City and Sawai Madhopur'],
    'MTJ': ['Dense fog visibility condition (< 150m) in NCR approach segment', 'Platform clearance delay for connecting Agra Cantt passenger train'],
    'NDLS': ['Terminal platform 12 occupancy by delayed Kalka Shatabdi', 'Terminal yard congestion at Shivaji Bridge outer signals'],
    'CNB': ['Ganga Bridge maintenance block speed limit', 'Heavy freight crossover at Juhi yard'],
    'PRYJ': ['Yard remodeling block at Naini junction', 'Congestion clearance post Vande Bharat overtaking slot'],
    'BSB': ['Outer signal wait due to Varanasi Cantt platform renovation', 'Speed restriction near Shivpur'],
    'VAPI': ['Monsoon speed restriction in coastal section', 'Level crossing gate repair delay'],
    'BH': ['Narmada river bridge maintenance inspection', 'Station approach signal hold'],
    'ANND': ['Dairy siding shunting movement crossing mainline', 'Automated signaling test in section'],
    'ND': ['Suburban MEMU crossover delay', 'Platform dwell extended for parcel loading'],
    'ADI': ['Terminal approach track maintenance', 'Platform 1 signal clearance queue'],
    'ASN': ['Coal freight rake clearance at Sitarampur', 'Section speed caution due to ballast work'],
    'DHN': ['Coalfield junction priority conflict', 'OHE maintenance speed restriction'],
    'PNME': ['Ghat section gradient descent regulated speed', 'Automatic block signaling glitch resolved'],
    'GAYA': ['Crew change and loco inspection duration', 'Grand Chord junction track crossover'],
    'DDU': ['Major freight corridor interchange clearance at Mughalsarai yards', 'Double-headed container rake precedence'],
}

_model = None
_model_load_attempted = False
_hist_averages = None


def _try_load_model():
    """Loads the trained model once, on first use. Safe if the file is missing."""
    global _model, _model_load_attempted, _hist_averages
    if _model_load_attempted:
        return
    _model_load_attempted = True

    if os.path.exists(_MODEL_PATH):
        try:
            import joblib
            from features import load_historical_averages
            _model = joblib.load(_MODEL_PATH)
            _hist_averages = load_historical_averages()
            print(f"[eta.py] Loaded trained model from {_MODEL_PATH}")
        except Exception as e:
            print(f"[eta.py] Found model file but failed to load it ({e}). Falling back to placeholder.")
            _model = None
    else:
        print(f"[eta.py] No trained model found at {_MODEL_PATH}. Using placeholder formula until ML leads train one.")


def predict_delay_minutes(
    train_number: str,
    station_code: str,
    distance_km: float,
    current_delay_min: int = 18,
    total_distance_km: float = None,
) -> tuple[int, list[str]]:
    """
    Returns (predicted_delay_minutes, top_delay_factors).

    Uses the real trained model if ml/model/delay_model.pkl exists,
    otherwise falls back to the original placeholder formula. The
    function signature is backward compatible — total_distance_km is
    optional so existing call sites don't break; when omitted, the
    real-model path falls back to the placeholder for that call since
    it needs total_distance_km to compute route_progress correctly.
    """
    _try_load_model()

    if _model is not None and total_distance_km:
        from features import build_features, current_time_features
        hour, dow = current_time_features()
        features = build_features(
            train_number=train_number,
            station_code=station_code,
            distance_km=distance_km,
            total_distance_km=total_distance_km,
            current_delay_min=current_delay_min,
            scheduled_departure_hour=hour,
            day_of_week=dow,
            hist_averages=_hist_averages,
        )
        predicted = max(0, round(float(_model.predict([features])[0])))
    else:
        base = current_delay_min * 0.85
        distance_factor = distance_km / 450
        noise = random.uniform(-1, 3)
        predicted = max(0, round(base + distance_factor + noise))

    factors = get_delay_reasons(station_code)
    return predicted, factors


def get_delay_reasons(station_code: str) -> list[str]:
    """Returns root-cause reasons for a given station."""
    return STATION_REASONS.get(station_code, [
        "Section speed restriction due to track maintenance work ahead",
        "Preceding express train clearance delay at junction signals"
    ])


def status_from_delay(delay_min: int) -> str:
    """Classifies delay into operational status."""
    if delay_min <= 2:
        return "on_time"
    return "delayed"


def model_metrics() -> dict:
    """
    Returns real training metrics if the model has been trained,
    otherwise clearly-labeled placeholder metrics so the About page
    doesn't silently show fake numbers as if they were real.
    """
    if os.path.exists(_METRICS_PATH):
        with open(_METRICS_PATH) as f:
            saved = json.load(f)
        return {
            "mae_minutes": saved["mae_minutes"],
            "trained_on_records": saved["trained_on_records"],
            "last_trained": f"Gradient Boosted Tree (trained {saved['last_trained']})",
        }
    return {
        "mae_minutes": 0.0,
        "trained_on_records": 0,
        "last_trained": "Not yet trained — placeholder predictions in use",
    }
