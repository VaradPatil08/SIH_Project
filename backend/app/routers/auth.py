from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.auth_schemas import (
    OTPRequestIn,
    OTPRequestOut,
    OTPVerifyIn,
    TokenOut,
    AdminLoginIn,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp/request", response_model=OTPRequestOut)
def request_otp(payload: OTPRequestIn, db: Session = Depends(get_db)):
    """
    Sends (or in dev mode, returns) a 6-digit OTP for the given phone
    number. Used for both login and to lightly gate crowdsourced report
    submission against spam/bots.
    """
    code = auth_service.request_otp(payload.phone_number, db)
    return OTPRequestOut(
        message="OTP sent." if code is None else "DEV_MODE: OTP generated (see dev_otp field).",
        dev_otp=code,
    )


@router.post("/otp/verify", response_model=TokenOut)
def verify_otp(payload: OTPVerifyIn, db: Session = Depends(get_db)):
    """Verifies an OTP, creating the user on first login, and returns a JWT."""
    user = auth_service.verify_otp(payload.phone_number, payload.code, db)

    if payload.name and not user.name:
        user.name = payload.name
        db.commit()

    token = auth_service.create_access_token(user.id, role=user.role)
    return TokenOut(access_token=token, user_id=user.id)


@router.post("/admin/login", response_model=TokenOut)
def admin_login(payload: AdminLoginIn, db: Session = Depends(get_db)):
    """
    Verifies pre-provisioned station-admin credentials (username/employee_id + password)
    and returns a JWT token. No self-registration endpoint is provided.
    """
    user = auth_service.authenticate_admin(payload.username, payload.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_service.create_access_token(user.id, role=user.role)
    return TokenOut(access_token=token, user_id=user.id)
