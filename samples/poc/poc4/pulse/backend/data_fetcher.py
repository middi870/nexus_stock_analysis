"""
data_fetcher.py — Fetch NSE data via yfinance; fall back to seeded mock.
"""
import sqlite3, math, os, logging
from datetime import datetime, timedelta
import pandas as pd

log = logging.getLogger(__name__)
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "data", "stocks.db"))

COMPANIES = {
    "RELIANCE":   {"name": "Reliance Industries",   "sector": "Energy",       "yf": "RELIANCE.NS",   "base": 2850, "vol": 0.018, "seed": 1,  "pe": 28.4, "pb": 2.1, "div": 0.4,  "cap": 19.3},
    "TCS":        {"name": "Tata Consultancy Svcs", "sector": "IT",           "yf": "TCS.NS",        "base": 3900, "vol": 0.016, "seed": 2,  "pe": 30.1, "pb": 13.2,"div": 1.8,  "cap": 14.1},
    "INFY":       {"name": "Infosys",               "sector": "IT",           "yf": "INFY.NS",       "base": 1720, "vol": 0.020, "seed": 3,  "pe": 24.7, "pb": 8.4, "div": 2.1,  "cap": 7.2},
    "HDFCBANK":   {"name": "HDFC Bank",             "sector": "Banking",      "yf": "HDFCBANK.NS",   "base": 1680, "vol": 0.017, "seed": 4,  "pe": 19.2, "pb": 2.8, "div": 1.2,  "cap": 12.8},
    "WIPRO":      {"name": "Wipro",                 "sector": "IT",           "yf": "WIPRO.NS",      "base": 480,  "vol": 0.022, "seed": 5,  "pe": 20.3, "pb": 3.9, "div": 0.2,  "cap": 2.5},
    "ITC":        {"name": "ITC Limited",           "sector": "FMCG",         "yf": "ITC.NS",        "base": 448,  "vol": 0.014, "seed": 6,  "pe": 26.8, "pb": 7.1, "div": 3.4,  "cap": 5.6},
    "TATAMOTORS": {"name": "Tata Motors",           "sector": "Auto",         "yf": "TATAMOTORS.NS", "base": 870,  "vol": 0.025, "seed": 7,  "pe": 12.4, "pb": 3.2, "div": 0.0,  "cap": 3.2},
    "SBIN":       {"name": "State Bank of India",   "sector": "Banking",      "yf": "SBIN.NS",       "base": 790,  "vol": 0.020, "seed": 8,  "pe": 10.1, "pb": 1.5, "div": 1.8,  "cap": 7.1},
    "BAJFINANCE": {"name": "Bajaj Finance",         "sector": "Finance",      "yf": "BAJFINANCE.NS", "base": 6900, "vol": 0.021, "seed": 9,  "pe": 32.7, "pb": 6.8, "div": 0.3,  "cap": 4.3},
    "HINDUNILVR": {"name": "Hindustan Unilever",    "sector": "FMCG",         "yf": "HINDUNILVR.NS", "base": 2340, "vol": 0.013, "seed": 10, "pe": 56.2, "pb": 11.4,"div": 1.6,  "cap": 5.5},
    "SUNPHARMA":  {"name": "Sun Pharmaceutical",   "sector": "Pharma",       "yf": "SUNPHARMA.NS",  "base": 1620, "vol": 0.019, "seed": 11, "pe": 38.4, "pb": 6.3, "div": 0.4,  "cap": 3.9},
    "ADANIENT":   {"name": "Adani Enterprises",     "sector": "Conglomerate", "yf": "ADANIENT.NS",   "base": 2420, "vol": 0.030, "seed": 12, "pe": 88.1, "pb": 5.2, "div": 0.0,  "cap": 2.8},
    "AXISBANK":   {"name": "Axis Bank",             "sector": "Banking",      "yf": "AXISBANK.NS",   "base": 1050, "vol": 0.021, "seed": 13, "pe": 14.6, "pb": 2.1, "div": 0.1,  "cap": 3.2},
    "KOTAKBANK":  {"name": "Kotak Mahindra Bank",   "sector": "Banking",      "yf": "KOTAKBANK.NS",  "base": 1780, "vol": 0.018, "seed": 14, "pe": 22.3, "pb": 3.4, "div": 0.1,  "cap": 3.5},
    "MARUTI":     {"name": "Maruti Suzuki India",   "sector": "Auto",         "yf": "MARUTI.NS",     "base": 11200,"vol": 0.019, "seed": 15, "pe": 28.6, "pb": 4.9, "div": 0.4,  "cap": 3.4},
    "LT":         {"name": "Larsen & Toubro",       "sector": "Infra",        "yf": "LT.NS",         "base": 3450, "vol": 0.020, "seed": 16, "pe": 32.1, "pb": 4.8, "div": 1.1,  "cap": 4.7},
    "ULTRACEMCO": {"name": "UltraTech Cement",      "sector": "Materials",    "yf": "ULTRACEMCO.NS", "base": 10800,"vol": 0.021, "seed": 17, "pe": 45.3, "pb": 6.2, "div": 0.4,  "cap": 3.1},
    "ONGC":       {"name": "Oil & Natural Gas Corp","sector": "Energy",       "yf": "ONGC.NS",       "base": 265,  "vol": 0.022, "seed": 18, "pe": 7.4,  "pb": 1.1, "div": 5.2,  "cap": 3.3},
    "POWERGRID":  {"name": "Power Grid Corp",       "sector": "Utilities",    "yf": "POWERGRID.NS",  "base": 310,  "vol": 0.016, "seed": 19, "pe": 18.2, "pb": 2.8, "div": 4.1,  "cap": 2.9},
    "NTPC":       {"name": "NTPC Limited",          "sector": "Utilities",    "yf": "NTPC.NS",       "base": 360,  "vol": 0.018, "seed": 20, "pe": 16.8, "pb": 2.2, "div": 3.8,  "cap": 3.5},
}

