import React from "react";
import { Node3D } from "./types";
import { X, ExternalLink, ShieldCheck, Database, Award, Sparkles, BookOpen } from "lucide-react";
import { GlassPanel } from "../ds/GlassPanel";
import { pct } from "../ui";

interface NodeInspectorProps {
  node: Node3D | null;
  onClose: () => void;
  onSelectNode?: (n: Node3D) => void;
  allNodes?: Node3D[];
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  onClose,
  onSelectNode,
  allNodes = [],
}) => {
  if (!node) {
    return (
      <GlassPanel elevation={3} className="p-5 flex flex-col items-center justify-center text-center h-full min-h-[360px]">
        <Sparkles size={28} className="text-sonar mb-3 opacity-60" />
        <h3 className="font-display text-scale-md font-semibold text-white">
          Constellation Inspector
        </h3>
        <p className="font-sans text-scale-xs text-slate-400 mt-2 max-w-xs">
          Click any skill, evidence vector, or goal sphere in the 3D space. The camera will fly directly to inspect its provenance and posterior distribution.
        </p>
        <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <kbd className="px-1.5 py-0.5 rounded bg-surface-1 border border-white/10 text-slate-300">Orbit: Drag</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-surface-1 border border-white/10 text-slate-300">Zoom: Scroll</kbd>
        </div>
      </GlassPanel>
    );
  }

  const badgeColor =
    node.gap
      ? "bg-alarm/15 text-alarm border-alarm/30"
      : node.type === "evidence"
      ? "bg-plasma/15 text-plasma border-plasma/30"
      : node.type === "goal"
      ? "bg-signal/15 text-signal border-signal/30"
      : "bg-sonar/15 text-sonar border-sonar/30";

  return (
    <GlassPanel elevation={4} aiActive={true} glow={node.gap ? "alarm" : "sonar"} className="p-5 flex flex-col justify-between h-full">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${badgeColor}`}>
                {node.type}
              </span>
              {node.group && (
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  [{node.group}]
                </span>
              )}
            </div>
            <h2 className="font-display text-scale-lg font-bold text-white tracking-tight">
              {node.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-nexus-sm text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Close inspector"
          >
            <X size={18} />
          </button>
        </div>

        {/* Statistical Bayesian Metrics */}
        {node.type === "skill" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-nexus-md bg-surface-2 border border-white/10">
              <span className="label block mb-1">Posterior Mean</span>
              <span className="font-mono text-scale-xl font-bold text-sonar tabular-data">
                {pct(node.level)}
              </span>
              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                Target Weight: {node.weight ? (node.weight * 100).toFixed(0) + "%" : "—"}
              </span>
            </div>

            <div className="p-3 rounded-nexus-md bg-surface-2 border border-white/10">
              <span className="label block mb-1">Uncertainty (σ)</span>
              <span className="font-mono text-scale-xl font-bold text-signal tabular-data">
                ±{(node.uncertainty * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                Confidence: {(100 - node.uncertainty * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* Critical Gap Alert if applicable */}
        {node.gap && (
          <div className="p-3 rounded-nexus-md bg-alarm/10 border border-alarm/40 text-alarm space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-alarm animate-ping" />
              Critical Capability Gap
            </div>
            <p className="font-sans text-scale-xs text-slate-300">
              Level is currently below 50% for a high-priority skill required for target role completion.
            </p>
          </div>
        )}

        {/* Evidence List & Provenance Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="label flex items-center gap-1.5">
              <Database size={12} className="text-plasma" />
              Evidence & Provenance ({node.evidenceList?.length || node.evidence_count || 0})
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {(!node.evidenceList || node.evidenceList.length === 0) ? (
              <div className="p-3 rounded-nexus-sm bg-surface-2 border border-white/5 text-slate-400 font-mono text-xs text-center">
                {node.evidence_count ? `${node.evidence_count} source documents referenced.` : "No direct evidence documents linked."}
              </div>
            ) : (
              node.evidenceList.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-nexus-md bg-surface-2 border border-white/10 space-y-1 hover:border-plasma/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs font-medium text-white truncate max-w-[190px]">
                      {ev.doc_name}
                    </span>
                    <span className="font-mono text-[10px] text-plasma tabular-data">
                      {ev.mentions} mentions
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="truncate max-w-[130px]">{ev.origin}</span>
                    <span className="text-sonar">Score: {ev.score.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span>Node ID: {node.id}</span>
        <span className="text-sonar flex items-center gap-1">
          <ShieldCheck size={12} />
          Nexus Graph Validated
        </span>
      </div>
    </GlassPanel>
  );
};

export default NodeInspector;
