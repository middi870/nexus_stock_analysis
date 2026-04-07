"""
NEXUS — NSE Intelligence Platform
FastAPI application entry point.

Run locally:
    uvicorn app.main:app --reload --port 8000

Docker / Railway:
    CMD set in Dockerfile / railway.toml calls this via uvicorn.
"""
import logging, os
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import init_db
from app.services.data_service import ingest_all
from app.services.cache_service import cache
from app.api.routes import health, stocks, market, screener, ai

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("━━━  NEXUS starting up  ━━━")
    init_db()
    log.info("Ingesting market data …")
    report = ingest_all()
    yf_count   = sum(1 for s in report.values() if s == "yfinance")
    mock_count = sum(1 for s in report.values() if s == "mock")
    log.info("Ingestion complete — %d yfinance, %d mock", yf_count, mock_count)
    log.info("━━━  NEXUS ready  ━━━")
    yield
    log.info("NEXUS shutting down …")


# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title       = settings.APP_NAME,
    version     = settings.VERSION,
    description = settings.DESCRIPTION,
    lifespan    = lifespan,
    docs_url    = "/docs",
    redoc_url   = "/redoc",
    openapi_url = "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins  = settings.CORS_ORIGINS.split() if " " in settings.CORS_ORIGINS else [settings.CORS_ORIGINS],
    allow_methods  = ["*"],
    allow_headers  = ["*"],
    allow_credentials = True,
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(stocks.router)
app.include_router(market.router)
app.include_router(screener.router)
app.include_router(ai.router)


# ── Admin endpoints ───────────────────────────────────────────────────────────

import time as _time
from fastapi import HTTPException as _HTTPException

_last_refresh: float = 0.0
_REFRESH_COOLDOWN = 1800   # 30 minutes between refreshes

@app.post("/refresh", tags=["Admin"])
async def refresh(bg: BackgroundTasks):
    """Rate-limited data re-ingestion (max once per 30 minutes)."""
    global _last_refresh
    elapsed  = _time.time() - _last_refresh
    remaining = _REFRESH_COOLDOWN - elapsed
    if _last_refresh > 0 and remaining > 0:
        raise _HTTPException(
            status_code=429,
            detail=f"Refresh rate-limited. Try again in {int(remaining)}s."
        )
    _last_refresh = _time.time()
    cache.clear()
    bg.add_task(ingest_all)
    return {"message": "Data refresh started", "cache": "cleared", "next_in": _REFRESH_COOLDOWN}


@app.get("/cache/stats", tags=["Admin"])
def cache_stats():
    return {"entries": cache.size}


@app.delete("/cache", tags=["Admin"])
def clear_cache():
    cache.clear()
    return {"message": "Cache cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=False)
