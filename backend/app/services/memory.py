"""Personal memory & progress: tasks, completed work (updates skill levels), and an event timeline."""
import json
import time
import uuid

from ..core.db import db
from . import skills


def log(kind: str, payload) -> None:
    with db() as conn:
        conn.execute("INSERT INTO events(ts,kind,payload) VALUES(?,?,?)", (time.time(), kind, json.dumps(payload) if not isinstance(payload, str) else payload))


def add_task(title: str, skill: str, hours: float) -> dict:
    if skill not in skills.TAXONOMY:
        raise ValueError(f"Unknown skill: {skill}")
    tid = uuid.uuid4().hex[:10]
    with db() as conn:
        conn.execute("INSERT INTO tasks(id,title,skill,hours,done,created_at) VALUES(?,?,?,?,0,?)", (tid, title, skill, hours, time.time()))
    log("task_added", {"title": title, "skill": skill})
    return {"id": tid, "title": title, "skill": skill, "hours": hours, "done": 0}


def list_tasks() -> list[dict]:
    with db() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM tasks ORDER BY done, created_at DESC")]


def complete_task(task_id: str) -> dict:
    with db() as conn:
        t = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        if not t:
            raise KeyError(task_id)
        if t["done"]:
            return {"task": dict(t), "new_level": skills.levels()[t["skill"]]["level"], "already_done": True}
        conn.execute("UPDATE tasks SET done=1, done_at=? WHERE id=?", (time.time(), task_id))
    new = skills.add_progress(t["skill"], t["hours"])
    log("task_completed", {"title": t["title"], "skill": t["skill"], "hours": t["hours"]})
    return {"task": {**dict(t), "done": 1}, "new_level": round(new, 3), "already_done": False}


def timeline(limit: int = 30) -> list[dict]:
    with db() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,))]
