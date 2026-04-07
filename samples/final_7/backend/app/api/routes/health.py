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

# ── Rate-limited refresh ──────────────────────────────────────────────────────
import time as _time

_last_refresh_ts: float = 0.0
_REFRESH_COOLDOWN: int  = 1800   # 30 minutes

@router.post("/refresh-status")
def refresh_status():
    remaining = max(0, _REFRESH_COOLDOWN - (_time.time() - _last_refresh_ts))
    return {
        "last_refresh": int(_last_refresh_ts) or None,
        "cooldown_secs": _REFRESH_COOLDOWN,
        "next_allowed_in": int(remaining),
        "can_refresh": remaining == 0,
    }
