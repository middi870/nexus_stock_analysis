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

            # ✅ Step 1: fetch data
            df = await fetch_stock_data(sym)

            # ✅ Step 2: check
            if df is not None and not df.empty:
                await store_stock_data(db, sym, df)
                print(f"Stored {len(df)} rows for {sym}")
            else:
                print(f"No data for {sym}")
