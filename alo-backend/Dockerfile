FROM python:3.11-slim AS base

# Copier uv depuis l'image officielle
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Couche des dépendances (cacheable)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Code applicatif + config
COPY app ./app
COPY alembic ./alembic
COPY data ./data
# Bot Telegram (process séparé, lancé via `command:` différent dans docker-compose —
# voir service alo-telegram-bot). Même image que l'API pour éviter de dupliquer les
# dépendances Python.
COPY telegram_bot ./telegram_bot
RUN echo "Rebuilt at $(date)"

RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/docs || exit 1

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
