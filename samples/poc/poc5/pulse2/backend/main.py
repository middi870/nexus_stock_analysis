"""
PULSE v2 — FastAPI Backend
Advanced indicators, screener, SSE streaming AI, smart caching.
"""
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import sqlite3, pandas as pd, numpy as np
from datetime import datetime, timedelta
import logging, os, json, asyncio, httpx
from data_fetcher import fetch_and_store_all, get_db, COMPANIES, init_db
from ai_providers import PROVIDER_DEFAULTS

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="PULSE v2 API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    log.info("Initialising…"); fetch_and_store_all(); log.info("Ready.")

# ── DB helpers ────────────────────────────────────────────────────────────────
def qdf(sql, params=()):
    conn = get_db(); df = pd.read_sql_query(sql, conn, params=params); conn.close(); return df

def add_metrics(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    cl = df["close"]
    # Basic
    df["return"]  = ((cl - df["open"]) / df["open"] * 100).round(4)
    df["ma7"]     = cl.rolling(7).mean().round(2)
    df["ma20"]    = cl.rolling(20).mean().round(2)
    df["ma50"]    = cl.rolling(50).mean().round(2)
    df["ma200"]   = cl.rolling(200).mean().round(2)
    # Bollinger
    std20         = cl.rolling(20).std()
    df["bb_mid"]  = df["ma20"]
    df["bb_up"]   = (df["ma20"] + 2*std20).round(2)
    df["bb_dn"]   = (df["ma20"] - 2*std20).round(2)
    df["bb_width"]= ((df["bb_up"] - df["bb_dn"]) / df["bb_mid"] * 100).round(2)
    # RSI-14
    delta         = cl.diff()
    gain          = delta.where(delta>0, 0).rolling(14).mean()
    loss          = (-delta.where(delta<0, 0)).rolling(14).mean()
    df["rsi"]     = (100 - 100/(1 + gain/(loss+1e-9))).round(2)
    # MACD (12,26,9)
    ema12         = cl.ewm(span=12, adjust=False).mean()
    ema26         = cl.ewm(span=26, adjust=False).mean()
    df["macd"]    = (ema12 - ema26).round(4)
    df["macd_sig"]= df["macd"].ewm(span=9, adjust=False).mean().round(4)
    df["macd_hist"]= (df["macd"] - df["macd_sig"]).round(4)
    # Stochastic (14,3)
    lo14          = df["low"].rolling(14).min()
    hi14          = df["high"].rolling(14).max()
    df["stoch_k"] = ((cl - lo14) / (hi14 - lo14 + 1e-9) * 100).round(2)
    df["stoch_d"] = df["stoch_k"].rolling(3).mean().round(2)
    # ATR-14
    hl  = df["high"] - df["low"]
    hcp = (df["high"] - cl.shift()).abs()
    lcp = (df["low"]  - cl.shift()).abs()
    df["atr"] = pd.concat([hl, hcp, lcp], axis=1).max(axis=1).rolling(14).mean().round(2)
    # OBV
    direction     = np.sign(cl.diff())
    df["obv"]     = (direction * df["volume"]).fillna(0).cumsum().astype(int)
    # Momentum score
    vmean = df["volume"].mean(); vstd = df["volume"].std()+1
    vz    = (df["volume"]-vmean)/vstd
    dr    = df["return"].clip(-5,5)/5
    df["momentum"] = (0.6*dr*50+50 + 0.4*vz.clip(-3,3)/3*50).clip(0,100).round(2)
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    return df.replace({np.nan: None, np.inf: None, -np.inf: None})

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/companies")
def get_companies():
    conn = get_db(); cur = conn.cursor(); rows = []
    for sym, meta in COMPANIES.items():
        cur.execute("SELECT close,open,volume,high,low FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2", (sym,))
        rec = cur.fetchall()
        lat = rec[0] if rec else None
        prv = rec[1] if len(rec)>1 else None
        chg = round((lat[0]-prv[0])/prv[0]*100,2) if lat and prv and prv[0] else None
        rows.append({
            "symbol":sym, "name":meta["name"], "sector":meta["sector"],
            "close":lat[0] if lat else None, "open":lat[1] if lat else None,
            "volume":lat[2] if lat else None, "high":lat[3] if lat else None,
            "low":lat[4] if lat else None,
            "prev_close":prv[0] if prv else None, "change_pct":chg,
            "pe":meta.get("pe"), "pb":meta.get("pb"),
            "div_yield":meta.get("div"), "mktcap":meta.get("cap"),
        })
    conn.close()
    return rows

@app.get("/data/{symbol}")
def get_data(symbol: str, days: int = Query(90, ge=1, le=730)):
    sym = symbol.upper()
    if sym not in COMPANIES: raise HTTPException(404, f"Unknown: {sym}")
    since = (datetime.utcnow()-timedelta(days=days+250)).strftime("%Y-%m-%d")
    df = qdf("SELECT * FROM stocks WHERE symbol=? AND date>=? ORDER BY date", (sym, since))
    if df.empty: raise HTTPException(404, "No data")
    df = add_metrics(df)
    return df.tail(days).to_dict(orient="records")

@app.get("/summary/{symbol}")
def get_summary(symbol: str):
    sym = symbol.upper()
    if sym not in COMPANIES: raise HTTPException(404)
    since = (datetime.utcnow()-timedelta(days=400)).strftime("%Y-%m-%d")
    df = qdf("SELECT * FROM stocks WHERE symbol=? AND date>=? ORDER BY date", (sym, since))
    if df.empty: raise HTTPException(404)
    df2 = add_metrics(df)
    yr  = df.tail(252)
    cl  = yr["close"].values
    ret = pd.Series(cl).pct_change().dropna()
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT close FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2",(sym,))
    rec = cur.fetchall(); conn.close()
    lat, prv = (rec[0][0] if rec else None), (rec[1][0] if len(rec)>1 else None)
    last_row = df2.iloc[-1]
    meta = COMPANIES[sym]
    return {
        "symbol":sym, "name":meta["name"], "sector":meta["sector"],
        "close":lat, "prev_close":prv,
        "change_pct":round((lat-prv)/prv*100,2) if lat and prv else None,
        "open":float(df["open"].iloc[-1]), "high":float(df["high"].iloc[-1]),
        "low":float(df["low"].iloc[-1]),
        "week52_high":round(float(yr["high"].max()),2),
        "week52_low":round(float(yr["low"].min()),2),
        "avg_close":round(float(yr["close"].mean()),2),
        "total_return_pct":round((float(cl[-1])-float(cl[0]))/float(cl[0])*100,2),
        "volatility_pct":round(float(ret.std()*np.sqrt(252)*100),2),
        "avg_volume":int(yr["volume"].mean()),
        "rsi":last_row.get("rsi"), "macd":last_row.get("macd"),
        "macd_signal":last_row.get("macd_sig"),
        "stoch_k":last_row.get("stoch_k"), "stoch_d":last_row.get("stoch_d"),
        "atr":last_row.get("atr"), "momentum":last_row.get("momentum"),
        "bb_width":last_row.get("bb_width"),
        "pe":meta.get("pe"), "pb":meta.get("pb"),
        "div_yield":meta.get("div"), "mktcap":meta.get("cap"),
        "data_from":str(df["date"].iloc[0]), "data_to":str(df["date"].iloc[-1]),
    }

@app.get("/compare")
def compare(symbol1:str, symbol2:str, days:int=Query(90,ge=7,le=730)):
    s1,s2 = symbol1.upper(), symbol2.upper()
    for s in (s1,s2):
        if s not in COMPANIES: raise HTTPException(404,f"Unknown {s}")
    since = (datetime.utcnow()-timedelta(days=days+5)).strftime("%Y-%m-%d")
    def load(s):
        df = qdf("SELECT date,close FROM stocks WHERE symbol=? AND date>=? ORDER BY date",(s,since))
        df = df.tail(days).reset_index(drop=True)
        if len(df)<2: raise HTTPException(404,f"Insufficient data {s}")
        df["norm"] = df["close"]/df["close"].iloc[0]*100
        return df
    d1,d2 = load(s1),load(s2)
    merged = pd.merge(d1,d2,on="date",suffixes=(f"_{s1}",f"_{s2}"))
    corr = float(merged[f"close_{s1}"].pct_change().corr(merged[f"close_{s2}"].pct_change()))
    return {
        "symbol1":s1,"symbol2":s2,"correlation":round(corr,4),
        "return1":round((d1["close"].iloc[-1]-d1["close"].iloc[0])/d1["close"].iloc[0]*100,2),
        "return2":round((d2["close"].iloc[-1]-d2["close"].iloc[0])/d2["close"].iloc[0]*100,2),
        "days":days,
        "series":merged.apply(lambda r:{"date":r["date"],
            f"norm_{s1}":round(r[f"norm_{s1}"],2),
            f"norm_{s2}":round(r[f"norm_{s2}"],2)},axis=1).tolist(),
    }

@app.get("/movers")
def movers(n:int=Query(7,ge=1,le=20)):
    conn=get_db(); cur=conn.cursor(); res=[]
    for sym,meta in COMPANIES.items():
        cur.execute("SELECT close FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2",(sym,))
        rec=cur.fetchall()
        if len(rec)<2: continue
        chg=(rec[0][0]-rec[1][0])/rec[1][0]*100
        res.append({"symbol":sym,"name":meta["name"],"sector":meta["sector"],
                    "close":round(rec[0][0],2),"change_pct":round(chg,2)})
    conn.close(); res.sort(key=lambda x:x["change_pct"],reverse=True)
    return {"gainers":res[:n],"losers":res[-n:][::-1]}

@app.get("/sectors")
def sectors():
    conn=get_db(); cur=conn.cursor(); sec={}
    for sym,meta in COMPANIES.items():
        cur.execute("SELECT close FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2",(sym,))
        rec=cur.fetchall()
        if len(rec)<2: continue
        chg=(rec[0][0]-rec[1][0])/rec[1][0]*100
        sec.setdefault(meta["sector"],[]).append({"symbol":sym,"change_pct":round(chg,2),"close":round(rec[0][0],2)})
    conn.close()
    return [{"sector":s,"avg_change":round(sum(x["change_pct"] for x in v)/len(v),2),
             "count":len(v),"stocks":sorted(v,key=lambda x:x["change_pct"],reverse=True)}
            for s,v in sec.items()]

@app.get("/screener")
def screener(
    sector:    str   = Query(None),
    min_pe:    float = Query(None), max_pe: float = Query(None),
    min_pb:    float = Query(None), max_pb: float = Query(None),
    min_div:   float = Query(None),
    min_chg:   float = Query(None), max_chg: float = Query(None),
    min_vol:   float = Query(None), max_vol: float = Query(None),
    min_rsi:   float = Query(None), max_rsi: float = Query(None),
    sort_by:   str   = Query("change_pct"),
    sort_asc:  bool  = Query(False),
):
    conn=get_db(); cur=conn.cursor(); res=[]
    for sym,meta in COMPANIES.items():
        if sector and meta["sector"]!=sector: continue
        if min_pe and (meta.get("pe") or 0)<min_pe: continue
        if max_pe and (meta.get("pe") or 999)>max_pe: continue
        if min_pb and (meta.get("pb") or 0)<min_pb: continue
        if max_pb and (meta.get("pb") or 999)>max_pb: continue
        if min_div and (meta.get("div") or 0)<min_div: continue
        cur.execute("SELECT close FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2",(sym,))
        rec=cur.fetchall()
        if len(rec)<2: continue
        chg=(rec[0][0]-rec[1][0])/rec[1][0]*100
        if min_chg and chg<min_chg: continue
        if max_chg and chg>max_chg: continue
        # Get RSI from recent data
        since=(datetime.utcnow()-timedelta(days=60)).strftime("%Y-%m-%d")
        df=qdf("SELECT close FROM stocks WHERE symbol=? AND date>=? ORDER BY date",(sym,since))
        rsi_val=None
        if len(df)>=14:
            delta=df["close"].diff(); gain=delta.where(delta>0,0).rolling(14).mean()
            loss=(-delta.where(delta<0,0)).rolling(14).mean()
            rs=gain.iloc[-1]/(loss.iloc[-1]+1e-9); rsi_val=round(100-100/(1+rs),1)
        if min_rsi and rsi_val and rsi_val<min_rsi: continue
        if max_rsi and rsi_val and rsi_val>max_rsi: continue
        vol_pct=None
        if len(df)>=30:
            ret=df["close"].pct_change().dropna()
            vol_pct=round(float(ret.std()*np.sqrt(252)*100),1)
        if min_vol and vol_pct and vol_pct<min_vol: continue
        if max_vol and vol_pct and vol_pct>max_vol: continue
        res.append({"symbol":sym,"name":meta["name"],"sector":meta["sector"],
                    "close":round(rec[0][0],2),"change_pct":round(chg,2),
                    "pe":meta.get("pe"),"pb":meta.get("pb"),
                    "div_yield":meta.get("div"),"mktcap":meta.get("cap"),
                    "rsi":rsi_val,"volatility":vol_pct})
    conn.close()
    valid_sorts={"change_pct","close","pe","pb","div_yield","mktcap","rsi","volatility"}
    if sort_by in valid_sorts:
        res.sort(key=lambda x:(x.get(sort_by) or (0 if sort_asc else float("inf"))), reverse=not sort_asc)
    return res

@app.get("/heatmap")
def heatmap():
    """Returns all stocks with change_pct for heatmap rendering."""
    return get_companies()

@app.post("/refresh")
async def refresh(bg:BackgroundTasks):
    bg.add_task(fetch_and_store_all); return {"message":"Refresh started"}

@app.get("/providers")
def list_providers():
    return [
        {"id":"ollama",    "name":"Ollama",     "tag":"Local · Free",  "color":"#22D3EE",
         "models":["llama3","llama3.1","mistral","gemma2","phi3","codellama"],"needs_key":False},
        {"id":"anthropic", "name":"Anthropic",  "tag":"Claude",        "color":"#F59E0B",
         "models":["claude-sonnet-4-5","claude-opus-4-5","claude-haiku-4-5-20251001"],"needs_key":True},
        {"id":"openai",    "name":"OpenAI",     "tag":"GPT",           "color":"#34D399",
         "models":["gpt-4o","gpt-4o-mini","gpt-4-turbo"],"needs_key":True},
        {"id":"openrouter","name":"OpenRouter", "tag":"Multi-model",   "color":"#A78BFA",
         "models":["meta-llama/llama-3-8b-instruct","anthropic/claude-3.5-sonnet","openai/gpt-4o","google/gemini-flash-1.5"],"needs_key":True},
    ]

# ── AI: streaming SSE endpoint ────────────────────────────────────────────────
class ChatReq(BaseModel):
    provider: str = "ollama"
    model:    str = "llama3"
    messages: list[dict]
    system:   str = ""
    api_key:  str = ""
    stream:   bool = True

@app.post("/ai/chat")
async def ai_chat_endpoint(req: ChatReq):
    """Non-streaming fallback (used when stream=False)."""
    key = req.api_key.strip() or os.environ.get(
        {"anthropic":"ANTHROPIC_API_KEY","openai":"OPENAI_API_KEY","openrouter":"OPENROUTER_API_KEY"}.get(req.provider,""),"")
    base = os.environ.get("OLLAMA_BASE_URL","http://host.docker.internal:11434") if req.provider=="ollama" else ""
    try:
        from ai_providers import chat
        text = await chat(provider=req.provider, model=req.model, messages=req.messages,
                          system=req.system, api_key=key, base_url=base)
        return {"reply": text}
    except Exception as e:
        raise HTTPException(502, str(e))

@app.post("/ai/stream")
async def ai_stream_endpoint(req: ChatReq):
    """Server-Sent Events streaming endpoint for real-time AI responses."""
    key = req.api_key.strip() or os.environ.get(
        {"anthropic":"ANTHROPIC_API_KEY","openai":"OPENAI_API_KEY","openrouter":"OPENROUTER_API_KEY"}.get(req.provider,""),"")
    base = os.environ.get("OLLAMA_BASE_URL","http://host.docker.internal:11434") if req.provider=="ollama" else ""

    async def event_generator():
        try:
            if req.provider == "ollama":
                async for chunk in _stream_ollama(base, req.model, req.messages, req.system):
                    yield f"data: {json.dumps({'delta':chunk})}\n\n"
            elif req.provider == "anthropic":
                async for chunk in _stream_anthropic(req.model, req.messages, req.system, key):
                    yield f"data: {json.dumps({'delta':chunk})}\n\n"
            else:
                # OpenAI-compatible
                async for chunk in _stream_openai(req.provider, req.model, req.messages, req.system, key):
                    yield f"data: {json.dumps({'delta':chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error':str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"})

