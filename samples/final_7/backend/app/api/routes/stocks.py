"""
NEXUS v0.2.0 — Stock data endpoints.
New: sparkline data in /companies, /quote/{symbol} intraday, /news/{symbol}
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Annotated, Optional

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
    lat = rows[0] if rows else None
    prv = rows[1] if len(rows) > 1 else None
    return lat, prv


def _sparkline(symbol: str, n: int = 10) -> list:
    """Return last n closing prices for sparkline rendering."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT close FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT ?",
        (symbol, n)
    ).fetchall()
    conn.close()
    prices = [float(r[0]) for r in reversed(rows) if r[0] is not None]
    return prices


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
        spark = _sparkline(sym, 10)
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
            "spark":      spark,   # last 10 closes for mini sparkline
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
    result = compute_summary_stats(df, df_ind, meta)

    cache.set(cache_key, result, ttl=settings.TTL_SUMMARY)
    return result


# ── /compare ─────────────────────────────────────────────────────────────────

@router.get("/compare")
def compare(symbol1: str, symbol2: str, days: int = Query(90, ge=7, le=730)):
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
    corr    = float(merged[f"close_{s1}"].pct_change().corr(merged[f"close_{s2}"].pct_change()))

    series = [clean_for_json({
        "date":        row["date"],
        f"norm_{s1}":  round(float(row[f"norm_{s1}"]), 2),
        f"norm_{s2}":  round(float(row[f"norm_{s2}"]), 2),
    }) for _, row in merged.iterrows()]

    result = clean_for_json({
        "symbol1": s1, "name1": COMPANIES[s1]["name"],
        "symbol2": s2, "name2": COMPANIES[s2]["name"],
        "correlation": round(corr, 4),
        "return1": round((float(d1["close"].iloc[-1]) - float(d1["close"].iloc[0])) / float(d1["close"].iloc[0]) * 100, 2),
        "return2": round((float(d2["close"].iloc[-1]) - float(d2["close"].iloc[0])) / float(d2["close"].iloc[0]) * 100, 2),
        "days": days, "series": series,
    })
    cache.set(cache_key, result, ttl=settings.TTL_DATA)
    return result


# ── /quote/{symbol} — intraday OHLCV ─────────────────────────────────────────

@router.get("/quote/{symbol}")
def get_intraday(
    symbol:   str,
    interval: Annotated[str, Query(description="yfinance interval: 5m, 15m, 30m, 60m")] = "5m",
):
    """
    Returns intraday OHLCV bars for today (or last trading day).
    Uses yfinance live fetch — not cached in SQLite.
    Falls back gracefully if market is closed or yfinance unavailable.
    """
    sym = symbol.upper()
    if sym not in COMPANIES:
        raise HTTPException(404, f"Unknown symbol: {sym}")

    valid_intervals = {"5m", "15m", "30m", "60m", "1h"}
    if interval not in valid_intervals:
        interval = "5m"

    cache_key = f"intraday:{sym}:{interval}"
    cached    = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        import yfinance as yf
        ticker = yf.Ticker(COMPANIES[sym]["yf"])
        df = ticker.history(period="1d", interval=interval, auto_adjust=True)

        if df.empty:
            # Try previous trading day
            df = ticker.history(period="2d", interval=interval, auto_adjust=True)
            if not df.empty:
                last_day = df.index[-1].date()
                df = df[df.index.date == last_day]

        if df.empty:
            return {"symbol": sym, "interval": interval, "bars": [], "source": "empty"}

        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df.columns = ["open", "high", "low", "close", "volume"]
        df.index = pd.to_datetime(df.index).tz_localize(None) if df.index.tz is None else pd.to_datetime(df.index).tz_convert(None)

        bars = []
        for ts, row in df.iterrows():
            bars.append(clean_for_json({
                "time":   ts.strftime("%H:%M"),
                "date":   ts.strftime("%Y-%m-%d"),
                "open":   round(float(row["open"]),  2),
                "high":   round(float(row["high"]),  2),
                "low":    round(float(row["low"]),   2),
                "close":  round(float(row["close"]), 2),
                "volume": int(row["volume"]) if not np.isnan(row["volume"]) else 0,
            }))

        result = {
            "symbol":   sym,
            "name":     COMPANIES[sym]["name"],
            "interval": interval,
            "bars":     bars,
            "source":   "yfinance",
            "fetched":  datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        # Short TTL — intraday data changes every few minutes
        cache.set(cache_key, result, ttl=180)
        return result

    except Exception as exc:
        raise HTTPException(503, f"Intraday unavailable: {exc}")


# ── /news/{symbol} ────────────────────────────────────────────────────────────

@router.get("/news/{symbol}")
def get_news(symbol: str, limit: int = Query(6, ge=1, le=12)):
    """
    Returns recent news headlines for a symbol via yfinance.
    Cached for 15 minutes.
    """
    sym = symbol.upper()
    if sym not in COMPANIES:
        raise HTTPException(404, f"Unknown symbol: {sym}")

    cache_key = f"news:{sym}"
    cached    = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        import yfinance as yf
        raw = yf.Ticker(COMPANIES[sym]["yf"]).news or []

        articles = []
        for item in raw[:limit]:
            content = item.get("content", {})
            # yfinance ≥0.2.50 wraps everything in content{}
            title     = content.get("title")     or item.get("title", "")
            summary   = content.get("summary")   or ""
            provider  = (content.get("provider", {}) or {}).get("displayName") or \
                        item.get("publisher", "")
            link      = (content.get("canonicalUrl", {}) or {}).get("url") or \
                        item.get("link", "")
            pub_ts    = content.get("pubDate") or item.get("providerPublishTime")
            if isinstance(pub_ts, (int, float)):
                pub_str = datetime.utcfromtimestamp(pub_ts).strftime("%b %d, %Y")
            elif isinstance(pub_ts, str):
                pub_str = pub_ts[:10]
            else:
                pub_str = ""

            if title:
                articles.append({
                    "title":     title,
                    "summary":   summary[:200] + "…" if len(summary) > 200 else summary,
                    "publisher": provider,
                    "link":      link,
                    "published": pub_str,
                })

        result = {"symbol": sym, "articles": articles}
        cache.set(cache_key, result, ttl=900)   # 15-min TTL
        return result

    except Exception as exc:
        return {"symbol": sym, "articles": [], "error": str(exc)}
