import React from "react";

export interface StatusPulseProps {
  status?: "nominal" | "active" | "warning" | "alarm" | "idle";
  size?: "sm" | "md" | "lg";
  withLabel?: boolean;
  label?: string;
  className?: string;
}

const statusConfig = {
  nominal: {
    color: "bg-sonar",
    glow: "shadow-glow-sonar",
    ring: "border-sonar/40",
    ping: "bg-sonar",
    text: "text-sonar",
    defaultLabel: "Nominal / AI Active",
  },
  active: {
    color: "bg-sonar",
    glow: "shadow-glow-sonar",
    ring: "border-sonar/50",
    ping: "bg-sonar",
    text: "text-sonar",
    defaultLabel: "Computing",
  },
  warning: {
    color: "bg-signal",
    glow: "shadow-glow-signal",
    ring: "border-signal/50",
    ping: "bg-signal",
    text: "text-signal",
    defaultLabel: "Uncertainty / Divergence",
  },
  alarm: {
    color: "bg-alarm",
    glow: "shadow-glow-alarm",
    ring: "border-alarm/50",
    ping: "bg-alarm",
    text: "text-alarm",
    defaultLabel: "Critical Gap Detected",
  },
  idle: {
    color: "bg-slate-500",
    glow: "",
    ring: "border-slate-500/30",
    ping: "bg-slate-500",
    text: "text-slate-400",
    defaultLabel: "Standby",
  },
};

const sizeStyles = {
  sm: { dot: "w-2 h-2", outer: "w-4 h-4", text: "text-scale-xs" },
  md: { dot: "w-2.5 h-2.5", outer: "w-5 h-5", text: "text-scale-sm" },
  lg: { dot: "w-3.5 h-3.5", outer: "w-7 h-7", text: "text-scale-base" },
};

/**
 * StatusPulse
 * Bioluminescent state radar pulse.
 * Motion rule: Motion communicates state (thinking, nominal, warning, idle), never decorates.
 */
export const StatusPulse: React.FC<StatusPulseProps> = ({
  status = "nominal",
  size = "md",
  withLabel = false,
  label,
  className = "",
}) => {
  const cfg = statusConfig[status];
  const sz = sizeStyles[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className={`relative flex items-center justify-center ${sz.outer}`}>
        {/* Animated radar sonar ripple (only active on non-idle states) */}
        {status !== "idle" && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping duration-1000 ${cfg.ping}`}
          />
        )}
        {/* Secondary soft ring */}
        <span
          className={`absolute inline-flex h-full w-full rounded-full border ${cfg.ring} opacity-60`}
        />
        {/* Central Core Dot */}
        <span
          className={`relative inline-flex rounded-full ${sz.dot} ${cfg.color} ${cfg.glow}`}
        />
      </div>

      {withLabel && (
        <span className={`font-mono font-medium tracking-wide tabular-data ${sz.text} ${cfg.text}`}>
          {label || cfg.defaultLabel}
        </span>
      )}
    </div>
  );
};

export default StatusPulse;
