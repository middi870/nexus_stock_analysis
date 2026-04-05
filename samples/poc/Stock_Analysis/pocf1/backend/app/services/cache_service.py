import json
import os
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

_redis = None


# ─────────────────────────────────────────────
# INIT (lazy connection)
# ─────────────────────────────────────────────
async def get_redis():
    global _redis

    if _redis is None:
        _redis = redis.from_url(
            REDIS_URL,
            decode_responses=True
        )

    return _redis


# ─────────────────────────────────────────────
# GET CACHE
# ─────────────────────────────────────────────
async def get_cache(key: str):
    try:
        r = await get_redis()
        val = await r.get(key)

        if val:
            return json.loads(val)

        return None

    except Exception as e:
        print("Cache GET error:", e)
        return None


# ─────────────────────────────────────────────
# SET CACHE
# ─────────────────────────────────────────────
async def set_cache(key: str, value, expire: int = 300):
    try:
        r = await get_redis()

        await r.set(
            key,
            json.dumps(value),
            ex=expire
        )

    except Exception as e:
        print("Cache SET error:", e)


# ─────────────────────────────────────────────
# DELETE CACHE (optional)
# ─────────────────────────────────────────────
async def delete_cache(key: str):
    try:
        r = await get_redis()
        await r.delete(key)
    except Exception as e:
        print("Cache DELETE error:", e)
