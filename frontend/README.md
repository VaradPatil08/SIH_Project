# 🚆 RailPulse — Dynamic ML Train ETA Prediction

> **Smart India Hackathon (SIH)** Prototype for Dynamic ETA Prediction & Telemetry for Indian Coaching Trains.

RailPulse is a dynamic ETA prediction platform designed to eliminate static timetable assumptions across the Indian Railways network. By modeling section-level track occupancy, junction precedence, and cascade delay propagation, RailPulse gives commuters and railway controllers real-time predictive arrival times and root-cause explanations for delays.

---

## 🌟 Key Features

1. **Live Train Search & Directory** (`/`)
   - Instant search by train number (e.g. `12951`, `22436`) or route/name (`Rajdhani`, `Vande Bharat`, `Shatabdi`).
   - Quick-access chips for major high-priority express routes.
   - Live telemetry status badges and feature highlights.

2. **Real-Time Dynamic Tracking Dashboard** (`/train/:trainNumber`)
   - **Continuous Polling**: Polls live telemetry every 6 seconds with an animated countdown ticker and manual refresh option.
   - **Interactive Leaflet Route Map**: Renders full track GIS coordinates, completed vs. remaining track line styling, station pins, and an animated train locomotive pulse marker.
   - **Dynamic Station Timeline**: Vertical track timeline showing scheduled timetable times vs dynamic ML-predicted ETAs with color-coded delay status badges (`On Time`, `Delayed`, `Reached`).
   - **Expandable ML Root-Cause Diagnostics**: Clicking any delayed station triggers `GET /trains/:trainNumber/eta/:stationCode/reasons` to reveal why the delay occurred (platform congestion, OHE maintenance, speed restriction, freight rake clearance).

3. **Methodology & Hackathon Transparency** (`/about`)
   - Complete technical breakdown of the Gradient Boosted ML pipeline.
   - Clear disclosure of live REST endpoints vs simulated section occupancy feeds for offline evaluation.

---

## 🎨 Visual Identity & UX

- **Heritage Blue & Indian Railways Enamel Plaque**: Evoking classic ICF blue, Vande Bharat navy tones, and the iconic yellow platform station signs.
- **Micro-Interactions**: Framer Motion entrance animations, staggered station list reveals, and animated delay badges.
- **Accessibility**: High contrast ratios, visible keyboard focus indicators (`focus-visible:ring-2`), and full `prefers-reduced-motion` compliance.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
By default, RailPulse connects to `http://localhost:8000`. You can customize this by creating a `.env` file:
```bash
cp .env.example .env
```
Contents of `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```

---

## 🔌 API Contract Reference

The frontend expects the following endpoints from the FastAPI backend at `http://localhost:8000`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/trains` | List of coaching trains `{ train_number, name, origin, destination }` |
| `GET` | `/trains/{train_number}/route` | Route coordinates and stations |
| `GET` | `/trains/{train_number}/eta` | Live dynamic predictions, current GPS position, and delay minutes |
| `GET` | `/trains/{train_number}/eta/{station_code}/reasons` | Root cause diagnostics for delayed halts |

> **Offline Fallback Guarantee**: If the FastAPI backend is not running, the frontend automatically activates a high-fidelity synthetic simulation with realistic Indian Railways routes (12951 Mumbai Rajdhani, 22436 Vande Bharat, 12009 Shatabdi, 12301 Howrah Rajdhani), ensuring 100% demo continuity during presentations.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons
- **Mapping & GIS**: Leaflet, React-Leaflet
- **Routing**: React Router v6
- **Backend API**: FastAPI (REST)