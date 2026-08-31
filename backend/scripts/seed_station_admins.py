"""
Seed script — creates or updates demo station_admin users with hashed passwords
for the hackathon demo.

USAGE:
  python scripts/seed_station_admins.py
  (or python backend/scripts/seed_station_admins.py)
"""

import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db import init_db, SessionLocal
from app.models_db import User
from app.services.auth_service import hash_password

DEMO_ADMINS = [
    {
        "username": "admin_ndls",
        "name": "Station Controller NDLS",
        "password": "railpulse@admin2026",
        "role": "station_admin",
    },
    {
        "username": "station_admin",
        "name": "Senior Station Master",
        "password": "adminpassword123",
        "role": "station_admin",
    },
]


def seed_station_admins():
    # Ensure all tables are created and columns migrated
    init_db()

    db = SessionLocal()
    try:
        print("=" * 65)
        print("  RailPulse — Station Admin Demo Credentials Provisioning")
        print("=" * 65)

        for admin_data in DEMO_ADMINS:
            username = admin_data["username"]
            plain_pass = admin_data["password"]
            name = admin_data["name"]
            role = admin_data["role"]

            hashed = hash_password(plain_pass)

            # Look for existing user by phone_number (which stores username/emp-id) or name
            existing = (
                db.query(User)
                .filter(
                    (User.phone_number == username) | (User.name == name)
                )
                .first()
            )

            if existing:
                existing.phone_number = username
                existing.name = name
                existing.role = role
                existing.password_hash = hashed
                db.commit()
                db.refresh(existing)
                print(f"[UPDATED] Station Admin: {username} ({name})")
            else:
                user = User(
                    phone_number=username,
                    name=name,
                    role=role,
                    password_hash=hashed,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"[CREATED] Station Admin: {username} ({name})")

            print(f"   -> Username / Employee ID : {username}")
            print(f"   -> Password               : {plain_pass}")
            print(f"   -> Role                   : {role}")
            print("-" * 65)

        print("\n[SUCCESS] Demo station_admin accounts provisioned successfully.")
        print("You can now log in via the Station Admin Login modal using these credentials.\n")

    finally:
        db.close()


if __name__ == "__main__":
    seed_station_admins()
