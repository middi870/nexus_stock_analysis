"""
NEXUS — Market-wide endpoints.
/movers   → top N gainers & losers
/sectors  → sector performance aggregation
/heatmap  → all stocks with change_pct for treemap rendering
"""
from fastapi import APIRouter, Query
from app.core.constants import COMPANIES
from app.core.config import settings
from app.db.database import get_conn
from app.services.cache_service import cache

router = APIRouter(tags=["Market"])


def _get_changes() -> list[dict]:
    """Return latest close + change_pct for every company."""
    conn = get_conn()
    result = []
    for sym, meta in COMPANIES.items():
        rows = conn.execute(
            "SELECT close, open, high, low, volume FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2",
            (sym,)
        ).fetchall()
        lat = rows[0] if rows      else None
        prv = rows[1] if len(rows) > 1 else None
        if not lat:
            continue
        chg = round((lat[0] - prv[0]) / prv[0] * 100, 2) if prv and prv[0] else None
        result.append({
            "symbol":     sym,
            "name":       meta["name"],
            "sector":     meta["sector"],
            "close":      round(lat[0], 2),
            "open":       round(lat[1], 2),
            "high":       round(lat[2], 2),
            "low":        round(lat[3], 2),
            "volume":     lat[4],
            "prev_close": round(prv[0], 2) if prv else None,
            "change_pct": chg,
            "pe":         meta.get("pe"),
            "pb":         meta.get("pb"),
            "div_yield":  meta.get("div"),
            "mktcap":     meta.get("cap"),
        })
    conn.close()
    return result


@router.get("/movers")
def movers(n: int = Query(7, ge=1, le=20)):
    cached = cache.get(f"movers:{n}")
    if cached is not None:
        return cached

    data = [x for x in _get_changes() if x["change_pct"] is not None]
    data.sort(key=lambda x: x["change_pct"], reverse=True)
    result = {"gainers": data[:n], "losers": data[-n:][::-1]}
    cache.set(f"movers:{n}", result, ttl=settings.TTL_MOVERS)
    return result


@router.get("/sectors")
def sectors():
    cached = cache.get("sectors")
    if cached is not None:
        return cached

    data = _get_changes()
    sec: dict[str, list] = {}
    for item in data:
        if item["change_pct"] is None:
            continue
        sec.setdefault(item["sector"], []).append(item)

    result = [
        {
            "sector":     s,
            "avg_change": round(sum(x["change_pct"] for x in v) / len(v), 2),
            "count":      len(v),
            "stocks":     sorted(v, key=lambda x: x["change_pct"], reverse=True),
        }
        for s, v in sorted(sec.items(), key=lambda kv: -sum(x["change_pct"] for x in kv[1]) / len(kv[1]))
    ]
    cache.set("sectors", result, ttl=settings.TTL_SECTORS)
    return result


@router.get("/heatmap")
def heatmap():
    """Returns all companies with change_pct — suitable for treemap / heatmap rendering."""
    cached = cache.get("heatmap")
    if cached is not None:
        return cached
    data = _get_changes()
    cache.set("heatmap", data, ttl=settings.TTL_MOVERS)
    return data
