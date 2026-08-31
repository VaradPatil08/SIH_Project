import os
import datetime
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db import Base, get_db
from app.models_db import TrainLiveCache, ApiQuotaUsage
from app.services import quota_guard, railradar_client, railradar_interpolation

TEST_DB_URL = "sqlite:///./test_railradar.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def setup_function():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    db.query(TrainLiveCache).delete()
    db.query(ApiQuotaUsage).delete()
    db.commit()
    db.close()


def teardown_module():
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("test_railradar.db"):
        try:
            os.remove("test_railradar.db")
        except Exception:
            pass


def test_interpolation_departed_segment():
    mock_stations = [
        {"code": "INDB", "name": "Indore", "lat": 22.7196, "lng": 75.8577, "distance_km": 0},
        {"code": "UJN", "name": "Ujjain", "lat": 23.1765, "lng": 75.7885, "distance_km": 55},
    ]
    data = {
        "currentLocation": {
            "stationCode": "UJN",
            "status": "departed",
            "segmentProgress": 0.5,
            "speedKmh": 70.0,
            "bearingDegrees": 180.0,
        },
        "previousHalt": {"stationCode": "INDB"},
        "nextHalt": {"stationCode": "UJN"},
    }
    result = railradar_interpolation.interpolate_railradar_position(data, mock_stations)
    assert result is not None
    assert result["source"] == "railradar"
    assert result["speed_kmh"] == 70.0
    assert result["bearing_degrees"] == 180.0
    assert result["next_station_code"] == "UJN"
    assert abs(result["lat"] - 22.9481) < 0.001
    assert result["distance_to_next_km"] == 27.5


def test_interpolation_halted_state():
    mock_stations = [
        {"code": "INDB", "name": "Indore", "lat": 22.7196, "lng": 75.8577, "distance_km": 0},
        {"code": "UJN", "name": "Ujjain", "lat": 23.1765, "lng": 75.7885, "distance_km": 55},
    ]
    data = {
        "currentLocation": {
            "stationCode": "UJN",
            "status": "arrived",
            "speedKmh": 0.0,
            "bearingDegrees": None,
        },
        "previousHalt": {"stationCode": "INDB"},
        "nextHalt": {"stationCode": "UJN"},
    }
    result = railradar_interpolation.interpolate_railradar_position(data, mock_stations)
    assert result is not None
    assert result["lat"] == 23.1765
    assert result["lng"] == 75.7885
    assert result["speed_kmh"] == 0.0
    assert result["distance_to_next_km"] == 0.0


def test_interpolation_unmapped_stations():
    mock_stations = [
        {"code": "NDLS", "name": "New Delhi", "lat": 28.6415, "lng": 77.2209, "distance_km": 0},
    ]
    data = {
        "currentLocation": {"status": "departed", "segmentProgress": 0.5},
        "previousHalt": {"stationCode": "UNKNOWN1"},
        "nextHalt": {"stationCode": "UNKNOWN2"},
    }
    result = railradar_interpolation.interpolate_railradar_position(data, mock_stations)
    assert result is None


def test_quota_guard_budget_check():
    db = TestingSessionLocal()
    month_key = quota_guard.get_current_month_key()

    assert quota_guard.has_budget(db) is True

    # Exhaust budget
    usage = ApiQuotaUsage(provider="railradar", month_key=month_key, request_count=950)
    db.add(usage)
    db.commit()

    assert quota_guard.has_budget(db) is False
    db.close()


def test_sync_with_mocked_railradar_success_and_ttl_caching():
    db = TestingSessionLocal()
    month_key = quota_guard.get_current_month_key()

    mock_railradar_data = {
        "trainNumber": "12951",
        "lastUpdatedAt": "2026-06-22T07:14:00+05:30",
        "status": "running",
        "currentLocation": {
            "stationCode": "ST",
            "status": "departed",
            "segmentProgress": 0.4,
            "speedKmh": 82.5,
            "bearingDegrees": 195.0,
        },
        "previousHalt": {"stationCode": "BVI"},
        "nextHalt": {"stationCode": "ST"},
    }

    # 1. First sync call: mock railradar_client.fetch_live or mock httpx request inside railradar_client
    with patch("app.services.railradar_client.RAILRADAR_API_KEY", "rr_live_test_key"), \
         patch("app.services.railradar_client.httpx.Client") as mock_client_cls:
        
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True, "data": mock_railradar_data}
        mock_client.get.return_value = mock_response
        mock_client_cls.return_value.__enter__.return_value = mock_client

        res1 = client.post("/trains/12951/live/sync")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["source"] == "railradar"
        assert data1["speed_kmh"] == 82.5
        assert data1["bearing_degrees"] == 195.0
        assert data1["next_station_code"] == "ST"

        # Verify quota count is 1
        usage = db.query(ApiQuotaUsage).filter_by(provider="railradar", month_key=month_key).first()
        assert usage is not None
        assert usage.request_count == 1

        # 2. Second sync call within TTL: should hit cache, NO outbound call, quota stays 1
        mock_client.get.reset_mock()
        res2 = client.post("/trains/12951/live/sync")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["source"] == "railradar"
        assert data2["synced_at"] == data1["synced_at"]
        mock_client.get.assert_not_called()

        db.expire_all()
        usage_after = db.query(ApiQuotaUsage).filter_by(provider="railradar", month_key=month_key).first()
        assert usage_after.request_count == 1

    # 3. 6s ETA Polling endpoint should read from cache with source='railradar'
    eta_res = client.get("/trains/12951/eta")
    assert eta_res.status_code == 200
    eta_data = eta_res.json()
    assert "current_position" in eta_data
    pos = eta_data["current_position"]
    assert pos["source"] == "railradar"
    assert pos["speed_kmh"] == 82.5
    assert pos["bearing_degrees"] == 195.0
    assert pos["next_station_code"] == "ST"

    db.close()


def test_sync_exhausted_budget_degrades_silently():
    db = TestingSessionLocal()
    month_key = quota_guard.get_current_month_key()

    # Exhaust budget
    usage = ApiQuotaUsage(provider="railradar", month_key=month_key, request_count=980)
    db.add(usage)
    db.commit()

    with patch("app.services.railradar_client.httpx.Client") as mock_client_cls:
        res = client.post("/trains/12951/live/sync")
        assert res.status_code == 200
        data = res.json()
        assert data["source"] == "simulated"
        mock_client_cls.assert_not_called()

    db.close()


def test_sync_network_failure_degrades_to_simulator():
    with patch("app.services.railradar_client.RAILRADAR_API_KEY", "rr_live_test_key"), \
         patch("app.services.railradar_client.httpx.Client", side_effect=Exception("Network connection refused")):
        res = client.post("/trains/12951/live/sync")
        assert res.status_code == 200
        data = res.json()
        assert data["source"] == "simulated"
        assert "lat" in data
        assert "lng" in data

