import datetime
import uuid

from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.orm import relationship

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    phone_number = Column(String, unique=True, nullable=True, index=True)
    name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="passenger")
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    preferences = relationship("Preference", back_populates="user", cascade="all, delete-orphan")


class Preference(Base):
    """A user's saved/favorited train, for the personalized dashboard."""
    __tablename__ = "preferences"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    train_number = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="preferences")


class Report(Base):
    """A crowdsourced report of a disruption affecting a train/section."""
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=_uuid)
    train_number = Column(String, nullable=False, index=True)
    station_code = Column(String, nullable=True)
    description = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)  # optional, if reporter was OTP-verified
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class OTPCode(Base):
    """
    Short-lived OTP codes for phone verification.

    NOTE: this only prevents trivial spam/bot submissions by requiring
    control of a phone number — it does NOT verify that a report's
    CONTENT is true. Never describe this as "verified accurate" in the
    product or pitch; it's spam prevention, not fact-checking.
    """
    __tablename__ = "otp_codes"

    id = Column(String, primary_key=True, default=_uuid)
    phone_number = Column(String, nullable=False, index=True)
    code_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    verified = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
