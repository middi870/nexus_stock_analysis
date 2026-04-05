from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.db.session import get_db
from app.db.models import Stock
from app.services.ai_service import get_ai_insight

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/insight/{symbol}")
async def ai_insight(
    symbol: str,
    provider: str = Query("ollama"),
    model: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Stock)
        .where(Stock.symbol == symbol)
        .order_by(desc(Stock.date))
        .limit(1)
    )

    row = result.scalar()

    if not row:
        return {"error": "No data"}

    data = {
        "close": row.close,
        "rsi": row.rsi,
        "macd": row.macd,
        "macd_signal": row.macd_signal,
        "ma20": row.ma20,
        "ma50": row.ma50,
    }

    insight = await get_ai_insight(
        symbol,
        data,
        provider=provider,
        model=model
    )

    return {
        "symbol": symbol,
        "provider": provider,
        "model": model,
        "insight": insight
    }
