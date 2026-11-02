import React, { useState } from "react";
import { ExternalLink, Database, X, ShieldCheck } from "lucide-react";
import GlassPanel from "./GlassPanel";

export interface EvidenceChipProps {
  id?: string;
  source: string;
  confidence?: number;
  snippet?: string;
  provenance?: {
    origin: string;
    timestamp: string;
    verifiedBy: string;
    retrievalScore: number;
    tokensCount?: number;
  };
  semantic?: "evidence" | "calculated" | "estimated" | "gap";
  interactive?: boolean;
  className?: string;
}

export const EvidenceChip: React.FC<EvidenceChipProps> = ({
  id = "ev-01",
  source,
  confidence = 94,
  snippet = "Extracted from primary enterprise knowledge base and cross-referenced with simulated telemetry data.",
  provenance = {
    origin: "vector-store://abyssal-cluster-04",
    timestamp: "2026-11-02 09:41:22 UTC",
    verifiedBy: "Nexus Consensus Agent v2.4",
    retrievalScore: 0.942,
    tokensCount: 418,
  },
  semantic = "evidence",
  interactive = true,
  className = "",
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const colors = {
    evidence: {
      text: "text-plasma",
      bg: "bg-plasma/10",
      border: "border-plasma/30 hover:border-plasma/60",
      badge: "bg-plasma/20 text-plasma",
    },
    calculated: {
      text: "text-sonar",
      bg: "bg-sonar/10",
      border: "border-sonar/30 hover:border-sonar/60",
      badge: "bg-sonar/20 text-sonar",
    },
    estimated: {
      text: "text-signal",
      bg: "bg-signal/10",
      border: "border-signal/30 hover:border-signal/60",
      badge: "bg-signal/20 text-signal",
    },
    gap: {
      text: "text-alarm",
      bg: "bg-alarm/10",
      border: "border-alarm/30 hover:border-alarm/60",
      badge: "bg-alarm/20 text-alarm",
    },
  }[semantic];

  return (
    <>
      <button
        type="button"
        disabled={!interactive}
        onClick={() => interactive && setDrawerOpen(true)}
        className={`inline-flex items-center gap-2 rounded-nexus-sm border px-2.5 py-1 text-scale-xs font-mono transition-all duration-instant ease-abyssal ${colors.bg} ${colors.border} ${colors.text} ${
          interactive ? "cursor-pointer hover:shadow-glow-plasma active:scale-95" : "cursor-default"
        } ${className}`}
        aria-label={`Open provenance drawer for ${source}`}
      >
        <Database size={12} className="shrink-0" />
        <span className="truncate max-w-[140px] font-medium">{source}</span>
        <span className={`px-1 py-0.2 rounded text-[10px] tabular-data ${colors.badge}`}>
          {confidence}%
        </span>
      </button>

      {/* Provenance Slide-out Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="provenance-title"
        >
          <div
            className="w-full max-w-md h-full bg-surface-1 border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Database className="text-plasma" size={18} />
                  <h3 id="provenance-title" className="font-display font-semibold text-white text-scale-md">
                    Evidence Provenance
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-nexus-sm p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition"
                  aria-label="Close provenance drawer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Source Details */}
              <div className="mt-5 space-y-4">
                <div>
                  <span className="label block mb-1">Source Artifact</span>
                  <div className="p-3 rounded-nexus-md bg-surface-2 border border-white/10 font-mono text-scale-sm text-white flex items-center justify-between">
                    <span className="font-semibold">{source}</span>
                    <span className="text-xs text-plasma font-mono tabular-data">ID: {id}</span>
                  </div>
                </div>

                <div>
                  <span className="label block mb-1">Extracted Snippet</span>
                  <div className="p-3.5 rounded-nexus-md bg-surface-0 border border-white/10 font-sans text-scale-sm text-slate-300 leading-relaxed italic border-l-2 border-l-plasma">
                    "{snippet}"
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-nexus-md bg-surface-2 border border-white/10">
                    <span className="label block mb-1">Confidence</span>
                    <span className="font-mono text-scale-lg font-bold text-plasma tabular-data">
                      {confidence}%
                    </span>
                  </div>
                  <div className="p-3 rounded-nexus-md bg-surface-2 border border-white/10">
                    <span className="label block mb-1">Retrieval Score</span>
                    <span className="font-mono text-scale-lg font-bold text-sonar tabular-data">
                      {provenance.retrievalScore.toFixed(3)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-scale-xs font-mono text-slate-400">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span>Origin:</span>
                    <span className="text-slate-200 truncate max-w-[200px]">{provenance.origin}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span>Timestamp:</span>
                    <span className="text-slate-200 tabular-data">{provenance.timestamp}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span>Verified By:</span>
                    <span className="text-slate-200 flex items-center gap-1">
                      <ShieldCheck size={12} className="text-sonar" />
                      {provenance.verifiedBy}
                    </span>
                  </div>
                  {provenance.tokensCount && (
                    <div className="flex justify-between pb-1">
                      <span>Tokens Processed:</span>
                      <span className="text-slate-200 tabular-data">{provenance.tokensCount}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">
                Nexus Biometric Chain #82719
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="btn text-xs py-1.5 px-3"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EvidenceChip;
