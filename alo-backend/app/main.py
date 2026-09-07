from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from app.database import Base, engine
from app.config import settings

# Import models to register them with the ORM
from app.models import Expense, Account, AccountBalance, SharingEntry, Child, PresencePeriod, Period, MealRecord, MealPresence

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ALO - Gestion des dépenses familiales",
    description="Application locale de gestion et répartition des dépenses familiales",
    version="0.1.0",
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8001",
        "http://192.168.1.34:3000",
        "http://192.168.1.34:8001",
        "http://192.168.1.34:8000",
        "http://alo.logo-solutions.fr:8001",
        "http://alo.logo-solutions.fr:8000",
        "https://alo.logo-solutions.fr:8001",
        "https://alo.logo-solutions.fr:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
async def root():
    static_dir = Path(__file__).parent / "static"
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return """
    <html>
        <head>
            <title>ALO</title>
        </head>
        <body>
            <h1>ALO - Gestion des dépenses familiales</h1>
            <p>Interface en cours de développement</p>
            <p><a href="/docs">Documentation Swagger</a></p>
        </body>
    </html>
    """


@app.get("/repas", response_class=HTMLResponse)
async def repas():
    static_dir = Path(__file__).parent / "static"
    repas_file = static_dir / "repas.html"
    if repas_file.exists():
        return FileResponse(repas_file)
    return "Fichier repas.html non trouvé"


@app.get("/reequilibrage", response_class=HTMLResponse)
async def reequilibrage_page():
    static_dir = Path(__file__).parent / "static"
    reequilibrage_file = static_dir / "reequilibrage.html"
    if reequilibrage_file.exists():
        return FileResponse(reequilibrage_file)
    return "Fichier reequilibrage.html non trouvé"


@app.get("/api/health")
async def health():
    from sqlalchemy import text
    from app.database import SessionLocal

    db_status = "error"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "version": "0.1.0",
        "database": db_status,
        "api": "ok"
    }


# Import routers
from app.routers.expenses import router as expenses_router
from app.routers.periods import router as periods_router
from app.routers.imports import router as imports_router
from app.routers.exports import router as exports_router
from app.routers.meals import router as meals_router
from app.routers.reequilibrage import router as reequilibrage_router
from app.routers.presence import router as presence_router

# Include routers
app.include_router(expenses_router, prefix="/api/expenses", tags=["expenses"])
app.include_router(periods_router, prefix="/api/periods", tags=["periods"])
app.include_router(imports_router, prefix="/api/imports", tags=["imports"])
app.include_router(exports_router, prefix="/api/exports", tags=["exports"])
app.include_router(meals_router, tags=["meals"])
app.include_router(reequilibrage_router, tags=["reequilibrage"])
app.include_router(presence_router, tags=["presence"])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.api_host, port=settings.api_port)
