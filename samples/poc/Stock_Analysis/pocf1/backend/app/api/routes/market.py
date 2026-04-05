from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.session import get_db
from app.db.models import Stock

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/movers")
async def movers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Stock))
    rows = result.scalars().all()

    latest = {}
    prev = {}

    for r in rows:
        if r.symbol not in latest or r.date > latest[r.symbol].date:
            prev[r.symbol] = latest.get(r.symbol)
            latest[r.symbol] = r

    data = []

    for sym in latest:
        if sym in prev and prev[sym]:
            change = ((latest[sym].close - prev[sym].close) / prev[sym].close) * 100
            data.append({
                "symbol": sym,
                "price": latest[sym].close,
                "change_pct": round(change, 2)
            })

    data.sort(key=lambda x: x["change_pct"], reverse=True)

    return {
        "gainers": data[:5],
        "losers": data[-5:]
    }
