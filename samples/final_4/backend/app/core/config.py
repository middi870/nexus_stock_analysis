"""
NEXUS — NSE Intelligence Platform
Centralised settings, all values overridable via env vars.
"""
import os

class Settings:
    APP_NAME: str  = "NEXUS — NSE Intelligence Platform"
    VERSION:  str  = "1.0.0"
    DESCRIPTION: str = (
        "Production-grade NSE/BSE stock analytics platform with real-time "
        "indicators, AI-powered analysis, and multi-provider LLM integration."
    )

    # ── Storage ──────────────────────────────────────────────────────────────
    # On Railway: mount a persistent volume at /data and set DB_PATH=/data/nexus.db
    DB_PATH: str = os.getenv("DB_PATH", "/data/nexus.db")

    # ── AI Providers ─────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY:  str = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY:     str = os.getenv("OPENAI_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OLLAMA_BASE_URL:    str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    # ── Server ────────────────────────────────────────────────────────────────
    PORT:       int  = int(os.getenv("PORT", 8000))
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")   # space-sep list in prod

    # ── Cache TTLs (seconds) ──────────────────────────────────────────────────
    TTL_COMPANIES: int = 30
    TTL_DATA:      int = 60
    TTL_SUMMARY:   int = 30
    TTL_MOVERS:    int = 20
    TTL_SECTORS:   int = 30
    TTL_SCREENER:  int = 15


settings = Settings()
