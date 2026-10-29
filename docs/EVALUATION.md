# Evaluation protocol
1. Collect 3–5 real documents (resume, project reports, job descriptions). Upload them.
2. Write 40+ questions in `backend/data/eval/testset.json`: `{question, doc, phrase}` where `phrase` must appear in the gold passage.
3. Add 10+ unanswerable questions to `unanswerable.json` (abstention test).
4. Run `make eval` (or Evidence Explorer → Run evaluation). Report Recall@k, MRR and latency per mode: vector, keyword, hybrid, hybrid+rerank.
5. Report groundedness (lexical support, upper-bounded by wording overlap) and add a manual audit of 20 answers for citation accuracy.
6. Simulator: show seeded reproducibility (`tests/test_core.py::test_simulation_is_deterministic_and_bounded`), then run a small user study rating plan usefulness 1–5.

Baseline on the shipped sample set (n=9, k=3): recall@3 vector 0.78, keyword 0.89, hybrid 0.78, hybrid+rerank 0.89; abstained on 3/3 unanswerable. Too small to draw conclusions.
