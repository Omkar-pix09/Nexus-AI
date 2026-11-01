import re
from pydantic import BaseModel, Field

from ..core.config import settings
from . import retrieval
from .llm import llm

SYSTEM = (
    "You are NEXUS, an evidence-grounded assistant. Answer ONLY from the numbered sources. "
    "Cite every claim with [n]. If the sources do not contain the answer, say so plainly. "
    "Never claim to predict hiring or selection."
)


class RAGAnswerModel(BaseModel):
    answer: str = Field(description="Evidence-grounded answer citing sources with [n]")
    has_sufficient_evidence: bool = Field(True, description="Whether sources contain sufficient evidence to answer")


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", text) if len(s.strip()) > 25]


def _extractive(question: str, hits: list[dict]) -> str:
    q = set(retrieval.tokens(question))
    scored = []
    for n, h in enumerate(hits[:3], 1):
        for s in _sentences(h["text"]):
            t = set(retrieval.tokens(s))
            if t:
                scored.append((len(q & t) / (len(q) or 1), n, s.lstrip("-*# ").strip()))
    scored.sort(reverse=True)
    picked = [f"{s} [{n}]" for sc, n, s in scored[:3] if sc > 0]
    return " ".join(picked) or f"The closest passage is: {hits[0]['text'][:240]} [1]"


def groundedness(answer: str, hits: list[dict]) -> dict:
    """Lexical support check: a sentence is 'supported' if >=50% of its content tokens appear in a cited source."""
    sentences = [s for s in _sentences(answer) if re.search(r"\[\d+\]", s)] or _sentences(answer)
    supported = 0
    detail = []
    for s in sentences:
        cites = [int(x) for x in re.findall(r"\[(\d+)\]", s)]
        toks = set(retrieval.tokens(re.sub(r"\[\d+\]", "", s)))
        pool = [hits[c - 1] for c in cites if 0 < c <= len(hits)] or hits
        best = max((len(toks & set(retrieval.tokens(h["text"]))) / (len(toks) or 1) for h in pool), default=0.0)
        ok = best >= 0.5
        supported += ok
        detail.append({"sentence": s, "support": round(best, 2), "supported": ok, "cited": bool(cites)})
    total = len(sentences) or 1
    return {"score": round(supported / total, 2), "claims": detail}


def answer(question: str, k: int = 5, mode: str = "hybrid_rerank") -> dict:
    hits = retrieval.search(question, k=k, mode=mode)
    if not hits or hits[0]["relevance"] < settings.abstain_threshold:
        return {
            "question": question,
            "abstained": True,
            "answer": "I couldn't find enough evidence in your documents to answer that. Upload a relevant document or rephrase.",
            "sources": hits[:2],
            "groundedness": {"score": None, "claims": []},
            "mode": mode,
            "engine": "abstain",
        }
    engine = "extractive"
    text = None
    if llm.is_live:
        ctx = "\n\n".join(f"[{i}] ({h['doc_name']}) {h['text']}" for i, h in enumerate(hits, 1))
        fallback_text = _extractive(question, hits)
        fallback_obj = RAGAnswerModel(answer=fallback_text, has_sufficient_evidence=True)
        structured = llm.generate_structured(
            schema=RAGAnswerModel,
            system=SYSTEM,
            user=f"Sources:\n{ctx}\n\nQuestion: {question}",
            fallback=fallback_obj,
        )
        if not structured.has_sufficient_evidence:
            return {
                "question": question,
                "abstained": True,
                "answer": "I couldn't find enough evidence in your documents to answer that. Upload a relevant document or rephrase.",
                "sources": hits[:2],
                "groundedness": {"score": None, "claims": []},
                "mode": mode,
                "engine": llm.provider,
            }
        text = structured.answer
        engine = llm.provider
    if text is None:
        text = _extractive(question, hits)
    return {
        "question": question,
        "abstained": False,
        "answer": text,
        "sources": hits,
        "groundedness": groundedness(text, hits),
        "mode": mode,
        "engine": engine,
    }

