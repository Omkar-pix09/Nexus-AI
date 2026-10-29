"""Skill taxonomy, evidence extraction from documents, and current skill levels.
Levels are *estimates from evidence* (0..1) plus a progress bonus from completed tasks."""
import re
import time

from ..core.db import db

# name -> (category, aliases, hours to reach working proficiency from zero)
TAXONOMY: dict[str, dict] = {
    "Python": {"cat": "Languages", "alias": ["python", "pandas", "numpy"], "hours": 90},
    "JavaScript": {"cat": "Languages", "alias": ["javascript", "es6", "js"], "hours": 90},
    "TypeScript": {"cat": "Languages", "alias": ["typescript"], "hours": 50},
    "Java": {"cat": "Languages", "alias": ["java"], "hours": 100},
    "Kotlin": {"cat": "Languages", "alias": ["kotlin"], "hours": 60},
    "SQL": {"cat": "Data", "alias": ["sql", "postgresql", "mysql", "postgres"], "hours": 50},
    "MongoDB": {"cat": "Data", "alias": ["mongodb", "mongoose", "nosql"], "hours": 40},
    "Redis": {"cat": "Data", "alias": ["redis"], "hours": 25},
    "React": {"cat": "Frontend", "alias": ["react", "react.js", "reactjs", "redux"], "hours": 90},
    "Node.js": {"cat": "Backend", "alias": ["node.js", "nodejs", "node", "express", "express.js"], "hours": 70},
    "REST APIs": {"cat": "Backend", "alias": ["rest", "restful", "api", "apis", "fastapi", "endpoints"], "hours": 40},
    "FastAPI": {"cat": "Backend", "alias": ["fastapi"], "hours": 30},
    "Android": {"cat": "Mobile", "alias": ["android", "android studio", "firebase"], "hours": 120},
    "Git": {"cat": "Tooling", "alias": ["git", "github"], "hours": 20},
    "Docker": {"cat": "DevOps", "alias": ["docker", "containers", "kubernetes"], "hours": 35},
    "Cloud Deployment": {"cat": "DevOps", "alias": ["deploy", "deployed", "vercel", "render", "aws", "gcp", "azure", "ci/cd"], "hours": 40},
    "Testing": {"cat": "Tooling", "alias": ["pytest", "jest", "unit test", "unit tests", "testing"], "hours": 30},
    "Data Structures & Algorithms": {"cat": "CS Core", "alias": ["dsa", "algorithms", "data structures", "leetcode", "competitive"], "hours": 200},
    "System Design": {"cat": "CS Core", "alias": ["system design", "scalability", "architecture", "microservices"], "hours": 80},
    "Machine Learning": {"cat": "AI/ML", "alias": ["machine learning", "scikit-learn", "sklearn", "classification", "regression", "ml"], "hours": 140},
    "Deep Learning": {"cat": "AI/ML", "alias": ["deep learning", "pytorch", "tensorflow", "neural"], "hours": 140},
    "NLP": {"cat": "AI/ML", "alias": ["nlp", "natural language", "transformers", "embeddings"], "hours": 90},
    "LLMs": {"cat": "AI/ML", "alias": ["llm", "llms", "gemini", "gpt", "claude", "openai", "language model"], "hours": 50},
    "Prompt Engineering": {"cat": "AI/ML", "alias": ["prompt engineering", "prompting", "prompts"], "hours": 20},
    "RAG": {"cat": "AI/ML", "alias": ["rag", "retrieval", "vector", "chromadb", "pinecone", "qdrant", "pgvector", "faiss"], "hours": 45},
    "LangChain": {"cat": "AI/ML", "alias": ["langchain", "langgraph", "llamaindex"], "hours": 30},
    "ML Evaluation": {"cat": "AI/ML", "alias": ["evaluation", "metrics", "precision", "recall", "benchmark", "mlops"], "hours": 40},
    "Statistics": {"cat": "AI/ML", "alias": ["statistics", "probability", "hypothesis"], "hours": 70},
}

