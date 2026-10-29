"""Retrieval experiment: vector vs keyword vs hybrid vs hybrid+rerank on a fixed labelled test set."""
import json
import time
from pathlib import Path

from . import rag, retrieval

TESTSET = Path(__file__).resolve().parents[2] / "data" / "eval" / "testset.json"


def run(k: int = 3) -> dict:
    cases = json.loads(TESTSET.read_text())
    results = {}
    for mode in retrieval.MODES:
        hit_at_k, rr, lat = 0, 0.0, []
        for c in cases:
            t0 = time.perf_counter()
            hits = retrieval.search(c["question"], k=k, mode=mode)
            lat.append((time.perf_counter() - t0) * 1000)
            rank = next((i + 1 for i, h in enumerate(hits) if h["doc_name"] == c["doc"] and c["phrase"].lower() in h["text"].lower()), None)
            hit_at_k += rank is not None
            rr += 1 / rank if rank else 0
        n = len(cases)
        results[mode] = {"recall_at_k": round(hit_at_k / n, 3), "mrr": round(rr / n, 3), "avg_latency_ms": round(sum(lat) / n, 2)}
    grounded = [rag.answer(c["question"])["groundedness"]["score"] for c in cases]
    grounded = [g for g in grounded if g is not None]
    abstain = [rag.answer(q)["abstained"] for q in json.loads((TESTSET.with_name("unanswerable.json")).read_text())]
    return {
        "k": k, "n_cases": len(cases), "retrieval": results,
        "groundedness_avg": round(sum(grounded) / len(grounded), 3) if grounded else None,
        "abstention_rate_on_unanswerable": round(sum(abstain) / len(abstain), 3) if abstain else None,
    }
