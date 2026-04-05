from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import COMPANIES
from app.db.session import get_db
from app.api.routes.stocks import (
    get_companies,
    get_summary,
    compare,
    get_stock,
)

router = APIRouter(tags=["public"])


# ─────────────────────────────────────────────
# ALIAS ENDPOINTS (MATCH ASSIGNMENT)
# ─────────────────────────────────────────────

@router.get("/companies")
async def companies(db: AsyncSession = Depends(get_db)):
    return await get_companies(db)


@router.get("/summary/{symbol}")
async def summary(symbol: str, db: AsyncSession = Depends(get_db)):
    return await get_summary(symbol, db)


@router.get("/compare")
async def compare_public(
    symbol1: str,
    symbol2: str,
    db: AsyncSession = Depends(get_db)
):
    return await compare(symbol1, symbol2, db)





@router.get("/data/{symbol}")
async def data(
    symbol: str,
    days: int = Query(90),
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db)
):
    return await get_stock(
        symbol=symbol,
        days=days,
        limit=limit,
        db=db
    )



@router.get("/sectors")
async def get_sectors():
    sectors = set()

    for company in COMPANIES.values():
        if company.get("sector"):
            sectors.add(company["sector"])

    return sorted(list(sectors))
