import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { Card, ErrorNote, Spinner, pct } from "../components/ui";

type N = { id: string; type: string; label: string; level: number; weight: number; gap?: boolean; group?: string; x: number; y: number; vx: number; vy: number; evidence_count?: number };
const COLORS: Record<string, string> = { goal: "#fbbf24", skill: "#22e6c9", evidence: "#8b5cf6", task: "#fb7185" };

/* Dependency-free force layout on canvas: repulsion + spring edges + centre gravity. */
export default function KnowledgeGraph() {
  const { target, tick } = useStore();
  const [g, setG] = useState<any>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<N | null>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const nodes = useRef<N[]>([]);
  const hover = useRef<N | null>(null);

  useEffect(() => { api.graph(target).then(setG).catch((e) => setErr(e.message)); }, [target, tick]);

  useEffect(() => {
    if (!g) return;
    const c = cv.current!, ctx = c.getContext("2d")!;
    const dpr = devicePixelRatio || 1;
    const W = c.clientWidth, H = c.clientHeight;
    c.width = W * dpr; c.height = H * dpr; ctx.scale(dpr, dpr);
    nodes.current = g.nodes.map((n: any, i: number) => ({ ...n, x: W / 2 + Math.cos(i) * 150 * Math.random(), y: H / 2 + Math.sin(i) * 150 * Math.random(), vx: 0, vy: 0 }));
    const byId = new Map(nodes.current.map((n) => [n.id, n]));
    const links = g.edges.map((e: any) => ({ a: byId.get(e.source)!, b: byId.get(e.target)!, t: e.type, w: e.weight })).filter((l: any) => l.a && l.b);
    let raf = 0, frames = 0;
    const r = (n: N) => (n.type === "goal" ? 22 : n.type === "skill" ? 8 + n.level * 10 : 7);
    const tickSim = () => {
      const N_ = nodes.current;
      for (let i = 0; i < N_.length; i++) for (let j = i + 1; j < N_.length; j++) {
        const a = N_[i], b = N_[j]; let dx = a.x - b.x, dy = a.y - b.y; const d2 = dx * dx + dy * dy + 40; const f = 2600 / d2; const d = Math.sqrt(d2);
        dx /= d; dy /= d; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
      }
      for (const l of links) { const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y, d = Math.hypot(dx, dy) || 1; const rest = l.t === "evidences" ? 120 : l.t === "required" ? 170 : 90; const f = (d - rest) * 0.012; l.a.vx += (dx / d) * f; l.a.vy += (dy / d) * f; l.b.vx -= (dx / d) * f; l.b.vy -= (dy / d) * f; }
      for (const n of N_) { n.vx += (W / 2 - n.x) * 0.002; n.vy += (H / 2 - n.y) * 0.002; n.vx *= 0.82; n.vy *= 0.82; n.x += n.vx; n.y += n.vy; }
    };
    const draw = () => {
      if (frames++ < 400) tickSim();
      ctx.clearRect(0, 0, W, H);
      for (const l of links) {
        ctx.strokeStyle = l.t === "required" ? `rgba(251,191,36,${0.15 + l.w * 0.35})` : l.t === "prerequisite" ? "rgba(255,255,255,.12)" : "rgba(139,92,246,.35)";
        ctx.lineWidth = l.t === "required" ? 1 + l.w * 2 : 1; ctx.beginPath(); ctx.moveTo(l.a.x, l.a.y); ctx.lineTo(l.b.x, l.b.y); ctx.stroke();
      }
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 350);
      for (const n of nodes.current) {
        const col = n.gap ? "#fb7185" : COLORS[n.type]; const rad = r(n);
        ctx.shadowColor = col; ctx.shadowBlur = n === hover.current ? 28 : n.gap ? 10 + 14 * pulse : 12;
        ctx.fillStyle = col; ctx.globalAlpha = n.type === "skill" ? 0.35 + n.level * 0.65 : 0.9;
        ctx.beginPath(); ctx.arc(n.x, n.y, rad, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        ctx.fillStyle = "#cbd5e1"; ctx.font = "11px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText(n.label.slice(0, 26), n.x, n.y + rad + 13);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const pick = (e: MouseEvent) => { const b = c.getBoundingClientRect(); const x = e.clientX - b.left, y = e.clientY - b.top; return nodes.current.find((n) => Math.hypot(n.x - x, n.y - y) < r(n) + 4) ?? null; };
    const move = (e: MouseEvent) => { hover.current = pick(e); c.style.cursor = hover.current ? "pointer" : "default"; };
    const click = (e: MouseEvent) => setSel(pick(e));
    c.addEventListener("mousemove", move); c.addEventListener("click", click);
    return () => { cancelAnimationFrame(raf); c.removeEventListener("mousemove", move); c.removeEventListener("click", click); };
  }, [g]);

  if (err) return <ErrorNote msg={err} />;
  if (!g) return <Spinner label="Building knowledge graph…" />;
  return (
    <div className="space-y-4">
      <header><p className="label">Living knowledge graph</p><h1 className="text-3xl font-semibold">{g.target_name}</h1></header>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="!p-0 overflow-hidden"><canvas ref={cv} className="h-[560px] w-full" aria-label="Knowledge graph of skills, evidence and gaps" /></Card>
        <div className="space-y-4">
          <Card title="Legend">
            <ul className="space-y-1 text-sm">{[["Goal", "#fbbf24"], ["Skill (size/brightness = level)", "#22e6c9"], ["Gap (pulsing)", "#fb7185"], ["Evidence document", "#8b5cf6"]].map(([l, c]) => <li key={l} className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ background: c }} />{l}</li>)}</ul>
          </Card>
          <Card title={sel ? sel.label : "Select a node"}>
            {sel ? <div className="space-y-1 text-sm text-slate-300"><p>Type: {sel.type}</p>{sel.type === "skill" && <><p>Estimated level: {pct(sel.level)}</p><p>Required weight: {sel.weight || "—"}</p><p>Evidence documents: {sel.evidence_count}</p>{sel.gap && <p className="text-ember">Critical gap — below 50% on a heavily weighted skill.</p>}</>}</div> : <p className="text-sm text-slate-500">Click any node. Complete a task or upload a document and this map updates.</p>}
          </Card>
          <Card title="Top gaps"><ol className="list-decimal pl-5 text-sm">{g.gaps.slice(0, 6).map((x: string) => <li key={x}>{x}</li>)}</ol></Card>
        </div>
      </div>
    </div>
  );
}
