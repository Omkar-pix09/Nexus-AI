# Architecture notes
- **Retrieval**: dense cosine + BM25 → Reciprocal Rank Fusion (k=60) → rerank by 0.55·term-coverage + 0.35·cosine + 0.10·phrase. Abstain when top relevance < `NEXUS_ABSTAIN_THRESHOLD`.
- **Skill levels**: own documents only (resume/project/notes). Level = min(0.7, 0.2 + 0.12·docs + 0.05·mentions) + task-progress bonus. Job descriptions define role weights, never your level.
- **Simulator**: level' = 1 − (1 − level)·exp(−h/τ), τ = 0.45·hours-to-proficiency; coverage = Σw·level / Σw; 300 seeded runs with lognormal(σ=0.25) learning-rate noise for the p10–p90 band; greedy marginal-gain optimiser for the "Gap-Optimised" plan.
- **Agent graph**: intake → research → analyse → plan → verify → report; fixed edges, 12-step cap, SSE trace to the UI.
- **Voice**: browser SpeechRecognition + speechSynthesis; barge-in cancels speech on user input; hold-to-talk on mouse, tap-to-toggle on touch; text fallback always present.
- **Scaling path**: SQLite → Postgres+pgvector, in-process cache → Redis, add auth/tenancy, move embeddings to a worker queue.
