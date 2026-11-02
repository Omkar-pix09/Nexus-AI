import React from "react";
import { N } from "./types";
import { Card, pct } from "../ui";

export interface CanvasGraphFallbackProps {
  data: {
    target_name: string;
    nodes: any[];
    edges: any[];
    gaps: string[];
  };
  selectedNode: N | null;
  onSelectNode: (n: N | null) => void;
  reason?: string;
  fps?: number;
}

const COLORS: Record<string, string> = {
  goal: "#fbbf24",
  skill: "#22e6c9",
  evidence: "#8b5cf6",
  task: "#fb7185",
};

export const CanvasGraphFallback: React.FC<CanvasGraphFallbackProps> = ({
  data,
  selectedNode,
  onSelectNode,
  reason = "WebGL unavailable or low FPS safeguard",
  fps,
}) => {
  const cv = React.useRef<HTMLCanvasElement>(null);
  const nodes = React.useRef<N[]>([]);
  const hover = React.useRef<N | null>(null);

  React.useEffect(() => {
    const c = cv.current;
    if (!c || !data) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth || 800;
    const H = c.clientHeight || 560;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.scale(dpr, dpr);

    nodes.current = data.nodes.map((n: any, i: number) => ({
      ...n,
      x: W / 2 + Math.cos(i) * 160 * (0.4 + 0.6 * Math.random()),
      y: H / 2 + Math.sin(i) * 160 * (0.4 + 0.6 * Math.random()),
      vx: 0,
      vy: 0,
    }));

    const byId = new Map(nodes.current.map((n) => [n.id, n]));
    const links = data.edges
      .map((e: any) => ({
        a: byId.get(e.source)!,
        b: byId.get(e.target)!,
        t: e.type,
        w: e.weight,
      }))
      .filter((l: any) => l.a && l.b);

    let raf = 0;
    let frames = 0;
    const r = (n: N) => (n.type === "goal" ? 22 : n.type === "skill" ? 8 + n.level * 10 : 7);

    const tickSim = () => {
      const N_ = nodes.current;
      for (let i = 0; i < N_.length; i++) {
        for (let j = i + 1; j < N_.length; j++) {
          const a = N_[i];
          const b = N_[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          const d2 = dx * dx + dy * dy + 40;
          const f = 2600 / d2;
          const d = Math.sqrt(d2);
          dx /= d;
          dy /= d;
          a.vx += dx * f;
          a.vy += dy * f;
          b.vx -= dx * f;
          b.vy -= dy * f;
        }
      }
      for (const l of links) {
        const dx = l.b.x - l.a.x;
        const dy = l.b.y - l.a.y;
        const d = Math.hypot(dx, dy) || 1;
        const rest = l.t === "evidences" ? 120 : l.t === "required" ? 170 : 90;
        const f = (d - rest) * 0.012;
        l.a.vx += (dx / d) * f;
        l.a.vy += (dy / d) * f;
        l.b.vx -= (dx / d) * f;
        l.b.vy -= (dy / d) * f;
      }
      for (const n of N_) {
        n.vx += (W / 2 - n.x) * 0.002;
        n.vy += (H / 2 - n.y) * 0.002;
        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x += n.vx;
        n.y += n.vy;
      }
    };

    const draw = () => {
      if (frames++ < 400) tickSim();
      ctx.clearRect(0, 0, W, H);

      for (const l of links) {
        ctx.strokeStyle =
          l.t === "required"
            ? `rgba(251,191,36,${0.15 + l.w * 0.35})`
            : l.t === "prerequisite"
            ? "rgba(255,255,255,.12)"
            : "rgba(139,92,246,.35)";
        ctx.lineWidth = l.t === "required" ? 1 + l.w * 2 : 1;
        ctx.beginPath();
        ctx.moveTo(l.a.x, l.a.y);
        ctx.lineTo(l.b.x, l.b.y);
        ctx.stroke();
      }

      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 350);
      for (const n of nodes.current) {
        const col = n.gap ? "#fb7185" : COLORS[n.type] || "#22e6c9";
        const rad = r(n);
        ctx.shadowColor = col;
        ctx.shadowBlur = n === hover.current ? 28 : n.gap ? 10 + 14 * pulse : 12;
        ctx.fillStyle = col;
        ctx.globalAlpha = n.type === "skill" ? 0.35 + n.level * 0.65 : 0.9;
        ctx.beginPath();
        ctx.arc(n.x, n.y, rad, 0, 6.3);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(n.label.slice(0, 26), n.x, n.y + rad + 13);
      }
      raf = requestAnimationFrame(draw);
    };

    draw();

    const pick = (e: MouseEvent) => {
      const b = c.getBoundingClientRect();
      const x = e.clientX - b.left;
      const y = e.clientY - b.top;
      return nodes.current.find((n) => Math.hypot(n.x - x, n.y - y) < r(n) + 4) ?? null;
    };

    const move = (e: MouseEvent) => {
      hover.current = pick(e);
      c.style.cursor = hover.current ? "pointer" : "default";
    };

    const click = (e: MouseEvent) => onSelectNode(pick(e));

    c.addEventListener("mousemove", move);
    c.addEventListener("click", click);

    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener("mousemove", move);
      c.removeEventListener("click", click);
    };
  }, [data]);

  return (
    <div className="relative">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-surface-1/90 border border-signal/40 px-3 py-1.5 rounded-nexus-sm backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-signal animate-ping" />
        <span className="font-mono text-scale-xs text-signal">
          2D Engine Fallback Active: {reason} {fps ? `(${fps} FPS)` : ""}
        </span>
      </div>
      <canvas
        ref={cv}
        className="h-[620px] w-full rounded-nexus-lg bg-surface-1/90"
        aria-label="2D Fallback Knowledge graph of skills, evidence and gaps"
      />
    </div>
  );
};

export default CanvasGraphFallback;
