import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..agents import pipeline
from ..core.config import settings
from ..services import command, evaluation, graph, ingestion, memory, rag, retrieval, roles, simulator, skills
from ..services.llm import llm

router = APIRouter(prefix="/api")


class AskIn(BaseModel):
    question: str = Field(min_length=2, max_length=1000)
    mode: str = "hybrid_rerank"
    k: int = Field(5, ge=1, le=10)


class SimIn(BaseModel):
    target: str = "ai_ml_engineer"
    days: int = Field(30, ge=3, le=180)
    hours_per_day: float = Field(3.0, ge=0.5, le=12)
    custom: dict[str, float] | None = None


class CommandIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    target: str = "ai_ml_engineer"


class TaskIn(BaseModel):
    title: str
    skill: str
    hours: float = Field(2.0, gt=0, le=100)


@router.get("/health")
def health():
    return {"status": "ok", "llm_provider": llm.provider, "llm_live": llm.is_live, "embed_provider": settings.embed_provider}


@router.get("/documents")
def documents():
    return ingestion.list_documents()


@router.post("/documents")
async def upload(file: UploadFile = File(...), kind: str | None = Form(None)):
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(413, "File too large (15 MB max)")
    try:
        return ingestion.ingest(file.filename or "upload.txt", data, kind)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    ingestion.delete(doc_id)
    return {"ok": True}


@router.get("/search")
def search(q: str, mode: str = "hybrid_rerank", k: int = 5):
    if mode not in retrieval.MODES:
        raise HTTPException(400, f"mode must be one of {retrieval.MODES}")
    return retrieval.search(q, k=k, mode=mode)


@router.post("/ask")
def ask(body: AskIn):
    if body.mode not in retrieval.MODES:
        raise HTTPException(400, "invalid mode")
    return rag.answer(body.question, body.k, body.mode)


@router.get("/roles")
def get_roles():
    return roles.list_roles()


@router.post("/simulate")
def simulate(body: SimIn):
    return simulator.simulate(body.target, body.days, body.hours_per_day, custom=body.custom)


@router.get("/graph")
def get_graph(target: str = "ai_ml_engineer"):
    return graph.build(target)


@router.get("/skills")
def get_skills():
    lv = skills.levels()
    return [{"skill": s, "category": skills.TAXONOMY[s]["cat"], **lv[s]} for s in skills.TAXONOMY]


@router.get("/tasks")
def tasks():
    return memory.list_tasks()


@router.post("/tasks")
def add_task(body: TaskIn):
    try:
        return memory.add_task(body.title, body.skill, body.hours)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/tasks/{task_id}/complete")
def complete(task_id: str):
    try:
        return memory.complete_task(task_id)
    except KeyError:
        raise HTTPException(404, "task not found")


@router.get("/timeline")
def timeline():
    return memory.timeline()


@router.post("/command")
def run_command(body: CommandIn):
    return command.handle(body.text, body.target)


@router.get("/dashboard")
def dashboard(target: str = "ai_ml_engineer"):
    name, req = roles.requirements(target)
    lv = skills.levels()
    now = simulator.coverage({s: lv[s]["level"] for s in lv}, req)
    sim = simulator.simulate(target, 7, 3.0)
    best = next(p for p in sim["plans"] if p["id"] == "gap_optimised")
    top = list(best["hours"].items())[:3]
    g = graph.build(target)
    docs = ingestion.list_documents()
    open_tasks = [t for t in memory.list_tasks() if not t["done"]]
    return {
        "target": target, "target_name": name, "coverage": round(now, 3), "documents": len(docs),
        "evidence_links": sum(1 for e in g["edges"] if e["type"] == "evidences"),
        "gaps": g["gaps"][:6], "open_tasks": len(open_tasks),
        "next_action": {"summary": "This week, spend your hours on: " + ", ".join(f"{s} ({h:g}h)" for s, h in top), "skills": [s for s, _ in top], "hours": [h for _, h in top]},
        "llm_live": llm.is_live,
    }


@router.get("/agent/stream")
def agent_stream(question: str, target: str = "ai_ml_engineer", days: int | None = None, hpd: float = 3.0):
    def gen():
        for ev in pipeline.run(question, target, days, hpd):
            yield f"data: {json.dumps(ev, default=str)}\n\n"
        yield "event: end\ndata: {}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/eval/run")
def run_eval(k: int = 3):
    return evaluation.run(k)
