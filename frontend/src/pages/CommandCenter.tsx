import { useEffect, useState, useRef } from "react";
import { Upload, CheckCircle2, Circle, Plus } from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { Bar, Card, Counter, ErrorNote, Spinner } from "../components/ui";
import { HeroVoiceOrb } from "../components/voice/HeroVoiceOrb";

export default function CommandCenter() {
  const { target, tick, refresh } = useStore();
  const [d, setD] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState("");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([api.dashboard(target), api.tasks(), api.timeline()]).then(([a, b, c]) => { setD(a); setTasks(b); setTimeline(c); setSkill((s) => s || a.next_action.skills[0] || ""); }).catch((e) => setErr(e.message));
  }, [target, tick]);

  const upload = async (f?: File) => { if (!f) return; try { await api.upload(f); refresh(); } catch (e: any) { setErr(e.message); } };
  if (err) return <ErrorNote msg={err} />;
  if (!d) return <Spinner label="Loading command center…" />;

  return (
    <div className="space-y-5">
      <header>
        <p className="label">Command Center</p>
        <h1 className="text-3xl font-semibold">Don’t just ask AI what to do. <span className="text-neon">Simulate what could happen next.</span></h1>
        <p className="mt-1 text-slate-400">Target: {d.target_name}</p>
      </header>

      {/* Hero Voice Orb: Audio-Reactive Mission AI Core */}
      <section aria-label="Hero Voice Orb Mission Control">
        <HeroVoiceOrb onPlanAdopted={refresh} />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[["Skill coverage (est.)", d.coverage * 100, "%"], ["Documents indexed", d.documents, ""], ["Evidence links", d.evidence_links, ""], ["Open tasks", d.open_tasks, ""]].map(([l, v, s]) => (
          <Card key={l as string}><p className="label">{l as string}</p><p className="mt-2 text-4xl font-semibold text-neon"><Counter value={v as number} suffix={s as string} /></p></Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Recommended next action" className="xl:col-span-2">
          <p className="text-lg">{d.next_action.summary}</p>
          <div className="mt-3"><Bar value={d.coverage} color="#8b5cf6" /></div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded bg-white/10 px-2 py-0.5 text-slate-300">Plan: <b>Calculated</b> from 7-day optimization formula</span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-slate-300">Levels: <b>Estimated</b> from your documents</span>
            <span className="rounded bg-amber/20 px-2 py-0.5 text-amber">Non-predictive: skill coverage only, not a hiring guarantee</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{d.gaps.map((g: string) => <span key={g} className="rounded-full border border-ember/40 bg-ember/10 px-3 py-1 text-xs text-ember">gap · {g}</span>)}</div>
        </Card>
        <Card title="Evidence upload">
          <button className="btn w-full justify-center" onClick={() => file.current?.click()}><Upload size={16} />Upload PDF / MD / TXT</button>
          <input ref={file} type="file" hidden accept=".pdf,.md,.txt" onChange={(e) => upload(e.target.files?.[0])} />
          <p className="mt-2 text-xs text-slate-400">Name files with “resume”, “project”, or “jd” so they’re classified correctly.</p>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Tasks → update my skill map">
          <div className="mb-3 flex gap-2">
            <input className="input" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="input !w-44" placeholder="Skill (e.g. RAG)" value={skill} onChange={(e) => setSkill(e.target.value)} />
            <button className="btn" onClick={async () => { try { await api.addTask(title, skill, 3); setTitle(""); refresh(); } catch (e: any) { setErr(e.message); } }}><Plus size={14} /></button>
          </div>
          <ul className="space-y-2">
            {tasks.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center gap-3 text-sm">
                <button aria-label="Complete task" disabled={!!t.done} onClick={async () => { await api.completeTask(t.id); refresh(); }}>{t.done ? <CheckCircle2 className="text-neon" size={18} /> : <Circle size={18} />}</button>
                <span className={t.done ? "text-slate-500 line-through" : ""}>{t.title}</span><span className="ml-auto label">{t.skill} · {t.hours}h</span>
              </li>
            ))}
            {!tasks.length && <p className="text-sm text-slate-500">No tasks yet — adopt a plan in the Simulation Lab.</p>}
          </ul>
        </Card>
        <Card title="Memory timeline">
          <ul className="space-y-2 text-sm">{timeline.slice(0, 8).map((e) => <li key={e.id} className="flex gap-3"><span className="label w-28 shrink-0">{e.kind.replace("_", " ")}</span><span className="truncate text-slate-300">{e.payload}</span></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
