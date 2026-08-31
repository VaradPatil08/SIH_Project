import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.auth_schemas import ReportIn, ReportOut, ReportSummaryOut
from app.models_db import Report, User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/trains", tags=["reports"])

# If this many reports land for a train within FLAG_WINDOW_HOURS, show
# it as a flagged/reported disruption on the frontend. Tune these during
# testing — with a small user base, 3 is a reasonable starting bar.
FLAG_THRESHOLD = 3
FLAG_WINDOW_HOURS = 3


@router.post("/{train_number}/reports", response_model=ReportOut)
def submit_report(
    train_number: str,
    payload: ReportIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a crowdsourced disruption report for a train.
    Requires authentication via JWT token (must be OTP-verified).
    """
    report = Report(
        train_number=train_number,
        station_code=payload.station_code,
        description=payload.description,
        phone_number=current_user.phone_number,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/{train_number}/reports", response_model=list[ReportOut])
def list_reports(train_number: str, db: Session = Depends(get_db)):
    return (
        db.query(Report)
        .filter(Report.train_number == train_number)
        .order_by(Report.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/{train_number}/reports/summary", response_model=ReportSummaryOut)
def report_summary(train_number: str, db: Session = Depends(get_db)):
    """
    Returns the report count within the flagging window and whether the
    train should be shown as flagged. This is the endpoint the Tracking
    page badge should poll alongside the ETA endpoint.
    """
    window_start = datetime.datetime.utcnow() - datetime.timedelta(hours=FLAG_WINDOW_HOURS)

    recent = (
        db.query(Report)
        .filter(Report.train_number == train_number, Report.created_at >= window_start)
        .order_by(Report.created_at.desc())
        .all()
    )

    return ReportSummaryOut(
        train_number=train_number,
        window_hours=FLAG_WINDOW_HOURS,
        report_count=len(recent),
        flagged=len(recent) >= FLAG_THRESHOLD,
        recent_reports=recent[:10],
    )
