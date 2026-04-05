"""
Stock Data Intelligence Dashboard — FastAPI Backend
Author: Your Name
"""

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional
import logging

from data_fetcher import fetch_and_store_all, get_db_connection, COMPANIES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Stock Data Intelligence Dashboard",
    description="A mini financial data platform for NSE/BSE stock analysis.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize DB and fetch data on startup."""
    logger.info("Initializing database and fetching stock data...")
    fetch_and_store_all()
    logger.info("Startup complete.")


# ──────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────

def query_df(sql: str, params=()) -> pd.DataFrame:
    conn = get_db_connection()
    df = pd.read_sql_query(sql, conn, params=params)
    conn.close()
    return df


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@app.get("/companies", summary="List all available companies")
def get_companies():
    """Returns metadata for every tracked company."""
    rows = []
    conn = get_db_connection()
    cur = conn.cursor()
    for symbol, meta in COMPANIES.items():
        cur.execute(
            "SELECT close, date FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2",
            (symbol,)
        )
        prices = cur.fetchall()
        change_pct = None
        latest_close = None
        if len(prices) >= 2:
            latest_close = prices[0][0]
            prev_close   = prices[1][0]
            change_pct   = round((latest_close - prev_close) / prev_close * 100, 2)
        elif len(prices) == 1:
            latest_close = prices[0][0]
        rows.append({
            "symbol":      symbol,
            "name":        meta["name"],
            "sector":      meta["sector"],
            "latest_close": latest_close,
            "change_pct":  change_pct,
        })
    conn.close()
    return rows


@app.get("/data/{symbol}", summary="Last N days of OHLCV data")
def get_stock_data(symbol: str, days: int = Query(30, ge=1, le=365)):
    """
    Returns the last `days` trading sessions for the given symbol,
    including daily_return, 7-day MA, and momentum_score.
    """
    symbol = symbol.upper()
    if symbol not in COMPANIES:
        raise HTTPException(404, f"Symbol '{symbol}' not found.")

    since = (datetime.utcnow() - timedelta(days=days + 30)).strftime("%Y-%m-%d")
    df = query_df(
        "SELECT * FROM stocks WHERE symbol=? AND date>=? ORDER BY date ASC",
        (symbol, since),
    )
    if df.empty:
        raise HTTPException(404, "No data available for this symbol.")

    df["date"]          = pd.to_datetime(df["date"])
    df["daily_return"]  = ((df["close"] - df["open"]) / df["open"] * 100).round(4)
    df["ma_7"]          = df["close"].rolling(7).mean().round(2)
    df["ma_20"]         = df["close"].rolling(20).mean().round(2)

    # Momentum score: normalised (0–100) composite of return + volume z-score
    df["vol_z"]         = (df["volume"] - df["volume"].mean()) / (df["volume"].std() + 1)
    df["momentum_score"] = (
        0.6 * df["daily_return"].clip(-5, 5) / 5 * 50 + 50 +
        0.4 * df["vol_z"].clip(-3, 3) / 3 * 50
    ).clip(0, 100).round(2)

    df = df.tail(days)
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    return df.replace({np.nan: None}).to_dict(orient="records")


@app.get("/summary/{symbol}", summary="52-week stats for a symbol")
def get_summary(symbol: str):
    """Returns 52-week high, low, average close, total return, and volatility."""
    symbol = symbol.upper()
    if symbol not in COMPANIES:
        raise HTTPException(404, f"Symbol '{symbol}' not found.")

    since = (datetime.utcnow() - timedelta(days=365)).strftime("%Y-%m-%d")
    df = query_df(
        "SELECT date, open, high, low, close, volume FROM stocks WHERE symbol=? AND date>=? ORDER BY date ASC",
        (symbol, since),
    )
    if df.empty:
        raise HTTPException(404, "No data available.")

    df["daily_return"] = df["close"].pct_change()
    first_close = df["close"].iloc[0]
    last_close  = df["close"].iloc[-1]

    return {
        "symbol":           symbol,
        "name":             COMPANIES[symbol]["name"],
        "sector":           COMPANIES[symbol]["sector"],
        "week52_high":      round(float(df["high"].max()), 2),
        "week52_low":       round(float(df["low"].min()), 2),
        "avg_close":        round(float(df["close"].mean()), 2),
        "total_return_pct": round((last_close - first_close) / first_close * 100, 2),
        "volatility_pct":   round(float(df["daily_return"].std() * np.sqrt(252) * 100), 2),
        "avg_volume":       int(df["volume"].mean()),
        "latest_close":     round(float(last_close), 2),
        "data_from":        df["date"].iloc[0],
        "data_to":          df["date"].iloc[-1],
    }


