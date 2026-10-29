"""Transparent what-if engine. Every number comes from explicit formulas and assumptions that are returned
to the UI. Nothing here predicts hiring outcomes; it estimates *skill coverage* of a target role.

Model:  level' = 1 - (1 - level) * exp(-hours * m / tau),  tau = 0.45 * hours_to_master
        coverage = sum(w_s * level_s) / sum(w_s)
Uncertainty: Monte-Carlo over the learning-rate multiplier m ~ LogNormal(0, 0.25), seeded for reproducibility."""
import math

import numpy as np

from ..core.config import settings
from . import skills
from .roles import requirements

DSA = "Data Structures & Algorithms"

TEMPLATES = {
    "dsa_focus": ("DSA Sprint", "Interview-style problem solving first.", {DSA: 0.6, "System Design": 0.1, "SQL": 0.15, "Python": 0.15}),
    "ai_project": ("AI Project Build", "Ship one evidence-rich RAG/LLM project.", {"RAG": 0.25, "LLMs": 0.2, "LangChain": 0.1, "FastAPI": 0.15, "ML Evaluation": 0.15, "Python": 0.1, "Docker": 0.05}),
    "fullstack_polish": ("Full-Stack Polish", "Deepen React/TypeScript/Node and deployment.", {"React": 0.25, "TypeScript": 0.2, "Node.js": 0.2, "Cloud Deployment": 0.15, "Testing": 0.1, "REST APIs": 0.1}),
    "ml_foundations": ("ML Foundations", "Core ML and statistics theory plus evaluation.", {"Machine Learning": 0.35, "Statistics": 0.2, "Deep Learning": 0.15, "NLP": 0.15, "ML Evaluation": 0.15}),
}


def _tau(skill: str) -> float:
    return skills.TAXONOMY[skill]["hours"] * 0.45


def _after(level: float, hours: float, skill: str, m: float = 1.0) -> float:
    return 1 - (1 - level) * math.exp(-hours * m / _tau(skill))


def coverage(lv: dict[str, float], req: dict[str, float]) -> float:
    tw = sum(req.values()) or 1.0
    return sum(w * lv.get(s, 0.0) for s, w in req.items()) / tw


def optimise(lv: dict[str, float], req: dict[str, float], total_hours: float, steps: int = 50) -> dict[str, float]:
    """Greedy marginal-gain allocation: repeatedly give the next slice of hours to the skill with the best weight*gain."""
    cur, hrs, slice_h = dict(lv), {s: 0.0 for s in req}, total_hours / steps
    for _ in range(steps):
        best = max(req, key=lambda s: req[s] * (_after(cur[s], slice_h, s) - cur[s]))
        hrs[best] += slice_h
        cur[best] = _after(cur[best], slice_h, best)
    return {s: h / total_hours for s, h in hrs.items() if h > 0}


