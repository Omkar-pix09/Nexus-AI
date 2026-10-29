"""Hybrid retrieval: dense (cosine) + sparse (BM25) fused with Reciprocal Rank Fusion,
then a lightweight reranker (query-term coverage + dense similarity + phrase bonus).
Swap the in-memory matrix for pgvector/Qdrant when the corpus outgrows RAM."""
import re
from collections import Counter
from dataclasses import dataclass, asdict

import numpy as np

from ..core.db import db
from .embeddings import embedder

STOP = set(
    "a an the and or of to in for on with is are was were be by at as from that this it its your you my i we do does "
    "did what which who how about into over per me can should".split()
)
MODES = ("vector", "keyword", "hybrid", "hybrid_rerank")


def tokens(s: str) -> list[str]:
    return [t.rstrip(".") for t in re.findall(r"[a-z0-9][a-z0-9+#.]*", s.lower()) if t not in STOP and t.rstrip(".")]


class BM25:
    def __init__(self, docs: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.k1, self.b = k1, b
        self.tf = [Counter(d) for d in docs]
        self.len = np.array([len(d) for d in docs], dtype=np.float32)
        self.avg = float(self.len.mean()) if len(docs) else 1.0
        df: Counter = Counter()
        for d in self.tf:
            df.update(d.keys())
        n = len(docs)
        self.idf = {t: float(np.log(1 + (n - c + 0.5) / (c + 0.5))) for t, c in df.items()}

    def score(self, q: list[str]) -> np.ndarray:
        s = np.zeros(len(self.tf), dtype=np.float32)
        for t in set(q):
            if t not in self.idf:
                continue
            for i, tf in enumerate(self.tf):
                f = tf.get(t, 0)
                if f:
                    s[i] += self.idf[t] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self.len[i] / self.avg))
        return s


@dataclass
class Hit:
    chunk_id: str
    doc_id: str
    doc_name: str
    doc_kind: str
    page: int
    text: str
    relevance: float
    vec_score: float
    kw_score: float


_version = 0
_cache: dict = {"v": -1}


def bump() -> None:
    global _version
    _version += 1


def _load() -> dict:
    dim = embedder.dim
    if _cache["v"] == _version and _cache.get("dim") == dim and _cache.get("db") == _db_key():
        return _cache
    with db() as conn:
        rows = conn.execute(
            "SELECT c.id,c.doc_id,c.page,c.text,c.emb,c.dim,d.name,d.kind FROM chunks c "
            "JOIN documents d ON d.id=c.doc_id ORDER BY d.created_at,c.idx"
        ).fetchall()
    mat = np.zeros((len(rows), dim), dtype=np.float32)
    for i, r in enumerate(rows):
        if r["dim"] == dim:
            mat[i] = np.frombuffer(r["emb"], dtype=np.float32)
    toks = [tokens(r["text"]) for r in rows]
    _cache.update(v=_version, dim=dim, db=_db_key(), rows=rows, mat=mat, toks=toks, bm25=BM25(toks) if rows else None)
    return _cache


def _db_key() -> str:
    from ..core.config import settings

    return settings.db_path


def relevance(q_tokens: list[str], q_text: str, chunk_toks: list[str], chunk_text: str, vec: float) -> float:
    qs = set(q_tokens)
    cov = len(qs & set(chunk_toks)) / len(qs) if qs else 0.0
    phrase = 0.1 if len(q_text) > 6 and q_text.lower() in chunk_text.lower() else 0.0
    return float(0.55 * cov + 0.35 * min(1.0, max(vec, 0.0) * 2.0) + phrase)


def search(query: str, k: int = 5, mode: str = "hybrid_rerank", kinds: list[str] | None = None) -> list[dict]:
    c = _load()
    if not c["rows"]:
        return []
    q = tokens(query)
    qv = embedder.embed([query])[0]
    vec = c["mat"] @ qv if qv.shape[0] == c["mat"].shape[1] else np.zeros(len(c["rows"]), dtype=np.float32)
    kw = c["bm25"].score(q)
    allowed = np.array([(kinds is None or r["kind"] in kinds) for r in c["rows"]])
    vec_m, kw_m = np.where(allowed, vec, -9), np.where(allowed, kw, -9)
    rank_v = {int(i): r for r, i in enumerate(np.argsort(-vec_m)[:40])}
    rank_k = {int(i): r for r, i in enumerate(np.argsort(-kw_m)[:40])}
    if mode == "vector":
        cand = sorted(rank_v, key=rank_v.get)
    elif mode == "keyword":
        cand = [i for i in sorted(rank_k, key=rank_k.get) if kw[i] > 0]
    else:
        fused = {i: 1 / (60 + rank_v.get(i, 99)) + 1 / (60 + rank_k.get(i, 99)) for i in set(rank_v) | set(rank_k)}
        cand = sorted(fused, key=fused.get, reverse=True)
    cand = [i for i in cand if allowed[i]][: max(k, 15) if mode == "hybrid_rerank" else k]
    hits = []
    for i in cand:
        r = c["rows"][i]
        rel = relevance(q, query, c["toks"][i], r["text"], float(vec[i]))
        hits.append(Hit(r["id"], r["doc_id"], r["name"], r["kind"], r["page"], r["text"], rel, float(vec[i]), float(kw[i])))
    if mode == "hybrid_rerank":
        hits.sort(key=lambda h: h.relevance, reverse=True)
    return [asdict(h) for h in hits[:k]]
