from app.db.models import AIConversation


async def save_conversation(db, symbol, provider, prompt, response):
    convo = AIConversation(
        symbol=symbol,
        provider=provider,
        prompt=prompt,
        response=response
    )
    db.add(convo)
    await db.commit()
