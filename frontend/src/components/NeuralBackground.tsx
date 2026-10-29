import { useEffect, useRef } from "react";

/** Ambient particle network. Pauses when tab hidden, respects reduced-motion. */
export default function NeuralBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0;
    const N = 60;
    const pts = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.00018, vy: (Math.random() - 0.5) * 0.00018 }));
    const resize = () => { w = c.width = innerWidth; h = c.height = innerHeight; };
    resize(); addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) { p.x = (p.x + p.vx * 16 + 1) % 1; p.y = (p.y + p.vy * 16 + 1) % 1; }
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = (pts[i].x - pts[j].x) * w, dy = (pts[i].y - pts[j].y) * h, d = Math.hypot(dx, dy);
        if (d < 150) { ctx.strokeStyle = `rgba(34,230,201,${0.12 * (1 - d / 150)})`; ctx.beginPath(); ctx.moveTo(pts[i].x * w, pts[i].y * h); ctx.lineTo(pts[j].x * w, pts[j].y * h); ctx.stroke(); }
      }
      ctx.fillStyle = "rgba(139,92,246,.5)";
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 1.6, 0, 6.3); ctx.fill(); }
      if (!reduce && !document.hidden) raf = requestAnimationFrame(draw);
    };
    draw();
    const vis = () => { if (!document.hidden && !reduce) { cancelAnimationFrame(raf); draw(); } };
    document.addEventListener("visibilitychange", vis);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-70" />;
}
