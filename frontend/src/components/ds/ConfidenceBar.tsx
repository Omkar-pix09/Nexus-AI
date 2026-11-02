import React from "react";

export interface ConfidenceBarProps {
  label?: string;
  value: number; // 0 to 100 (point estimate)
  p10?: number;  // 0 to 100 lower bound
  p90?: number;  // 0 to 100 upper bound
  semantic?: "calculated" | "estimated" | "evidence" | "gap";
  isEstimated?: boolean; // When true or when semantic="estimated", render diagonal hatch pattern
  showLabels?: boolean;
  className?: string;
}

const colorMap = {
  calculated: {
    bar: "bg-sonar",
    glow: "shadow-glow-sonar",
    band: "bg-sonar/20 border-sonar/40",
    text: "text-sonar",
    marker: "border-sonar",
  },
  estimated: {
    bar: "bg-signal",
    glow: "shadow-glow-signal",
    band: "bg-signal/20 border-signal/40",
    text: "text-signal",
    marker: "border-signal",
  },
  evidence: {
    bar: "bg-plasma",
    glow: "shadow-glow-plasma",
    band: "bg-plasma/20 border-plasma/40",
    text: "text-plasma",
    marker: "border-plasma",
  },
  gap: {
    bar: "bg-alarm",
    glow: "shadow-glow-alarm",
    band: "bg-alarm/20 border-alarm/40",
    text: "text-alarm",
    marker: "border-alarm",
  },
};

/**
 * ConfidenceBar Component
 * Renders point estimate with p10-p90 uncertainty confidence interval band.
 * When `isEstimated` is true or semantic is `estimated`, applies a diagonal hatch pattern.
 */
export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  label,
  value,
  p10 = Math.max(0, value - 15),
  p90 = Math.min(100, value + 15),
  semantic = "calculated",
  isEstimated = false,
  showLabels = true,
  className = "",
}) => {
  const effectiveEstimated = isEstimated || semantic === "estimated";
  const colors = colorMap[semantic];

  const clampedVal = Math.min(100, Math.max(0, value));
  const clampedP10 = Math.min(clampedVal, Math.max(0, p10));
  const clampedP90 = Math.max(clampedVal, Math.min(100, p90));
  const bandWidth = clampedP90 - clampedP10;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-scale-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">{label || "Confidence"}</span>
            {effectiveEstimated && (
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-signal/15 text-signal border border-signal/30 font-semibold tracking-wider">
                Estimated (Hatched)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 tabular-data">
            <span className="text-slate-400">
              [{clampedP10.toFixed(0)}% — {clampedP90.toFixed(0)}%]
            </span>
            <span className={`font-semibold ${colors.text} text-scale-sm`}>
              {clampedVal.toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Main Track */}
      <div className="relative h-4 w-full rounded-nexus-sm bg-surface-1 border border-white/10 overflow-hidden">
        {/* Subtle grid ticks at 25%, 50%, 75% */}
        <div className="absolute inset-0 flex justify-between pointer-events-none px-[25%] opacity-15">
          <div className="w-px h-full bg-white" />
          <div className="w-px h-full bg-white" />
        </div>

        {/* p10 to p90 Uncertainty Band */}
        <div
          className={`absolute top-0 bottom-0 rounded-sm border-x transition-all duration-steady ease-abyssal ${
            effectiveEstimated ? "hatch-pattern-amber border-signal/50" : colors.band
          }`}
          style={{
            left: `${clampedP10}%`,
            width: `${bandWidth}%`,
          }}
          title={`p10: ${clampedP10}% | p90: ${clampedP90}%`}
        />

        {/* Value Fill Bar */}
        <div
          className={`absolute top-0 bottom-0 left-0 transition-all duration-steady ease-abyssal opacity-70 ${
            colors.bar
          }`}
          style={{
            width: `${clampedVal}%`,
          }}
        />

        {/* Exact Point Marker Line */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-all duration-steady ease-abyssal z-10"
          style={{
            left: `calc(${clampedVal}% - 2px)`,
          }}
          title={`Point Estimate: ${clampedVal}%`}
        />
      </div>

      {/* Bottom Range Legend */}
      <div className="flex justify-between text-[10px] font-mono text-slate-400 tabular-data px-0.5">
        <span>0%</span>
        <span>p10 ({clampedP10}%)</span>
        <span>p90 ({clampedP90}%)</span>
        <span>100%</span>
      </div>
    </div>
  );
};

export default ConfidenceBar;
