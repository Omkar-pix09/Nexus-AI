from app.services import evaluation, retrieval, simulator, skills


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_hybrid_retrieval_finds_database(client):
    hits = retrieval.search("Which database stores sessions?", k=3)
    assert any("MongoDB" in h["text"] for h in hits)


def test_rag_cites_and_abstains(client):
    ok = client.post("/api/ask", json={"question": "Which database did the placement project use?"}).json()
    assert not ok["abstained"] and "[1]" in ok["answer"]
    no = client.post("/api/ask", json={"question": "What is the candidate's favourite colour?"}).json()
    assert no["abstained"]


def test_skill_evidence_only_from_own_docs(client):
    ev = skills.evidence()
    assert "React" in ev and all(e["doc_name"] != "jd_fullstack_engineer.md" for e in ev["React"])


def test_simulation_is_deterministic_and_bounded(client):
    a = simulator.simulate("ai_ml_engineer", 30, 3)
    b = simulator.simulate("ai_ml_engineer", 30, 3)
    assert a == b
    for p in a["plans"]:
        assert p["coverage_before"] <= p["coverage_after"] <= 1.0
        assert p["coverage_p10"] <= p["coverage_p90"]
    assert a["recommended"] == a["plans"][0]["id"]
    assert any("NOT a hiring" in x for x in a["assumptions"])


def test_task_completion_raises_skill(client):
    before = next(s for s in client.get("/api/skills").json() if s["skill"] == "RAG")["level"]
    t = client.post("/api/tasks", json={"title": "Build RAG demo", "skill": "RAG", "hours": 10}).json()
    r = client.post(f"/api/tasks/{t['id']}/complete").json()
    assert r["new_level"] > before


def test_graph_has_gaps(client):
    g = client.get("/api/graph").json()
    assert g["nodes"][0]["type"] == "goal" and g["edges"]


def test_command_routing(client):
    assert client.post("/api/command", json={"text": "should I focus on DSA in the next 45 days"}).json()["intent"] == "simulate"
    assert client.post("/api/command", json={"text": "show my missing skills"}).json()["intent"] == "graph"


def test_agent_stream(client):
    r = client.get("/api/agent/stream", params={"question": "45 days before placements, what should I focus on?"})
    assert r.status_code == 200 and "event: end" in r.text and '"node": "report"' in r.text


def test_eval_runs(client):
    out = evaluation.run(3)
    assert set(out["retrieval"]) == set(retrieval.MODES)
    assert out["retrieval"]["hybrid_rerank"]["recall_at_k"] >= 0.6
