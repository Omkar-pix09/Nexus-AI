"""Natural-language command router used by the voice dock and chat. Rule-based on purpose:
fast, deterministic, no LLM round-trip before speaking. Unknown input falls back to grounded Q&A."""
import re

from ..agents.pipeline import parse_horizon
from . import graph, memory, rag, simulator, skills


def handle(text: str, target: str = "ai_ml_engineer") -> dict:
    t = text.strip()
    low = t.lower()
    if re.search(r"\b(simulate|what if|should i focus|compare plans?|plan for|next \d+ (days|weeks|months)|\d+ days)\b", low):
        sim = simulator.simulate(target, parse_horizon(low), 3.0)
        best = next(p for p in sim["plans"] if p["id"] == sim["recommended"])
        reply = (f"Over {sim['horizon_days']} days, I recommend {best['name']}. Estimated coverage rises from "
                 f"{sim['coverage_now']*100:.0f} to {best['coverage_after']*100:.0f} percent. {sim['tradeoff']}")
        return {"intent": "simulate", "reply": reply, "navigate": "/simulate", "data": {"days": sim["horizon_days"]}}
    m = re.search(r"(?:i (?:have )?(?:completed|finished|done)|mark .* done)\s+(.*)", low)
    if m:
        for task in memory.list_tasks():
            if not task["done"] and (task["title"].lower() in low or task["skill"].lower() in low):
                r = memory.complete_task(task["id"])
                return {"intent": "progress", "reply": f"Marked '{task['title']}' complete. {task['skill']} is now about {r['new_level']*100:.0f} percent.", "navigate": "/", "data": r}
        return {"intent": "progress", "reply": "I couldn't match that to an open task. Name the task or its skill.", "navigate": None, "data": {}}
    if re.search(r"\b(graph|map|gaps?|missing skills?|weakest)\b", low):
        g = graph.build(target)
        reply = ("Your biggest gaps are " + ", ".join(g["gaps"][:4]) + ".") if g["gaps"] else "No critical gaps detected."
        return {"intent": "graph", "reply": reply, "navigate": "/graph", "data": {"gaps": g["gaps"]}}
    r = rag.answer(t)
    nav = "/evidence"
    return {"intent": "ask", "reply": re.sub(r"\[\d+\]", "", r["answer"]), "navigate": nav, "data": {"answer": r}}
