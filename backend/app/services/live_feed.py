"""
Simulated live-feed service for train position interpolation.

Interpolates a train's lat/lng smoothly between current and next station
based on elapsed journey time, mirroring the frontend's generateSyntheticETA()
algorithm for consistent offline/online behavior.

--- SIMULATION SPEED DESIGN ---

SIM_SPEED_MULTIPLIER = 10 (real seconds per simulated minute)
    → 1 real second = 0.1 simulated minute = 6 simulated minutes per real minute
    → 10× real-time acceleration

Why 10×?
  Shortest inter-station segment in mock_trains.json: ~30 min (BVI→MMCT on 12009)
  Frontend poll interval: ~5 real seconds
  At 10× speed, a 5-second poll sees 0.5 simulated minutes of progress.
  That is 0.5/30 = 1.7% of the shortest segment — well below the 10-15%
  maximum-segment-jump budget. A full route (~480 min) completes in ~48 real
  seconds, giving a demo session multiple complete cycles per minute.

Why not 60× (old SECONDS_PER_SIM_MINUTE=2)?
  At 60×, a 5-second poll saw 5 simulated minutes, which is 5/30 = 17% of the
  shortest segment — enough to skip 1-2 stations in a single tick and cause the
  "7 km in 6 seconds" teleport that was reported.

--- JOURNEY CYCLE STATE MACHINE ---

Instead of a hard modulo wraparound (which snapped position back to origin
instantly), the train now progresses through three explicit phases per cycle:

  RUNNING  → train moving station-to-station (elapsed < total_journey_min)
  ARRIVED  → train held at destination for HOLD_REAL_SECONDS real seconds
             (status shows "arrived", speed=0, no position jump)
  RESET    → one-frame transition back to origin, then RUNNING begins again

This means get_live_position_and_state() NEVER returns elapsed going backward
except at the explicit reset frame, and callers receive is_arrived=True during
the hold so the UI can display an "arrived" badge instead of silently discontinuing.
"""

import math
import time
from datetime import datetime

# Simulation speed: 0.4 simulated minutes advance per real second.
#
# DERIVATION (to justify this number):
#   Globally shortest inter-station segment across all mock trains: 15 min
#     (HBJ→BPL on 12002, KJM→BNC on 20608, SC→HYB on 12723, etc.)
#   Target: a 5-second frontend poll must advance < 15% of that segment.
#   Budget: 5s × multiplier < 0.15 × 15min → multiplier < 0.45 sim-min/s
#   Chosen: 0.4 sim-min/s → 5s poll = 2 sim-min = 13.3% of shortest segment ✓
#
# At this speed:
#   1 real second  = 0.4 simulated minutes  (24× real-time acceleration)
#   Shortest segment (15 min) completes in ~38 real seconds
#   Typical Rajdhani route (1040 min) completes in ~43 real minutes per cycle
#   Full Kerala Express route (3260 min) completes in ~136 real minutes
#
# Do NOT increase above 0.45 without rechecking this budget against the
# shortest segment. Poll-skip teleports reappear when any segment advances
# >15% in a single poll.
SIM_SPEED_MULTIPLIER = 0.4  # sim-minutes per real second

# Real-time seconds to hold the train at its destination before restarting.
# 25 real seconds gives a clearly visible "ARRIVED" badge between demo cycles.
HOLD_REAL_SECONDS = 25

# Start time anchor for the simulation clock (module-level, fixed at import time)
_SIM_START = time.time()


def _sim_elapsed_for_train(total_journey_min: int, start_offset_min: int = 0) -> tuple[float, bool]:
    """
    Returns (elapsed_sim_min, is_in_hold_phase) for the current wall-clock time.

    Each train gets a phase offset (`start_offset_min`) so trains that share
    routes don't all appear at the same position simultaneously. The offset
    is seeded into the sim so it doesn't change across requests.

    The state machine:
        cycle_duration_real = total_journey_min / SIM_SPEED_MULTIPLIER + HOLD_REAL_SECONDS
        position_in_cycle   = real_elapsed % cycle_duration_real
        if position_in_cycle < journey_real_seconds → RUNNING (return sim_elapsed)
        else                                        → ARRIVED (return total_journey_min, is_hold=True)
    """
    real_elapsed = time.time() - _SIM_START + (start_offset_min / SIM_SPEED_MULTIPLIER)
    journey_real_seconds = total_journey_min / SIM_SPEED_MULTIPLIER
    cycle_duration_real = journey_real_seconds + HOLD_REAL_SECONDS

    position_in_cycle = real_elapsed % cycle_duration_real

    if position_in_cycle >= journey_real_seconds:
        # ARRIVED / HOLD phase — train is at destination, waiting for next cycle
        return float(total_journey_min), True
    else:
        # RUNNING phase — convert real seconds to simulated minutes
        elapsed_sim = position_in_cycle * SIM_SPEED_MULTIPLIER
        return float(elapsed_sim), False


