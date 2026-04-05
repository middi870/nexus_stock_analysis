from sqlalchemy import select
from app.db.models import Stock
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends


@router.get("/companies")
async def get_companies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Stock.symbol).distinct()
    )
    return [row[0] for row in result.all()]
