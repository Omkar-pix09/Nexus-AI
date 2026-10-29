"""Embedding providers behind one interface. `hash` works offline (feature hashing),
`gemini` uses the Gemini embedding API and silently falls back to hash on failure."""
import re
import zlib

import httpx
import numpy as np

from ..core.config import settings

DIM = 384


def _toks(text: str) -> list[str]:
    return re.findall(r"[a-z0-9][a-z0-9+#.]*", text.lower())


class HashEmbedder:
    dim = DIM
    name = "hash"

    def embed(self, texts: list[str]) -> np.ndarray:
        out = np.zeros((len(texts), DIM), dtype=np.float32)
        for i, t in enumerate(texts):
            toks = _toks(t)
            feats = toks + [a + "_" + b for a, b in zip(toks, toks[1:])]
            for f in feats:
                h = zlib.crc32(f.encode())
                out[i, h % DIM] += 1.0 if (h >> 16) & 1 else -1.0
            n = np.linalg.norm(out[i])
            if n:
                out[i] /= n
        return out


class GeminiEmbedder:
    name = "gemini"
    dim = 3072

    def embed(self, texts: list[str]) -> np.ndarray:
        vecs = []
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_embed_model}:embedContent"
        with httpx.Client(timeout=30) as c:
            for t in texts:
                r = c.post(url, params={"key": settings.gemini_api_key}, json={"content": {"parts": [{"text": t}]}})
                r.raise_for_status()
                v = np.array(r.json()["embedding"]["values"], dtype=np.float32)
                vecs.append(v / (np.linalg.norm(v) or 1))
        self.dim = len(vecs[0]) if vecs else self.dim
        return np.vstack(vecs)


class Embedder:
    def __init__(self):
        self._hash = HashEmbedder()
        self._gem = GeminiEmbedder()

    @property
    def dim(self) -> int:
        return self._active().dim

    def _active(self):
        if settings.embed_provider == "gemini" and settings.gemini_api_key:
            return self._gem
        return self._hash

    def embed(self, texts: list[str]) -> np.ndarray:
        try:
            return self._active().embed(texts)
        except Exception:
            return self._hash.embed(texts)


embedder = Embedder()
