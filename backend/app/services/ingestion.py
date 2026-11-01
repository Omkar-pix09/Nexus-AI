import io
import re
import time
import uuid

from ..core.db import db
from . import retrieval
from .embeddings import embedder


def guess_kind(name: str) -> str:
    n = name.lower()
    if re.search(r"(^|[_\-. ])(jd|job)([_\-. ]|$)|job[_-]?desc", n):
        return "job_description"
    if "resume" in n or re.search(r"(^|[_\-. ])cv([_\-. ]|$)", n):
        return "resume"
    if "report" in n or "project" in n:
        return "project"
    return "notes"


INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|directives)", re.IGNORECASE),
    re.compile(r"(system\s+prompt|system\s+message|developer\s+mode|jailbreak|DAN\s+mode)", re.IGNORECASE),
    re.compile(r"<\s*/?(system|assistant|human|user|instruction)\s*>", re.IGNORECASE),
    re.compile(r"(disregard|override)\s+all\s+rules", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(an?\s+)?unrestricted", re.IGNORECASE),
]

EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_PATTERN = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
KEY_PATTERN = re.compile(r"\b(?:api[_-]?key|bearer|token|secret)[=:\s]+[A-Za-z0-9_\-\.]{16,}\b", re.IGNORECASE)


def sanitize_untrusted_input(text: str) -> str:
    """Neutralize prompt injections in untrusted uploaded documents."""
    cleaned = text
    for pattern in INJECTION_PATTERNS:
        cleaned = pattern.sub("[filtered-instruction]", cleaned)
    # Neutralize control characters
    cleaned = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", cleaned)
    return cleaned


def redact_pii(text: str) -> str:
    """Redact sensitive personal identifiers before processing or external calls."""
    t = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", text)
    t = PHONE_PATTERN.sub("[REDACTED_PHONE]", t)
    t = KEY_PATTERN.sub("[REDACTED_SECRET]", t)
    return t


def parse(name: str, data: bytes) -> list[tuple[int, str]]:
    if name.lower().endswith(".pdf"):
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        return [(i + 1, sanitize_untrusted_input(p.extract_text() or "")) for i, p in enumerate(reader.pages)]
    raw = data.decode("utf-8", errors="ignore")
    return [(1, sanitize_untrusted_input(raw))]


def chunk_text(text: str, size: int = 700, overlap: int = 120) -> list[str]:
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks, cur = [], ""
    for p in paras:
        if cur and len(cur) + len(p) > size:
            chunks.append(cur)
            cur = (cur[-overlap:] + "\n" + p) if overlap else p
        else:
            cur = f"{cur}\n\n{p}" if cur else p
        while len(cur) > size * 1.6:
            cut = cur.rfind(". ", 0, size) + 1 or size
            chunks.append(cur[:cut])
            cur = cur[cut:].strip()
    if cur.strip():
        chunks.append(cur)
    return chunks


def ingest(name: str, data: bytes, kind: str | None = None) -> dict:
    kind = kind or guess_kind(name)
    pieces = [(pg, c) for pg, t in parse(name, data) for c in chunk_text(t)]
    if not pieces:
        raise ValueError("No extractable text found in document")
    embs = embedder.embed([c for _, c in pieces])
    doc_id = uuid.uuid4().hex[:12]
    with db() as conn:
        conn.execute("INSERT INTO documents VALUES(?,?,?,?,?)", (doc_id, name, kind, len(pieces), time.time()))
        for i, ((pg, text), e) in enumerate(zip(pieces, embs)):
            conn.execute(
                "INSERT INTO chunks VALUES(?,?,?,?,?,?,?)",
                (f"{doc_id}-{i}", doc_id, i, pg, text, e.tobytes(), int(e.shape[0])),
            )
        conn.execute("INSERT INTO events(ts,kind,payload) VALUES(?,?,?)", (time.time(), "document_added", name))
    retrieval.bump()
    return {"id": doc_id, "name": name, "kind": kind, "chunks": len(pieces)}


def delete(doc_id: str) -> None:
    with db() as conn:
        conn.execute("DELETE FROM chunks WHERE doc_id=?", (doc_id,))
        conn.execute("DELETE FROM documents WHERE id=?", (doc_id,))
    retrieval.bump()


def list_documents() -> list[dict]:
    with db() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM documents ORDER BY created_at DESC")]
