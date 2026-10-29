import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { streamAgent } from "../lib/api";
import { useStore } from "../lib/store";
import { Card, pct } from "../components/ui";

const STEPS = ["intake", "research", "analyse", "plan", "verify", "report"];

export default function ResearchRoom() {
  const { target } = useStore();
  const [q, setQ] = useState("I have 45 days before placements. Should I focus on DSA, AI projects, or full-stack development?");
  const [days, setDays] = useState(45);
  const [events, setEvents] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const stop = useRef<() => void>();

  const go = () => {
    setEvents([]); setResult(null); setRunning(true);
    stop.current = streamAgent(q, target, days, (e) => (e.node === "result" ? setResult(e.data) : setEvents((x) => [...x, e])), () => setRunning(false));
  };
  const done = new Set(events.map((e) => e.node));
  const active = STEPS.find((s) => !done.has(s));

  return (
    <div className="space-y-5">
      <header><p className="label">Agentic workflow · bounded state graph</p><h1 className="text-3xl font-semibold">AI Research Room</h1></header>
      <Card>
        <textarea className="input h-20" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-3 flex items-center gap-3"><label className="label">Horizon (days)</label><input type="number" min={3} max={180} className="input !w-24" value={days} onChange={(e) => setDays(+e.target.value)} /><button className="btn" onClick={go} disabled={running}>{running ? "Investigating…" : "Start investigation"}</button></div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card title="Pipeline trace">
          <ol className="space-y-3">{STEPS.map((s) => {
            const ev = events.find((e) => e.node === s);
            return (
              <li key={s} className="flex gap-3 text-sm">
                {ev ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-neon" /> : running && s === active ? <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-violet" /> : <span className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white/20" />}
                <div><p className="font-medium capitalize">{s}</p><AnimatePresence>{ev && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-slate-400">{ev.summary}</motion.p>}</AnimatePresence></div>
              </li>);
          })}</ol>
        </Card>
        <div className="space-y-4">
          {events.find((e) => e.node === "research") && <Card title="Retrieved evidence"><ul className="space-y-2 text-xs text-slate-300">{Object.entries(events.find((e) => e.node === "research")!.data.evidence_found).map(([sk, v]: any) => <li key={sk}><b>{sk}</b>: {v.length ? v.map((x: any) => `${x.doc} (${x.relevance})`).join(", ") : <span className="text-amber">no evidence found</span>}</li>)}</ul></Card>}
          {result && (
            <>
              <Card title="Decision brief"><p className="whitespace-pre-line leading-relaxed">{result.report.replace(/\*\*/g, "")}</p></Card>
              {result.issues.length > 0 && <Card title="Verification flags"><ul className="list-disc pl-5 text-sm text-amber">{result.issues.map((i: string) => <li key={i}>{i}</li>)}</ul></Card>}
              <Card title="Plans compared"><ul className="space-y-2 text-sm">{result.simulation.plans.map((p: any) => <li key={p.id} className="flex items-center gap-3"><span className="w-40">{p.name}</span><div className="h-2 flex-1 rounded bg-white/10"><div className="h-2 rounded bg-neon" style={{ width: pct(p.coverage_after) }} /></div><span>{pct(p.coverage_after)}</span></li>)}</ul></Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
