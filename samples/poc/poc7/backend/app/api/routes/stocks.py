from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timedelta

from app.db.session import get_db
from app.db.models import Stock
from app.services.cache_service import get_cache, set_cache

router = APIRouter(prefix="/stocks", tags=["stocks"])


# ─────────────────────────────────────────────
# COMPANIES
# ─────────────────────────────────────────────
@router.get("/companies")
async def get_companies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Stock.symbol).distinct())

    return [
        {"symbol": row[0]}
        for row in result.all()
    ]


# ─────────────────────────────────────────────
# SUMMARY (WITH CACHE)
# ─────────────────────────────────────────────
@router.get("/summary/{symbol}")
async def get_summary(symbol: str, db: AsyncSession = Depends(get_db)):
    cache_key = f"summary:{symbol}"

    # 🔥 cache check
    cached = await get_cache(cache_key)
    if cached:
        return cached

    since_date = datetime.utcnow() - timedelta(days=365)

    result = await db.execute(
        select(Stock)
        .where(Stock.symbol == symbol)
        .where(Stock.date >= since_date)
        .order_by(Stock.date.desc())
    )

    rows = result.scalars().all()

    if not rows:
        return {"error": "No data"}

    closes = [r.close for r in rows]

    response = {
        "symbol": symbol,
        "high_52w": max(closes),
        "low_52w": min(closes),
        "avg_close": sum(closes) / len(closes),
        "latest": closes[0]
    }

    # 🔥 store cache
    await set_cache(cache_key, response, expire=60)

    return response


# ─────────────────────────────────────────────
# COMPARE
# ─────────────────────────────────────────────
@router.get("/compare")
async def compare(
    symbol1: str,
    symbol2: str,
    db: AsyncSession = Depends(get_db)
):
    result1 = await db.execute(
        select(Stock)
        .where(Stock.symbol == symbol1)
        .order_by(Stock.date.desc())
        .limit(100)
    )

    result2 = await db.execute(
        select(Stock)
        .where(Stock.symbol == symbol2)
        .order_by(Stock.date.desc())
        .limit(100)
    )

    rows1 = list(reversed(result1.scalars().all()))
    rows2 = list(reversed(result2.scalars().all()))

    if not rows1 or not rows2:
        return {"error": "Missing data"}

    closes1 = [r.close for r in rows1]
    closes2 = [r.close for r in rows2]

    base1 = closes1[0]
    base2 = closes2[0]

    norm1 = [(c / base1) * 100 for c in closes1]
    norm2 = [(c / base2) * 100 for c in closes2]

    return {
        "symbol1": symbol1,
        "symbol2": symbol2,
        "series": [
            {
                "index": i,
                "s1": norm1[i],
                "s2": norm2[i]
            }
            for i in range(min(len(norm1), len(norm2)))
        ]
    }


# ─────────────────────────────────────────────
# STOCK DATA (CACHED)
# ─────────────────────────────────────────────
@router.get("/{symbol}")
async def get_stock(
    symbol: str,
    days: int = Query(90, ge=1, le=365),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    cache_key = f"stock:{symbol}:{days}:{limit}"

    cached = await get_cache(cache_key)
    if cached:
        return cached

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
            "rsi": r.rsi or 0,
            "macd": r.macd or 0,
            "macd_signal": r.macd_signal or 0,
            "ma20": r.ma20 or 0,
            "ma50": r.ma50 or 0,
        }
        for r in rows
    ]

    await set_cache(cache_key, data, expire=60)

    return data
