# NEXUS AI — The Personal Future Simulator

> Don't just ask AI what to do. Simulate what could happen next.

Voice-first, evidence-grounded decision intelligence. It reads your resume, projects and job descriptions, builds a living
skill graph, simulates alternative plans (7/30/90 days) with explicit assumptions, and shows the evidence behind every answer.

## Quick start
```bash
# 1) API  (works offline in mock mode — no keys needed)
cd backend && pip install -r requirements-dev.txt && uvicorn app.main:app --reload --port 8000
# 2) Web
cd frontend && npm install && npm run dev        # http://localhost:5173
# or everything:  docker compose up --build      # http://localhost:8080
```
Sample documents are auto-seeded on first run. To use a real LLM: copy `.env.example` to `backend/.env`, set
`NEXUS_LLM_PROVIDER=anthropic|gemini` and the key. Voice needs Chrome/Edge (Web Speech API); typing works everywhere.

## Features → code
| Feature | Where |
|---|---|
| Voice-first command center (barge-in, push-to-talk, live transcript) | `frontend/src/components/VoiceDock.tsx`, `hooks/useVoice.ts`, `backend/app/services/command.py` |
| Evidence-grounded RAG, citations, abstention, groundedness check | `services/{ingestion,retrieval,rag}.py`, `pages/EvidenceExplorer.tsx` |
| What-if simulator with assumptions + Monte-Carlo range | `services/simulator.py`, `pages/SimulationLab.tsx` |
| Living knowledge graph (updates on upload / task completion) | `services/{skills,graph}.py`, `pages/KnowledgeGraph.tsx` |
| Personal memory & progress | `services/memory.py`, Command Center |
| Agentic research workflow (bounded state graph, SSE trace) | `agents/{graph,pipeline}.py`, `pages/ResearchRoom.tsx` |
| Reliability layer / experiment | `services/evaluation.py`, `data/eval/`, `tests/` |

## Architecture
```
React+Vite+TS ──/api──► FastAPI ─┬─ ingestion → chunks+embeddings → SQLite
 (glass UI, canvas graph,        ├─ hybrid retrieval (BM25 + cosine → RRF → rerank)
  Web Speech voice, SSE)         ├─ rag (cite → verify → abstain)
                                 ├─ skills/graph/simulator (deterministic, seeded)
                                 ├─ agents: intake→research→analyse→plan→verify→report
                                 └─ llm provider abstraction: mock | anthropic | gemini
```

## Honest limits (read before presenting)
- The simulator estimates **skill coverage** of a target role. It does **not** predict hiring. Levels come from keyword
  evidence in your documents and rough hours-to-proficiency defaults — treat outputs as estimates (the UI labels them).
- Default embeddings are offline feature hashing (good for demo, weaker than neural embeddings). Set
  `NEXUS_EMBED_PROVIDER=gemini` for real semantic vectors; re-upload docs after switching.
- The shipped eval has 9 cases on 4 tiny sample docs: it proves the harness works, not that accuracy is high.
  Build a 40+ case set on your own documents for the final-year report (see `docs/EVALUATION.md`).
- Agent graph is a small in-repo state machine with LangGraph's API shape; swap in `langgraph` if your report requires it.

## Roadmap for a stronger final-year version
pgvector/Qdrant + Postgres, neural reranker, auth + multi-user, LLM-extracted skills (structured output), 3D graph (React Three Fiber), streaming LLM answers, server-side speech (Whisper/TTS).
