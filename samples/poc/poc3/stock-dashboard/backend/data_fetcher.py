"""
data_fetcher.py
Fetches real NSE data via yfinance; falls back to deterministic mock data
when the network is unavailable (e.g. inside Docker without external access).
"""

import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import math
import os

logger = logging.getLogger(__name__)

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "stocks.db"))

COMPANIES = {
    "RELIANCE":   {"name": "Reliance Industries",  "sector": "Energy",       "yf": "RELIANCE.NS",   "base": 2850, "vol": 0.018, "seed": 1},
    "TCS":        {"name": "Tata Consultancy",      "sector": "IT",           "yf": "TCS.NS",        "base": 3900, "vol": 0.016, "seed": 2},
    "INFY":       {"name": "Infosys",               "sector": "IT",           "yf": "INFY.NS",       "base": 1720, "vol": 0.020, "seed": 3},
    "HDFCBANK":   {"name": "HDFC Bank",             "sector": "Banking",      "yf": "HDFCBANK.NS",   "base": 1680, "vol": 0.017, "seed": 4},
    "WIPRO":      {"name": "Wipro",                 "sector": "IT",           "yf": "WIPRO.NS",      "base": 480,  "vol": 0.022, "seed": 5},
    "ITC":        {"name": "ITC Limited",           "sector": "FMCG",         "yf": "ITC.NS",        "base": 448,  "vol": 0.014, "seed": 6},
    "TATAMOTORS": {"name": "Tata Motors",           "sector": "Auto",         "yf": "TATAMOTORS.NS", "base": 870,  "vol": 0.025, "seed": 7},
    "SBIN":       {"name": "State Bank of India",   "sector": "Banking",      "yf": "SBIN.NS",       "base": 790,  "vol": 0.020, "seed": 8},
    "BAJFINANCE": {"name": "Bajaj Finance",         "sector": "Finance",      "yf": "BAJFINANCE.NS", "base": 6900, "vol": 0.021, "seed": 9},
    "HINDUNILVR": {"name": "Hindustan Unilever",    "sector": "FMCG",         "yf": "HINDUNILVR.NS", "base": 2340, "vol": 0.013, "seed": 10},
    "SUNPHARMA":  {"name": "Sun Pharma",            "sector": "Pharma",       "yf": "SUNPHARMA.NS",  "base": 1620, "vol": 0.019, "seed": 11},
    "ADANIENT":   {"name": "Adani Enterprises",     "sector": "Conglomerate", "yf": "ADANIENT.NS",   "base": 2420, "vol": 0.030, "seed": 12},
}


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS stocks (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol  TEXT NOT NULL,
            date    TEXT NOT NULL,
            open    REAL,
            high    REAL,
            low     REAL,
            close   REAL,
            volume  INTEGER,
            UNIQUE(symbol, date)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sd ON stocks(symbol, date)")
    conn.commit()
    conn.close()


# ─── Mock data generator (deterministic seeded random walk) ───────────────────

def _lcg(seed: int):
    s = seed
    def rng():
        nonlocal s
        s = (1664525 * s + 1013904223) & 0xFFFFFFFF
        return (s & 0xFFFFFFFF) / 4294967296.0
    return rng


def _gauss(rng):
    u, v = 0.0, 0.0
    while u == 0: u = rng()
    while v == 0: v = rng()
    return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)


def generate_mock_history(symbol: str) -> pd.DataFrame:
    meta  = COMPANIES[symbol]
    rng   = _lcg(meta["seed"] * 9999)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    trading_days = []
    d = today - timedelta(days=600)
    while len(trading_days) < 450:
        if d.weekday() < 5:
            trading_days.append(d)
        d += timedelta(days=1)

    price = float(meta["base"])
    rows  = []
    for dt in trading_days:
        ret   = 0.00012 + meta["vol"] * _gauss(rng)
        open_ = price
        price = max(price * (1 + ret), meta["base"] * 0.4)
        close = price
        hi    = max(open_, close) * (1 + abs(_gauss(rng)) * 0.007)
        lo    = min(open_, close) * (1 - abs(_gauss(rng)) * 0.007)
        vol   = int(max((300_000 + _gauss(rng) * 70_000) * (meta["base"] / 100), 50_000))
        rows.append({
            "symbol": symbol,
            "date":   dt.strftime("%Y-%m-%d"),
            "open":   round(open_, 2),
            "high":   round(hi, 2),
            "low":    round(lo, 2),
            "close":  round(close, 2),
            "volume": vol,
        })
    return pd.DataFrame(rows)


# ─── Real data via yfinance ───────────────────────────────────────────────────

def fetch_yfinance(symbol: str, yf_ticker: str) -> pd.DataFrame:
    try:
        import yfinance as yf
        df = yf.Ticker(yf_ticker).history(period="1y", auto_adjust=True)
        if df.empty:
            return pd.DataFrame()
        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df.columns = ["open", "high", "low", "close", "volume"]
        df.index   = pd.to_datetime(df.index).tz_localize(None)
        df.index.name = "date"
        df.dropna(subset=["open", "close"], inplace=True)
        df.ffill(inplace=True)
        df = df[(df["close"] > 0) & (df["open"] > 0)]
        df["symbol"] = symbol
        df.reset_index(inplace=True)
        df["date"]   = df["date"].dt.strftime("%Y-%m-%d")
        df["volume"] = df["volume"].fillna(0).astype(int)
        return df[["symbol", "date", "open", "high", "low", "close", "volume"]]
    except Exception as e:
        logger.warning(f"yfinance failed for {symbol}: {e}")
        return pd.DataFrame()


def store(df: pd.DataFrame):
    if df.empty:
        return
    conn = get_db_connection()
    df.to_sql("_tmp", conn, if_exists="replace", index=False)
    conn.execute("""
        INSERT OR IGNORE INTO stocks(symbol,date,open,high,low,close,volume)
        SELECT symbol,date,open,high,low,close,volume FROM _tmp
    """)
    conn.execute("DROP TABLE IF EXISTS _tmp")
    conn.commit()
    conn.close()


def fetch_and_store_all():
    """Try yfinance; fall back to deterministic mock data on any failure."""
    init_db()
    for symbol, meta in COMPANIES.items():
        logger.info(f"Fetching {symbol}…")
        df = fetch_yfinance(symbol, meta["yf"])
        if df.empty:
            logger.info(f"  → using mock data for {symbol}")
            df = generate_mock_history(symbol)
        store(df)
        logger.info(f"  → {len(df)} rows stored for {symbol}")
