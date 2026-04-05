import redis.asyncio as redis
import json
from app.core.config import REDIS_URL

r = redis.from_url(REDIS_URL, decode_responses=True)


async def get_cache(key: str):
    data = await r.get(key)
    if data:
        return json.loads(data)
    return None


async def set_cache(key: str, value, expire: int = 60):
    await r.set(key, json.dumps(value), ex=expire)
