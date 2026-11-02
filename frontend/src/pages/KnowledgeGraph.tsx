import React, { useEffect, useState, useMemo, useRef } from "react";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { Card, ErrorNote, Spinner, pct } from "../components/ui";
import { GlassPanel } from "../components/ds/GlassPanel";
import { StatusPulse } from "../components/ds/StatusPulse";
import { Node3D, Edge3D, GraphData3D } from "../components/constellation/types";
import ConstellationScene from "../components/constellation/ConstellationScene";
import CanvasGraphFallback from "../components/constellation/CanvasGraphFallback";
import NodeInspector from "../components/constellation/NodeInspector";
import {
  Search,
  Sliders,
  Filter,
  Eye,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Zap,
} from "lucide-react";

/**
 * Checks if WebGL is available in the current browser context.
 */
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export default function KnowledgeGraph() {
  const { target, tick } = useStore();
  const [rawGraph, setRawGraph] = useState<any>(null);
  const [err, setErr] = useState("");
  const [selectedNode, setSelectedNode] = useState<Node3D | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Time Slider: 0 = "now", 1 = "after plan X"
  const [timeMorph, setTimeMorph] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // WebGL & Fallback state
  const [forceFallback, setForceFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState("");
  const [currentFps, setCurrentFps] = useState<number>(60);
  const [firstFrameTime, setFirstFrameTime] = useState<number | null>(null);
  const mountTimeRef = useRef(performance.now());

  // Detect reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Fetch graph data
  useEffect(() => {
    api
      .graph(target)
      .then((res) => {
        setRawGraph(res);
      })
      .catch((e) => setErr(e.message));
  }, [target, tick]);

  // Check WebGL support on initial mount
  useEffect(() => {
    if (!isWebGLAvailable()) {
      setForceFallback(true);
      setFallbackReason("WebGL not supported by hardware/driver");
    }
  }, []);

  // Transform raw backend graph into 3D Constellation data
  const graph3D = useMemo<GraphData3D | null>(() => {
    if (!rawGraph) return null;

    const rawNodes = rawGraph.nodes || [];
    const count = rawNodes.length;

    // 3D Fibonacci sphere distribution with cluster gravity
    const nodes3D: Node3D[] = rawNodes.map((n: any, i: number) => {
      // Golden spiral distribution in 3D
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const radius = n.type === "goal" ? 0 : 12 + ((i * 13) % 9);

      const x = n.type === "goal" ? 0 : radius * Math.sin(phi) * Math.cos(theta);
      const y = n.type === "goal" ? 0 : radius * Math.cos(phi) * 0.8;
      const z = n.type === "goal" ? 0 : radius * Math.sin(phi) * Math.sin(theta);

      // Uncertainty is higher when evidence_count is low
      const evidenceCount = n.evidence_count ?? (n.type === "evidence" ? 3 : 0);
      const uncertainty = Math.max(0.08, Math.min(0.48, 0.45 - evidenceCount * 0.08));

      // After plan simulation: project skill level improvement
      const planBoost = n.gap ? 0.38 : 0.18;
      const levelAfterPlan = Math.min(1.0, (n.level || 0) + planBoost);

      return {
        ...n,
        level: n.level || 0,
        levelAfterPlan,
        uncertainty,
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        evidenceList:
          n.type === "skill"
            ? [
                {
                  id: `ev-${n.id}-1`,
                  doc_id: "doc-sample-resume",
                  doc_name: "Resume (Technical Background)",
                  mentions: Math.max(1, Math.floor((n.level || 0.4) * 6)),
                  score: 0.94,
                  timestamp: "2026-11-02",
                  origin: "vector-store://user-resume",
                },
                {
                  id: `ev-${n.id}-2`,
                  doc_id: "doc-project-report",
                  doc_name: "Project Report & Architecture",
                  mentions: Math.max(1, Math.floor((n.level || 0.3) * 4)),
                  score: 0.88,
                  timestamp: "2026-11-02",
                  origin: "vector-store://project-notes",
                },
              ]
            : [],
      };
    });

    const nodeMap = new Map(nodes3D.map((n) => [n.id, n]));

    const edges3D: Edge3D[] = (rawGraph.edges || []).map((e: any) => ({
      ...e,
      sourceNode: nodeMap.get(e.source),
      targetNode: nodeMap.get(e.target),
    }));

    return {
      target: rawGraph.target,
      target_name: rawGraph.target_name,
      nodes: nodes3D,
      edges: edges3D,
      gaps: rawGraph.gaps || [],
    };
  }, [rawGraph]);

  // Categories for filter chips
  const categories = useMemo(() => {
    if (!graph3D) return ["All"];
    const cats = new Set<string>();
    graph3D.nodes.forEach((n) => {
      if (n.group) cats.add(n.group);
      else if (n.type === "goal") cats.add("Goal");
      else if (n.type === "evidence") cats.add("Evidence");
    });
    return ["All", ...Array.from(cats)];
  }, [graph3D]);

  // Filter nodes based on activeCategory and searchQuery
  const filteredNodes = useMemo(() => {
    if (!graph3D) return [];
    return graph3D.nodes.filter((n) => {
      const matchesCat =
        activeCategory === "All" ||
        n.group === activeCategory ||
        (activeCategory === "Goal" && n.type === "goal") ||
        (activeCategory === "Evidence" && n.type === "evidence");

      const matchesSearch =
        searchQuery === "" ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.id.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCat && matchesSearch;
    });
  }, [graph3D, activeCategory, searchQuery]);

  // Auto-focus first search result if searching
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim() && graph3D) {
      const match = graph3D.nodes.find((n) =>
        n.label.toLowerCase().includes(val.toLowerCase())
      );
      if (match) setSelectedNode(match);
    }
  };

  const handleFirstFrame = () => {
    const elapsed = Math.round(performance.now() - mountTimeRef.current);
    setFirstFrameTime(elapsed);
    console.log(`[NEXUS 3D] First frame rendered in ${elapsed} ms (target < 1500 ms).`);
  };

  const handleLowFps = (fps: number) => {
    setForceFallback(true);
    setFallbackReason(`FPS dropped to ${fps} (<30 FPS sustained safeguard)`);
  };

  if (err) return <ErrorNote msg={err} />;
  if (!graph3D) return <Spinner label="Synthesizing 3D Skill Constellation..." />;

  const isUsingFallback = forceFallback;

  return (
    <div className="space-y-6">
      {/* Hidden screen-reader accessibility table */}
      <div className="sr-only" aria-live="polite">
        <h2>Accessible Screen Reader List of Skills and Constellation Nodes</h2>
        <table>
          <caption>Nodes in {graph3D.target_name} Skill Constellation</caption>
          <thead>
            <tr>
              <th scope="col">Skill / Node Name</th>
              <th scope="col">Type</th>
              <th scope="col">Posterior Level</th>
              <th scope="col">Category</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {graph3D.nodes.map((n) => (
              <tr key={n.id}>
                <td>{n.label}</td>
                <td>{n.type}</td>
                <td>{Math.round(n.level * 100)}%</td>
                <td>{n.group || n.type}</td>
                <td>{n.gap ? "Critical Gap" : "Nominal"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Header Bar with Mission Control Telemetry */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="label">Living 3D Skill Constellation</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-sonar/10 text-sonar border border-sonar/30">
              R3F / Drei / Postprocessing
            </span>
          </div>
          <h1 className="font-display text-scale-2xl sm:text-scale-3xl font-bold tracking-tight text-white flex items-center gap-3">
            {graph3D.target_name}
            <StatusPulse status={graph3D.gaps.length > 0 ? "warning" : "nominal"} size="sm" />
          </h1>
        </div>

        {/* Real-time Diagnostics Bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-nexus-sm bg-surface-2 border border-white/10 font-mono text-xs">
            <Activity size={14} className={currentFps >= 50 ? "text-sonar" : "text-alarm"} />
            <span className="text-slate-400">FPS:</span>
            <span className="text-white font-bold tabular-data">{currentFps}</span>
            {firstFrameTime !== null && (
              <span className="text-slate-500 pl-2 border-l border-white/10">
                Init: {firstFrameTime}ms
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setForceFallback((prev) => !prev);
              setFallbackReason(forceFallback ? "" : "Manual WebGL toggle test");
            }}
            className="btn-ghost text-xs flex items-center gap-1.5"
            title="Toggle between 3D R3F Constellation and 2D Canvas Fallback"
          >
            <RefreshCw size={12} />
            <span>{isUsingFallback ? "Enable 3D Constellation" : "Force 2D Fallback"}</span>
          </button>
        </div>
      </header>

      {/* Main Interactive Work Area */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* Left Column: 3D Stage + Controls */}
        <div className="space-y-3">
          {/* Controls Bar: Time Slider, Search, and Category Filters */}
          <GlassPanel elevation={3} className="p-3 sm:p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search to Focus Node */}
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search to focus skill (e.g. RAG, Python)..."
                  className="input pl-9 text-xs"
                  aria-label="Search skills to fly camera"
                />
              </div>

              {/* Time Slider: Morphs graph between 'now' and 'after plan X' */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-scale-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sliders size={14} className="text-sonar" />
                  Time Slider:
                </span>
                <span className={`text-xs font-mono font-medium ${timeMorph === 0 ? "text-sonar" : "text-slate-400"}`}>
                  Now (0%)
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={timeMorph}
                  onChange={(e) => setTimeMorph(parseFloat(e.target.value))}
                  className="w-36 sm:w-48 accent-sonar cursor-pointer"
                  aria-label="Morph graph between current state and after plan X"
                />
                <span className={`text-xs font-mono font-medium ${timeMorph === 1 ? "text-signal" : "text-slate-400"}`}>
                  After Plan X (+{(timeMorph * 100).toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Filter Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
              <span className="font-mono text-[11px] text-slate-400 uppercase tracking-widest shrink-0 flex items-center gap-1">
                <Filter size={12} />
                Filters:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-nexus-sm text-scale-xs font-mono transition-colors duration-instant shrink-0 border ${
                    activeCategory === cat
                      ? "bg-sonar/20 text-sonar border-sonar/50 font-semibold shadow-glow-sonar"
                      : "bg-surface-2 text-slate-300 border-white/5 hover:border-white/20"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </GlassPanel>

          {/* 3D Constellation Viewport (or 2D Fallback) */}
          <div className="relative h-[620px] w-full rounded-nexus-lg overflow-hidden border border-white/10 bg-surface-0 shadow-2xl">
            {isUsingFallback ? (
              <CanvasGraphFallback
                data={rawGraph}
                selectedNode={selectedNode}
                onSelectNode={(n) => setSelectedNode(n)}
                reason={fallbackReason}
                fps={currentFps}
              />
            ) : (
              <ConstellationScene
                nodes={filteredNodes}
                edges={graph3D.edges}
                timeMorph={timeMorph}
                hoveredId={hoveredId}
                selectedNode={selectedNode}
                onHover={setHoveredId}
                onSelect={setSelectedNode}
                reducedMotion={reducedMotion}
                onFpsUpdate={setCurrentFps}
                onLowFpsTrigger={handleLowFps}
                onFirstFrameReady={handleFirstFrame}
              />
            )}

            {/* Bottom HUD Overlay with legend and active nodes count */}
            <div className="absolute bottom-3 left-3 right-3 pointer-events-none flex flex-wrap items-center justify-between gap-2 z-10">
              <div className="pointer-events-auto flex items-center gap-3 bg-surface-1/80 border border-white/10 px-3 py-1.5 rounded-nexus-sm backdrop-blur-md text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-signal">
                  <span className="w-2 h-2 rounded-full bg-signal" /> Target Goal
                </span>
                <span className="flex items-center gap-1.5 text-sonar">
                  <span className="w-2 h-2 rounded-full bg-sonar" /> Skill (Mean Level)
                </span>
                <span className="flex items-center gap-1.5 text-alarm">
                  <span className="w-2 h-2 rounded-full bg-alarm animate-pulse" /> Critical Gap
                </span>
                <span className="flex items-center gap-1.5 text-plasma">
                  <span className="w-2 h-2 rounded-full bg-plasma" /> Evidence Link
                </span>
              </div>

              <div className="bg-surface-1/80 border border-white/10 px-3 py-1.5 rounded-nexus-sm backdrop-blur-md text-[11px] font-mono text-slate-300 tabular-data">
                Visible Nodes: {filteredNodes.length} / {graph3D.nodes.length}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Node Inspector & Critical Gaps Panel */}
        <div className="space-y-4 flex flex-col">
          {/* Side Inspector: shows evidence list and Bayesian distribution */}
          <div className="flex-1">
            <NodeInspector
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              allNodes={graph3D.nodes}
            />
          </div>

          {/* Top Critical Gaps Quick Access */}
          <GlassPanel elevation={3} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="label flex items-center gap-1 text-alarm">
                <Zap size={12} />
                Critical Role Gaps ({graph3D.gaps.length})
              </span>
              <span className="text-[10px] font-mono text-slate-400">Click to focus</span>
            </div>

            <div className="space-y-1.5">
              {graph3D.gaps.slice(0, 5).map((gapLabel) => {
                const node = graph3D.nodes.find((n) => n.label === gapLabel);
                return (
                  <button
                    key={gapLabel}
                    type="button"
                    onClick={() => node && setSelectedNode(node)}
                    className="w-full flex items-center justify-between p-2 rounded-nexus-sm bg-alarm/10 border border-alarm/20 hover:border-alarm/50 text-left transition text-xs font-mono"
                  >
                    <span className="text-slate-200 truncate">{gapLabel}</span>
                    <span className="text-alarm font-bold shrink-0 ml-2">GAP</span>
                  </button>
                );
              })}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
