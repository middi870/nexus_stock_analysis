"""
NEXUS — AI chat endpoints.
POST /ai/stream          → SSE streaming (primary)
POST /ai/chat            → non-streaming fallback
GET  /ai/history/{id}   → fetch conversation thread
GET  /providers          → list available AI providers
"""
import json, logging
from pydantic import BaseModel

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.services.ai_service import (
    stream_response, save_turn, load_conversation, new_conversation_id
)

log    = logging.getLogger(__name__)
router = APIRouter(tags=["AI"])


# ── Request model ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    provider:        str       = "ollama"
    model:           str       = "llama3"
    messages:        list[dict]
    system:          str       = ""
    api_key:         str       = ""
    symbol:          str | None = None
    conversation_id: str | None = None   # pass to resume a thread


# ── Provider catalogue ────────────────────────────────────────────────────────

PROVIDERS = [
    {
        "id": "ollama", "name": "Ollama", "tag": "Local · Free", "color": "#22D3EE",
        "models": ["llama3", "llama3.1", "mistral", "gemma2", "phi3", "codellama"],
        "needs_key": False,
    },
    {
        "id": "anthropic", "name": "Anthropic", "tag": "Claude", "color": "#F5A623",
        "models": ["claude-sonnet-4-5", "claude-opus-4-5", "claude-haiku-4-5-20251001"],
        "needs_key": True,
    },
    {
        "id": "openai", "name": "OpenAI", "tag": "GPT", "color": "#34D399",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
        "needs_key": True,
    },
    {
        "id": "openrouter", "name": "OpenRouter", "tag": "Multi-model", "color": "#A78BFA",
        "models": [
            "meta-llama/llama-3-8b-instruct",
            "anthropic/claude-3.5-sonnet",
            "openai/gpt-4o",
            "google/gemini-flash-1.5",
        ],
        "needs_key": True,
    },
]


@router.get("/providers")
def list_providers():
    return PROVIDERS


# ── SSE Streaming endpoint ────────────────────────────────────────────────────

@router.post("/ai/stream")
async def ai_stream(req: ChatRequest):
    conv_id = req.conversation_id or new_conversation_id()

    # Persist user turn
    if req.messages:
        last_user = next(
            (m["content"] for m in reversed(req.messages) if m["role"] == "user"), None
        )
        if last_user:
            save_turn(conv_id, req.symbol, req.provider, req.model, "user", last_user)

    async def event_gen():
        # Emit conversation_id first so client can track the thread
        yield f"data: {json.dumps({'conversation_id': conv_id})}\n\n"

        collected = []
        try:
            async for chunk in stream_response(
                provider=req.provider,
                model=req.model,
                messages=req.messages,
                system=req.system,
                api_key=req.api_key,
            ):
                collected.append(chunk)
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
        except Exception as exc:
            log.error("AI stream error: %s", exc)
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        finally:
            # Persist assistant reply
            full_reply = "".join(collected)
            if full_reply:
                save_turn(conv_id, req.symbol, req.provider, req.model, "assistant", full_reply)
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Non-streaming fallback ────────────────────────────────────────────────────

@router.post("/ai/chat")
async def ai_chat(req: ChatRequest):
    conv_id = req.conversation_id or new_conversation_id()
    chunks  = []
    async for chunk in stream_response(
        provider=req.provider,
        model=req.model,
        messages=req.messages,
        system=req.system,
        api_key=req.api_key,
    ):
        chunks.append(chunk)
    reply = "".join(chunks)
    if req.messages:
        last_user = next(
            (m["content"] for m in reversed(req.messages) if m["role"] == "user"), None
        )
        if last_user:
            save_turn(conv_id, req.symbol, req.provider, req.model, "user", last_user)
    save_turn(conv_id, req.symbol, req.provider, req.model, "assistant", reply)
    return {"reply": reply, "conversation_id": conv_id}


# ── Conversation history ──────────────────────────────────────────────────────

@router.get("/ai/history/{conversation_id}")
def get_history(conversation_id: str):
    return {
        "conversation_id": conversation_id,
        "messages":        load_conversation(conversation_id),
    }
