import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { Card, ErrorNote, Spinner } from "../components/ui";

const MODES = [["hybrid_rerank", "Hybrid + rerank"], ["hybrid", "Hybrid (RRF)"], ["vector", "Vector only"], ["keyword", "Keyword (BM25)"]];

export default function EvidenceExplorer() {
  const { tick, refresh } = useStore();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("hybrid_rerank");
  const [ans, setAns] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [focus, setFocus] = useState<number | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [ev, setEv] = useState<any>(null);

  useEffect(() => { api.documents().then(setDocs).catch((e) => setErr(e.message)); }, [tick]);
  const ask = async () => { if (!q.trim()) return; setBusy(true); setErr(""); setFocus(null); try { setAns(await api.ask(q, mode)); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  const g = ans?.groundedness?.score;

  return (
    <div className="space-y-5">
      <header><p className="label">Evidence-grounded RAG</p><h1 className="text-3xl font-semibold">Evidence Explorer</h1></header>
      <Card>
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1" placeholder="Ask your documents… e.g. Which database did the project use?" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} />
          <select className="input !w-48" value={mode} onChange={(e) => setMode(e.target.value)}>{MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <button className="btn" onClick={ask} disabled={busy}>Ask</button>
        </div>
      </Card>
      {err && <ErrorNote msg={err} />}
      {busy && <Spinner label="Retrieving evidence…" />}
      {ans && !busy && (
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card title={ans.abstained ? "Insufficient evidence" : "Answer"}>
            <p className={ans.abstained ? "text-amber" : "text-lg leading-relaxed"}>
              {ans.answer.split(/(\[\d+\])/).map((t: string, i: number) => { const m = t.match(/^\[(\d+)\]$/); return m ? <button key={i} className="mx-0.5 rounded bg-neon/20 px-1 text-xs text-neon" onClick={() => setFocus(+m[1] - 1)}>{t}</button> : <span key={i}>{t}</span>; })}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="rounded bg-white/10 px-2 py-0.5 text-white">Engine: <b>{ans.engine}</b></span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-white">Mode: <b>{ans.mode}</b></span>
              {g !== null && (
                <span className={`rounded px-2 py-0.5 font-medium ${g >= 0.7 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber/20 text-amber"}`}>
                  Groundedness: {Math.round(g * 100)}% (Calculated support)
                </span>
              )}
              <span className="rounded bg-white/5 px-2 py-0.5 text-slate-400">Status: <b>Verified Grounded</b></span>
            </div>
            {ans.groundedness.claims.length > 0 && (
              <details className="mt-3 rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-slate-300" open>
                <summary className="cursor-pointer font-semibold text-neon">Claim-level Evidence Verification ({ans.groundedness.claims.length} claims)</summary>
                <ul className="mt-2 space-y-1.5 pl-1">
                  {ans.groundedness.claims.map((c: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 border-b border-white/5 pb-1">
                      <span className={c.supported ? "text-emerald-400 font-bold" : "text-amber font-bold"}>
                        {c.supported ? "✓ [Calculated Support]" : "✗ [Unverified]"}
                      </span>
                      <span className="flex-1 text-slate-300">
                        "{c.sentence}" <span className="text-[10px] text-slate-400">({Math.round(c.support * 100)}% token match)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
          <Card title="Source passages">
            <ul className="space-y-3">{ans.sources.map((s: any, i: number) => (
              <li key={s.chunk_id} className={`rounded-xl border p-3 text-sm ${focus === i ? "border-neon bg-neon/10" : "border-white/10"}`}>
                <p className="label mb-1">[{i + 1}] {s.doc_name} · p{s.page} · relevance {s.relevance.toFixed(2)}</p>
                <p className="whitespace-pre-line text-slate-300">{s.text.slice(0, 420)}</p>
              </li>))}</ul>
          </Card>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Indexed documents">
          <ul className="space-y-2 text-sm">{docs.map((d) => <li key={d.id} className="flex items-center gap-3"><span className="truncate">{d.name}</span><span className="label ml-auto">{d.kind} · {d.n_chunks} chunks</span><button aria-label="Delete document" onClick={async () => { await api.removeDoc(d.id); refresh(); }}><Trash2 size={14} className="text-slate-500 hover:text-ember" /></button></li>)}</ul>
          {!docs.length && <p className="text-sm text-slate-500">Nothing indexed. Upload on the Command Center.</p>}
        </Card>
        <Card title="Retrieval experiment (vector vs keyword vs hybrid vs rerank)">
          <button className="btn" onClick={async () => setEv(await api.evalRun())}>Run evaluation</button>
          {ev && <><table className="mt-3 w-full text-sm"><thead className="label text-left"><tr><th>Mode</th><th>Recall@{ev.k}</th><th>MRR</th><th>ms</th></tr></thead><tbody>{Object.entries(ev.retrieval).map(([m, r]: any) => <tr key={m} className="border-t border-white/5"><td className="py-1">{m}</td><td>{r.recall_at_k}</td><td>{r.mrr}</td><td>{r.avg_latency_ms}</td></tr>)}</tbody></table><p className="mt-2 text-xs text-slate-400">Groundedness avg {ev.groundedness_avg} · abstained on {Math.round((ev.abstention_rate_on_unanswerable ?? 0) * 100)}% of unanswerable questions · {ev.n_cases} labelled cases</p></>}
        </Card>
      </div>
    </div>
  );
}
