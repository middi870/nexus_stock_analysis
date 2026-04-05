import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@db:5432/app"
)

REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://redis:6379"
)
