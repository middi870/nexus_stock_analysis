from fastapi import APIRouter
from datetime import datetime, timezone
from app.core.config import settings
from app.services.cache_service import cache
from app.db.database import get_conn

router = APIRouter(tags=["Health"])


@router.get("/", include_in_schema=False)
@router.get("/health")
def health():
    # Quick DB ping
    db_ok = False
    try:
        conn = get_conn()
        conn.execute("SELECT 1").fetchone()
        conn.close()
        db_ok = True
    except Exception:
        pass

    return {
        "status":    "ok" if db_ok else "degraded",
        "service":   settings.APP_NAME,
        "version":   settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "db":        "ok" if db_ok else "error",
        "cache_size": cache.size,
    }