# prerequisite edges (skill -> prerequisites)
PREREQS: dict[str, list[str]] = {
    "FastAPI": ["Python", "REST APIs"], "RAG": ["Python", "LLMs", "NLP"], "LangChain": ["Python", "LLMs"],
    "Deep Learning": ["Machine Learning", "Python"], "Machine Learning": ["Python", "Statistics"],
    "NLP": ["Machine Learning"], "LLMs": ["Python"], "ML Evaluation": ["Machine Learning"],
    "React": ["JavaScript"], "TypeScript": ["JavaScript"], "Node.js": ["JavaScript"], "System Design": ["REST APIs", "SQL"],
    "Cloud Deployment": ["Docker", "Git"], "Prompt Engineering": ["LLMs"], "Kotlin": ["Java"], "Android": ["Java"],
}

_PATTERNS = {
    s: re.compile(r"(?<![a-z0-9+#])(?:" + "|".join(re.escape(a) for a in sorted(v["alias"], key=len, reverse=True)) + r")(?![a-z0-9+#])", re.I)
    for s, v in TAXONOMY.items()
}
OWN_KINDS = ("resume", "project", "notes")


def mentions(text: str) -> dict[str, int]:
    return {s: len(p.findall(text)) for s, p in _PATTERNS.items() if p.search(text)}


def _chunks(kinds: tuple[str, ...] | None = None):
    with db() as conn:
        q = "SELECT c.id,c.doc_id,c.text,d.name,d.kind FROM chunks c JOIN documents d ON d.id=c.doc_id"
        return [dict(r) for r in conn.execute(q) if kinds is None or r["kind"] in kinds]


def evidence() -> dict[str, list[dict]]:
    """skill -> list of {doc_id, doc_name, mentions, snippet} from the user's OWN documents."""
    out: dict[str, dict[str, dict]] = {}
    for ch in _chunks(OWN_KINDS):
        for s, n in mentions(ch["text"]).items():
            d = out.setdefault(s, {}).setdefault(ch["doc_id"], {"doc_id": ch["doc_id"], "doc_name": ch["name"], "mentions": 0, "snippet": ""})
            d["mentions"] += n
            if not d["snippet"]:
                m = _PATTERNS[s].search(ch["text"])
                a = max(0, m.start() - 70)
                d["snippet"] = ch["text"][a : m.end() + 90].replace("\n", " ").strip()
    return {s: list(v.values()) for s, v in out.items()}


def bonuses() -> dict[str, float]:
    with db() as conn:
        return {r["skill"]: r["bonus"] for r in conn.execute("SELECT skill,bonus FROM skill_bonus")}


def levels() -> dict[str, dict]:
    ev, bonus = evidence(), bonuses()
    out = {}
    for s in TAXONOMY:
        e = ev.get(s, [])
        total = sum(x["mentions"] for x in e)
        base = 0.0 if not e else min(0.7, 0.2 + 0.12 * len(e) + 0.05 * min(total, 6))
        lvl = min(0.95, base + bonus.get(s, 0.0))
        out[s] = {"level": round(lvl, 3), "evidence_level": round(base, 3), "bonus": round(bonus.get(s, 0.0), 3), "evidence_count": len(e)}
    return out


def add_progress(skill: str, hours: float) -> float:
    """Diminishing-returns bonus: each hour closes a fraction of the remaining gap."""
    import math

    cur = levels()[skill]["level"]
    tau = TAXONOMY[skill]["hours"] * 0.45
    new = 1 - (1 - cur) * math.exp(-hours * 0.6 / tau)  # 0.6 = completed tasks count at 60% weight until verified by evidence
    bonus = bonuses().get(skill, 0.0) + (new - cur)
    with db() as conn:
        conn.execute("INSERT OR REPLACE INTO skill_bonus VALUES(?,?,?)", (skill, bonus, time.time()))
    return new
