from fastapi import FastAPI
from app.api.routes import health
from app.db.session import engine
from app.workers.ingestion import run_ingestion
from app.api.routes import stocks
from app.db.models import Base
import asyncio

app = FastAPI(title="New Backend V2")

app.include_router(health.router)
app.include_router(stocks.router)

async def wait_for_db():
    """Retry DB connection until it's ready"""
    for i in range(10):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("✅ Database connected")
            return
        except Exception as e:
            print(f"⏳ DB not ready, retrying... ({i+1}/10)")
            await asyncio.sleep(2)

    raise Exception("❌ Could not connect to DB after retries")


@app.on_event("startup")
async def startup():
    await wait_for_db()
    await run_ingestion()
