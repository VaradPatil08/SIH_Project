import time
import json
import random
import pandas as pd

def simulate_live_train(train_id="12673", delay_injection_min=5, interval_sec=1.5):
    """
    Simulates real-time telemetry stream for a train running across its stations.
    Emits JSON packets with GPS progress, speed, weather, signal aspects, and dynamic delay.
    """
    df = pd.read_csv("data/processed/ml_training_data.csv")
    df['train_id'] = df['train_id'].astype(str).str.zfill(5)
    
    route = df[df['train_id'] == str(train_id).zfill(5)].sort_values('seq_no')
    
    if route.empty:
        train_id = df['train_id'].iloc[0]
        route = df[df['train_id'] == train_id].sort_values('seq_no')
        
    print("=" * 65)
    print(f" LIVE TELEMETRY SIMULATION STREAM - TRAIN #{train_id}")
    print(f" Route: {route['station_code'].iloc[0]} -> {route['station_code'].iloc[-1]} ({len(route)} stations)")
    print("=" * 65 + "\n")
    
    current_delay = delay_injection_min
    
    for idx, station in route.iterrows():
        # 1. Randomly simulate real-world events
        weather = random.choices(["CLEAR", "FOGGY_LOW_VISIBILITY", "HEAVY_RAIN"], weights=[0.80, 0.12, 0.08])[0]
        signal = random.choices(["GREEN", "DOUBLE_YELLOW", "RED_OVERTAKE_HALT"], weights=[0.82, 0.13, 0.05])[0]
        
        # 2. Dynamic Delay & Speed Logic
        if signal == "RED_OVERTAKE_HALT":
            halt_penalty = random.randint(10, 25)
            current_delay += halt_penalty
            speed_kmh = 0
            status_desc = f"⚠️ Halted at signal for high-priority train overtake (+{halt_penalty}m)"
        elif weather == "FOGGY_LOW_VISIBILITY":
            fog_delay = random.randint(3, 8)
            current_delay += fog_delay
            speed_kmh = random.randint(45, 60)
            status_desc = "🌫️ Speed restriction active due to dense fog"
        else:
            recovery = random.randint(0, 3)
            current_delay = max(0, current_delay - recovery)
            speed_kmh = random.randint(95, 130)
            status_desc = " Normal running conditions"
            
        # 3. Form telemetry packet (Ready for API / Model consumption)
        telemetry_packet = {
            "timestamp": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
            "train_id": train_id,
            "train_name": station.get('train_name', 'Superfast Express'),
            "current_station": station['station_code'],
            "seq_no": int(station['seq_no']),
            "distance_covered_km": float(station['distance_km']),
            "remaining_distance_km": float(station['remaining_distance_km']),
            "current_speed_kmh": speed_kmh,
            "signal_aspect": signal,
            "weather_condition": weather,
            "current_live_delay_min": current_delay,
            "historical_expected_delay_min": float(station['average_delay_minutes']),
            "high_delay_risk_pct": float(station['pct_significant_delay']),
            "status_message": status_desc
        }
        
        print(json.dumps(telemetry_packet, indent=2))
        print("-" * 65)
        time.sleep(interval_sec)

if __name__ == "__main__":
    simulate_live_train(train_id="12673", delay_injection_min=4, interval_sec=1.2)