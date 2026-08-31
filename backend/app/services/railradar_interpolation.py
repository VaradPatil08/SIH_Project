"""
Interpolation service for RailRadar live telemetry data.
Resolves RailRadar progress fraction against local station coordinates to produce
accurate, ground-truth GPS positions matching the app's GIS routing.
"""

from typing import Optional, List, Dict, Any


def interpolate_railradar_position(
    data: Dict[str, Any],
    stations: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Interpolates ground-truth lat/lng, speed, bearing, and distance to next halt
    from a RailRadar live data snapshot.

    Returns dict on success or None if stations cannot be resolved against the route.
    """
    if not data or not stations:
        return None

    # Station lookup map keyed by uppercase station code
    stn_map: Dict[str, Dict[str, Any]] = {
        str(st["code"]).strip().upper(): st for st in stations if "code" in st
    }

    current_loc = data.get("currentLocation") or {}
    prev_halt = data.get("previousHalt") or {}
    next_halt = data.get("nextHalt") or {}

    prev_code = str(prev_halt.get("stationCode", "")).strip().upper()
    next_code = str(next_halt.get("stationCode", "")).strip().upper()
    current_code = str(current_loc.get("stationCode", "")).strip().upper()

    status = str(current_loc.get("status", "")).strip().lower()
    speed_kmh = float(current_loc.get("speedKmh") or 0.0)
    bearing = current_loc.get("bearingDegrees")
    bearing_degrees = float(bearing) if bearing is not None else None

    # 1. Halted at a station (status == 'arrived', 'halted', 'halt') or terminal halt
    if status in ("arrived", "halted", "halt", "reached"):
        target_code = current_code or next_code or prev_code
        if target_code not in stn_map:
            return None
        stn = stn_map[target_code]
        return {
            "lat": round(float(stn["lat"]), 4),
            "lng": round(float(stn["lng"]), 4),
            "speed_kmh": 0.0,
            "bearing_degrees": bearing_degrees,
            "next_station_code": stn["code"],
            "next_station_name": stn["name"],
            "distance_to_next_km": 0.0,
            "source": "railradar",
        }

    # 2. Mid-segment / Departed train: requires both prev and next halt codes to match our route
    if not prev_code or not next_code:
        # If one is missing but current_code is available and matches
        if current_code in stn_map:
            stn = stn_map[current_code]
            return {
                "lat": round(float(stn["lat"]), 4),
                "lng": round(float(stn["lng"]), 4),
                "speed_kmh": speed_kmh,
                "bearing_degrees": bearing_degrees,
                "next_station_code": stn["code"],
                "next_station_name": stn["name"],
                "distance_to_next_km": 0.0,
                "source": "railradar",
            }
        return None

    if prev_code not in stn_map or next_code not in stn_map:
        # Station mismatch between RailRadar and local route dataset
        return None

    prev_stn = stn_map[prev_code]
    next_stn = stn_map[next_code]

    # Progress between stations: 0.0 to 1.0 (clamped)
    raw_progress = current_loc.get("segmentProgress")
    if raw_progress is None:
        progress = 0.5
    else:
        try:
            progress = max(0.0, min(1.0, float(raw_progress)))
        except (ValueError, TypeError):
            progress = 0.5

    # Linear interpolation of GPS coordinates between ground-truth stations
    lat = prev_stn["lat"] + (next_stn["lat"] - prev_stn["lat"]) * progress
    lng = prev_stn["lng"] + (next_stn["lng"] - prev_stn["lng"]) * progress

    # Compute distance to next station
    prev_dist = float(prev_stn.get("distance_km", 0.0))
    next_dist = float(next_stn.get("distance_km", 0.0))
    segment_distance = abs(next_dist - prev_dist)
    if segment_distance > 0:
        traveled = segment_distance * progress
        distance_to_next = max(0.0, round(segment_distance - traveled, 1))
    else:
        distance_to_next = 0.0

    return {
        "lat": round(float(lat), 4),
        "lng": round(float(lng), 4),
        "speed_kmh": round(speed_kmh, 1),
        "bearing_degrees": bearing_degrees,
        "next_station_code": next_stn["code"],
        "next_station_name": next_stn["name"],
        "distance_to_next_km": distance_to_next,
        "source": "railradar",
    }

