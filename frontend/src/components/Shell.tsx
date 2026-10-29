import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { LayoutDashboard, Network, FlaskConical, FileSearch, Bot, Sparkles } from "lucide-react";
import NeuralBackground from "./NeuralBackground";
import VoiceDock from "./VoiceDock";
import { api } from "../lib/api";
import { useStore } from "../lib/store";

const NAV = [
  { to: "/", label: "Command Center", icon: LayoutDashboard },
  { to: "/graph", label: "Knowledge Graph", icon: Network },
  { to: "/simulate", label: "Simulation Lab", icon: FlaskConical },
  { to: "/evidence", label: "Evidence Explorer", icon: FileSearch },
  { to: "/research", label: "AI Research Room", icon: Bot },
];

export default function Shell() {
  const { target, setTarget } = useStore();
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [health, setHealth] = useState<any>(null);
  const tick = useStore((s) => s.tick);
  useEffect(() => { api.roles().then(setRoles).catch(() => {}); }, [tick]);
  useEffect(() => { api.health().then(setHealth).catch(() => setHealth({ status: "down" })); }, []);

  return (
    <div className="aurora min-h-screen">
      <NeuralBackground />
      <aside className="glass fixed left-3 top-3 bottom-3 z-20 hidden w-60 flex-col p-4 md:flex">
        <div className="mb-6 flex items-center gap-2"><Sparkles className="text-neon" /><span className="text-lg font-semibold tracking-wide">NEXUS <span className="text-neon">AI</span></span></div>
        <nav className="space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${isActive ? "bg-neon/10 text-neon" : "text-slate-300 hover:bg-white/5"}`}>
              <Icon size={17} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2 text-xs text-slate-400">
          <label className="label block">Target role</label>
          <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <p>{health?.status === "ok" ? (health.llm_live ? `● LLM live (${health.llm_provider})` : "● Offline demo mode (no LLM key)") : "● API unreachable"}</p>
        </div>
      </aside>
      <nav className="glass fixed inset-x-2 top-2 z-20 flex justify-around p-2 md:hidden" aria-label="Primary">
        {NAV.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} end={to === "/"} aria-label={label} className={({ isActive }) => (isActive ? "text-neon" : "text-slate-400")}><Icon size={20} /></NavLink>)}
      </nav>
      <main className="px-4 pb-40 pt-16 md:ml-64 md:px-8 md:pt-8"><Outlet /></main>
      <VoiceDock />
    </div>
  );
}
