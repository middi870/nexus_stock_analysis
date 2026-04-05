from fastapi import FastAPI
import asyncio

from app.db.session import engine
from app.db.models import Base

# ✅ import all routes
from app.api.routes import health, stocks, screener, market

# ingestion
from app.workers.ingestion import run_ingestion

app = FastAPI(title="Trading Backend V2")


# ✅ register all routers
app.include_router(health.router)
app.include_router(stocks.router)
app.include_router(screener.router)
app.include_router(market.router)


# ✅ DB wait logic
async def wait_for_db():
    for i in range(10):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("✅ Database connected")
            return
        except Exception:
            print(f"⏳ DB not ready... retry {i+1}")
            await asyncio.sleep(2)

    raise Exception("DB connection failed")


# ✅ startup
@app.on_event("startup")
async def startup():
    await wait_for_db()
    await run_ingestion()
