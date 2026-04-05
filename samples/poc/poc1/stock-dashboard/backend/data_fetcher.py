"""
data_fetcher.py — Data Collection & Preparation
Fetches NSE stock data via yfinance, cleans it, and stores in SQLite.
"""

import sqlite3
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import os

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "stocks.db")

# ──────────────────────────────────────────────
# Company Registry (NSE symbols via yfinance)
# ──────────────────────────────────────────────
COMPANIES = {
    "RELIANCE":    {"name": "Reliance Industries",  "sector": "Energy",       "yf": "RELIANCE.NS"},
    "TCS":         {"name": "Tata Consultancy Svcs","sector": "IT",           "yf": "TCS.NS"},
    "INFY":        {"name": "Infosys",              "sector": "IT",           "yf": "INFY.NS"},
    "HDFCBANK":    {"name": "HDFC Bank",            "sector": "Banking",      "yf": "HDFCBANK.NS"},
    "WIPRO":       {"name": "Wipro",                "sector": "IT",           "yf": "WIPRO.NS"},
    "ITC":         {"name": "ITC Limited",          "sector": "FMCG",        "yf": "ITC.NS"},
    "TATAMOTORS":  {"name": "Tata Motors",          "sector": "Auto",        "yf": "TATAMOTORS.NS"},
    "SBIN":        {"name": "State Bank of India",  "sector": "Banking",     "yf": "SBIN.NS"},
    "BAJFINANCE":  {"name": "Bajaj Finance",        "sector": "Finance",     "yf": "BAJFINANCE.NS"},
    "HINDUNILVR":  {"name": "Hindustan Unilever",   "sector": "FMCG",       "yf": "HINDUNILVR.NS"},
    "SUNPHARMA":   {"name": "Sun Pharma",           "sector": "Pharma",      "yf": "SUNPHARMA.NS"},
    "ADANIENT":    {"name": "Adani Enterprises",    "sector": "Conglomerate","yf": "ADANIENT.NS"},
}


# ──────────────────────────────────────────────
# Database Setup
# ──────────────────────────────────────────────

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
    conn.execute("CREATE INDEX IF NOT EXISTS idx_symbol_date ON stocks(symbol, date)")
    conn.commit()
    conn.close()


# ──────────────────────────────────────────────
# Data Fetching & Cleaning
# ──────────────────────────────────────────────

def fetch_stock(symbol: str, yf_ticker: str, period: str = "1y") -> pd.DataFrame:
    """Fetch OHLCV data from yfinance and return a clean DataFrame."""
    try:
        ticker = yf.Ticker(yf_ticker)
        df     = ticker.history(period=period, auto_adjust=True)

        if df.empty:
            logger.warning(f"No data returned for {symbol} ({yf_ticker})")
            return pd.DataFrame()

        # ── Clean ──────────────────────────────
        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df.columns = ["open", "high", "low", "close", "volume"]
        df.index   = pd.to_datetime(df.index).tz_localize(None)
        df.index.name = "date"

        # Drop rows where all price cols are NaN
        df.dropna(subset=["open", "high", "low", "close"], how="all", inplace=True)

        # Forward-fill remaining NaNs (e.g. volume gaps)
        df.ffill(inplace=True)

        # Remove obviously wrong prices (zero or negative)
        df = df[(df["close"] > 0) & (df["open"] > 0)]

        df["symbol"] = symbol
        df.reset_index(inplace=True)
        df["date"] = df["date"].dt.strftime("%Y-%m-%d")
        df["volume"] = df["volume"].fillna(0).astype(int)

        return df[["symbol", "date", "open", "high", "low", "close", "volume"]]

    except Exception as e:
        logger.error(f"Failed to fetch {symbol}: {e}")
        return pd.DataFrame()


def store_stock(df: pd.DataFrame):
    """Upsert stock rows into SQLite."""
    if df.empty:
        return
    conn = get_db_connection()
    df.to_sql("stocks_tmp", conn, if_exists="replace", index=False)
    conn.execute("""
        INSERT OR IGNORE INTO stocks (symbol, date, open, high, low, close, volume)
        SELECT symbol, date, open, high, low, close, volume FROM stocks_tmp
    """)
    conn.execute("DROP TABLE IF EXISTS stocks_tmp")
    conn.commit()
    conn.close()


def fetch_and_store_all():
    """Main entry point: initialise DB and refresh all company data."""
    init_db()
    for symbol, meta in COMPANIES.items():
        logger.info(f"Fetching {symbol} ({meta['yf']})…")
        df = fetch_stock(symbol, meta["yf"])
        store_stock(df)
        logger.info(f"  → {len(df)} rows stored for {symbol}")