@app.get("/compare", summary="Compare two stocks")
def compare_stocks(
    symbol1: str = Query(..., description="First stock symbol, e.g. TCS"),
    symbol2: str = Query(..., description="Second stock symbol, e.g. INFY"),
    days: int    = Query(90, ge=7, le=365),
):
    """
    Returns normalised price series (base=100) for two symbols,
    plus correlation and annualised return comparison.
    """
    sym1, sym2 = symbol1.upper(), symbol2.upper()
    for s in (sym1, sym2):
        if s not in COMPANIES:
            raise HTTPException(404, f"Symbol '{s}' not found.")

    since = (datetime.utcnow() - timedelta(days=days + 10)).strftime("%Y-%m-%d")

    def load(sym):
        df = query_df(
            "SELECT date, close FROM stocks WHERE symbol=? AND date>=? ORDER BY date ASC",
            (sym, since),
        )
        df = df.tail(days)
        if df.empty or len(df) < 2:
            raise HTTPException(404, f"Not enough data for {sym}")
        df = df.reset_index(drop=True)
        df["norm"] = df["close"] / df["close"].iloc[0] * 100
        return df

    d1, d2 = load(sym1), load(sym2)

    merged = pd.merge(d1, d2, on="date", suffixes=(f"_{sym1}", f"_{sym2}"))
    corr   = float(merged[f"close_{sym1}"].pct_change().corr(
                   merged[f"close_{sym2}"].pct_change()))

    def ret(df): return round((df["close"].iloc[-1] - df["close"].iloc[0]) / df["close"].iloc[0] * 100, 2)

    series = []
    for _, row in merged.iterrows():
        series.append({
            "date":             row["date"],
            f"norm_{sym1}":     round(row[f"norm_{sym1}"], 2),
            f"norm_{sym2}":     round(row[f"norm_{sym2}"], 2),
            f"close_{sym1}":    round(row[f"close_{sym1}"], 2),
            f"close_{sym2}":    round(row[f"close_{sym2}"], 2),
        })

    return {
        "symbol1":      sym1,
        "symbol2":      sym2,
        "correlation":  round(corr, 4),
        "return1_pct":  ret(d1),
        "return2_pct":  ret(d2),
        "days":         days,
        "series":       series,
    }


@app.get("/top-movers", summary="Top gainers and losers today")
def top_movers(n: int = Query(5, ge=1, le=10)):
    """Returns the top N gainers and losers based on the latest daily return."""
    conn = get_db_connection()
    cur  = conn.cursor()
    results = []
    for symbol, meta in COMPANIES.items():
        cur.execute(
            "SELECT close, date FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2",
            (symbol,)
        )
        rows = cur.fetchall()
        if len(rows) < 2:
            continue
        chg = (rows[0][0] - rows[1][0]) / rows[1][0] * 100
        results.append({
            "symbol": symbol,
            "name":   meta["name"],
            "sector": meta["sector"],
            "close":  round(rows[0][0], 2),
            "change_pct": round(chg, 2),
            "date":   rows[0][1],
        })
    conn.close()
    results.sort(key=lambda x: x["change_pct"], reverse=True)
    return {
        "gainers": results[:n],
        "losers":  results[-n:][::-1],
    }


@app.post("/refresh", summary="Re-fetch latest stock data")
def refresh_data(background_tasks: BackgroundTasks):
    """Triggers a background data refresh from yfinance."""
    background_tasks.add_task(fetch_and_store_all)
    return {"message": "Data refresh started in background."}


@app.get("/", include_in_schema=False)
def root():
    return {"message": "Stock Dashboard API — visit /docs for Swagger UI"}
