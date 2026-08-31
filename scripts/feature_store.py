import pandas as pd
import numpy as np

class TrainFeatureStore:
    def __init__(self, data_path="data/processed/ml_training_data.csv"):
        print("Initializing Feature Store...")
        self.df = pd.read_csv(data_path, low_memory=False)
        self.df['train_id'] = self.df['train_id'].astype(str).str.zfill(5)
        self.df['station_code'] = self.df['station_code'].astype(str).str.upper()
        
    def get_features_for_station(self, train_id, current_station, live_delay_min=0, weather="CLEAR", signal="GREEN"):
        """
        Extracts all static, historical, and dynamic features for a given live ping.
        Returns a single-row DataFrame ready for model.predict()
        """
        tid = str(train_id).zfill(5)
        stn = str(current_station).upper()
        
        row = self.df[(self.df['train_id'] == tid) & (self.df['station_code'] == stn)]
        
        if row.empty:
            # Fallback if specific station not in dataset
            row = self.df[self.df['train_id'] == tid].head(1)
            if row.empty:
                row = self.df.head(1)
                
        feat = row.iloc[0].to_dict()
        
        # Override with dynamic real-time inputs
        feat['current_live_delay_min'] = float(live_delay_min)
        feat['is_foggy'] = 1 if "FOG" in weather.upper() else 0
        feat['is_red_signal'] = 1 if "RED" in signal.upper() else 0
        
        # Convert to single-row DataFrame
        return pd.DataFrame([feat])

if __name__ == "__main__":
    fs = TrainFeatureStore()
    sample = fs.get_features_for_station(train_id="12673", current_station="AJJ", live_delay_min=15)
    print(" Live Feature Vector Created:")
    print(sample[['train_id', 'station_code', 'train_priority', 'remaining_distance_km', 'average_delay_minutes', 'station_congestion_index']])