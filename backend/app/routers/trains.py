import json
import math
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    CurrentPosition,
    DelayReasonsResponse,
    ModelMetrics,
    Station,
    StationETA,
    TrainETAResponse,
    TrainRouteResponse,
    TrainSummary,
)
from app.services import eta, live_feed

router = APIRouter(tags=["trains"])

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "mock_trains.json"
with open(_DATA_PATH, encoding="utf-8") as f:
    _MOCK_TRAINS = json.load(f)

# Module-level sim start so delay random-walk is stable per server restart
_DELAY_SIM_START = time.time()


@router.get("/trains/search", response_model=list[TrainSummary])
def search_trains(
    q: str = Query(..., min_length=2, description="Search query — min 2 chars; matches train number, name, origin, destination"),
    limit: int = Query(20, ge=1, le=50, description="Max results (1–50, default 20)"),
):
    """
    Full-network search across all 9,525 trains.
    Case-insensitive match on train_number (prefix/exact) or name/origin/destination (substring).
    This is the ONLY endpoint that should surface non-featured trains — never dump the full set.
    """
    ql = q.strip().lower()
    if len(ql) < 2:
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(status_code=400, detail="Query must be at least 2 characters.")

    results = []
    for t in _MOCK_TRAINS.values():
        if (
            ql in t.get("train_number", "").lower()
            or ql in t.get("name", "").lower()
            or ql in (t.get("origin") or "").lower()
            or ql in (t.get("destination") or "").lower()
        ):
            results.append(
                TrainSummary(
                    train_number=t["train_number"],
                    name=t["name"],
                    origin=t["origin"],
                    destination=t["destination"],
                    type=t.get("type"),
                    zone=t.get("zone"),
                    scheduled_departure=t.get("scheduled_departure"),
                    total_distance_km=t.get("total_distance_km"),
                    train_name=t["name"],
                    featured=bool(t.get("featured", False)),
                )
            )
            if len(results) >= limit:
                break
    return results


@router.get("/trains", response_model=list[TrainSummary])
def list_trains(featured: bool | None = Query(None, description="If true (default), return only featured flagship homepage trains (6 trains). Pass false to return the full network — large response, use deliberately.")):
    """
    Returns train list.
    - Default (no param): returns only the 6 curated featured trains — fast, suitable for homepage.
    - ?featured=true: same as default.
    - ?featured=false: returns full 9,525-train network — large, use only when explicitly needed.
    Use GET /trains/search?q=... to search the full network without loading it all at once.
    """
    show_featured_only = featured if featured is not None else True
    return [
        TrainSummary(
            train_number=t["train_number"],
            name=t["name"],
            origin=t["origin"],
            destination=t["destination"],
            type=t.get("type"),
            zone=t.get("zone"),
            scheduled_departure=t.get("scheduled_departure"),
            total_distance_km=t.get("total_distance_km"),
            train_name=t["name"],
            featured=bool(t.get("featured", False)),
        )
        for t in _MOCK_TRAINS.values()
        if bool(t.get("featured", False)) == show_featured_only
    ]



@router.get("/trains/{train_number}/route", response_model=TrainRouteResponse)
@router.get("/train/{train_number}/route", response_model=TrainRouteResponse)
def get_train_route(train_number: str):
    """Returns static station list and GIS coordinates for a train route."""
    train = _MOCK_TRAINS.get(train_number)
    if not train:
        raise HTTPException(status_code=404, detail=f"Unknown train {train_number}")

    return TrainRouteResponse(
        train_number=train["train_number"],
        name=train["name"],
        stations=[
            Station(
                code=st["code"],
                name=st["name"],
                lat=st["lat"],
                lng=st["lng"],
                scheduled_offset_min=st.get("scheduled_offset_min", 0),
                distance_km=st.get("distance_km", 0.0),
            )
            for st in train["stations"]
        ]
    )


