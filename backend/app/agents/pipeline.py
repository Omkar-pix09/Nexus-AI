"""Research -> analyse -> plan -> verify -> report. Each node emits a trace event for the Research Room UI."""
import json
import re
from typing import Iterator
from pydantic import BaseModel, Field

from ..services import retrieval, simulator, skills
from ..services.llm import LLMError, llm
from ..services.roles import requirements
from .graph import END, StateGraph


def parse_horizon(text: str, default: int = 30) -> int:
    m = re.search(r"(\d+)\s*(day|week|month)", text.lower())
    if m:
        n, unit = int(m.group(1)), m.group(2)
        return n * {"day": 1, "week": 7, "month": 30}[unit]
    for word, d in (("quarter", 90), ("month", 30), ("week", 7)):
        if word in text.lower():
            return d
    return default


def intake(s):
    days = s.get("days") or parse_horizon(s["question"])
    return {"days": max(3, min(180, days)), "summary": f"Goal: '{s['question']}' | horizon {days} days | target {s['target']}"}


def research(s):
    name, req = requirements(s["target"])
    top = sorted(req, key=req.get, reverse=True)[:5]
    found = {}
    for sk in top:
        h = retrieval.search(f"{sk} experience project", k=2, mode="hybrid_rerank", kinds=["resume", "project", "notes"])
        found[sk] = [{"doc": x["doc_name"], "relevance": round(x["relevance"], 2), "snippet": x["text"][:160].replace("\n", " ")} for x in h if x["relevance"] > 0.2]
    jd = retrieval.search(f"{name} requirements", k=2, kinds=["job_description"])
    return {"target_name": name, "requirements": req, "evidence_found": found,
            "jd_sources": [{"doc": x["doc_name"], "snippet": x["text"][:160].replace("\n", " ")} for x in jd],
            "summary": f"Retrieved evidence for {len(top)} critical skills; {sum(1 for v in found.values() if v)} have supporting passages."}


def analyse(s):
    lv = skills.levels()
    gaps = sorted(((sk, w, lv[sk]["level"]) for sk, w in s["requirements"].items()), key=lambda x: -(x[1] * (1 - x[2])))[:5]
    return {"gaps": [{"skill": a, "weight": b, "level": c} for a, b, c in gaps], "summary": "Largest weighted gaps: " + ", ".join(g[0] for g in gaps)}


def plan(s):
    sim = simulator.simulate(s["target"], s["days"], s.get("hpd", 3.0))
    return {"simulation": sim, "summary": f"Simulated {len(sim['plans'])} plans; leader: {sim['recommended']}"}


def verify(s):
    sim, issues = s["simulation"], []
    best = next(p for p in sim["plans"] if p["id"] == sim["recommended"])
    for sk in list(best["allocation"])[:4]:
        if not s["evidence_found"].get(sk) and sk in s["requirements"] and skills.levels()[sk]["evidence_count"] == 0:
            issues.append(f"No evidence in your documents for {sk}; starting level assumed ~0.")
    if best["coverage_p90"] - best["coverage_p10"] > 0.12:
        issues.append("Wide uncertainty band; treat the ranking between close plans as tentative.")
    if not s["jd_sources"]:
        issues.append("No job description uploaded; using built-in role template weights.")
    return {"issues": issues, "retries": s.get("retries", 0) + 1, "summary": f"{len(issues)} verification flag(s)"}


class AgentReportModel(BaseModel):
    decision_brief: str = Field(description="Concise decision brief adhering to non-predictive rules and evidence-grounded facts")


def report(s):
    sim = s["simulation"]
    best = next(p for p in sim["plans"] if p["id"] == sim["recommended"])
    facts = {
        "recommended": best["name"], "coverage_now": sim["coverage_now"], "coverage_after": best["coverage_after"],
        "range": [best["coverage_p10"], best["coverage_p90"]], "top_hours": dict(list(best["hours"].items())[:5]),
        "tradeoff": sim["tradeoff"], "flags": s["issues"], "assumptions": sim["assumptions"][:3],
    }
    hrs = ", ".join(f"{k} {v:g}h" for k, v in facts["top_hours"].items())
    deterministic_text = (
        f"Recommendation: **{best['name']}**. Estimated skill coverage for {sim['target_name']} moves from "
        f"{sim['coverage_now']*100:.0f}% to {best['coverage_after']*100:.0f}% (likely range {best['coverage_p10']*100:.0f}-{best['coverage_p90']*100:.0f}%). "
        f"Hours: {hrs}. {sim['tradeoff']} " + ("Flags: " + " ".join(s["issues"]) if s["issues"] else "No verification flags.")
    )
    text = deterministic_text
    if llm.is_live:
        structured = llm.generate_structured(
            schema=AgentReportModel,
            system="Write a concise decision brief (max 180 words). Use ONLY the numbers in the JSON. Label every number calculated or estimated. NEVER predict hiring or selection.",
            user=json.dumps(facts),
            fallback=AgentReportModel(decision_brief=deterministic_text),
            max_tokens=500,
        )
        text = structured.decision_brief
    return {"report": text, "summary": "Decision brief written"}


def build() -> StateGraph:
    g = StateGraph()
    for n, f in (("intake", intake), ("research", research), ("analyse", analyse), ("plan", plan), ("verify", verify), ("report", report)):
        g.add_node(n, f)
    g.add_edge("intake", "research"); g.add_edge("research", "analyse"); g.add_edge("analyse", "plan"); g.add_edge("plan", "verify")
    g.add_conditional_edges("verify", lambda s: "report")
    g.add_edge("report", END)
    return g


def run(question: str, target: str = "ai_ml_engineer", days: int | None = None, hpd: float = 3.0) -> Iterator[dict]:
    state = {"question": question, "target": target, "days": days, "hpd": hpd}
    for node, upd in build().stream(state):
        public = {k: v for k, v in upd.items() if k not in ("simulation",)}
        yield {"node": node, "status": "done", "summary": upd.get("summary", ""), "data": public}
    yield {"node": "result", "status": "done", "summary": "complete", "data": {"report": state["report"], "simulation": state["simulation"], "issues": state["issues"]}}
