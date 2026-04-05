"""
PULSE Market Intelligence — FastAPI Backend
"""
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3, pandas as pd, numpy as np
from datetime import datetime, timedelta
import logging, os

from data_fetcher import fetch_and_store_all, get_db, COMPANIES, init_db
from ai_providers  import chat as ai_chat, PROVIDER_DEFAULTS

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="PULSE API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    log.info("Initialising data…")
    fetch_and_store_all()
    log.info("Ready.")

# ── helpers ───────────────────────────────────────────────────────────────────
def qdf(sql, params=()):
    conn = get_db(); df = pd.read_sql_query(sql, conn, params=params); conn.close(); return df

def add_metrics(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["date"]   = pd.to_datetime(df["date"])
    df["return"] = ((df["close"] - df["open"]) / df["open"] * 100).round(4)
    df["ma7"]    = df["close"].rolling(7).mean().round(2)
    df["ma20"]   = df["close"].rolling(20).mean().round(2)
    df["ma50"]   = df["close"].rolling(50).mean().round(2)
    # Bollinger bands (20-period)
    df["bb_mid"] = df["ma20"]
    std = df["close"].rolling(20).std()
    df["bb_up"]  = (df["ma20"] + 2 * std).round(2)
    df["bb_dn"]  = (df["ma20"] - 2 * std).round(2)
    # Volume z-score momentum
    vmean = df["volume"].mean(); vstd = df["volume"].std() + 1
    vz    = (df["volume"] - vmean) / vstd
    dr    = df["return"].clip(-5, 5) / 5
    df["momentum"] = (0.6 * dr * 50 + 50 + 0.4 * vz.clip(-3, 3) / 3 * 50).clip(0, 100).round(2)
    # RSI (14)
    delta = df["close"].diff()
    gain  = delta.where(delta > 0, 0).rolling(14).mean()
    loss  = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs    = gain / (loss + 1e-9)
    df["rsi"] = (100 - 100 / (1 + rs)).round(2)
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    return df.replace({np.nan: None})

# ── endpoints ─────────────────────────────────────────────────────────────────

@app.get("/companies")
def get_companies():
    conn = get_db(); cur = conn.cursor(); rows = []
    for sym, meta in COMPANIES.items():
        cur.execute("SELECT close, open, volume, date FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2", (sym,))
        rec = cur.fetchall()
        latest = prev = None; chg = None; vol = 0
        if len(rec) >= 2:
            latest, prev = rec[0][0], rec[1][0]
            chg = round((latest - prev) / prev * 100, 2) if prev else None
            vol = rec[0][2] or 0
        elif len(rec) == 1:
            latest = rec[0][0]; vol = rec[0][2] or 0
        rows.append({
            "symbol": sym, "name": meta["name"], "sector": meta["sector"],
            "close": latest, "prev_close": prev,
            "change_pct": chg, "volume": vol,
            "pe": meta.get("pe"), "pb": meta.get("pb"),
            "div_yield": meta.get("div"), "market_cap_lakh_cr": meta.get("cap"),
        })
    conn.close(); return rows

@app.get("/data/{symbol}")
def get_data(symbol: str, days: int = Query(30, ge=1, le=730)):
    symbol = symbol.upper()
    if symbol not in COMPANIES: raise HTTPException(404, f"Unknown symbol {symbol}")
    since = (datetime.utcnow() - timedelta(days=days + 60)).strftime("%Y-%m-%d")
    df = qdf("SELECT * FROM stocks WHERE symbol=? AND date>=? ORDER BY date ASC", (symbol, since))
    if df.empty: raise HTTPException(404, "No data")
    df = add_metrics(df).tail(days)
    return df.to_dict(orient="records")

@app.get("/summary/{symbol}")
def get_summary(symbol: str):
    symbol = symbol.upper()
    if symbol not in COMPANIES: raise HTTPException(404)
    since = (datetime.utcnow() - timedelta(days=365)).strftime("%Y-%m-%d")
    df = qdf("SELECT date,open,high,low,close,volume FROM stocks WHERE symbol=? AND date>=? ORDER BY date", (symbol, since))
    if df.empty: raise HTTPException(404, "No data")
    df2 = add_metrics(df)
    cl  = df["close"].values
    ret = pd.Series(cl).pct_change().dropna()
    meta = COMPANIES[symbol]
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT close FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2", (symbol,))
    rec = cur.fetchall(); conn.close()
    latest = rec[0][0] if rec else None
    prev   = rec[1][0] if len(rec) > 1 else None
    return {
        "symbol": symbol, "name": meta["name"], "sector": meta["sector"],
        "latest_close":     latest,
        "prev_close":       prev,
        "change_pct":       round((latest - prev) / prev * 100, 2) if latest and prev else None,
        "week52_high":      round(float(df["high"].max()), 2),
        "week52_low":       round(float(df["low"].min()), 2),
        "avg_close":        round(float(df["close"].mean()), 2),
        "total_return_pct": round((float(cl[-1]) - float(cl[0])) / float(cl[0]) * 100, 2),
        "volatility_pct":   round(float(ret.std() * np.sqrt(252) * 100), 2),
        "avg_volume":       int(df["volume"].mean()),
        "current_rsi":      round(float(df2["rsi"].dropna().iloc[-1]), 2) if not df2["rsi"].dropna().empty else None,
        "pe":               meta.get("pe"),
        "pb":               meta.get("pb"),
        "div_yield":        meta.get("div"),
        "market_cap_lakh_cr": meta.get("cap"),
        "data_from": str(df["date"].iloc[0]), "data_to": str(df["date"].iloc[-1]),
    }

@app.get("/compare")
def compare(symbol1: str, symbol2: str, days: int = Query(90, ge=7, le=730)):
    s1, s2 = symbol1.upper(), symbol2.upper()
    for s in (s1, s2):
        if s not in COMPANIES: raise HTTPException(404, f"Unknown {s}")
    since = (datetime.utcnow() - timedelta(days=days + 10)).strftime("%Y-%m-%d")
    def load(s):
        df = qdf("SELECT date,close FROM stocks WHERE symbol=? AND date>=? ORDER BY date", (s, since))
        df = df.tail(days)
        if df.empty or len(df) < 2: raise HTTPException(404, f"Insufficient data for {s}")
        df = df.reset_index(drop=True)
        df["norm"] = df["close"] / df["close"].iloc[0] * 100
        return df
    d1, d2 = load(s1), load(s2)
    merged  = pd.merge(d1, d2, on="date", suffixes=(f"_{s1}", f"_{s2}"))
    r1 = merged[f"close_{s1}"].pct_change().dropna()
    r2 = merged[f"close_{s2}"].pct_change().dropna()
    corr = float(r1.corr(r2))
    series = merged.apply(lambda row: {
        "date": row["date"],
        f"norm_{s1}": round(row[f"norm_{s1}"], 2),
        f"norm_{s2}": round(row[f"norm_{s2}"], 2),
    }, axis=1).tolist()
    return {
        "symbol1": s1, "symbol2": s2, "correlation": round(corr, 4),
        "return1_pct": round((d1["close"].iloc[-1] - d1["close"].iloc[0]) / d1["close"].iloc[0] * 100, 2),
        "return2_pct": round((d2["close"].iloc[-1] - d2["close"].iloc[0]) / d2["close"].iloc[0] * 100, 2),
        "days": days, "series": series,
    }

@app.get("/movers")
def movers(n: int = Query(5, ge=1, le=15)):
    conn = get_db(); cur = conn.cursor(); res = []
    for sym, meta in COMPANIES.items():
        cur.execute("SELECT close FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2", (sym,))
        rec = cur.fetchall()
        if len(rec) < 2: continue
        chg = (rec[0][0] - rec[1][0]) / rec[1][0] * 100
        res.append({"symbol": sym, "name": meta["name"], "sector": meta["sector"],
                    "close": round(rec[0][0], 2), "change_pct": round(chg, 2)})
    conn.close()
    res.sort(key=lambda x: x["change_pct"], reverse=True)
    return {"gainers": res[:n], "losers": res[-n:][::-1]}

@app.get("/sectors")
def sectors():
    conn = get_db(); cur = conn.cursor()
    sec_data = {}
    for sym, meta in COMPANIES.items():
        cur.execute("SELECT close FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2", (sym,))
        rec = cur.fetchall()
        if len(rec) < 2: continue
        chg = (rec[0][0] - rec[1][0]) / rec[1][0] * 100
        s = meta["sector"]
        sec_data.setdefault(s, []).append(chg)
    conn.close()
    return [{"sector": s, "avg_change": round(sum(v)/len(v), 2), "count": len(v)}
            for s, v in sec_data.items()]

@app.post("/refresh")
async def refresh(bg: BackgroundTasks):
    bg.add_task(fetch_and_store_all)
    return {"message": "Refresh started"}

@app.get("/providers")
def list_providers():
    return [
        {"id": "ollama",     "name": "Ollama (Local)",  "needs_key": False, "models": ["llama3", "llama3.1", "mistral", "gemma2"]},
        {"id": "anthropic",  "name": "Anthropic",       "needs_key": True,  "models": ["claude-sonnet-4-5", "claude-opus-4-5", "claude-haiku-4-5-20251001"]},
        {"id": "openai",     "name": "OpenAI",          "needs_key": True,  "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]},
        {"id": "openrouter", "name": "OpenRouter",      "needs_key": True,  "models": ["meta-llama/llama-3-8b-instruct","anthropic/claude-3.5-sonnet","openai/gpt-4o"]},
    ]

class ChatReq(BaseModel):
    provider: str = "ollama"
    model:    str = "llama3"
    messages: list[dict]
    system:   str = ""
    api_key:  str = ""
    base_url: str = ""

@app.post("/ai/chat")
async def ai_endpoint(req: ChatReq):
    key = req.api_key.strip() or os.environ.get(
        {"anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY",
         "openrouter": "OPENROUTER_API_KEY"}.get(req.provider, ""), "")
    base = req.base_url.strip() or os.environ.get("OLLAMA_BASE_URL", "") if req.provider == "ollama" else ""
    try:
        text = await ai_chat(provider=req.provider, model=req.model,
                             messages=req.messages, system=req.system,
                             api_key=key, base_url=base)
        return {"reply": text}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/")
def root(): return {"status": "ok", "docs": "/docs"}