def _compute_base_delay(
    train_number: str,
    stations: list[dict],
    elapsed_min: float,
) -> int:
    """
    Computes a smoothly-evolving delay estimate for the whole journey — NOT
    per-segment, so it never resets to zero when current_station_index advances.

    FIX for the sawtooth problem:
        The old code used `sim_delay = elapsed_min - scheduled_offset_at_current_station`.
        This collapsed to ~0 every time the station index advanced, because the new
        station's own scheduled_offset becomes the denominator. The result was a
        sawtooth wave instead of a continuous signal.

    NEW APPROACH — smooth bounded random-walk keyed by (train_number, journey fraction):
        1. Seed a historical base from the ML lookup table (per-train chronic delay)
        2. Add a slow sinusoidal perturbation (period = total journey), so delay rises and
           falls naturally across the route — not per-station resets
        3. Add a very slow random-walk component driven by a hash of
           (train_number, coarse_time_bucket) so each train has its own independent
           delay trajectory, and adjacent polls produce adjacent values (no jumps)

    The result is a signal that:
        • Is different per train (seeded by hist_lag per train)
        • Varies continuously across the journey (sinusoidal wave)
        • Drifts slowly over real time (random-walk bucket)
        • Never resets to 0 on station-crossing
        • Is bounded to [hist_base * 0.3, hist_base * 2.2] so it stays realistic
    """
    hist = eta._hist_averages or {}
    global_avg = float(hist.get("global_avg", 20.0))
    tid = str(train_number).zfill(5)

    # 1. Historical base: this train's chronic delay profile
    train_avg = float(hist.get("train", {}).get(tid, global_avg))
    # Clamp to a realistic range (some trains have 0.0 from sparse data)
    hist_base = max(8.0, min(train_avg, 60.0))

    # 2. Journey-progress sinusoidal component.
    #    One full sine cycle over the whole journey duration — delay rises in the
    #    middle of a long run and recovers near the destination. Amplitude = 30% of base.
    total_min = float(stations[-1].get("scheduled_offset_min", 1000) or 1000)
    phase = (elapsed_min / total_min) * 2.0 * math.pi  # 0 → 2π across the journey
    sine_component = hist_base * 0.30 * math.sin(phase)  # ±30% of base

    # 3. Slow random-walk: bucket size = 4 real minutes (40 simulated minutes at 10×).
    #    Each bucket gets a stable offset derived from a deterministic hash, so
    #    consecutive polls in the same bucket see the same value (no inter-poll jumps).
    #    The hash uses train_number as a seed so different trains drift independently.
    real_elapsed = time.time() - _DELAY_SIM_START
    bucket = int(real_elapsed // 240)  # changes every 4 real minutes
    # Deterministic pseudo-random from (train_id, bucket) — no import of random needed
    hash_val = hash(f"{train_number}:{bucket}") % 1000  # 0..999
    walk_component = hist_base * 0.25 * (hash_val / 500.0 - 1.0)  # ±25% of base

    raw = hist_base + sine_component + walk_component

    # Clamp to a realistic delay range
    result = max(int(hist_base * 0.3), min(round(raw), int(hist_base * 2.2)))
    return result


@router.get("/trains/{train_number}/eta", response_model=TrainETAResponse)
@router.get("/train/{train_number}/eta", response_model=TrainETAResponse)
def get_train_eta(train_number: str):
    """
    Main endpoint the live tracking page uses:
    Calculates interpolated current position, live speed, and station-level delay predictions.
    """
    train = _MOCK_TRAINS.get(train_number)
    if not train:
        raise HTTPException(status_code=404, detail=f"Unknown train {train_number}")

    stations = train["stations"]

    # Pass per-train sim_start_offset_min so trains on shared corridors
    # (e.g. MMCT→BVI is on both 12951 and 12009) appear at different positions.
    sim_offset = train.get("sim_start_offset_min", 0)
    position, elapsed_min, current_station_index = live_feed.get_live_position_and_state(
        stations,
        train_number=train_number,
        start_offset_min=sim_offset,
    )

    # Ensure the ETA model's historical averages are loaded
    eta._try_load_model()

    # Continuously-evolving delay estimate — no per-station sawtooth resets
    base_delay = _compute_base_delay(train_number, stations, float(elapsed_min))

    station_etas = []
    for idx, st in enumerate(stations):
        if idx < current_station_index:
            # Already-passed stations: reconstruct a plausible decaying historic delay
            status = "reached"
            delay = 0 if idx == 0 else max(0, base_delay - (current_station_index - idx) * 2)
        elif idx == current_station_index:
            # Current station: use the evolved delay
            status = "delayed" if base_delay > 2 else "on_time"
            delay = base_delay
        else:
            # Future stations: ML model predicts given current incoming delay
            delay, _ = eta.predict_delay_minutes(
                train_number=train_number,
                station_code=st["code"],
                distance_km=st.get("distance_km", 0),
                current_delay_min=base_delay,
                total_distance_km=train.get("total_distance_km"),
            )
            status = eta.status_from_delay(delay)

        station_etas.append(
            StationETA(
                code=st["code"],
                name=st["name"],
                lat=st["lat"],
                lng=st["lng"],
                scheduled_offset_min=st.get("scheduled_offset_min", 0),
                distance_km=st.get("distance_km", 0.0),
                predicted_delay_min=delay,
                predicted_offset_min=st.get("scheduled_offset_min", 0) + delay,
                status=status,
                platform=(idx % 4) + 1,
                top_delay_factors=eta.get_delay_reasons(st["code"]),
            )
        )

    return TrainETAResponse(
        train_number=train["train_number"],
        name=train["name"],
        current_position=CurrentPosition(**position),
        elapsed_min=elapsed_min,
        stations=station_etas,
        is_mock=False,
    )


@router.get("/trains/{train_number}/eta/{station_code}/reasons", response_model=DelayReasonsResponse)
@router.get("/train/{train_number}/eta/{station_code}/reasons", response_model=DelayReasonsResponse)
def get_station_delay_reasons(train_number: str, station_code: str):
    """Returns root-cause attribution reasons for a delayed station."""
    reasons = eta.get_delay_reasons(station_code.upper())
    return DelayReasonsResponse(reasons=reasons)


@router.get("/model/metrics", response_model=ModelMetrics)
def get_model_metrics():
    """Powers the /about page specification with model validation metrics."""
    return ModelMetrics(**eta.model_metrics())
