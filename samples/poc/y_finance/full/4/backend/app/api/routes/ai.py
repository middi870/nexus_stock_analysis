from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Stock, AIConversation
from app.services.ai_service import stream_ai

router = APIRouter(prefix="/ai", tags=["AI"])


# ─────────────────────────────────────────────
# GET HISTORY
# ─────────────────────────────────────────────
async def get_history(db, conversation_id, limit=5):
    result = await db.execute(
        select(AIConversation)
        .where(AIConversation.conversation_id == conversation_id)
        .order_by(AIConversation.created_at.desc())
        .limit(limit)
    )

    rows = result.scalars().all()

    messages = []

    for r in reversed(rows):
        messages.append({"role": "user", "content": r.prompt})
        messages.append({"role": "assistant", "content": r.response})

    return messages


# ─────────────────────────────────────────────
# STREAM ENDPOINT
# ─────────────────────────────────────────────
@router.get("/stream/{symbol}")
async def stream_ai_endpoint(
    symbol: str,
    conversation_id: str,
    provider: str = "ollama",
    db: AsyncSession = Depends(get_db)
):
    # 🔹 get latest stock
    result = await db.execute(
        select(Stock)
        .where(Stock.symbol == symbol)
        .order_by(Stock.date.desc())
        .limit(1)
    )

    stock = result.scalar()

    if not stock:
        return {"error": "No data"}

    data = {
        "close": stock.close,
        "rsi": stock.rsi,
        "macd": stock.macd,
        "macd_signal": stock.macd_signal,
        "ma20": stock.ma20,
        "ma50": stock.ma50,
    }

    # 🔹 history
    history = await get_history(db, conversation_id)

    full_response = ""

    async def generator():
        nonlocal full_response

        async for chunk in stream_ai(symbol, data, provider, history):
            full_response += chunk
            yield chunk

        # ✅ SAVE AFTER STREAM COMPLETE
        db.add(AIConversation(
            conversation_id=conversation_id,
            symbol=symbol,
            provider=provider,
            prompt=str(data),
            response=full_response
        ))
        await db.commit()

    return StreamingResponse(generator(), media_type="text/plain")
