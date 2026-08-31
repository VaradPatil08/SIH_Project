import pandas as pd
import numpy as np

def assign_train_priority(train_id, train_name=""):
    tid = str(train_id)
    name = str(train_name).upper()
    if any(p in name for p in ["VANDE BHARAT", "RAJDHANI", "SHATABDI", "DURONTO", "GATIMAAN", "TEJAS"]):
        return 3 # Top priority
    elif tid.startswith(('12', '22', '20')):
        return 2 # Superfast
    elif tid.startswith('1'):
        return 1 # Mail / Express
    else:
        return 0 # Passenger / Special

def parse_minutes(time_str):
    try:
        parts = [int(p) for p in str(time_str).strip().split(':')]
        return parts[0] * 60 + parts[1]
    except:
        return 0

def build_ml_features():
    print("Loading cleaned schedule and delay datasets...")
    schedule = pd.read_csv("data/processed/train_schedule_clean.csv", low_memory=False)
    delays = pd.read_csv("data/processed/delays_clean.csv", low_memory=False)
    
    # 1. Standardize types
    schedule['train_id'] = schedule['train_id'].astype(str).str.zfill(5)
    schedule['station_code'] = schedule['station_code'].astype(str).str.upper()
    delays['train_id'] = delays['train_id'].astype(str).str.zfill(5)
    delays['station_code'] = delays['station_code'].astype(str).str.upper()
    
    # 2. Merge Schedule with Delays
    merged = pd.merge(
        schedule, 
        delays[['train_id', 'station_code', 'average_delay_minutes', 'pct_right_time', 'pct_slight_delay', 'pct_significant_delay', 'pct_cancelled_unknown']], 
        on=['train_id', 'station_code'], 
        how='inner' # Inner join provides high-quality ground-truth rows
    )
    
    if merged.empty:
        print("Warning: Inner join empty, trying left join with fallback matching...")
        merged = pd.merge(
            schedule, 
            delays[['train_id', 'station_code', 'average_delay_minutes', 'pct_right_time', 'pct_slight_delay', 'pct_significant_delay', 'pct_cancelled_unknown']], 
            on=['train_id', 'station_code'], 
            how='left'
        )
        merged['average_delay_minutes'] = merged['average_delay_minutes'].fillna(5.0)
        merged['pct_right_time'] = merged['pct_right_time'].fillna(80.0)
        merged['pct_slight_delay'] = merged['pct_slight_delay'].fillna(15.0)
        merged['pct_significant_delay'] = merged['pct_significant_delay'].fillna(5.0)
        merged['pct_cancelled_unknown'] = merged['pct_cancelled_unknown'].fillna(0.0)

    # 3. Sort strictly by train and sequence
    merged['seq_no'] = pd.to_numeric(merged['seq_no'], errors='coerce').fillna(0)
    merged = merged.sort_values(by=['train_id', 'seq_no']).reset_index(drop=True)
    
    print("Engineering ML features...")
    # Train Priority
    merged['train_priority'] = merged.apply(lambda r: assign_train_priority(r['train_id'], r.get('train_name', '')), axis=1)
    
    # Progress & Remaining Metrics
    max_seq = merged.groupby('train_id')['seq_no'].transform('max')
    total_dist = merged.groupby('train_id')['distance_km'].transform('max')
    
    merged['total_stops'] = max_seq
    merged['remaining_stops'] = max_seq - merged['seq_no']
    merged['remaining_distance_km'] = (total_dist - merged['distance_km']).clip(lower=0)
    merged['pct_journey_completed'] = (merged['distance_km'] / total_dist.replace(0, 1)).clip(0, 1)
    
    # Scheduled Halt Duration
    if 'scheduled_arrival' in merged.columns and 'scheduled_departure' in merged.columns:
        merged['arr_min'] = merged['scheduled_arrival'].apply(parse_minutes)
        merged['dep_min'] = merged['scheduled_departure'].apply(parse_minutes)
        merged['scheduled_halt_duration_min'] = (merged['dep_min'] - merged['arr_min']).apply(lambda x: max(0, x))
    else:
        merged['scheduled_halt_duration_min'] = 2.0
    
    # Lag Features (Delay at previous 2 stations along the route)
    merged['hist_delay_lag1'] = merged.groupby('train_id')['average_delay_minutes'].shift(1).fillna(0.0)
    merged['hist_delay_lag2'] = merged.groupby('train_id')['average_delay_minutes'].shift(2).fillna(0.0)
    
    # Section Delay Gradient (Rate of delay increase/recovery)
    merged['section_delay_gradient'] = merged['average_delay_minutes'] - merged['hist_delay_lag1']
    
    # Station Congestion Stress Index
    station_stress = merged.groupby('station_code')['average_delay_minutes'].transform('mean').fillna(0.0)
    merged['station_congestion_index'] = station_stress.round(2)
    
    # Target Variables for ML Model (Person B)
    merged['target_next_station_delay'] = merged.groupby('train_id')['average_delay_minutes'].shift(-1)
    merged['target_dest_delay'] = merged.groupby('train_id')['average_delay_minutes'].transform('last')
    
    # Drop final destination rows (where next station delay is NaN)
    ml_train_df = merged.dropna(subset=['target_next_station_delay']).reset_index(drop=True)
    
    out_csv = "data/processed/ml_training_data.csv"
    ml_train_df.to_csv(out_csv, index=False)
    
    print(f"\n ML Training Data created successfully: {out_csv}")
    print(f"Total Rows: {len(ml_train_df)} | Total Columns: {len(ml_train_df.columns)}")
    print("\nFeature Columns generated:")
    print(list(ml_train_df.columns))

if __name__ == "__main__":
    build_ml_features()