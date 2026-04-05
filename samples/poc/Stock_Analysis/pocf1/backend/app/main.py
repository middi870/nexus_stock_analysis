from fastapi import FastAPI
import asyncio

from fastapi.middleware.cors import CORSMiddleware

from app.db.session import engine
from app.db.models import Base

# ✅ import all routes
from app.api.routes import health, stocks, screener, market, ai

# ingestion
from app.workers.ingestion import run_ingestion


app = FastAPI(title="Trading Backend V2")


# ✅ CORS (IMPORTANT for frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 🔒 restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ register all routers
app.include_router(health.router)
app.include_router(stocks.router)
app.include_router(screener.router)
app.include_router(market.router)
app.include_router(ai.router)


# ✅ DB wait logic (robust)
async def wait_for_db():
    for i in range(10):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("✅ Database connected")
            return
        except Exception as e:
            print(f"⏳ DB not ready... retry {i+1} | {e}")
            await asyncio.sleep(2)

    raise Exception("❌ DB connection failed after retries")


# ✅ startup
@app.on_event("startup")
async def startup():
    await wait_for_db()

    # 🔥 Optional: run ingestion in background (non-blocking)
    asyncio.create_task(run_ingestion())


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )