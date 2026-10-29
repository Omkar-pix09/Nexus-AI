from . import skills
from .roles import requirements


def build(target: str = "ai_ml_engineer") -> dict:
    name, req = requirements(target)
    lv = skills.levels()
    ev = skills.evidence()
    nodes = [{"id": "goal", "type": "goal", "label": name, "level": 1.0, "weight": 1.0}]
    edges = []
    active = set(req) | {s for s, e in ev.items() if e}
    for p in list(active):
        active |= set(skills.PREREQS.get(p, [])) if lv[p]["level"] > 0 or p in req else set()
    for s in sorted(active):
        w = req.get(s, 0.0)
        lvl = lv[s]["level"]
        nodes.append({
            "id": f"skill:{s}", "type": "skill", "label": s, "group": skills.TAXONOMY[s]["cat"],
            "level": lvl, "weight": w, "gap": bool(w >= 0.5 and lvl < 0.5), "evidence_count": lv[s]["evidence_count"],
        })
        if w > 0:
            edges.append({"source": f"skill:{s}", "target": "goal", "type": "required", "weight": w})
        for p in skills.PREREQS.get(s, []):
            if p in active:
                edges.append({"source": f"skill:{p}", "target": f"skill:{s}", "type": "prerequisite", "weight": 0.3})
    docs: dict[str, dict] = {}
    for s, items in ev.items():
        for it in items:
            docs.setdefault(it["doc_id"], {"id": f"doc:{it['doc_id']}", "type": "evidence", "label": it["doc_name"], "level": 0.5, "weight": 0})
            edges.append({"source": f"doc:{it['doc_id']}", "target": f"skill:{s}", "type": "evidences", "weight": min(1.0, it["mentions"] / 5)})
    nodes += list(docs.values())
    from ..core.db import db

    with db() as conn:
        for t in conn.execute("SELECT * FROM tasks WHERE done=0"):
            if f"skill:{t['skill']}" in {n["id"] for n in nodes}:
                nodes.append({"id": f"task:{t['id']}", "type": "task", "label": t["title"], "level": 0.3, "weight": 0})
                edges.append({"source": f"task:{t['id']}", "target": f"skill:{t['skill']}", "type": "improves", "weight": 0.4})
    gaps = sorted([n for n in nodes if n.get("gap")], key=lambda n: -n["weight"])
    return {"target": target, "target_name": name, "nodes": nodes, "edges": edges, "gaps": [g["label"] for g in gaps]}
