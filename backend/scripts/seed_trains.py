"""
Seed script — expands data/mock_trains.json using a public Indian
Railways dataset.

WHY A SCRIPT, NOT A LIVE FETCH: scraping IRCTC/NTES on demand is
fragile (CAPTCHAs, layout changes, ToS issues) and risks breaking your
live demo. Instead, download a static dataset once and run this script
to pre-populate your database — same end result (a large train list),
none of the live-fetch risk.

WHERE TO GET THE DATA (pick one):
  1. data.gov.in — search "Indian Railways" for official train/schedule
     datasets published by the Ministry of Railways.
  2. Kaggle — search "Indian Railways trains dataset" or
     "IRCTC train schedule". Several well-maintained CSVs exist with
     train number, name, source/destination station codes, and
     sometimes full station-wise schedules.

EXPECTED INPUT CSV COLUMNS (adjust the column-name mapping below to
match whatever dataset you download — they vary):
  train_number, train_name, source_station_code, source_station_name,
  destination_station_code, destination_station_name

If your chosen dataset also includes full station-by-station schedules
(station code, arrival/departure time, distance), extend
`build_station_list()` below to parse those instead of the
single-source/destination fallback this script uses by default.

USAGE:
  python scripts/seed_trains.py path/to/downloaded_trains.csv
"""

import csv
import json
import os
import sys

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "app", "data", "mock_trains.json")

# Minimal known coordinates for common junction stations, used as a
# fallback when the dataset doesn't include lat/lng. Extend this as
# needed, or better: use a dataset that already includes station
# coordinates (e.g. join against a stations-master CSV that has them).
KNOWN_STATION_COORDS = {
    "NDLS": (28.6431, 77.2197), "HWH": (22.5839, 88.3428),
    "MMCT": (18.9696, 72.8194), "MAS": (13.0827, 80.2707),
    "SBC": (12.9762, 77.5993), "ADI": (23.0225, 72.5714),
    "PUNE": (18.5286, 73.8744), "PNBE": (25.6093, 85.1414),
    "BZA": (16.5062, 80.6480), "BBS": (20.2678, 85.8316),
}


def build_station_list(row: dict) -> list[dict]:
    """
    Fallback: builds a 2-station route (source -> destination) when the
    dataset only has origin/destination, not a full schedule. Real
    schedule data (if your CSV has it) should replace this with the
    actual intermediate stations.
    """
    src_code = row["source_station_code"].strip()
    dst_code = row["destination_station_code"].strip()

    src_lat, src_lng = KNOWN_STATION_COORDS.get(src_code, (0.0, 0.0))
    dst_lat, dst_lng = KNOWN_STATION_COORDS.get(dst_code, (0.0, 0.0))

    return [
        {
            "code": src_code,
            "name": row["source_station_name"].strip(),
            "lat": src_lat,
            "lng": src_lng,
            "scheduled_offset_min": 0,
            "distance_km": 0,
        },
        {
            "code": dst_code,
            "name": row["destination_station_name"].strip(),
            "lat": dst_lat,
            "lng": dst_lng,
            # Placeholder — replace with real duration if your dataset
            # has it. This default is intentionally obviously-wrong
            # (24h) so it's easy to spot any train that fell through
            # to this fallback rather than getting real schedule data.
            "scheduled_offset_min": 1440,
            "distance_km": 0,
        },
    ]


def main(csv_path: str):
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    trains = {}
    skipped = 0
    for row in rows:
        try:
            train_number = row["train_number"].strip()
            trains[train_number] = {
                "train_number": train_number,
                "name": row["train_name"].strip(),
                "stations": build_station_list(row),
            }
        except (KeyError, AttributeError):
            skipped += 1
            continue

    with open(OUTPUT_PATH, "w") as f:
        json.dump(trains, f, indent=2)

    print(f"Seeded {len(trains)} trains to {OUTPUT_PATH} ({skipped} rows skipped due to missing columns).")
    print("Reminder: verify column names in KNOWN_STATION_COORDS / build_station_list")
    print("match your actual downloaded CSV before trusting this output.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/seed_trains.py path/to/trains.csv")
        sys.exit(1)
    main(sys.argv[1])
