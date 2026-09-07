from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.database import get_db
from app.models.meal_presence import MealPresence
from pydantic import BaseModel

router = APIRouter(prefix="/api/presence", tags=["presence"])

ACCOUNTS = {
    "gourmich": ["Loïc", "Alban", "Mahaut", "Ilan"],
    "tigresse": ["Alice", "Adèle", "Oscar", "Albert", "Joséphine"]
}


class PresenceToggleRequest(BaseModel):
    year: int
    month: int
    day: int
    account: str
    person: str
    slot: str  # "midi" ou "soir"
    present: bool


def get_default_presence(year: int, month: int, day: int, account: str, person: str) -> dict:
    """
    Retourne la présence par défaut pour une personne un jour donné.
    Par défaut, tout le monde est présent (midi=True, soir=True).
    """
    return {"midi": True, "soir": True}


@router.get("/range/{start_date}/{end_date}/{account}")
async def get_presence_range(start_date: str, end_date: str, account: str, db: Session = Depends(get_db)):
    """
    Récupère la présence pour une plage de dates.
    Format: {"YYYY-MM-DD": {person: {"midi": bool, "soir": bool}}}
    """
    if account not in ACCOUNTS:
        raise HTTPException(status_code=400, detail="Account invalide")

    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (YYYY-MM-DD)")

    result = {}
    current = start
    while current <= end:
        day_key = current.isoformat()
        result[day_key] = {}

        # Récupérer les enregistrements de présence pour ce jour
        presences = db.query(MealPresence).filter(
            MealPresence.year == current.year,
            MealPresence.month == current.month,
            MealPresence.day == current.day,
            MealPresence.account == account,
        ).all()

        # Construire le dictionnaire par personne
        for person in ACCOUNTS[account]:
            presence = next((p for p in presences if p.person == person), None)
            if presence:
                result[day_key][person] = {"midi": presence.midi, "soir": presence.soir}
            else:
                # Fallback sur le défaut
                result[day_key][person] = get_default_presence(current.year, current.month, current.day, account, person)

        current += timedelta(days=1)

    return result


@router.post("/toggle")
async def toggle_presence(req: PresenceToggleRequest, db: Session = Depends(get_db)):
    """
    Toggle la présence pour un repas (midi ou soir) d'une personne un jour donné.
    Met aussi à jour le MealRecord.repas en conséquence.
    """
    if req.account not in ACCOUNTS:
        raise HTTPException(status_code=400, detail="Account invalide")
    if req.person not in ACCOUNTS[req.account]:
        raise HTTPException(status_code=400, detail=f"Person invalide pour le compte {req.account}")
    if req.slot not in ["midi", "soir"]:
        raise HTTPException(status_code=400, detail="Slot doit être 'midi' ou 'soir'")

    # Récupérer ou créer l'enregistrement de présence
    presence = db.query(MealPresence).filter(
        MealPresence.year == req.year,
        MealPresence.month == req.month,
        MealPresence.day == req.day,
        MealPresence.account == req.account,
        MealPresence.person == req.person,
    ).first()

    if not presence:
        # Créer un nouvel enregistrement avec les défauts
        defaults = get_default_presence(req.year, req.month, req.day, req.account, req.person)
        presence = MealPresence(
            year=req.year,
            month=req.month,
            day=req.day,
            account=req.account,
            person=req.person,
            midi=defaults["midi"],
            soir=defaults["soir"],
        )
        db.add(presence)

    # Mettre à jour le slot demandé
    if req.slot == "midi":
        presence.midi = req.present
    else:
        presence.soir = req.present

    db.commit()

    return {"status": "ok", "midi": presence.midi, "soir": presence.soir}