async def _stream_ollama(base_url, model, messages, system):
    msgs = ([{"role":"system","content":system}] if system else []) + messages
    async with httpx.AsyncClient(timeout=120) as c:
        async with c.stream("POST", f"{base_url}/api/chat",
                            json={"model":model,"messages":msgs,"stream":True}) as r:
            async for line in r.aiter_lines():
                if line:
                    try:
                        d = json.loads(line)
                        chunk = d.get("message",{}).get("content","")
                        if chunk: yield chunk
                    except: pass

async def _stream_anthropic(model, messages, system, key):
    payload = {"model":model,"max_tokens":1024,"messages":messages,"stream":True}
    if system: payload["system"]=system
    hdrs = {"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"}
    async with httpx.AsyncClient(timeout=60) as c:
        async with c.stream("POST","https://api.anthropic.com/v1/messages",
                            headers=hdrs,json=payload) as r:
            async for line in r.aiter_lines():
                if line.startswith("data:"):
                    try:
                        d=json.loads(line[5:].strip())
                        if d.get("type")=="content_block_delta":
                            yield d["delta"].get("text","")
                    except: pass

async def _stream_openai(provider, model, messages, system, key):
    base = "https://openrouter.ai/api" if provider=="openrouter" else "https://api.openai.com"
    msgs = ([{"role":"system","content":system}] if system else []) + messages
    hdrs = {"Authorization":f"Bearer {key}","content-type":"application/json"}
    async with httpx.AsyncClient(timeout=60) as c:
        async with c.stream("POST",f"{base}/v1/chat/completions",
                            headers=hdrs,json={"model":model,"messages":msgs,"stream":True}) as r:
            async for line in r.aiter_lines():
                if line.startswith("data:") and "[DONE]" not in line:
                    try:
                        d=json.loads(line[5:].strip())
                        chunk=d["choices"][0]["delta"].get("content","")
                        if chunk: yield chunk
                    except: pass

@app.get("/")
def root(): return {"status":"ok","version":"2.0.0","docs":"/docs"}