# ── DB ────────────────────────────────────────────────────────────────────────
def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS stocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL, date TEXT NOT NULL,
            open REAL, high REAL, low REAL, close REAL, volume INTEGER,
            UNIQUE(symbol, date)
        );
        CREATE INDEX IF NOT EXISTS idx_sd ON stocks(symbol, date);
    """)
    conn.commit(); conn.close()

# ── Mock generator ────────────────────────────────────────────────────────────
def _lcg(seed):
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

def mock_history(symbol: str) -> pd.DataFrame:
    m   = COMPANIES[symbol]
    rng = _lcg(m["seed"] * 9999)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    days, d = [], today - timedelta(days=700)
    while len(days) < 510:
        if d.weekday() < 5: days.append(d)
        d += timedelta(days=1)
    price, rows = float(m["base"]), []
    for dt in days:
        ret   = 0.00012 + m["vol"] * _gauss(rng)
        op    = price
        price = max(price * (1 + ret), m["base"] * 0.4)
        cl    = price
        hi    = max(op, cl) * (1 + abs(_gauss(rng)) * 0.007)
        lo    = min(op, cl) * (1 - abs(_gauss(rng)) * 0.007)
        vol   = int(max((300_000 + _gauss(rng) * 80_000) * (m["base"] / 100), 50_000))
        rows.append({"symbol": symbol, "date": dt.strftime("%Y-%m-%d"),
                     "open": round(op, 2), "high": round(hi, 2),
                     "low": round(lo, 2), "close": round(cl, 2), "volume": vol})
    return pd.DataFrame(rows)

# ── yfinance ──────────────────────────────────────────────────────────────────
def fetch_yf(symbol: str, yf_ticker: str) -> pd.DataFrame:
    try:
        import yfinance as yf
        df = yf.Ticker(yf_ticker).history(period="2y", auto_adjust=True)
        if df.empty: return pd.DataFrame()
        df = df[["Open","High","Low","Close","Volume"]].copy()
        df.columns = ["open","high","low","close","volume"]
        df.index   = pd.to_datetime(df.index).tz_localize(None)
        df.index.name = "date"
        df.dropna(subset=["close"], inplace=True); df.ffill(inplace=True)
        df = df[df["close"] > 0]
        df["symbol"] = symbol; df.reset_index(inplace=True)
        df["date"]   = df["date"].dt.strftime("%Y-%m-%d")
        df["volume"] = df["volume"].fillna(0).astype(int)
        return df[["symbol","date","open","high","low","close","volume"]]
    except Exception as e:
        log.warning(f"yfinance failed for {symbol}: {e}")
        return pd.DataFrame()

def store(df: pd.DataFrame):
    if df.empty: return
    conn = get_db()
    df.to_sql("_tmp", conn, if_exists="replace", index=False)
    conn.execute("INSERT OR IGNORE INTO stocks(symbol,date,open,high,low,close,volume) SELECT symbol,date,open,high,low,close,volume FROM _tmp")
    conn.execute("DROP TABLE IF EXISTS _tmp")
    conn.commit(); conn.close()

def fetch_and_store_all():
    init_db()
    for sym, meta in COMPANIES.items():
        log.info(f"Fetching {sym}…")
        df = fetch_yf(sym, meta["yf"])
        if df.empty:
            log.info(f"  → mock data for {sym}")
            df = mock_history(sym)
        store(df)
        log.info(f"  → {len(df)} rows for {sym}")
