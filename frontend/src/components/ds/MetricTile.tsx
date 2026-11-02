import React, { useEffect, useState, useRef } from "react";
import GlassPanel from "./GlassPanel";

export interface MetricTileProps {
  label: string;
  value: number;
  format?: "number" | "currency" | "percent" | "raw";
  prefix?: string;
  suffix?: string;
  change?: number; // e.g. +14.2%
  sparklineData?: number[];
  uncertaintyWhisker?: {
    low: number;
    high: number;
  };
  semantic?: "calculated" | "estimated" | "evidence" | "gap";
  aiActive?: boolean;
  statusLabel?: string;
  elevation?: 1 | 2 | 3 | 4 | 5;
  className?: string;
}

const semanticColor = {
  calculated: {
    accent: "text-sonar",
    bg: "bg-sonar/10",
    border: "border-sonar/30",
    stroke: "#22e6c9",
    fill: "rgba(34, 230, 201, 0.15)",
    glow: "sonar" as const,
  },
  estimated: {
    accent: "text-signal",
    bg: "bg-signal/10",
    border: "border-signal/30",
    stroke: "#fbbf24",
    fill: "rgba(251, 191, 36, 0.15)",
    glow: "signal" as const,
  },
  evidence: {
    accent: "text-plasma",
    bg: "bg-plasma/10",
    border: "border-plasma/30",
    stroke: "#8b5cf6",
    fill: "rgba(139, 92, 246, 0.15)",
    glow: "plasma" as const,
  },
  gap: {
    accent: "text-alarm",
    bg: "bg-alarm/10",
    border: "border-alarm/30",
    stroke: "#fb7185",
    fill: "rgba(251, 113, 133, 0.15)",
    glow: "alarm" as const,
  },
};

/**
 * MetricTile Component
 * Includes:
 * - Animated tabular numeral counter (spring/ease transition)
 * - Micro-sparkline SVG with gradient fill
 * - Uncertainty Whisker (Low/High error bar visualization)
 * - State-communicating bioluminescent AI active glow
 */
export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  format = "number",
  prefix = "",
  suffix = "",
  change,
  sparklineData = [12, 18, 15, 24, 22, 31, 28, 38],
  uncertaintyWhisker,
  semantic = "calculated",
  aiActive = false,
  statusLabel,
  elevation = 3,
  className = "",
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const startRef = useRef<number>(value);
  const startTimeRef = useRef<number>(0);

  // Smooth counter animation honoring 420ms duration motion token
  useEffect(() => {
    let animId: number;
    const startVal = displayValue;
    const endVal = value;
    const duration = 420; // 420ms motion token
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: cubic-bezier(.2,.8,.2,1) approximate
      const ease = progress === 1 ? 1 : 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        setDisplayValue(endVal);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  const config = semanticColor[semantic];

  // Format value
  const formattedVal = () => {
    if (format === "percent") {
      return `${displayValue.toFixed(1)}%`;
    }
    if (format === "currency") {
      return `$${displayValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    }
    return displayValue.toLocaleString("en-US", {
      maximumFractionDigits: displayValue % 1 === 0 ? 0 : 1,
    });
  };

  // Sparkline coordinates
  const sparkWidth = 110;
  const sparkHeight = 34;
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;

  const points = sparklineData
    .map((d, i) => {
      const x = (i / (sparklineData.length - 1)) * sparkWidth;
      const y = sparkHeight - ((d - min) / range) * (sparkHeight - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  const fillPath = `M 0,${sparkHeight} ${points} L ${sparkWidth},${sparkHeight} Z`;

  return (
    <GlassPanel
      elevation={elevation}
      aiActive={aiActive}
      glow={config.glow}
      className={`p-4 sm:p-5 flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono text-scale-xs uppercase tracking-[0.16em] text-slate-400 truncate">
            {label}
          </span>
          {statusLabel && (
            <span
              className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border ${config.border} ${config.bg} ${config.accent} tabular-data`}
            >
              {statusLabel}
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div className="font-display text-scale-2xl sm:text-scale-3xl font-bold tracking-tight text-white tabular-data">
            {prefix}
            {formattedVal()}
            {suffix}
          </div>

          {change !== undefined && (
            <span
              className={`font-mono text-scale-xs font-semibold tabular-data flex items-center gap-0.5 ${
                change >= 0 ? "text-sonar" : "text-alarm"
              }`}
            >
              {change >= 0 ? "↑" : "↓"}
              {Math.abs(change)}%
            </span>
          )}
        </div>
      </div>

      {/* Uncertainty Whisker Bar (Low / High bounds) */}
      {uncertaintyWhisker && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1 tabular-data">
            <span>p10: {uncertaintyWhisker.low}</span>
            <span className="text-slate-500 uppercase text-[9px] tracking-wider">Uncertainty Whisker</span>
            <span>p90: {uncertaintyWhisker.high}</span>
          </div>
          <div className="relative w-full h-2 bg-surface-1 rounded-full overflow-hidden flex items-center">
            {/* Whiskers line */}
            <div className="w-full h-0.5 bg-slate-700 relative">
              {/* Range span */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 h-1 rounded ${config.bg} ${config.border} border`}
                style={{
                  left: "20%",
                  width: "60%",
                }}
              />
              {/* Point estimate marker */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${config.border} border bg-white`}
                style={{
                  left: "54%",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Micro-Sparkline Chart */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-[11px] font-mono text-slate-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-current align-middle" />
          {semantic.toUpperCase()}
        </div>

        <svg
          width={sparkWidth}
          height={sparkHeight}
          className="overflow-visible"
          aria-hidden="true"
        >
          <path d={fillPath} fill={config.fill} />
          <polyline
            fill="none"
            stroke={config.stroke}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    </GlassPanel>
  );
};

export default MetricTile;
