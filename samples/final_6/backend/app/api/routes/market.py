"""
NEXUS — Market-wide endpoints: movers, sectors, heatmap.
All values explicitly cast to native Python types.
"""
from fastapi import APIRouter, Query
from app.core.constants import COMPANIES
from app.core.config import settings
from app.core.utils import clean_for_json
from app.db.database import get_conn
from app.services.cache_service import cache

router = APIRouter(tags=["Market"])


def _get_changes() -> list[dict]:
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
        close  = float(lat[0])
        pclose = float(prv[0]) if prv else None
        chg    = round((close - pclose) / pclose * 100, 2) if pclose else None
        result.append(clean_for_json({
            "symbol":     sym,
            "name":       meta["name"],
            "sector":     meta["sector"],
            "close":      round(close, 2),
            "open":       round(float(lat[1]), 2),
            "high":       round(float(lat[2]), 2),
            "low":        round(float(lat[3]), 2),
            "volume":     int(lat[4]),
            "prev_close": round(pclose, 2) if pclose else None,
            "change_pct": chg,
            "pe":         meta.get("pe"),
            "pb":         meta.get("pb"),
            "div_yield":  meta.get("div"),
            "mktcap":     meta.get("cap"),
        }))
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
        clean_for_json({
            "sector":     s,
            "avg_change": round(sum(x["change_pct"] for x in v) / len(v), 2),
            "count":      len(v),
            "stocks":     sorted(v, key=lambda x: x["change_pct"], reverse=True),
        })
        for s, v in sorted(sec.items(), key=lambda kv: -sum(x["change_pct"] for x in kv[1]) / len(kv[1]))
    ]
    cache.set("sectors", result, ttl=settings.TTL_SECTORS)
    return result


@router.get("/heatmap")
def heatmap():
    cached = cache.get("heatmap")
    if cached is not None:
        return cached
    data = _get_changes()
    cache.set("heatmap", data, ttl=settings.TTL_MOVERS)
    return data
