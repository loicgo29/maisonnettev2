from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/alo.db"
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    # Compte Telegram personnel (Telethon), utilisé par l'import d'historique
    # — distinct du bot ci-dessus. Jamais de valeur par défaut : une valeur
    # vide ferait échouer l'authentification Telegram plutôt que de tourner
    # silencieusement avec un mauvais compte.
    telegram_api_id: int = 0
    telegram_api_hash: str = ""
    telegram_personal_phone: str = ""
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

# Dans /app/data (volume persistant alo_data en production) plutôt que le
# répertoire courant du process : sinon la session Telethon est perdue à
# chaque redéploiement/restart du conteneur, forçant une réauthentification
# SMS chaque fois.
TELEGRAM_SESSION_PATH = str(DATA_DIR / "alo_session")
