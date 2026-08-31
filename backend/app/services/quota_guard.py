import datetime
from sqlalchemy.orm import Session

from app.config import RAILRADAR_MONTHLY_LIMIT, RAILRADAR_SAFETY_MARGIN
from app.models_db import ApiQuotaUsage


def get_current_month_key() -> str:
    """Returns current month in 'YYYY-MM' format."""
    return datetime.datetime.utcnow().strftime("%Y-%m")


def has_budget(db: Session, provider: str = "railradar") -> bool:
    """
    Checks if API requests for the current month are within the conservative safety budget.
    Hard-stops when used >= (limit - safety_margin), e.g. 1000 - 50 = 950.
    """
    month_key = get_current_month_key()
    usage = (
        db.query(ApiQuotaUsage)
        .filter(ApiQuotaUsage.provider == provider, ApiQuotaUsage.month_key == month_key)
        .first()
    )
    used = usage.request_count if usage else 0
    effective_limit = max(0, RAILRADAR_MONTHLY_LIMIT - RAILRADAR_SAFETY_MARGIN)
    return used < effective_limit


def get_quota_status(db: Session, provider: str = "railradar") -> dict:
    """Returns detailed quota usage statistics for diagnostics."""
    month_key = get_current_month_key()
    usage = (
        db.query(ApiQuotaUsage)
        .filter(ApiQuotaUsage.provider == provider, ApiQuotaUsage.month_key == month_key)
        .first()
    )
    used = usage.request_count if usage else 0
    effective_limit = max(0, RAILRADAR_MONTHLY_LIMIT - RAILRADAR_SAFETY_MARGIN)
    return {
        "provider": provider,
        "month_key": month_key,
        "request_count": used,
        "monthly_limit": RAILRADAR_MONTHLY_LIMIT,
        "safety_margin": RAILRADAR_SAFETY_MARGIN,
        "effective_limit": effective_limit,
        "has_budget": used < effective_limit,
    }

