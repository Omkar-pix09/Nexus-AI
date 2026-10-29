"""Provider-agnostic LLM client. `mock` keeps the whole product demo-able offline;
callers check `llm.is_live` and use deterministic templates otherwise."""
import httpx

from ..core.config import settings


class LLMError(RuntimeError):
    pass


class LLM:
    @property
    def provider(self) -> str:
        return settings.llm_provider

    @property
    def is_live(self) -> bool:
        if self.provider == "anthropic":
            return bool(settings.anthropic_api_key)
        if self.provider == "gemini":
            return bool(settings.gemini_api_key)
        return False

    def generate(self, system: str, user: str, max_tokens: int = 900) -> str:
        if not self.is_live:
            raise LLMError("LLM provider not configured")
        try:
            with httpx.Client(timeout=60) as c:
                if self.provider == "anthropic":
                    r = c.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={"x-api-key": settings.anthropic_api_key, "anthropic-version": "2023-06-01"},
                        json={
                            "model": settings.anthropic_model,
                            "max_tokens": max_tokens,
                            "system": system,
                            "messages": [{"role": "user", "content": user}],
                        },
                    )
                    r.raise_for_status()
                    return "".join(b.get("text", "") for b in r.json()["content"])
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent"
                r = c.post(
                    url,
                    params={"key": settings.gemini_api_key},
                    json={
                        "systemInstruction": {"parts": [{"text": system}]},
                        "contents": [{"role": "user", "parts": [{"text": user}]}],
                        "generationConfig": {"maxOutputTokens": max_tokens},
                    },
                )
                r.raise_for_status()
                return r.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:  # network, quota, schema drift
            raise LLMError(str(e)) from e


llm = LLM()
