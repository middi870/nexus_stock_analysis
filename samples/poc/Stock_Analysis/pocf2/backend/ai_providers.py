"""Unified LLM provider abstraction."""
import os, httpx, logging
log = logging.getLogger(__name__)

PROVIDER_DEFAULTS = {
    "ollama":     {"base_url":"http://host.docker.internal:11434","model":"llama3"},
    "anthropic":  {"base_url":"https://api.anthropic.com","model":"claude-sonnet-4-5"},
    "openai":     {"base_url":"https://api.openai.com","model":"gpt-4o-mini"},
    "openrouter": {"base_url":"https://openrouter.ai/api","model":"meta-llama/llama-3-8b-instruct"},
}

def _env_key(p): return {"anthropic":"ANTHROPIC_API_KEY","openai":"OPENAI_API_KEY","openrouter":"OPENROUTER_API_KEY"}.get(p,"")

async def chat(*, provider, model, messages, system="", api_key="", base_url="", max_tokens=1024):
    p = provider.lower()
    defaults = PROVIDER_DEFAULTS.get(p, {})
    model    = model    or defaults.get("model","")
    base_url = base_url or defaults.get("base_url","")
    api_key  = api_key  or os.environ.get(_env_key(p),"")
    if p == "ollama":   return await _ollama(base_url, model, messages, system, max_tokens)
    if p == "anthropic":return await _anthropic(base_url, model, messages, system, api_key, max_tokens)
    return await _openai_compat(base_url, model, messages, system, api_key, max_tokens)

async def _ollama(base_url, model, messages, system, max_tokens):
    msgs = ([{"role":"system","content":system}] if system else []) + messages
    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post(f"{base_url}/api/chat",
                         json={"model":model,"messages":msgs,"stream":False,"options":{"num_predict":max_tokens}})
        r.raise_for_status()
        return r.json().get("message",{}).get("content","")

async def _anthropic(base_url, model, messages, system, api_key, max_tokens):
    if not api_key: raise ValueError("Anthropic API key required")
    payload = {"model":model,"max_tokens":max_tokens,"messages":messages}
    if system: payload["system"]=system
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{base_url}/v1/messages",
                         headers={"x-api-key":api_key,"anthropic-version":"2023-06-01","content-type":"application/json"},
                         json=payload)
        r.raise_for_status()
        return r.json()["content"][0]["text"]

async def _openai_compat(base_url, model, messages, system, api_key, max_tokens):
    if not api_key: raise ValueError("API key required")
    msgs = ([{"role":"system","content":system}] if system else []) + messages
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{base_url}/v1/chat/completions",
                         headers={"Authorization":f"Bearer {api_key}","content-type":"application/json"},
                         json={"model":model,"max_tokens":max_tokens,"messages":msgs})
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