def get_live_position_and_state(
    stations: list[dict],
    train_number: str = "",
    start_offset_min: int = 0,
) -> tuple[dict, int, int]:
    """
    Computes smooth interpolated GPS coordinates, velocity, and segment metrics.

    Returns: (current_position_dict, effective_elapsed_min, current_station_index)

    Changes from previous version:
      - No more SECONDS_PER_SIM_MINUTE=2 (was 60× speed, caused teleports)
      - No more hard modulo wraparound (caused instant position reset)
      - Journey-cycle state machine: RUNNING → ARRIVED (hold) → RUNNING
      - `start_offset_min` staggers different trains on shared corridors
    """
    if not stations:
        return {
            "lat": 28.6415,
            "lng": 77.2209,
            "speed_kmh": 0,
            "last_updated": datetime.now().strftime("%I:%M:%S %p"),
            "next_station_code": "NDLS",
            "next_station_name": "New Delhi",
            "distance_to_next_km": 0,
        }, 0, 0

    total_journey_min = stations[-1].get("scheduled_offset_min", 1000)
    elapsed_sim, is_arrived = _sim_elapsed_for_train(total_journey_min, start_offset_min)

    # Clamp elapsed to journey bounds (never exceeds total_journey_min)
    effective_elapsed = min(float(elapsed_sim), float(total_journey_min))

    # Determine current station index based on scheduled offset minutes
    current_station_index = 0
    for i, st in enumerate(stations):
        if st.get("scheduled_offset_min", 0) <= effective_elapsed:
            current_station_index = i
        else:
            break

    cur_stn = stations[current_station_index]
    next_index = min(current_station_index + 1, len(stations) - 1)
    next_stn = stations[next_index]

    # Real seconds since sim start (for smooth speed oscillation, unaffected by speed multiplier)
    real_tick = time.time() - _SIM_START

    if is_arrived or current_station_index >= len(stations) - 1:
        # ARRIVED phase — hold at destination, speed = 0
        current_lat = stations[-1]["lat"]
        current_lng = stations[-1]["lng"]
        current_speed = 0
        distance_to_next = 0
        next_stn = stations[-1]  # point "next" at terminus so UI doesn't show wrong station
    else:
        segment_duration = max(1, next_stn.get("scheduled_offset_min", 0) - cur_stn.get("scheduled_offset_min", 0))
        progress_in_segment = min(0.95, max(0.05,
            (effective_elapsed - cur_stn.get("scheduled_offset_min", 0)) / segment_duration
        ))

        current_lat = cur_stn["lat"] + (next_stn["lat"] - cur_stn["lat"]) * progress_in_segment
        current_lng = cur_stn["lng"] + (next_stn["lng"] - cur_stn["lng"]) * progress_in_segment

        # Speed oscillates naturally around 95 km/h; slow sine cycle (period ~12s real)
        # stays visually smooth regardless of poll interval
        current_speed = int(95 + math.sin(real_tick * 0.5) * 18)

        cur_dist = cur_stn.get("distance_km", 0)
        next_dist = next_stn.get("distance_km", 0)
        traveled_in_seg = (next_dist - cur_dist) * progress_in_segment
        distance_to_next = max(1, round(next_dist - (cur_dist + traveled_in_seg)))

    position = {
        "lat": round(current_lat, 4),
        "lng": round(current_lng, 4),
        "speed_kmh": current_speed,
        "last_updated": datetime.now().strftime("%I:%M:%S %p"),
        "next_station_code": next_stn["code"],
        "next_station_name": next_stn["name"],
        "distance_to_next_km": distance_to_next,
    }

    return position, int(effective_elapsed), current_station_index
