import React, { useState } from "react";
import {
  GlassPanel,
  MetricTile,
  ConfidenceBar,
  EvidenceChip,
  StatusPulse,
  AgentAvatar,
  CommandPalette,
  Toast,
  Skeleton,
  SonarRadar,
} from "../components/ds";
import {
  Layers,
  Sparkles,
  Command,
  Activity,
  Sliders,
  ShieldCheck,
  Zap,
  Info,
  Radio,
  RefreshCw,
  Search,
} from "lucide-react";

export default function DesignSystemShowcase() {
  const [metricVal, setMetricVal] = useState(148200);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<"surfaces" | "typography" | "components" | "motion" | "ai">("components");

  const randomizeMetrics = () => {
    setMetricVal(Math.floor(120000 + Math.random() * 80000));
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* Top Banner / System Title */}
      <header className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-scale-xs px-2.5 py-0.5 rounded-nexus-sm border border-sonar/40 bg-sonar/10 text-sonar uppercase tracking-widest">
              Nexus Design System v2.4
            </span>
            <span className="font-mono text-scale-xs px-2.5 py-0.5 rounded-nexus-sm border border-plasma/40 bg-plasma/10 text-plasma uppercase tracking-widest">
              Abyssal Mission Control
            </span>
          </div>
          <h1 className="font-display text-scale-3xl sm:text-scale-4xl font-bold tracking-tight text-white">
            NEXUS <span className="text-sonar">Design System</span>
          </h1>
          <p className="font-sans text-scale-sm sm:text-scale-base text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Deep ink-black space, layered glass panels, bioluminescent accents glowing only where AI is active.
            Linear confidence × Bloomberg terminal density × deep-sea sonar surveillance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="btn flex items-center gap-2 shadow-glow-sonar"
          >
            <Command size={16} />
            <span>Open Command Palette</span>
            <kbd className="font-mono text-[11px] bg-black/40 border border-sonar/40 px-1.5 py-0.5 rounded ml-1">
              ⌘K
            </kbd>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav aria-label="Design System Showcase Sections" className="flex border-b border-white/10 gap-2 sm:gap-6 overflow-x-auto pb-px">
        {[
          { id: "components", label: "Components Suite" },
          { id: "surfaces", label: "Surfaces & Glass" },
          { id: "typography", label: "Type & 8-pt Grid" },
          { id: "motion", label: "Motion & Semantics" },
          { id: "ai", label: "AI Sonar Effects" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`font-mono text-scale-xs sm:text-scale-sm uppercase tracking-wider pb-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? "border-sonar text-sonar font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* TAB 1: ALL COMPONENTS IN EVERY STATE */}
      {activeTab === "components" && (
        <div className="space-y-12">
          {/* Section 1: MetricTile Component */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-scale-xl font-bold text-white flex items-center gap-2">
                  <Activity size={20} className="text-sonar" />
                  MetricTile (Every State)
                </h2>
                <p className="font-sans text-scale-xs text-slate-400 mt-1">
                  Features tabular numeral counters, animated 420ms spring interpolation, micro-sparkline, and low/high uncertainty whiskers.
                </p>
              </div>
              <button
                type="button"
                onClick={randomizeMetrics}
                className="btn-ghost text-xs flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Test Live Counter Animation</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* State 1: Calculated (Sonar Cyan, Nominal) */}
              <MetricTile
                label="Simulation Trajectory"
                value={metricVal}
                format="currency"
                change={14.8}
                semantic="calculated"
                aiActive={true}
                statusLabel="Verified Deterministic"
                uncertaintyWhisker={{ low: 135000, high: 162000 }}
                sparklineData={[80, 92, 88, 110, 105, 125, 140, 148]}
              />

              {/* State 2: Estimated (Signal Amber with Uncertainty) */}
              <MetricTile
                label="Heuristic P90 Yield"
                value={metricVal * 0.74}
                format="currency"
                change={-3.4}
                semantic="estimated"
                aiActive={true}
                statusLabel="Monte Carlo (10k)"
                uncertaintyWhisker={{ low: 92000, high: 138000 }}
                sparklineData={[115, 110, 108, 102, 98, 105, 101, 109]}
              />

              {/* State 3: Evidence (Plasma Violet, Verified) */}
              <MetricTile
                label="Consensus Confidence"
                value={96.4}
                format="percent"
                change={2.1}
                semantic="evidence"
                aiActive={false}
                statusLabel="Provenance Intact"
                uncertaintyWhisker={{ low: 92, high: 99 }}
                sparklineData={[82, 85, 87, 89, 93, 94, 95, 96]}
              />

              {/* State 4: Gap Detected (Alarm Coral) */}
              <MetricTile
                label="Skill Delta Discrepancy"
                value={38.2}
                format="percent"
                change={-12.6}
                semantic="gap"
                aiActive={true}
                statusLabel="Gap Critical"
                uncertaintyWhisker={{ low: 25, high: 54 }}
                sparklineData={[15, 20, 24, 28, 30, 32, 35, 38]}
              />
            </div>
          </section>

          {/* Section 2: ConfidenceBar Component */}
          <section className="space-y-4">
            <h2 className="font-display text-scale-xl font-bold text-white flex items-center gap-2">
              <Sliders size={20} className="text-signal" />
              ConfidenceBar (Calculated vs. Hatched Estimated States)
            </h2>
            <p className="font-sans text-scale-xs text-slate-400">
              Visualizes point estimate marker with p10-p90 uncertainty credible intervals. Estimated semantic activates diagonal hatch pattern.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassPanel elevation={3} className="p-5 space-y-5">
                <h3 className="font-display text-scale-sm font-semibold text-white flex items-center justify-between">
                  <span>Deterministic / Calculated State (Sonar Cyan)</span>
                  <span className="font-mono text-scale-xs text-sonar">No Hatch</span>
                </h3>
                <ConfidenceBar
                  label="Role Trajectory Viability"
                  value={88}
                  p10={78}
                  p90={94}
                  semantic="calculated"
                />
                <ConfidenceBar
                  label="Knowledge Graph Consensus"
                  value={94}
                  p10={90}
                  p90={98}
                  semantic="evidence"
                />
              </GlassPanel>

              <GlassPanel elevation={3} className="p-5 space-y-5">
                <h3 className="font-display text-scale-sm font-semibold text-white flex items-center justify-between">
                  <span>Heuristic / Estimated State (Signal Amber)</span>
                  <span className="font-mono text-scale-xs text-signal">Diagonal Hatch Pattern</span>
                </h3>
                <ConfidenceBar
                  label="Monte Carlo 5-Year Compensation"
                  value={68}
                  p10={44}
                  p90={86}
                  semantic="estimated"
                  isEstimated={true}
                />
                <ConfidenceBar
                  label="Market Demand Discrepancy"
                  value={42}
                  p10={20}
                  p90={65}
                  semantic="gap"
                  isEstimated={true}
                />
              </GlassPanel>
            </div>
          </section>

          {/* Section 3: EvidenceChip & Provenance Drawer */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-scale-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={20} className="text-plasma" />
                  EvidenceChip & Interactive Provenance Drawer
                </h2>
                <p className="font-sans text-scale-xs text-slate-400 mt-1">
                  Clicking any chip opens the full biometric provenance slide-out drawer with retrieval telemetry and token breakdown.
                </p>
              </div>
            </div>

            <GlassPanel elevation={3} className="p-5">
              <div className="flex flex-wrap gap-3">
                <EvidenceChip
                  id="ev-8842"
                  source="SEC Form 10-K (Q3 Telemetry)"
                  confidence={98}
                  semantic="evidence"
                  snippet="Consolidated operational income exceeded predictive baselines by 14.8% due to autonomous workflow migration."
                />
                <EvidenceChip
                  id="ev-9104"
                  source="Vector Cluster :: Deep-Sea v4"
                  confidence={94}
                  semantic="calculated"
                  snippet="Cosine similarity: 0.942 against canonical staff-engineer engineering competencies."
                />
                <EvidenceChip
                  id="ev-3312"
                  source="Glassdoor Aggregated Band #12"
                  confidence={76}
                  semantic="estimated"
                  snippet="Estimated distribution median derived from 4,200 peer self-reported data points."
                />
                <EvidenceChip
                  id="ev-1049"
                  source="Skill Matrix Anomaly Audit"
                  confidence={89}
                  semantic="gap"
                  snippet="Critical capability gap flagged in distributed consensus and raft replication protocols."
                />
              </div>
            </GlassPanel>
          </section>

          {/* Section 4: StatusPulse & AgentAvatar */}
          <section className="space-y-4">
            <h2 className="font-display text-scale-xl font-bold text-white flex items-center gap-2">
              <Radio size={20} className="text-sonar" />
              StatusPulse & AgentAvatar (State Communications)
            </h2>
            <p className="font-sans text-scale-xs text-slate-400">
              Motion communicates state: thinking (pulsing sweep), evidence found (plasma violet halo), divergent (coral alarm), nominal (sonar).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Pulses */}
              <GlassPanel elevation={3} className="p-5 space-y-4">
                <h3 className="font-display text-scale-sm font-semibold text-white">
                  StatusPulse Variants
                </h3>
                <div className="space-y-3">
                  <div>
                    <StatusPulse status="nominal" size="sm" withLabel label="Nominal AI Link" />
                  </div>
                  <div>
                    <StatusPulse status="active" size="md" withLabel label="Computing Simulation Vector" />
                  </div>
                  <div>
                    <StatusPulse status="warning" size="md" withLabel label="Uncertainty Boundary Exceeded" />
                  </div>
                  <div>
                    <StatusPulse status="alarm" size="lg" withLabel label="Critical Divergence Discovered" />
                  </div>
                  <div>
                    <StatusPulse status="idle" size="sm" withLabel label="Passive Standby" />
                  </div>
                </div>
              </GlassPanel>

              {/* Agent Avatars */}
              <GlassPanel elevation={3} className="p-5 space-y-4">
                <h3 className="font-display text-scale-sm font-semibold text-white">
                  AgentAvatar Bioluminescent States
                </h3>
                <div className="space-y-4">
                  <AgentAvatar
                    name="DeepSeek Consensus"
                    role="Active Reasoning Engine"
                    state="thinking"
                    size="md"
                  />
                  <AgentAvatar
                    name="Synthesizer v2"
                    role="Knowledge Retriever"
                    state="evidence_found"
                    size="md"
                  />
                  <AgentAvatar
                    name="Sentinel Guard"
                    role="Discrepancy Analyzer"
                    state="divergent"
                    size="md"
                  />
                  <AgentAvatar
                    name="Nexus Primary"
                    role="Abyssal Core Node"
                    state="nominal"
                    size="lg"
                  />
                </div>
              </GlassPanel>
            </div>
          </section>

          {/* Section 5: Toasts & Skeletons */}
          <section className="space-y-4">
            <h2 className="font-display text-scale-xl font-bold text-white flex items-center gap-2">
              <Zap size={20} className="text-sonar" />
              HUD Toast & Sonar Skeleton Shimmers
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {toastVisible && (
                  <Toast
                    type="nominal"
                    title="Simulation Completed"
                    message="Calculated 10,000 branch paths with p90 confidence interval 94.2%."
                    onClose={() => setToastVisible(false)}
                  />
                )}
                <Toast
                  type="warning"
                  title="Uncertainty High"
                  message="Confidence intervals for compensation widened by ±18%."
                  duration={0}
                />
                <Toast
                  type="alarm"
                  title="Capability Gap Flagged"
                  message="System detected 2 unverified prerequisite skills."
                  duration={0}
                />
              </div>

              <GlassPanel elevation={2} className="p-5 space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="label">Deep-Sea Sonar Shimmer States</span>
                  <span className="font-mono text-scale-xs text-sonar">2.0s sweep</span>
                </div>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="90%" />
                <div className="flex items-center gap-3 pt-2">
                  <Skeleton variant="circular" />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="80%" />
                  </div>
                </div>
                <Skeleton variant="metric" />
              </GlassPanel>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: SIX ELEVATION SURFACES & GLASS RECIPE */}
      {activeTab === "surfaces" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-scale-xl font-bold text-white">
              Six Surface Elevations (#04060b to #121a2b) & Glass Recipe
            </h2>
            <p className="font-sans text-scale-xs text-slate-400">
              Elevation architecture engineered for Abyssal Mission Control with 24px blur, 1px inner border white/10, top highlight, and 2% noise grain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { level: 1, hex: "#070a12", name: "Surface-1 Canvas", desc: "Background layer and deep base container." },
              { level: 2, hex: "#0a0f1b", name: "Surface-2 Recessed", desc: "Recessed wells, telemetry troughs, and sunken docks." },
              { level: 3, hex: "#0e1524", name: "Surface-3 Card", desc: "Standard glass cards, data tiles, and panels." },
              { level: 4, hex: "#121a2b", name: "Surface-4 Active", desc: "Elevated surfaces, focused inputs, active states." },
              { level: 5, hex: "#18233a", name: "Surface-5 Floating", desc: "Modal overlays, command palette, popovers, toasts." },
            ].map((s) => (
              <GlassPanel key={s.level} elevation={s.level as any} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-scale-xs uppercase tracking-widest text-sonar">
                    Elevation {s.level}
                  </span>
                  <code className="font-mono text-scale-xs text-slate-400 tabular-data">{s.hex}</code>
                </div>
                <h3 className="font-display text-scale-md font-semibold text-white">{s.name}</h3>
                <p className="font-sans text-scale-xs text-slate-300 mt-2">{s.desc}</p>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>blur(24px)</span>
                  <span>1px white/10</span>
                  <span>2% noise</span>
                </div>
              </GlassPanel>
            ))}

            {/* AI Active Glow Card */}
            <GlassPanel elevation={3} aiActive={true} glow="sonar" className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-scale-xs uppercase tracking-widest text-sonar flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sonar animate-ping" />
                  AI Active Glow
                </span>
                <code className="font-mono text-scale-xs text-sonar tabular-data">Bioluminescent</code>
              </div>
              <h3 className="font-display text-scale-md font-semibold text-white">Active Sonar Edge</h3>
              <p className="font-sans text-scale-xs text-slate-300 mt-2">
                Accents glow only where an AI engine is actively computing or inspecting evidence vectors.
              </p>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-sonar">
                <span>shadow-glow-sonar</span>
                <span>top-rim pulse</span>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}

      {/* TAB 3: TYPOGRAPHY SCALE & 8-PT GRID */}
      {activeTab === "typography" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-scale-xl font-bold text-white">
              Typography Hierarchy & Tabular Numerals
            </h2>
            <p className="font-sans text-scale-xs text-slate-400">
              Space Grotesk (display), Inter (UI body), JetBrains Mono (numbers and data labels). Tabular numerals wherever data appears. Modular scale 1.2.
            </p>
          </div>

          <GlassPanel elevation={3} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-white/10">
              <div>
                <span className="label block mb-1">Display Font</span>
                <span className="font-display text-scale-xl font-bold text-white">Space Grotesk</span>
                <p className="font-sans text-scale-xs text-slate-400 mt-1">High-contrast mission control headers & metrics.</p>
              </div>
              <div>
                <span className="label block mb-1">UI System Font</span>
                <span className="font-sans text-scale-xl font-medium text-white">Inter UI</span>
                <p className="font-sans text-scale-xs text-slate-400 mt-1">Crystal clear legibility across micro copy and dense dashboards.</p>
              </div>
              <div>
                <span className="label block mb-1">Telemetry Numbers</span>
                <span className="font-mono text-scale-xl font-bold text-sonar tabular-data">JetBrains Mono 0123456789</span>
                <p className="font-sans text-scale-xs text-slate-400 mt-1">Strict tabular lining figures with zero column jitter.</p>
              </div>
            </div>

            <div className="space-y-4">
              <span className="label block">Modular Scale 1.2 Demo</span>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                  <span className="font-display text-scale-4xl font-bold text-white">Scale 4XL (2.986rem)</span>
                  <span className="font-mono text-xs text-slate-400">Mission Banner</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                  <span className="font-display text-scale-3xl font-bold text-white">Scale 3XL (2.488rem)</span>
                  <span className="font-mono text-xs text-slate-400">Primary Page Title</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                  <span className="font-display text-scale-2xl font-semibold text-white">Scale 2XL (2.074rem)</span>
                  <span className="font-mono text-xs text-slate-400">Card Metric Number</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                  <span className="font-display text-scale-xl font-semibold text-white">Scale XL (1.728rem)</span>
                  <span className="font-mono text-xs text-slate-400">Section Header</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                  <span className="font-sans text-scale-base text-slate-200">Scale Base (1.000rem) — High readability body text adhering to WCAG AA 4.5:1 contrast standards</span>
                  <span className="font-mono text-xs text-slate-400">Body Copy</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-white/5 pb-2">
                  <span className="font-mono text-scale-xs text-slate-400 uppercase tracking-widest">Scale XS (0.694rem) — TELEMETRY LABELS & ATTRIBUTION</span>
                  <span className="font-mono text-xs text-slate-400">Labels / Chips</span>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* TAB 4: MOTION & SEMANTIC MAPPINGS */}
      {activeTab === "motion" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-scale-xl font-bold text-white">
              Motion Tokens & Semantic State Rules
            </h2>
            <p className="font-sans text-scale-xs text-slate-400">
              Durations: 120ms (instant), 220ms (fast), 420ms (steady), 800ms (deep). Easing: cubic-bezier(.2,.8,.2,1). Motion must communicate state, never decorate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassPanel elevation={3} className="p-5 space-y-4">
              <h3 className="font-display text-scale-md font-semibold text-white">
                Motion Hierarchy (Communicating State)
              </h3>
              <div className="space-y-3 text-scale-xs font-mono">
                <div className="p-3 rounded-nexus-md bg-surface-2 border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-white block font-semibold">Instant (120ms)</span>
                    <span className="text-slate-400">Button presses, chip selections, focus rings</span>
                  </div>
                  <span className="text-sonar tabular-data">120ms</span>
                </div>
                <div className="p-3 rounded-nexus-md bg-surface-2 border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-white block font-semibold">Fast (220ms)</span>
                    <span className="text-slate-400">Glass hover transitions, modal backdrops</span>
                  </div>
                  <span className="text-sonar tabular-data">220ms</span>
                </div>
                <div className="p-3 rounded-nexus-md bg-surface-2 border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-white block font-semibold">Steady (420ms)</span>
                    <span className="text-slate-400">Tabular counter counting up, whisker shifts</span>
                  </div>
                  <span className="text-sonar tabular-data">420ms</span>
                </div>
                <div className="p-3 rounded-nexus-md bg-surface-2 border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-white block font-semibold">Deep (800ms)</span>
                    <span className="text-slate-400">AI consensus state shift, sonar scan cycle</span>
                  </div>
                  <span className="text-sonar tabular-data">800ms</span>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel elevation={3} className="p-5 space-y-4">
              <h3 className="font-display text-scale-md font-semibold text-white">
                Semantic Color Mappings & Glows
              </h3>
              <div className="space-y-3 font-sans text-scale-xs">
                <div className="p-3 rounded-nexus-md bg-sonar/10 border border-sonar/40 flex items-center justify-between">
                  <div>
                    <span className="font-mono uppercase text-sonar font-bold block">Calculated (Sonar Cyan #22e6c9)</span>
                    <span className="text-slate-300">Verified deterministic computations & model metrics.</span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-sonar shadow-glow-sonar" />
                </div>

                <div className="p-3 rounded-nexus-md bg-plasma/10 border border-plasma/40 flex items-center justify-between">
                  <div>
                    <span className="font-mono uppercase text-plasma font-bold block">Evidence (Plasma Violet #8b5cf6)</span>
                    <span className="text-slate-300">Retrieved vector store provenance & consensus anchors.</span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-plasma shadow-glow-plasma" />
                </div>

                <div className="p-3 rounded-nexus-md bg-signal/10 border border-signal/40 flex items-center justify-between">
                  <div>
                    <span className="font-mono uppercase text-signal font-bold block">Estimated (Signal Amber #fbbf24)</span>
                    <span className="text-slate-300">Heuristic predictions rendered with diagonal hatch pattern.</span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-signal shadow-glow-signal" />
                </div>

                <div className="p-3 rounded-nexus-md bg-alarm/10 border border-alarm/40 flex items-center justify-between">
                  <div>
                    <span className="font-mono uppercase text-alarm font-bold block">Gap (Alarm Coral #fb7185)</span>
                    <span className="text-slate-300">Discrepancies, missing credentials, skill divergence.</span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-alarm shadow-glow-alarm" />
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}

      {/* TAB 5: AI EFFECTS (SONAR RADAR & DEEP MISSION CONTROL) */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-scale-xl font-bold text-white">
              AI Sonar Mission Control Radar (10X Effect)
            </h2>
            <p className="font-sans text-scale-xs text-slate-400">
              Interactive HTML5 canvas sonar radar displaying active agent telemetry, discrepancy pings, and cluster vectors.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <GlassPanel elevation={3} className="p-6 flex flex-col items-center justify-center">
              <SonarRadar size={320} sweepSpeedSec={3.5} />
              <div className="mt-4 flex items-center gap-4 text-scale-xs font-mono">
                <span className="flex items-center gap-1.5 text-sonar">
                  <span className="w-2 h-2 rounded-full bg-sonar" /> Active Agent
                </span>
                <span className="flex items-center gap-1.5 text-signal">
                  <span className="w-2 h-2 rounded-full bg-signal" /> Vector Cluster
                </span>
                <span className="flex items-center gap-1.5 text-alarm">
                  <span className="w-2 h-2 rounded-full bg-alarm" /> Gap Anomaly
                </span>
              </div>
            </GlassPanel>

            <div className="space-y-4">
              <GlassPanel elevation={3} className="p-5 space-y-3">
                <span className="label block">Acoustic Sonar Surveillance</span>
                <h3 className="font-display text-scale-lg font-bold text-white">
                  Telemetry Convergence Matrix
                </h3>
                <p className="font-sans text-scale-sm text-slate-300 leading-relaxed">
                  The sonar radar computes active vector coordinates in real-time. Nodes illuminate dynamically when intercepted by the 360-degree sweep beam, creating a living sensory environment for mission operators.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-nexus-md bg-surface-2 border border-white/5">
                    <span className="label block mb-1">Active Pings</span>
                    <span className="font-mono text-scale-lg font-bold text-sonar tabular-data">14 / 16</span>
                  </div>
                  <div className="p-3 rounded-nexus-md bg-surface-2 border border-white/5">
                    <span className="label block mb-1">Sweep Frequency</span>
                    <span className="font-mono text-scale-lg font-bold text-slate-200 tabular-data">0.28 Hz</span>
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel elevation={3} className="p-5">
                <span className="label block mb-2">Live Mission Log</span>
                <div className="space-y-2 font-mono text-scale-xs text-slate-400">
                  <div className="flex gap-2">
                    <span className="text-sonar tabular-data">[10:04:12]</span>
                    <span className="text-slate-200">Consensus lock established on cluster Alpha-9.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-signal tabular-data">[10:05:01]</span>
                    <span className="text-slate-300">Signal variance within normal heuristic tolerances.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-alarm tabular-data">[10:05:33]</span>
                    <span className="text-alarm">1 capability gap queued for synthesis resolution.</span>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>
      )}

      {/* Global Command Palette Component instance */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
