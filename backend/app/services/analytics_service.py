"""
NEXUS — Technical analytics engine.
Computes 10+ indicators on top of raw OHLCV DataFrames.
All functions are pure (no side-effects, no DB access).
"""
import numpy as np
import pandas as pd


def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Enrich a raw OHLCV DataFrame with technical indicators.

    Input columns required: date, open, high, low, close, volume
    Returns the same DataFrame with all computed columns appended.
    NaN / Inf values are replaced with None for clean JSON serialisation.
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    cl = df["close"]

    # ── Daily return ──────────────────────────────────────────────────────────
    df["return_pct"] = ((cl - df["open"]) / df["open"] * 100).round(4)

    # ── Moving averages ───────────────────────────────────────────────────────
    df["ma7"]  = cl.rolling(7).mean().round(2)
    df["ma20"] = cl.rolling(20).mean().round(2)
    df["ma50"] = cl.rolling(50).mean().round(2)
    df["ma200"]= cl.rolling(200).mean().round(2)

    # ── Bollinger Bands (20, 2σ) ──────────────────────────────────────────────
    std20        = cl.rolling(20).std()
    df["bb_mid"] = df["ma20"]
    df["bb_up"]  = (df["ma20"] + 2 * std20).round(2)
    df["bb_dn"]  = (df["ma20"] - 2 * std20).round(2)
    df["bb_width"]= ((df["bb_up"] - df["bb_dn"]) / (df["bb_mid"] + 1e-9) * 100).round(2)
    df["bb_pct_b"]= ((cl - df["bb_dn"])  / (df["bb_up"] - df["bb_dn"] + 1e-9) * 100).round(2)

    # ── RSI-14 ────────────────────────────────────────────────────────────────
    delta      = cl.diff()
    gain       = delta.where(delta > 0, 0.0).rolling(14).mean()
    loss       = (-delta.where(delta < 0, 0.0)).rolling(14).mean()
    df["rsi"]  = (100 - 100 / (1 + gain / (loss + 1e-9))).round(2)

    # ── MACD (12, 26, 9) ──────────────────────────────────────────────────────
    ema12          = cl.ewm(span=12, adjust=False).mean()
    ema26          = cl.ewm(span=26, adjust=False).mean()
    df["macd"]     = (ema12 - ema26).round(4)
    df["macd_sig"] = df["macd"].ewm(span=9, adjust=False).mean().round(4)
    df["macd_hist"]= (df["macd"] - df["macd_sig"]).round(4)

    # ── Stochastic Oscillator (14, 3) ─────────────────────────────────────────
    lo14          = df["low"].rolling(14).min()
    hi14          = df["high"].rolling(14).max()
    df["stoch_k"] = ((cl - lo14) / (hi14 - lo14 + 1e-9) * 100).round(2)
    df["stoch_d"] = df["stoch_k"].rolling(3).mean().round(2)

    # ── ATR-14 (Average True Range) ───────────────────────────────────────────
    hl            = df["high"] - df["low"]
    hcp           = (df["high"] - cl.shift()).abs()
    lcp           = (df["low"]  - cl.shift()).abs()
    df["atr"]     = pd.concat([hl, hcp, lcp], axis=1).max(axis=1).rolling(14).mean().round(2)
    df["atr_pct"] = (df["atr"] / cl * 100).round(3)   # normalised ATR

    # ── OBV (On-Balance Volume) ───────────────────────────────────────────────
    direction  = np.sign(cl.diff())
    df["obv"]  = (direction * df["volume"]).fillna(0).cumsum().astype(int)

    # ── VWAP (rolling 20-day proxy) ───────────────────────────────────────────
    typical = (df["high"] + df["low"] + cl) / 3
    df["vwap"] = (
        (typical * df["volume"]).rolling(20).sum() /
        df["volume"].rolling(20).sum()
    ).round(2)

    # ── Composite momentum score [0–100] ──────────────────────────────────────
    vmean = df["volume"].mean()
    vstd  = df["volume"].std() + 1
    vz    = (df["volume"] - vmean) / vstd
    dr    = df["return_pct"].clip(-5, 5) / 5
    df["momentum"] = (0.6 * dr * 50 + 50 + 0.4 * vz.clip(-3, 3) / 3 * 50).clip(0, 100).round(2)

    # ── 52-week high/low distance ─────────────────────────────────────────────
    df["dist_52h"] = (cl / cl.rolling(252).max() * 100 - 100).round(2)
    df["dist_52l"] = (cl / cl.rolling(252).min() * 100 - 100).round(2)

    # ── Serialisation cleanup ─────────────────────────────────────────────────
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    return df.replace({np.nan: None, np.inf: None, -np.inf: None})


def compute_summary_stats(df_raw: pd.DataFrame, df_ind: pd.DataFrame, meta: dict) -> dict:
    """
    Build a /summary response from raw OHLCV + indicators + company metadata.
    Uses trailing 252 trading days (~1 year) for 52W stats.
    """
    yr   = df_raw.tail(252)
    cl   = yr["close"].values
    ret  = pd.Series(cl).pct_change().dropna()
    last = df_ind.iloc[-1]
    prev = df_raw.iloc[-2]["close"] if len(df_raw) >= 2 else None
    curr = float(df_raw.iloc[-1]["close"])

    return {
        "symbol":          meta["symbol"],
        "name":            meta["name"],
        "sector":          meta["sector"],
        "close":           curr,
        "prev_close":      float(prev) if prev else None,
        "change_pct":      round((curr - prev) / prev * 100, 2) if prev else None,
        "open":            float(df_raw.iloc[-1]["open"]),
        "high":            float(df_raw.iloc[-1]["high"]),
        "low":             float(df_raw.iloc[-1]["low"]),
        "week52_high":     round(float(yr["high"].max()), 2),
        "week52_low":      round(float(yr["low"].min()), 2),
        "avg_close":       round(float(yr["close"].mean()), 2),
        "total_return_pct":round((float(cl[-1]) - float(cl[0])) / float(cl[0]) * 100, 2) if len(cl) > 1 else None,
        "volatility_pct":  round(float(ret.std() * (252 ** 0.5) * 100), 2),
        "avg_volume":      int(yr["volume"].mean()),
        # Indicators
        "rsi":             last.get("rsi"),
        "macd":            last.get("macd"),
        "macd_signal":     last.get("macd_sig"),
        "macd_hist":       last.get("macd_hist"),
        "stoch_k":         last.get("stoch_k"),
        "stoch_d":         last.get("stoch_d"),
        "atr":             last.get("atr"),
        "atr_pct":         last.get("atr_pct"),
        "obv":             last.get("obv"),
        "bb_up":           last.get("bb_up"),
        "bb_dn":           last.get("bb_dn"),
        "bb_width":        last.get("bb_width"),
        "bb_pct_b":        last.get("bb_pct_b"),
        "vwap":            last.get("vwap"),
        "momentum":        last.get("momentum"),
        "dist_52h":        last.get("dist_52h"),
        "dist_52l":        last.get("dist_52l"),
        # Fundamentals
        "pe":              meta.get("pe"),
        "pb":              meta.get("pb"),
        "div_yield":       meta.get("div"),
        "mktcap":          meta.get("cap"),
        "data_from":       str(df_raw.iloc[0]["date"]),
        "data_to":         str(df_raw.iloc[-1]["date"]),
    }
