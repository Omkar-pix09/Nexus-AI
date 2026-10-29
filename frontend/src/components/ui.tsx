import { motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={`glass p-5 ${className}`}>
      {title && <h3 className="label mb-3">{title}</h3>}
      {children}
    </motion.section>
  );
}

export function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => { const p = Math.min(1, (t - t0) / 700); setV(value * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{Math.round(v)}{suffix}</>;
}

export function Bar({ value, low, high, color = "#22e6c9" }: { value: number; low?: number; high?: number; color?: string }) {
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/10">
      {low !== undefined && high !== undefined && <div className="absolute h-full bg-white/20" style={{ left: pct(low), width: pct(Math.max(0, high - low)) }} />}
      <motion.div className="absolute h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: pct(value) }} transition={{ duration: 0.8 }} />
    </div>
  );
}

export function Spinner({ label = "Working…" }: { label?: string }) {
  return <p className="flex items-center gap-2 text-sm text-slate-400"><span className="h-3 w-3 animate-spin rounded-full border-2 border-neon border-t-transparent" />{label}</p>;
}

export function ErrorNote({ msg }: { msg: string }) { return <p className="rounded-xl border border-ember/40 bg-ember/10 p-3 text-sm text-ember">{msg}</p>; }
