"""
Pydantic schemas — this file defines the API contract between frontend and backend.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Union


class Station(BaseModel):
    code: str            # e.g. "MMCT"
    name: str            # e.g. "Mumbai Central"
    lat: float
    lng: float
    scheduled_offset_min: int = 0
    distance_km: float = 0.0


class StationETA(Station):
    predicted_delay_min: int = 0
    predicted_offset_min: int = 0
    status: str = "on_time"   # "reached" | "on_time" | "delayed"
    platform: int = 1
    top_delay_factors: List[str] = []


class TrainSummary(BaseModel):
    train_number: str
    name: str
    origin: str
    destination: str
    type: Optional[str] = None
    zone: Optional[str] = None
    scheduled_departure: Optional[str] = None
    total_distance_km: Optional[int] = None
    train_name: Optional[str] = None
    featured: Optional[bool] = False


class CurrentPosition(BaseModel):
    lat: float
    lng: float
    speed_kmh: Union[int, float]
    last_updated: str
    next_station_code: str
    next_station_name: str
    distance_to_next_km: Union[int, float]
    bearing_degrees: Optional[float] = None
    synced_at: Optional[str] = None
    source: str = "simulated"  # "simulated" | "railradar"


class LiveSyncResponse(BaseModel):
    train_number: str
    lat: float
    lng: float
    speed_kmh: float
    bearing_degrees: Optional[float] = None
    next_station_code: Optional[str] = None
    next_station_name: Optional[str] = None
    distance_to_next_km: Optional[float] = None
    source: str = "simulated"  # "railradar" | "simulated"
    synced_at: str


class TrainETAResponse(BaseModel):
    train_number: str
    name: str
    current_position: CurrentPosition
    elapsed_min: int
    stations: List[StationETA]
    is_mock: bool = False


class TrainRouteResponse(BaseModel):
    train_number: str
    name: str
    stations: List[Station]


class DelayReasonsResponse(BaseModel):
    reasons: List[str] = []


class ModelMetrics(BaseModel):
    mae_minutes: float
    trained_on_records: int
    last_trained: str


class StationPickerItem(BaseModel):
    code: str
    name: str


class StationArrivalItem(BaseModel):
    train_number: str
    train_name: str
    platform: int
    scheduled_arrival_offset_min: int
    predicted_delay_min: int
    predicted_arrival_offset_min: int
    halt_min: int
    status: str
    direction: str
