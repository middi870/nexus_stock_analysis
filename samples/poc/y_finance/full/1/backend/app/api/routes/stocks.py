from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Stock

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("/{symbol}")
async def get_stock(symbol: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Stock).where(Stock.symbol == symbol)
    )

    rows = result.scalars().all()

    return [
        {
            "symbol": r.symbol,
            "date": r.date,
            "close": r.close,
            "volume": r.volume
        }
        for r in rows
    ]
