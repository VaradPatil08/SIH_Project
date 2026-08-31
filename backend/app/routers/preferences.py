from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.auth_schemas import PreferenceIn, PreferenceOut, UserOut
from app.models_db import Preference, User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/users/me", tags=["preferences"])


@router.get("", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/preferences", response_model=list[PreferenceOut])
def list_preferences(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(Preference)
        .filter(Preference.user_id == current_user.id)
        .order_by(Preference.created_at.desc())
        .all()
    )


@router.post("/preferences", response_model=PreferenceOut)
def add_preference(
    payload: PreferenceIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Preference)
        .filter(
            Preference.user_id == current_user.id,
            Preference.train_number == payload.train_number,
        )
        .first()
    )
    if existing:
        return existing

    pref = Preference(user_id=current_user.id, train_number=payload.train_number)
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


@router.delete("/preferences/{train_number}")
def remove_preference(
    train_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = (
        db.query(Preference)
        .filter(
            Preference.user_id == current_user.id,
            Preference.train_number == train_number,
        )
        .first()
    )
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")

    db.delete(pref)
    db.commit()
    return {"message": "Removed"}
