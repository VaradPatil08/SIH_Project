# RailPulse // Dynamic ML Train ETA Prediction

RailPulse is an industrial control-room telemetry interface and dynamic machine learning ETA prediction engine for Indian Railways coaching services (Smart India Hackathon 2026).

---

## Project Structure

`	ext
SIH_PredicTrack/
├── backend/                  # FastAPI REST API Service
│   ├── app/
│   │   ├── data/             # Mock dataset (6 Indian Railways coaching trains)
│   │   ├── models/           # Pydantic schemas defining the API contract
│   │   ├── routers/          # API endpoints (/trains, /route, /eta, /reasons)
│   │   ├── services/         # GPS coordinate interpolation & delay prediction
│   │   └── main.py           # FastAPI application entrypoint with CORS
│   └── requirements.txt      # Python backend dependencies
├── frontend/                 # React + Vite + Tailwind UI
│   ├── src/
│   │   ├── components/       # TrainMap (Leaflet), StationTimeline, Navbar, Footer
│   │   ├── pages/            # LandingPage, TrackingPage, AboutPage
│   │   └── services/api.js   # API client with automatic offline fallback
│   ├── DESIGN.md             # Design system specifications (Sora + IBM Plex Sans)
│   └── package.json          # Node dependencies
└── README.md                 # Project documentation
`

---

## Quickstart & Local Development

### 1. Backend Service (FastAPI)

Prerequisites: Python 3.10+

`ash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server with live reload on port 8000
uvicorn app.main:app --reload --port 8000
`

The API will be available at:
- **API Base URL**: http://localhost:8000
- **Interactive Swagger Docs**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc

### 2. Frontend Application (React + Vite)

Prerequisites: Node.js 18+

`ash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
`

The UI will be available at http://localhost:5173.

> [!NOTE]
> rontend/.env.example defaults VITE_API_BASE_URL to http://localhost:8000. To customize the backend URL, copy .env.example to .env and update the value.

---

## API Contract & Resilience

The API contract is shared between ackend/app/models/schemas.py and rontend/src/services/api.js:

| Endpoint | Method | Description |
|---|---|---|
| /trains | GET | Returns list of all demo coaching trains with metadata |
| /trains/{train_number}/route | GET | Returns static station list and GIS lat/lng coordinates |
| /trains/{train_number}/eta | GET | Returns live interpolated position, velocity, and station delay ETAs |
| /trains/{train_number}/eta/{station_code}/reasons | GET | Returns root cause diagnostic reasons for delays |
| /model/metrics | GET | Returns ML architecture validation metrics |

### Offline Resilience Feature

rontend/src/services/api.js includes an automatic client-side synthetic fallback. If the backend is unreachable (e.g. offline during a demo presentation), the frontend automatically generates identical data shapes with smooth simulation drift without crashing or throwing errors.