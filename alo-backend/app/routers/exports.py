from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Period
from app.services.excel_exporter import ExcelExporter

router = APIRouter()
exporter = ExcelExporter()


@router.get("/excel/{period_id}")
async def export_period_as_excel(period_id: int, db: Session = Depends(get_db)):
    """
    Exporte une période figée en fichier Excel.
    Retourne un fichier XLSX téléchargeable.
    """
    period = db.get(Period, period_id)
    if not period:
        raise HTTPException(status_code=404, detail="Période non trouvée")

    if period.status != "frozen":
        raise HTTPException(status_code=409, detail="Seules les périodes figées peuvent être exportées")

    try:
        filepath = exporter.export_period(period_id, db)
        return FileResponse(
            path=filepath,
            filename=filepath.name,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export : {str(e)}")
