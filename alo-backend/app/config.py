from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/alo.db"
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    api_host: str = "localhost"
    api_port: int = 8000
    api_base_url: str = "http://localhost:8000"
    environment: str = "development"
    debug: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

CATEGORIZATION_RULES_PATH = DATA_DIR / "categorization_rules.yaml"
EXPORTS_DIR = DATA_DIR / "exports"
EXPORTS_DIR.mkdir(exist_ok=True)
IMPORTS_DIR = DATA_DIR / "imports"
IMPORTS_DIR.mkdir(exist_ok=True)
