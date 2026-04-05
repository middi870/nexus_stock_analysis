from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timedelta

from app.db.session import get_db
from app.db.models import Stock
from app.services.cache_service import get_cache, set_cache

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/{symbol}")
async def get_stock(
    symbol: str,
    days: int = Query(90, ge=1, le=365),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    # ✅ smarter cache key
    cache_key = f"stock:{symbol}:{days}:{limit}"

    # 🔥 1. Check cache
    cached = await get_cache(cache_key)
    if cached:
        return cached

    # 🔥 2. Filter by date
    since_date = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(Stock)
        .where(Stock.symbol == symbol)
        .where(Stock.date >= since_date)
        .order_by(desc(Stock.date))
        .limit(limit)
    )

    rows = result.scalars().all()

    data = [
        {
            "symbol": r.symbol,
            "date": str(r.date),
            "close": r.close,
            "volume": r.volume,
            "rsi": r.rsi,
            "macd": r.macd,
            "macd_signal": r.macd_signal,
            "ma20": r.ma20,
            "ma50": r.ma50,
        }
        for r in rows
    ]

    # 🔥 3. Store cache
    await set_cache(cache_key, data, expire=60)

    return data
