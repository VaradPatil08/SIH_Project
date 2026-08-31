import pandas as pd
import numpy as np

def clean_delays():
    raw_path = "data/raw/etrain_delays.csv"
    out_path = "data/processed/delays_clean.csv"
    
    print(f"Reading {raw_path}...")
    df = pd.read_csv(raw_path, low_memory=False)
    
    # 1. Standardize column names
    df.columns = [c.strip().lower() for c in df.columns]
    
    # 2. Standardize train_id (5-digit padded string)
    df['train_id'] = df['train_number'].astype(str).str.strip().str.zfill(5)
    df['station_code'] = df['station_code'].astype(str).str.strip().str.upper()
    
    # 3. Clean numeric delay metrics
    numeric_cols = [
        'average_delay_minutes', 
        'pct_right_time', 
        'pct_slight_delay', 
        'pct_significant_delay', 
        'pct_cancelled_unknown'
    ]
    
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
    # 4. Fill missing average_delay_minutes along the train route
    df['average_delay_minutes'] = df.groupby('train_id')['average_delay_minutes'].transform(
        lambda group: group.interpolate().ffill().bfill()
    ).fillna(0.0)
    
    for col in ['pct_right_time', 'pct_slight_delay', 'pct_significant_delay', 'pct_cancelled_unknown']:
        if col in df.columns:
            df[col] = df[col].fillna(0.0)
        
    # 5. Select clean columns & drop duplicates
    clean_df = df[[
        'train_id', 
        'train_name', 
        'station_code', 
        'station_name',
        'average_delay_minutes',
        'pct_right_time',
        'pct_slight_delay',
        'pct_significant_delay',
        'pct_cancelled_unknown'
    ]].copy()
    
    clean_df = clean_df.drop_duplicates(subset=['train_id', 'station_code']).reset_index(drop=True)
    clean_df.to_csv(out_path, index=False)
    
    print(f" Cleaned delays saved to {out_path} ({len(clean_df)} records, {clean_df['train_id'].nunique()} unique trains)")
    print("\nSample cleaned delay records:")
    print(clean_df.head())

if __name__ == "__main__":
    clean_delays()