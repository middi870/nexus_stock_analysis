from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Stock
from app.core.constants import COMPANIES

router = APIRouter(prefix="/screener", tags=["screener"])


@router.get("/")
async def screener(
    min_rsi: float = Query(None),
    max_rsi: float = Query(None),
    min_price: float = Query(None),
    sector: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Stock))
    rows = result.scalars().all()

    latest = {}

    # get latest row per stock
    for r in rows:
        if r.symbol not in latest or r.date > latest[r.symbol].date:
            latest[r.symbol] = r

    data = []

    for sym, r in latest.items():
        meta = COMPANIES.get(sym, {})

        if sector and meta.get("sector") != sector:
            continue

        if min_rsi and (r.rsi is None or r.rsi < min_rsi):
            continue

        if max_rsi and (r.rsi is None or r.rsi > max_rsi):
            continue

        if min_price and r.close < min_price:
            continue

        data.append({
            "symbol": sym,
            "name": meta.get("name"),
            "sector": meta.get("sector"),
            "price": r.close,
            "rsi": r.rsi,
            "macd": r.macd,
        })

    return data
