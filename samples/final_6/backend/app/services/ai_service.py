"""
NEXUS — AI service.
Supports 4 providers: Ollama (local), Anthropic, OpenAI, OpenRouter.
All yield text chunks for SSE streaming. Conversations are persisted to SQLite.
"""
import json, uuid, logging
from typing import AsyncGenerator

import httpx

from app.core.config import settings
from app.db.database import get_conn

log = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(connect=10, read=300, write=30, pool=10)


# ── Conversation persistence ──────────────────────────────────────────────────

def save_turn(conversation_id: str, symbol: str | None,
              provider: str, model: str,
              role: str, content: str) -> None:
    try:
        conn = get_conn()
        conn.execute("""
            INSERT INTO conversations(conversation_id, symbol, provider, model, role, content)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (conversation_id, symbol, provider, model, role, content))
        conn.commit()
        conn.close()
    except Exception as exc:
        log.warning("Failed to persist conversation turn: %s", exc)


def load_conversation(conversation_id: str) -> list[dict]:
    conn = get_conn()
    rows = conn.execute("""
        SELECT role, content FROM conversations
        WHERE conversation_id = ?
        ORDER BY id ASC
    """, (conversation_id,)).fetchall()
    conn.close()
    return [{"role": r["role"], "content": r["content"]} for r in rows]


def new_conversation_id() -> str:
    return str(uuid.uuid4())


# ── Provider stream generators ────────────────────────────────────────────────

async def _stream_ollama(model: str, messages: list[dict]) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        async with c.stream("POST", f"{settings.OLLAMA_BASE_URL}/api/chat",
                            json={"model": model, "messages": messages, "stream": True}) as r:
            async for line in r.aiter_lines():
                if not line:
                    continue
                try:
                    d = json.loads(line)
                    chunk = d.get("message", {}).get("content", "")
                    if chunk:
                        yield chunk
                except Exception:
                    pass


async def _stream_anthropic(model: str, messages: list[dict], system: str, key: str) -> AsyncGenerator[str, None]:
    payload = {"model": model, "max_tokens": 1024, "messages": messages, "stream": True}
    if system:
        payload["system"] = system
    headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        async with c.stream("POST", "https://api.anthropic.com/v1/messages",
                            headers=headers, json=payload) as r:
            async for line in r.aiter_lines():
                if line.startswith("data:"):
                    try:
                        d = json.loads(line[5:].strip())
                        if d.get("type") == "content_block_delta":
                            yield d["delta"].get("text", "")
                    except Exception:
                        pass


async def _stream_openai_compat(base_url: str, model: str,
                                messages: list[dict], key: str) -> AsyncGenerator[str, None]:
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        async with c.stream("POST", f"{base_url}/v1/chat/completions",
                            headers=headers,
                            json={"model": model, "messages": messages, "stream": True}) as r:
            async for line in r.aiter_lines():
                if line.startswith("data:") and "[DONE]" not in line:
                    try:
                        d = json.loads(line[5:].strip())
                        chunk = d["choices"][0]["delta"].get("content", "")
                        if chunk:
                            yield chunk
                    except Exception:
                        pass


# ── Public streaming entry-point ──────────────────────────────────────────────

async def stream_response(
    provider:        str,
    model:           str,
    messages:        list[dict],
    system:          str,
    api_key:         str,
) -> AsyncGenerator[str, None]:
    """Route to the correct provider and yield text chunks."""

    key = api_key.strip()

    # Resolve API keys from env when not supplied by client
    if not key:
        env_map = {
            "anthropic":  settings.ANTHROPIC_API_KEY,
            "openai":     settings.OPENAI_API_KEY,
            "openrouter": settings.OPENROUTER_API_KEY,
        }
        key = env_map.get(provider, "")

    if provider == "ollama":
        msgs = ([{"role": "system", "content": system}] if system else []) + messages
        async for chunk in _stream_ollama(model, msgs):
            yield chunk

    elif provider == "anthropic":
        async for chunk in _stream_anthropic(model, messages, system, key):
            yield chunk

    elif provider == "openai":
        msgs = ([{"role": "system", "content": system}] if system else []) + messages
        async for chunk in _stream_openai_compat("https://api.openai.com", model, msgs, key):
            yield chunk

    elif provider == "openrouter":
        msgs = ([{"role": "system", "content": system}] if system else []) + messages
        async for chunk in _stream_openai_compat("https://openrouter.ai/api", model, msgs, key):
            yield chunk

    else:
        yield f"[ERROR] Unknown provider: {provider}"
