import datetime
import json
import math
import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import RAILRADAR_CACHE_TTL_SECONDS
from app.db import get_db
from app.models_db import TrainLiveCache
from app.models.schemas import (
    CurrentPosition,
    DelayReasonsResponse,
    LiveSyncResponse,
    ModelMetrics,
    Station,
    StationETA,
    TrainETAResponse,
    TrainRouteResponse,
    TrainSummary,
)
from app.services import (
    eta,
    live_feed,
    quota_guard,
    railradar_client,
    railradar_interpolation,
)

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
    Full-network search across all trains.
    Case-insensitive match on train_number (prefix/exact) or name/origin/destination (substring).
    """
    ql = q.strip().lower()
    if len(ql) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters.")

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
def list_trains(
    featured: bool | None = Query(
        None,
        description="If true (default), return only featured flagship homepage trains. Pass false to return full network.",
    )
):
    """Returns train list (curated featured trains by default)."""
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
    """Computes a smoothly-evolving delay estimate for the whole journey."""
    hist = eta._hist_averages or {}
    global_avg = float(hist.get("global_avg", 20.0))
    tid = str(train_number).zfill(5)

    train_avg = float(hist.get("train", {}).get(tid, global_avg))
    hist_base = max(8.0, min(train_avg, 60.0))

    total_min = float(stations[-1].get("scheduled_offset_min", 1000) or 1000)
    phase = (elapsed_min / total_min) * 2.0 * math.pi
    sine_component = hist_base * 0.30 * math.sin(phase)

    real_elapsed = time.time() - _DELAY_SIM_START
    bucket = int(real_elapsed // 240)
    hash_val = hash(f"{train_number}:{bucket}") % 1000
    walk_component = hist_base * 0.25 * (hash_val / 500.0 - 1.0)

    raw = hist_base + sine_component + walk_component
    return max(int(hist_base * 0.3), min(round(raw), int(hist_base * 2.2)))


@router.post("/trains/{train_number}/live/sync", response_model=LiveSyncResponse)
@router.post("/train/{train_number}/live/sync", response_model=LiveSyncResponse)
def sync_train_live(train_number: str, db: Session = Depends(get_db)):
    """
    Explicit one-time sync endpoint triggered when a user adds a train to tracking.
    1. Checks shared DB cache for fresh snapshot within TTL window (shared across all users).
    2. Checks monthly quota guard before calling external RailRadar API.
    3. Degrades gracefully to the simulator on budget exhaustion, network errors, or route mismatches.
    """
    clean_num = str(train_number).strip()
    train = _MOCK_TRAINS.get(clean_num)
    if not train:
        raise HTTPException(status_code=404, detail=f"Unknown train {clean_num}")

    now = datetime.datetime.utcnow()
    stations = train["stations"]

    # 1. Check shared DB cache
    cached = db.query(TrainLiveCache).filter(TrainLiveCache.train_number == clean_num).first()
    if cached:
        age_seconds = (now - cached.synced_at).total_seconds()
        if age_seconds < RAILRADAR_CACHE_TTL_SECONDS:
            return LiveSyncResponse(
                train_number=clean_num,
                lat=cached.lat,
                lng=cached.lng,
                speed_kmh=cached.speed_kmh,
                bearing_degrees=cached.bearing_degrees,
                next_station_code=cached.next_station_code,
                next_station_name=cached.next_station_name,
                distance_to_next_km=cached.distance_to_next_km,
                source=cached.source,
                synced_at=cached.synced_at.isoformat(),
            )

    # 2. Check quota budget before outbound call
    if not quota_guard.has_budget(db):
        sim_pos, _, _ = live_feed.get_live_position_and_state(
            stations,
            train_number=clean_num,
            start_offset_min=train.get("sim_start_offset_min", 0),
        )
        return LiveSyncResponse(
            train_number=clean_num,
            lat=sim_pos["lat"],
            lng=sim_pos["lng"],
            speed_kmh=sim_pos["speed_kmh"],
            bearing_degrees=None,
            next_station_code=sim_pos.get("next_station_code"),
            next_station_name=sim_pos.get("next_station_name"),
            distance_to_next_km=sim_pos.get("distance_to_next_km"),
            source="simulated",
            synced_at=now.isoformat(),
        )

    # 3. Fetch from RailRadar API
    raw_data = railradar_client.fetch_live(clean_num, db)
    if raw_data:
        interpolated = railradar_interpolation.interpolate_railradar_position(raw_data, stations)
        if interpolated:
            # Upsert cache with real RailRadar telemetry
            if cached:
                cached.source = "railradar"
                cached.synced_at = now
                cached.lat = interpolated["lat"]
                cached.lng = interpolated["lng"]
                cached.speed_kmh = interpolated["speed_kmh"]
                cached.bearing_degrees = interpolated.get("bearing_degrees")
                cached.next_station_code = interpolated.get("next_station_code")
                cached.next_station_name = interpolated.get("next_station_name")
                cached.distance_to_next_km = interpolated.get("distance_to_next_km")
                cached.raw_response = json.dumps(raw_data)
            else:
                cached = TrainLiveCache(
                    train_number=clean_num,
                    source="railradar",
                    synced_at=now,
                    lat=interpolated["lat"],
                    lng=interpolated["lng"],
                    speed_kmh=interpolated["speed_kmh"],
                    bearing_degrees=interpolated.get("bearing_degrees"),
                    next_station_code=interpolated.get("next_station_code"),
                    next_station_name=interpolated.get("next_station_name"),
                    distance_to_next_km=interpolated.get("distance_to_next_km"),
                    raw_response=json.dumps(raw_data),
                )
                db.add(cached)
            db.commit()

            return LiveSyncResponse(
                train_number=clean_num,
                lat=interpolated["lat"],
                lng=interpolated["lng"],
                speed_kmh=interpolated["speed_kmh"],
                bearing_degrees=interpolated.get("bearing_degrees"),
                next_station_code=interpolated.get("next_station_code"),
                next_station_name=interpolated.get("next_station_name"),
                distance_to_next_km=interpolated.get("distance_to_next_km"),
                source="railradar",
                synced_at=now.isoformat(),
            )

    # Fallback to simulated position if RailRadar failed, unmapped route, or offline
    sim_pos, _, _ = live_feed.get_live_position_and_state(
        stations,
        train_number=clean_num,
        start_offset_min=train.get("sim_start_offset_min", 0),
    )

    if cached:
        cached.source = "simulated"
        cached.synced_at = now
        cached.lat = sim_pos["lat"]
        cached.lng = sim_pos["lng"]
        cached.speed_kmh = sim_pos["speed_kmh"]
        cached.bearing_degrees = None
        cached.next_station_code = sim_pos.get("next_station_code")
        cached.next_station_name = sim_pos.get("next_station_name")
        cached.distance_to_next_km = sim_pos.get("distance_to_next_km")
        cached.raw_response = None
    else:
        cached = TrainLiveCache(
            train_number=clean_num,
            source="simulated",
            synced_at=now,
            lat=sim_pos["lat"],
            lng=sim_pos["lng"],
            speed_kmh=sim_pos["speed_kmh"],
            bearing_degrees=None,
            next_station_code=sim_pos.get("next_station_code"),
            next_station_name=sim_pos.get("next_station_name"),
            distance_to_next_km=sim_pos.get("distance_to_next_km"),
            raw_response=None,
        )
        db.add(cached)
    db.commit()

    return LiveSyncResponse(
        train_number=clean_num,
        lat=sim_pos["lat"],
        lng=sim_pos["lng"],
        speed_kmh=sim_pos["speed_kmh"],
        bearing_degrees=None,
        next_station_code=sim_pos.get("next_station_code"),
        next_station_name=sim_pos.get("next_station_name"),
        distance_to_next_km=sim_pos.get("distance_to_next_km"),
        source="simulated",
        synced_at=now.isoformat(),
    )


@router.get("/trains/{train_number}/eta", response_model=TrainETAResponse)
@router.get("/train/{train_number}/eta", response_model=TrainETAResponse)
def get_train_eta(train_number: str, db: Session = Depends(get_db)):
    """
    Main endpoint the live tracking page polls every 6 seconds.
    MUST NEVER call RailRadar directly — satisfies position from TrainLiveCache or the simulator.
    """
    clean_num = str(train_number).strip()
    train = _MOCK_TRAINS.get(clean_num)
    if not train:
        raise HTTPException(status_code=404, detail=f"Unknown train {clean_num}")

    stations = train["stations"]
    sim_offset = train.get("sim_start_offset_min", 0)

    # 1. Check for valid RailRadar live cache
    now = datetime.datetime.utcnow()
    cached = db.query(TrainLiveCache).filter(TrainLiveCache.train_number == clean_num).first()
    
    use_railradar = False
    if cached and cached.source == "railradar":
        age_seconds = (now - cached.synced_at).total_seconds()
        if age_seconds < RAILRADAR_CACHE_TTL_SECONDS:
            use_railradar = True

    if use_railradar and cached:
        position = {
            "lat": cached.lat,
            "lng": cached.lng,
            "speed_kmh": cached.speed_kmh,
            "last_updated": cached.synced_at.strftime("%I:%M:%S %p"),
            "next_station_code": cached.next_station_code or stations[-1]["code"],
            "next_station_name": cached.next_station_name or stations[-1]["name"],
            "distance_to_next_km": cached.distance_to_next_km or 0.0,
            "bearing_degrees": cached.bearing_degrees,
            "synced_at": cached.synced_at.isoformat(),
            "source": "railradar",
        }
        # Approximate current station index & elapsed journey for delay propagation
        _, elapsed_min, current_station_index = live_feed.get_live_position_and_state(
            stations,
            train_number=clean_num,
            start_offset_min=sim_offset,
        )
    else:
        sim_pos, elapsed_min, current_station_index = live_feed.get_live_position_and_state(
            stations,
            train_number=clean_num,
            start_offset_min=sim_offset,
        )
        position = {
            **sim_pos,
            "bearing_degrees": None,
            "synced_at": None,
            "source": "simulated",
        }

    # Ensure the ETA model's historical averages are loaded
    eta._try_load_model()

    # Continuously-evolving delay estimate
    base_delay = _compute_base_delay(clean_num, stations, float(elapsed_min))

    station_etas = []
    for idx, st in enumerate(stations):
        if idx < current_station_index:
            status = "reached"
            delay = 0 if idx == 0 else max(0, base_delay - (current_station_index - idx) * 2)
        elif idx == current_station_index:
            status = "delayed" if base_delay > 2 else "on_time"
            delay = base_delay
        else:
            delay, _ = eta.predict_delay_minutes(
                train_number=clean_num,
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
