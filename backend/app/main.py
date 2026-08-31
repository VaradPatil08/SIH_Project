from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import trains, auth, preferences, reports, pnr, admin
from app.db import init_db
import app.models_db  # noqa: F401

# Create database tables and apply migrations
init_db()

app = FastAPI(
    title="RailPulse API",
    description="Dynamic ETA prediction for Indian coaching trains — SIH project",
    version="0.1.0",
)

# Wide-open CORS for hackathon dev speed. Tighten before final deployment
# (restrict allow_origins to your deployed frontend URL).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trains.router)
app.include_router(auth.router)
app.include_router(preferences.router)
app.include_router(reports.router)
app.include_router(pnr.router)
app.include_router(admin.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "RailPulse API"}

