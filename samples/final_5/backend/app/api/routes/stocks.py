"""
NEXUS — Stock data endpoints.
All responses are cleaned through clean_for_json() before returning,
guaranteeing no numpy types leak into FastAPI's JSON encoder.
"""
import pandas as pd
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Query

from app.core.constants import COMPANIES
from app.core.config import settings
from app.core.utils import clean_for_json
from app.db.database import get_conn
from app.services.analytics_service import add_indicators, compute_summary_stats
from app.services.cache_service import cache

router = APIRouter(tags=["Stocks"])


def _load_ohlcv(symbol: str, since: str) -> pd.DataFrame:
    conn = get_conn()
    df   = pd.read_sql_query(
        "SELECT * FROM stocks WHERE symbol=? AND date>=? ORDER BY date",
        conn, params=(symbol, since)
    )
    conn.close()
    return df


def _latest_two(symbol: str):
    conn = get_conn()
    rows = conn.execute(
        "SELECT close, open, high, low, volume FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2",
        (symbol,)
    ).fetchall()
    conn.close()
    lat = rows[0] if rows      else None
    prv = rows[1] if len(rows) > 1 else None
    return lat, prv


# ── /companies ────────────────────────────────────────────────────────────────

@router.get("/companies")
def get_companies():
    cached = cache.get("companies")
    if cached is not None:
        return cached

    result = []
    for sym, meta in COMPANIES.items():
        lat, prv = _latest_two(sym)
        chg = round((float(lat[0]) - float(prv[0])) / float(prv[0]) * 100, 2) if lat and prv and prv[0] else None
        result.append(clean_for_json({
            "symbol":     sym,
            "name":       meta["name"],
            "sector":     meta["sector"],
            "close":      float(lat[0]) if lat else None,
            "open":       float(lat[1]) if lat else None,
            "high":       float(lat[2]) if lat else None,
            "low":        float(lat[3]) if lat else None,
            "volume":     int(lat[4])   if lat else None,
            "prev_close": float(prv[0]) if prv else None,
            "change_pct": chg,
            "pe":         meta.get("pe"),
            "pb":         meta.get("pb"),
            "div_yield":  meta.get("div"),
            "mktcap":     meta.get("cap"),
        }))

    cache.set("companies", result, ttl=settings.TTL_COMPANIES)
    return result


# ── /data/{symbol} ────────────────────────────────────────────────────────────

@router.get("/data/{symbol}")
def get_data(symbol: str, days: int = Query(90, ge=1, le=730)):
    sym = symbol.upper()
    if sym not in COMPANIES:
        raise HTTPException(404, f"Unknown symbol: {sym}")

    cache_key = f"data:{sym}:{days}"
    cached    = cache.get(cache_key)
    if cached is not None:
        return cached

    warmup = max(days + 250, days + 1)
    since  = (datetime.utcnow() - timedelta(days=warmup)).strftime("%Y-%m-%d")
    df     = _load_ohlcv(sym, since)

    if df.empty:
        raise HTTPException(404, "No data — try POST /refresh")

    enriched = add_indicators(df)
    # Convert DataFrame records — numpy types must be cleaned
    records  = [clean_for_json(row) for row in enriched.tail(days).to_dict(orient="records")]

    cache.set(cache_key, records, ttl=settings.TTL_DATA)
    return records


# ── /summary/{symbol} ────────────────────────────────────────────────────────

@router.get("/summary/{symbol}")
def get_summary(symbol: str):
    sym = symbol.upper()
    if sym not in COMPANIES:
        raise HTTPException(404, f"Unknown symbol: {sym}")

    cache_key = f"summary:{sym}"
    cached    = cache.get(cache_key)
    if cached is not None:
        return cached

    since = (datetime.utcnow() - timedelta(days=400)).strftime("%Y-%m-%d")
    df    = _load_ohlcv(sym, since)
    if df.empty:
        raise HTTPException(404, "No data — try POST /refresh")

    df_ind = add_indicators(df)
    meta   = {**COMPANIES[sym], "symbol": sym}
    result = compute_summary_stats(df, df_ind, meta)   # already cleaned inside

    cache.set(cache_key, result, ttl=settings.TTL_SUMMARY)
    return result


# ── /compare ─────────────────────────────────────────────────────────────────

@router.get("/compare")
def compare(
    symbol1: str,
    symbol2: str,
    days:    int = Query(90, ge=7, le=730),
):
    s1, s2 = symbol1.upper(), symbol2.upper()
    for s in (s1, s2):
        if s not in COMPANIES:
            raise HTTPException(404, f"Unknown symbol: {s}")

    cache_key = f"compare:{s1}:{s2}:{days}"
    cached    = cache.get(cache_key)
    if cached is not None:
        return cached

    since = (datetime.utcnow() - timedelta(days=days + 5)).strftime("%Y-%m-%d")

    def _load(sym: str) -> pd.DataFrame:
        conn = get_conn()
        df = pd.read_sql_query(
            "SELECT date, close FROM stocks WHERE symbol=? AND date>=? ORDER BY date",
            conn, params=(sym, since)
        )
        conn.close()
        df = df.tail(days).reset_index(drop=True)
        if len(df) < 2:
            raise HTTPException(404, f"Insufficient data for {sym}")
        df["norm"] = df["close"] / df["close"].iloc[0] * 100
        return df

    d1, d2 = _load(s1), _load(s2)
    merged  = pd.merge(d1, d2, on="date", suffixes=(f"_{s1}", f"_{s2}"))
    r1      = merged[f"close_{s1}"].pct_change()
    r2      = merged[f"close_{s2}"].pct_change()
    corr    = float(r1.corr(r2))

    series = [clean_for_json({
        "date":          row["date"],
        f"norm_{s1}":    round(float(row[f"norm_{s1}"]), 2),
        f"norm_{s2}":    round(float(row[f"norm_{s2}"]), 2),
    }) for _, row in merged.iterrows()]

    result = clean_for_json({
        "symbol1":     s1,  "name1": COMPANIES[s1]["name"],
        "symbol2":     s2,  "name2": COMPANIES[s2]["name"],
        "correlation": round(corr, 4),
        "return1":     round((float(d1["close"].iloc[-1]) - float(d1["close"].iloc[0])) / float(d1["close"].iloc[0]) * 100, 2),
        "return2":     round((float(d2["close"].iloc[-1]) - float(d2["close"].iloc[0])) / float(d2["close"].iloc[0]) * 100, 2),
        "days":        days,
        "series":      series,
    })

    cache.set(cache_key, result, ttl=settings.TTL_DATA)
    return result
