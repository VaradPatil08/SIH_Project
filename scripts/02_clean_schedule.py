"""
Step 2: Load & clean the real train schedule (data.gov.in timetable).

Goal: turn train_schedule.csv into two clean tables matching our
locked schema field names:
  - stations.csv        (station_code, station_name)
  - train_schedule.csv  (train_id, train_name, seq_no, station_code,
                          scheduled_arrival, scheduled_departure,
                          distance_km)

These will be the backbone the Step 4 simulator walks through.
"""

import pandas as pd

RAW_PATH = "data/raw/train_schedule.csv"
OUT_STATIONS = "data/processed/stations.csv"
OUT_SCHEDULE = "data/processed/train_schedule_clean.csv"


def load_raw(path):
    df = pd.read_csv(path)
    print("Raw columns found:", list(df.columns))
    return df


def standardize_columns(df):
    """
    Rename raw columns to our locked schema names.
    NOTE: adjust the left-hand keys below if your actual header names
    differ slightly (e.g. extra spaces) -- the print in load_raw() will
    show you the exact raw names to match.
    """
    rename_map = {
        "Train No": "train_id",
        "Train Name": "train_name",
        "SEQ": "seq_no",
        "Station Code": "station_code",
        "Station Name": "station_name",
        "Arrival time": "scheduled_arrival",
        "Departure Time": "scheduled_departure",
        "Distance": "distance_km",
        "Source Station": "source_station_code",
        "Source Station Name": "source_station_name",
        "Destination Station": "destination_station_code",
        "Destination Station Name": "destination_station_name",
    }
    df = df.rename(columns=rename_map)
    return df


def clean_schedule(df):
    df = df.copy()

    df["train_id"] = df["train_id"].astype(str).str.strip()
    df["station_code"] = df["station_code"].astype(str).str.strip().str.upper()

    # Convert distance to numeric -- gov.in exports sometimes have this as
    # text with stray spaces/commas. Force numeric, invalid values -> NaN.
    df["distance_km"] = pd.to_numeric(
        df["distance_km"].astype(str).str.replace(",", "").str.strip(),
        errors="coerce"
    )
    n_bad_distance = df["distance_km"].isnull().sum()
    if n_bad_distance > 0:
        print(f"WARNING: {n_bad_distance} rows had non-numeric distance values, "
              f"set to NaN -- inspect these rows.")

    before = len(df)
    df = df.drop_duplicates()
    print(f"Dropped {before - len(df)} exact duplicate rows")

    df = df.sort_values(["train_id", "seq_no"]).reset_index(drop=True)

    bad = df.groupby("train_id")["distance_km"].apply(
        lambda s: (s.diff().fillna(0) < 0).any()
    )
    n_bad = bad.sum()
    if n_bad > 0:
        print(f"WARNING: {n_bad} trains have non-increasing distance sequences "
              f"-- inspect these before trusting distance_to_next_km downstream.")

    return df

def build_stations_table(df):
    stations = (
        df[["station_code", "station_name"]]
        .drop_duplicates(subset="station_code")
        .sort_values("station_code")
        .reset_index(drop=True)
    )
    return stations


def main():
    df = load_raw(RAW_PATH)
    df = standardize_columns(df)
    df = clean_schedule(df)

    stations = build_stations_table(df)

    schedule_out = df[
        ["train_id", "train_name", "seq_no", "station_code",
         "scheduled_arrival", "scheduled_departure", "distance_km"]
    ]

    stations.to_csv(OUT_STATIONS, index=False)
    schedule_out.to_csv(OUT_SCHEDULE, index=False)

    print(f"\nSaved {OUT_STATIONS} ({len(stations)} unique stations)")
    print(f"Saved {OUT_SCHEDULE} ({len(schedule_out)} rows, "
          f"{schedule_out['train_id'].nunique()} unique trains)")
    print("\nSample schedule rows:")
    print(schedule_out.head())


if __name__ == "__main__":
    main()