import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { Bar, Card, ErrorNote, Spinner, pct } from "../components/ui";

export default function SimulationLab() {
  const { target, refresh } = useStore();
  const loc = useLocation();
  const [days, setDays] = useState<number>((loc.state as any)?.command?.data?.days ?? 30);
  const [hpd, setHpd] = useState(3);
  const [sim, setSim] = useState<any>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");

  const run = () => { setBusy(true); setErr(""); api.simulate({ target, days, hours_per_day: hpd }).then((s) => { setSim(s); setOpen(s.recommended); }).catch((e) => setErr(e.message)).finally(() => setBusy(false)); };
  useEffect(run, [target, days]); // eslint-disable-line

  const adopt = async (p: any) => {
    const top = Object.entries(p.hours as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 4);
    for (const [skill, h] of top) await api.addTask(`${p.name}: ${skill} block`, skill, Math.max(1, Math.round(h / 4)));
    setMsg(`Added ${top.length} tasks from “${p.name}”. Complete them on the Command Center to update your skill map.`); refresh();
  };

  return (
    <div className="space-y-5">
      <header><p className="label">What-if simulator</p><h1 className="text-3xl font-semibold">Simulation Lab</h1></header>
      <Card>
        <div className="flex flex-wrap items-end gap-6">
          <div><p className="label mb-1">Horizon</p><div className="flex gap-2">{[7, 30, 45, 90].map((d) => <button key={d} className={d === days ? "btn" : "btn-ghost"} onClick={() => setDays(d)}>{d} days</button>)}</div></div>
          <div className="min-w-48"><p className="label mb-1">Hours / day · {hpd}</p><input type="range" min={1} max={8} step={0.5} value={hpd} onChange={(e) => setHpd(+e.target.value)} onMouseUp={run} onTouchEnd={run} className="w-full accent-[#22e6c9]" /></div>
          <button className="btn" onClick={run} disabled={busy}>Re-run simulation</button>
        </div>
      </Card>
      {err && <ErrorNote msg={err} />}
      {msg && <p className="rounded-xl border border-neon/40 bg-neon/10 p-3 text-sm text-neon">{msg}</p>}
      {busy && !sim ? <Spinner label="Simulating plans…" /> : sim && (
        <>
          <Card title="Verdict">
            <p className="text-lg">Estimated skill coverage now: <b>{pct(sim.coverage_now)}</b> · productive hours in window: <b>{sim.total_productive_hours}</b></p>
            <p className="mt-1 text-slate-300">{sim.tradeoff}</p>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            {sim.plans.map((p: any) => (
              <Card key={p.id} className={p.id === sim.recommended ? "!border-neon/60" : ""}>
                <div className="flex items-start justify-between"><div><h3 className="text-lg font-semibold">{p.name}{p.id === sim.recommended && <span className="ml-2 rounded-full bg-neon/20 px-2 py-0.5 text-xs text-neon">recommended</span>}</h3><p className="text-sm text-slate-400">{p.description}</p></div><p className="text-2xl font-semibold text-neon">{pct(p.coverage_after)}</p></div>
                <div className="mt-3"><Bar value={p.coverage_after} low={p.coverage_p10} high={p.coverage_p90} /><p className="mt-1 text-xs text-slate-400">Calculated {pct(p.coverage_after)} · estimated range {pct(p.coverage_p10)}–{pct(p.coverage_p90)} · gain +{(p.gain * 100).toFixed(0)} pts</p></div>
                <div className="mt-3 flex flex-wrap gap-1.5">{Object.entries(p.hours as Record<string, number>).slice(0, 6).map(([s, h]) => <span key={s} className="rounded-full border border-white/10 px-2 py-0.5 text-xs">{s} · {h}h</span>)}</div>
                {[...p.risks, ...p.dependency_warnings].length > 0 && <ul className="mt-3 list-disc pl-5 text-xs text-amber">{[...p.risks, ...p.dependency_warnings].map((r: string) => <li key={r}>{r}</li>)}</ul>}
                <div className="mt-3 flex gap-2"><button className="btn-ghost" onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? "Hide" : "Show"} weekly timeline</button><button className="btn" onClick={() => adopt(p)}>Adopt plan</button></div>
                {open === p.id && <div className="mt-3 max-h-48 overflow-auto text-xs"><table className="w-full"><tbody>{p.timeline.map((w: any) => <tr key={w.week} className="border-t border-white/5"><td className="py-1 pr-3 text-slate-400">Week {w.week}</td><td>{Object.entries(w.hours as Record<string, number>).slice(0, 4).map(([s, h]) => `${s} ${h}h`).join(" · ")}</td></tr>)}</tbody></table></div>}
              </Card>
            ))}
          </div>
          <Card title="Assumptions (shown explicitly)"><ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">{sim.assumptions.map((a: string) => <li key={a}>{a}</li>)}</ul></Card>
        </>
      )}
    </div>
  );
}