def simulate(target: str = "ai_ml_engineer", days: int = 30, hours_per_day: float = 3.0, seed: int = 7, custom: dict | None = None) -> dict:
    role_name, req = requirements(target)
    lv_full = skills.levels()
    lv = {s: lv_full[s]["level"] for s in skills.TAXONOMY}
    total = days * hours_per_day * settings.sim_efficiency
    before = coverage(lv, req)
    plans_in = {k: (n, d, {s: f for s, f in a.items() if s in skills.TAXONOMY}) for k, (n, d, a) in TEMPLATES.items()}
    opt = optimise(lv, req, total)
    plans_in["gap_optimised"] = ("Gap-Optimised", "Greedy allocation to the highest marginal coverage gain per hour.", opt)
    if custom:
        plans_in["custom"] = ("Custom", "Your own allocation.", {s: f for s, f in custom.items() if s in skills.TAXONOMY})
    rng = np.random.default_rng(seed)
    mult = rng.lognormal(0, 0.25, 300)
    critical = sorted(req, key=req.get, reverse=True)[: max(3, len(req) // 3)]
    plans = []
    weeks = max(1, math.ceil(days / 7))
    for pid, (name, desc, alloc) in plans_in.items():
        norm = sum(alloc.values()) or 1.0
        alloc = {s: f / norm for s, f in alloc.items()}
        hours = {s: round(f * total, 1) for s, f in alloc.items()}
        end = dict(lv)
        for s, h in hours.items():
            end[s] = _after(lv[s], h, s)
        cov = coverage(end, req)
        samples = []
        for m in mult:
            e = {s: (_after(lv[s], hours[s], s, m) if s in hours else lv[s]) for s in lv}
            samples.append(coverage(e, req))
        p10, p90 = float(np.percentile(samples, 10)), float(np.percentile(samples, 90))
        risks, warns = [], []
        if hours_per_day > 6:
            risks.append(f"{hours_per_day:g} h/day is above a sustainable study load; expect lower real efficiency.")
        if max(alloc.values()) > 0.55:
            top = max(alloc, key=alloc.get)
            risks.append(f"Over-concentrated: {alloc[top]*100:.0f}% of hours on {top}.")
        if len([s for s in alloc if alloc[s] < 0.1]) > 4:
            risks.append("Many small allocations -> context-switching cost not modelled here.")
        gaps = [s for s in critical if end.get(s, 0) < 0.5]
        if gaps:
            risks.append("Critical skills still below 50%: " + ", ".join(gaps[:4]) + ".")
        for s in alloc:
            for p in skills.PREREQS.get(s, []):
                if end.get(p, 0) < 0.35 and p not in alloc:
                    warns.append(f"{s} depends on {p}, which stays at {end.get(p,0)*100:.0f}%.")
        timeline = [
            {"week": w + 1, "hours": {s: round(h / weeks, 1) for s, h in hours.items()}} for w in range(weeks)
        ]
        plans.append({
            "id": pid, "name": name, "description": desc,
            "allocation": {s: round(f, 3) for s, f in sorted(alloc.items(), key=lambda x: -x[1])},
            "hours": hours,
            "coverage_before": round(before, 3), "coverage_after": round(cov, 3),
            "coverage_p10": round(p10, 3), "coverage_p90": round(p90, 3),
            "gain": round(cov - before, 3),
            "skills_after": {s: round(end[s], 3) for s in alloc},
            "risks": risks, "dependency_warnings": warns[:5], "timeline": timeline,
            "score": round(cov - 0.03 * len(risks) - 0.01 * len(warns), 4),
        })
    plans.sort(key=lambda p: p["score"], reverse=True)
    best, runner = plans[0], plans[1]
    return {
        "target": target, "target_name": role_name, "horizon_days": days, "hours_per_day": hours_per_day,
        "total_productive_hours": round(total, 1), "coverage_now": round(before, 3),
        "plans": plans, "recommended": best["id"],
        "tradeoff": f"{best['name']} leads {runner['name']} by {(best['score']-runner['score'])*100:.1f} score points "
                    f"({best['coverage_after']*100:.0f}% vs {runner['coverage_after']*100:.0f}% estimated coverage).",
        "assumptions": [
            f"Only {settings.sim_efficiency*100:.0f}% of planned hours are productive (breaks, debugging, context switching).",
            "Skill gain follows diminishing returns: level' = 1 - (1 - level) * exp(-hours / tau), tau = 0.45 * hours-to-proficiency.",
            "Hours-to-proficiency per skill are rough defaults from the taxonomy, not measured from you.",
            "Current levels are estimated from mentions in your own documents, not from tests.",
            "Uncertainty band = 10th-90th percentile over 300 seeded runs with learning-rate noise (sigma 0.25).",
            "Coverage is a skill-match score for the chosen target. It is NOT a hiring or selection probability.",
        ],
        "labels": {"calculated": ["coverage_before", "coverage_after", "hours", "allocation"], "estimated": ["coverage_p10", "coverage_p90", "levels"]},
    }
