"""
NEXUS — In-process TTL cache.
Thread-safe dict-based LRU with expiry. No Redis dependency.
Swap out for redis-py if you add Redis to your Railway stack.
"""
import time, threading
from typing import Any, Optional


class TTLCache:
    def __init__(self, max_size: int = 512):
        self._store:   dict[str, dict] = {}
        self._lock     = threading.Lock()
        self._max_size = max_size

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if time.monotonic() > entry["exp"]:
                del self._store[key]
                return None
            return entry["data"]

    def set(self, key: str, data: Any, ttl: int = 60) -> None:
        with self._lock:
            # Evict oldest entry when at capacity
            if len(self._store) >= self._max_size and key not in self._store:
                oldest = min(self._store, key=lambda k: self._store[k]["exp"])
                del self._store[oldest]
            self._store[key] = {"data": data, "exp": time.monotonic() + ttl}

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> int:
        with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]
            return len(keys)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._store)


# Singleton — import `cache` everywhere
cache = TTLCache()
