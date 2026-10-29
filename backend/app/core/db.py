import sqlite3
from contextlib import contextmanager
from pathlib import Path

from .config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY, name TEXT, kind TEXT, n_chunks INTEGER, created_at REAL);
CREATE TABLE IF NOT EXISTS chunks(id TEXT PRIMARY KEY, doc_id TEXT, idx INTEGER, page INTEGER, text TEXT, emb BLOB, dim INTEGER);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(doc_id);
CREATE TABLE IF NOT EXISTS skill_bonus(skill TEXT PRIMARY KEY, bonus REAL, updated_at REAL);
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, title TEXT, skill TEXT, hours REAL, done INTEGER DEFAULT 0, created_at REAL, done_at REAL);
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL, kind TEXT, payload TEXT);
"""
_initialised: set[str] = set()


@contextmanager
def db():
    Path(settings.db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    if settings.db_path not in _initialised:
        conn.executescript(SCHEMA)
        _initialised.add(settings.db_path)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
