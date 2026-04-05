"""
NEXUS — Market data ingestion.
Strategy: try yfinance (real NSE data) → fall back to deterministic mock.
Mock uses an LCG + Box-Muller so the same seed always yields the same series —
useful for development, demos, and environments without internet access.
"""
import math, logging
from datetime import datetime, timedelta

import pandas as pd

from app.core.constants import COMPANIES
from app.db.database import get_conn

log = logging.getLogger(__name__)


# ── LCG random number generator (deterministic, no numpy needed) ──────────────

def _lcg(seed: int):
    s = seed
    def rng() -> float:
        nonlocal s
        s = (1_664_525 * s + 1_013_904_223) & 0xFFFF_FFFF
        return s / 4_294_967_296.0
    return rng


def _gauss(rng) -> float:
    u, v = 0.0, 0.0
    while u == 0: u = rng()
    while v == 0: v = rng()
    return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)


# ── Mock history ──────────────────────────────────────────────────────────────

def mock_history(symbol: str) -> pd.DataFrame:
    """Generate 510 trading days of plausible OHLCV data for `symbol`."""
    m   = COMPANIES[symbol]
    rng = _lcg(m["seed"] * 9_999)

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    days:  list[datetime] = []
    d = today - timedelta(days=700)
    while len(days) < 510:
        if d.weekday() < 5:
            days.append(d)
        d += timedelta(days=1)

    price = float(m["base"])
    rows  = []
    for dt in days:
        ret   = 0.00012 + m["vol"] * _gauss(rng)
        op    = price
        price = max(price * (1 + ret), m["base"] * 0.4)
        cl    = price
        hi    = max(op, cl) * (1 + abs(_gauss(rng)) * 0.007)
        lo    = min(op, cl) * (1 - abs(_gauss(rng)) * 0.007)
        vol   = int(max((300_000 + _gauss(rng) * 80_000) * (m["base"] / 100), 50_000))
        rows.append({
            "symbol": symbol,
            "date":   dt.strftime("%Y-%m-%d"),
            "open":   round(op, 2), "high": round(hi, 2),
            "low":    round(lo, 2), "close": round(cl, 2),
            "volume": vol,
        })
    return pd.DataFrame(rows)


# ── yfinance fetch ────────────────────────────────────────────────────────────

def fetch_yfinance(symbol: str, yf_ticker: str) -> pd.DataFrame:
    try:
        import yfinance as yf
        df = yf.Ticker(yf_ticker).history(period="2y", auto_adjust=True)
        if df.empty:
            return pd.DataFrame()
        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df.columns = ["open", "high", "low", "close", "volume"]
        df.index = pd.to_datetime(df.index).tz_localize(None)
        df.index.name = "date"
        df.dropna(subset=["close"], inplace=True)
        df.ffill(inplace=True)
        df = df[df["close"] > 0]
        df["symbol"] = symbol
        df.reset_index(inplace=True)
        df["date"]   = df["date"].dt.strftime("%Y-%m-%d")
        df["volume"] = df["volume"].fillna(0).astype(int)
        return df[["symbol", "date", "open", "high", "low", "close", "volume"]]
    except Exception as exc:
        log.warning("yfinance failed for %s: %s", symbol, exc)
        return pd.DataFrame()


# ── Store to SQLite ───────────────────────────────────────────────────────────

def store_ohlcv(df: pd.DataFrame) -> int:
    if df.empty:
        return 0
    conn = get_conn()
    # Bulk upsert via temp table
    df.to_sql("_tmp_ohlcv", conn, if_exists="replace", index=False)
    conn.execute("""
        INSERT OR IGNORE INTO stocks(symbol, date, open, high, low, close, volume)
        SELECT symbol, date, open, high, low, close, volume FROM _tmp_ohlcv
    """)
    conn.execute("DROP TABLE IF EXISTS _tmp_ohlcv")
    conn.commit()
    rows = conn.execute("SELECT changes()").fetchone()[0]
    conn.close()
    return rows


# ── Ingestion orchestrator ────────────────────────────────────────────────────

def ingest_all() -> dict[str, str]:
    """Fetch + store all companies. Returns per-symbol source info."""
    from app.db.database import init_db
    init_db()
    report: dict[str, str] = {}

    for sym, meta in COMPANIES.items():
        log.info("Ingesting %s …", sym)
        df = fetch_yfinance(sym, meta["yf"])
        source = "yfinance"
        if df.empty:
            log.info("  → falling back to mock for %s", sym)
            df     = mock_history(sym)
            source = "mock"

        n = store_ohlcv(df)

        # Update ingestion log
        conn = get_conn()
        conn.execute("""
            INSERT INTO ingestion_log(symbol, last_run, rows_stored, source)
            VALUES (?, strftime('%Y-%m-%dT%H:%M:%SZ','now'), ?, ?)
            ON CONFLICT(symbol) DO UPDATE SET
                last_run    = excluded.last_run,
                rows_stored = excluded.rows_stored,
                source      = excluded.source
        """, (sym, n, source))
        conn.commit()
        conn.close()

        log.info("  ✓ %s — %d rows stored (%s)", sym, n, source)
        report[sym] = source

    return report
