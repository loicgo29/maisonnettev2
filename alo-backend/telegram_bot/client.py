import httpx
import asyncio
from typing import Optional
from datetime import date


class APIClient:
    """Client HTTP vers l'API FastAPI pour importer des dépenses."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url

    async def import_telegram_expense(
        self,
        label: str,
        amount: str,
        category: str = "divers",
        comment: Optional[str] = None,
    ) -> Optional[dict]:
        """
        POST /api/imports/telegram avec les données de la dépense.
        Retourne la dépense créée ou None en cas d'erreur.
        """
        payload = {
            "label": label,
            "amount": amount,
            "category": category,
            "date": str(date.today()),
            "comment": comment,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/imports/telegram",
                    json=payload,
                )
                if response.status_code == 201:
                    return response.json()
                else:
                    print(f"Erreur lors de l'import : {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            print(f"Erreur de connexion à l'API : {e}")
            return None

    async def get_recent_expenses(self, limit: int = 5) -> Optional[list]:
        """GET /api/expenses avec limit pour les dernières dépenses."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/expenses",
                    params={"limit": limit},
                )
                if response.status_code == 200:
                    return response.json()
                return None
        except Exception as e:
            print(f"Erreur lors de la récupération : {e}")
            return None

    async def get_month_total(self) -> Optional[dict]:
        """Retourne les dépenses du mois courant (approximativement)."""
        from datetime import datetime, timedelta

        today = datetime.now()
        first_day = date(today.year, today.month, 1)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/expenses",
                    params={"limit": 1000},
                )
                if response.status_code == 200:
                    expenses = response.json()
                    month_expenses = [
                        e for e in expenses
                        if date.fromisoformat(e["date"]) >= first_day
                    ]
                    total = sum(float(e["amount"]) for e in month_expenses)
                    return {
                        "total": total,
                        "count": len(month_expenses),
                    }
                return None
        except Exception as e:
            print(f"Erreur lors du calcul du total : {e}")
            return None
