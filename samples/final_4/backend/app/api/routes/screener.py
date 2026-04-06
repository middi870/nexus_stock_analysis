"""
NEXUS — Stock screener endpoint.
Filter by sector, PE, PB, dividend yield, RSI, volatility, price change.
"""
import pandas as pd
from datetime import datetime, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Query

from app.core.constants import COMPANIES
from app.db.database import get_conn

router = APIRouter(tags=["Screener"])


@router.get("/screener")
def screener(
    sector:    Annotated[Optional[str],   Query(description="Sector name")]          = None,
    min_pe:    Annotated[Optional[float], Query(description="Min P/E")]              = None,
    max_pe:    Annotated[Optional[float], Query(description="Max P/E")]              = None,
    min_pb:    Annotated[Optional[float], Query(description="Min P/B")]              = None,
    max_pb:    Annotated[Optional[float], Query(description="Max P/B")]              = None,
    min_div:   Annotated[Optional[float], Query(description="Min dividend yield %")] = None,
    min_chg:   Annotated[Optional[float], Query(description="Min change %")]         = None,
    max_chg:   Annotated[Optional[float], Query(description="Max change %")]         = None,
    min_vol:   Annotated[Optional[float], Query(description="Min volatility %")]     = None,
    max_vol:   Annotated[Optional[float], Query(description="Max volatility %")]     = None,
    min_rsi:   Annotated[Optional[float], Query(description="Min RSI")]              = None,
    max_rsi:   Annotated[Optional[float], Query(description="Max RSI")]              = None,
    min_price: Annotated[Optional[float], Query(description="Min price ₹")]         = None,
    max_price: Annotated[Optional[float], Query(description="Max price ₹")]         = None,
    sort_by:   Annotated[str,             Query(description="Sort field")]           = "change_pct",
    sort_asc:  Annotated[bool,            Query(description="Ascending order")]      = False,
):
    conn  = get_conn()
    since = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d")
    result = []

    for sym, meta in COMPANIES.items():
        # Fundamental filters (no DB needed)
        if sector   is not None and meta["sector"] != sector:                 continue
        if min_pe   is not None and (meta.get("pe")  or 0)   < min_pe:       continue
        if max_pe   is not None and (meta.get("pe")  or 999) > max_pe:       continue
        if min_pb   is not None and (meta.get("pb")  or 0)   < min_pb:       continue
        if max_pb   is not None and (meta.get("pb")  or 999) > max_pb:       continue
        if min_div  is not None and (meta.get("div") or 0)   < min_div:      continue

        # Price + day change
        rows = conn.execute(
            "SELECT close FROM stocks WHERE symbol=? ORDER BY date DESC LIMIT 2", (sym,)
        ).fetchall()
        if len(rows) < 2:
            continue
        price = rows[0][0]
        chg   = (rows[0][0] - rows[1][0]) / rows[1][0] * 100

        if min_price is not None and price < min_price: continue
        if max_price is not None and price > max_price: continue
        if min_chg   is not None and chg   < min_chg:   continue
        if max_chg   is not None and chg   > max_chg:   continue

        # Technical indicators (need history)
        df = pd.read_sql_query(
            "SELECT close FROM stocks WHERE symbol=? AND date>=? ORDER BY date",
            conn, params=(sym, since)
        )
        rsi_val = vol_pct = None
        if len(df) >= 14:
            delta   = df["close"].diff()
            gain    = delta.where(delta > 0, 0.0).rolling(14).mean()
            loss    = (-delta.where(delta < 0, 0.0)).rolling(14).mean()
            rs      = gain.iloc[-1] / (loss.iloc[-1] + 1e-9)
            rsi_val = round(100 - 100 / (1 + rs), 1)
        if len(df) >= 20:
            ret     = df["close"].pct_change().dropna()
            vol_pct = round(float(ret.std() * (252 ** 0.5) * 100), 1)

        if min_rsi is not None and rsi_val is not None and rsi_val < min_rsi: continue
        if max_rsi is not None and rsi_val is not None and rsi_val > max_rsi: continue
        if min_vol is not None and vol_pct is not None and vol_pct < min_vol: continue
        if max_vol is not None and vol_pct is not None and vol_pct > max_vol: continue

        result.append({
            "symbol":     sym,
            "name":       meta["name"],
            "sector":     meta["sector"],
            "close":      round(price, 2),
            "change_pct": round(chg, 2),
            "pe":         meta.get("pe"),
            "pb":         meta.get("pb"),
            "div_yield":  meta.get("div"),
            "mktcap":     meta.get("cap"),
            "rsi":        rsi_val,
            "volatility": vol_pct,
        })

    conn.close()

    valid_sorts = {"change_pct", "close", "pe", "pb", "div_yield", "mktcap", "rsi", "volatility"}
    if sort_by in valid_sorts:
        result.sort(
            key=lambda x: (x.get(sort_by) is None, x.get(sort_by) or 0),
            reverse=not sort_asc,
        )

    return result
