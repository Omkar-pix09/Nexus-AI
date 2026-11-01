import json
import re
from typing import Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError

from ..core.config import settings

T = TypeVar("T", bound=BaseModel)

EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_PATTERN = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
KEY_PATTERN = re.compile(r"\b(?:api[_-]?key|bearer|token|secret)[=:\s]+[A-Za-z0-9_\-\.]{16,}\b", re.IGNORECASE)


def redact_pii(text: str) -> str:
    """Redact personal info before sending outside or to LLM."""
    t = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", text)
    t = PHONE_PATTERN.sub("[REDACTED_PHONE]", t)
    t = KEY_PATTERN.sub("[REDACTED_SECRET]", t)
    return t


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
        # Ensure PII is redacted before sending to any cloud provider
        safe_system = redact_pii(system)
        safe_user = redact_pii(user)
        try:
            with httpx.Client(timeout=60) as c:
                if self.provider == "anthropic":
                    r = c.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={"x-api-key": settings.anthropic_api_key, "anthropic-version": "2023-06-01"},
                        json={
                            "model": settings.anthropic_model,
                            "max_tokens": max_tokens,
                            "system": safe_system,
                            "messages": [{"role": "user", "content": safe_user}],
                        },
                    )
                    r.raise_for_status()
                    return "".join(b.get("text", "") for b in r.json()["content"])
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent"
                r = c.post(
                    url,
                    params={"key": settings.gemini_api_key},
                    json={
                        "systemInstruction": {"parts": [{"text": safe_system}]},
                        "contents": [{"role": "user", "parts": [{"text": safe_user}]}],
                        "generationConfig": {"maxOutputTokens": max_tokens},
                    },
                )
                r.raise_for_status()
                return r.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:  # network, quota, schema drift
            raise LLMError(str(e)) from e

    def generate_structured(
        self,
        schema: Type[T],
        system: str,
        user: str,
        fallback: T,
        max_tokens: int = 900,
    ) -> T:
        """Rule 3: Any LLM output that drives logic must be structured JSON validated by Pydantic.
        Retry once on failure, then fall back to deterministic behaviour."""
        if not self.is_live:
            return fallback

        schema_json = json.dumps(schema.model_json_schema())
        instruction = f"\nReturn strictly valid JSON matching this JSON Schema with NO markdown fences, no conversational prose:\n{schema_json}"
        full_system = f"{system}\n{instruction}"

        # Attempt 1
        for attempt in range(2):
            try:
                raw = self.generate(full_system, user, max_tokens=max_tokens)
                # Strip markdown code blocks if model wrapped JSON
                cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.DOTALL)
                parsed = json.loads(cleaned)
                return schema.model_validate(parsed)
            except (LLMError, json.JSONDecodeError, ValidationError) as e:
                if attempt == 0:
                    # Retry once with explicit error correction prompt
                    user = f"{user}\n\n[Previous attempt failed to validate schema: {e}. Provide ONLY clean valid JSON adhering to the schema.]"
                    continue
                # After retry failure, fall back to deterministic output
                break
        return fallback


llm = LLM()

