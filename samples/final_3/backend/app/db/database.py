"""
NEXUS — Database layer.
SQLite via stdlib sqlite3 — zero external dependencies, portable.
On Railway, point DB_PATH to a persistent volume (e.g. /data/nexus.db).
"""
import sqlite3, os, logging
from app.core.config import settings

log = logging.getLogger(__name__)


def get_conn() -> sqlite3.Connection:
    """Return a new sqlite3 connection (row_factory set)."""
    os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
    conn = sqlite3.connect(settings.DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")   # concurrent readers
    conn.execute("PRAGMA synchronous=NORMAL")  # safe + fast
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Create all tables and indexes (idempotent)."""
    conn = get_conn()
    conn.executescript("""
        -- ── OHLCV + derived metrics ──────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS stocks (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol  TEXT    NOT NULL,
            date    TEXT    NOT NULL,
            open    REAL,
            high    REAL,
            low     REAL,
            close   REAL,
            volume  INTEGER,
            UNIQUE(symbol, date)
        );
        CREATE INDEX IF NOT EXISTS idx_stocks_sd   ON stocks(symbol, date);
        CREATE INDEX IF NOT EXISTS idx_stocks_date ON stocks(date);

        -- ── AI conversation history ───────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS conversations (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT    NOT NULL,
            symbol          TEXT,
            provider        TEXT,
            model           TEXT,
            role            TEXT    NOT NULL,   -- 'user' | 'assistant'
            content         TEXT    NOT NULL,
            created_at      TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );
        CREATE INDEX IF NOT EXISTS idx_conv_id  ON conversations(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_conv_sym ON conversations(symbol, created_at);

        -- ── Ingestion metadata ────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS ingestion_log (
            symbol      TEXT PRIMARY KEY,
            last_run    TEXT,
            rows_stored INTEGER,
            source      TEXT   -- 'yfinance' | 'mock'
        );
    """)
    conn.commit()
    conn.close()
    log.info("Database initialised at %s", settings.DB_PATH)
