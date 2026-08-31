from fastapi import APIRouter

from app.models.auth_schemas import PNRLookupIn, PNRLookupOut

router = APIRouter(prefix="/pnr", tags=["pnr"])


@router.post("/lookup", response_model=PNRLookupOut)
def lookup_pnr(payload: PNRLookupIn):
    """
    STUB. Real PNR-to-train lookup requires either scraping IRCTC/NTES
    (fragile, against ToS — avoid, same reasoning as not scraping IRCTC
    for the train database) or a paid third-party PNR API.

    For the hackathon: this always returns found=false, and the
    frontend's ticket-upload flow should treat that as expected,
    falling back to manual train-number entry (which the frontend
    already supports as the primary path). If a reliable PNR API is
    sourced later, implement the real lookup here — the response shape
    is already the contract the frontend can build against today.
    """
    return PNRLookupOut(
        found=False,
        train_number=None,
        message="PNR lookup isn't available yet — please enter your train number manually.",
    )
