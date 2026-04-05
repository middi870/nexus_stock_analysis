from app.db.session import SessionLocal
from app.services.stock_service import fetch_stock_data, store_stock_data

SYMBOLS = [
    "RELIANCE.NS",
    "TCS.NS",
    "INFY.NS"
]


async def run_ingestion():
    async with SessionLocal() as db:
        for sym in SYMBOLS:
            print(f"Fetching {sym}...")
            data = await fetch_stock_data(sym)

            if data:
                await store_stock_data(db, sym, data)
                print(f"Stored {len(data)} rows for {sym}")
            else:
                print(f"No data for {sym}")
