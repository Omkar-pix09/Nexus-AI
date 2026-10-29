import json
from pathlib import Path

from . import skills

_ROLES = json.loads((Path(__file__).resolve().parents[2] / "data" / "roles.json").read_text())


def list_roles() -> list[dict]:
    from ..core.db import db

    with db() as conn:
        has_jd = conn.execute("SELECT 1 FROM documents WHERE kind='job_description' LIMIT 1").fetchone() is not None
    out = [{"id": k, "name": v["name"]} for k, v in _ROLES.items()]
    if has_jd:
        out.append({"id": "jd", "name": "From my uploaded job descriptions"})
    return out


def requirements(target: str) -> tuple[str, dict[str, float]]:
    """Return (display name, {skill: weight 0..1}). `jd` derives weights from uploaded job descriptions."""
    if target == "jd":
        counts: dict[str, int] = {}
        for ch in skills._chunks(("job_description",)):
            for s, n in skills.mentions(ch["text"]).items():
                counts[s] = counts.get(s, 0) + n
        if counts:
            top = max(counts.values())
            return "Uploaded job descriptions", {s: round(0.3 + 0.7 * n / top, 2) for s, n in counts.items()}
        target = "ai_ml_engineer"
    r = _ROLES.get(target) or _ROLES["ai_ml_engineer"]
    return r["name"], {s: w for s, w in r["weights"].items() if s in skills.TAXONOMY}
