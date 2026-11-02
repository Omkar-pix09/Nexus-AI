import React from "react";
import StatusPulse from "./StatusPulse";

export interface AgentAvatarProps {
  name: string;
  role?: string;
  avatarUrl?: string;
  state?: "thinking" | "evidence_found" | "divergent" | "nominal" | "idle";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const stateColors = {
  thinking: {
    border: "border-sonar animate-pulse",
    glow: "shadow-glow-sonar",
    pulseStatus: "active" as const,
    label: "Synthesizing",
  },
  evidence_found: {
    border: "border-plasma",
    glow: "shadow-glow-plasma",
    pulseStatus: "nominal" as const,
    label: "Evidence Found",
  },
  divergent: {
    border: "border-alarm",
    glow: "shadow-glow-alarm",
    pulseStatus: "alarm" as const,
    label: "Gap Detected",
  },
  nominal: {
    border: "border-sonar/50",
    glow: "shadow-glow-sonar",
    pulseStatus: "nominal" as const,
    label: "Synchronized",
  },
  idle: {
    border: "border-white/10",
    glow: "",
    pulseStatus: "idle" as const,
    label: "Standby",
  },
};

const avatarSizes = {
  sm: { container: "w-8 h-8", text: "text-xs", ring: "p-0.5", icon: "text-[10px]" },
  md: { container: "w-11 h-11", text: "text-sm", ring: "p-1", icon: "text-xs" },
  lg: { container: "w-16 h-16", text: "text-lg", ring: "p-1.5", icon: "text-base" },
};

/**
 * AgentAvatar Component
 * Features bioluminescent reactive halo that communicates state:
 * - thinking: pulsing Sonar Cyan sweep
 * - evidence_found: Plasma Violet aura
 * - divergent / uncertainty: Alarm Coral warning perimeter
 */
export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  name,
  role = "Nexus Autonomous Agent",
  avatarUrl,
  state = "nominal",
  size = "md",
  className = "",
}) => {
  const current = stateColors[state];
  const sz = avatarSizes[size];

  // Extract initials
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={`relative inline-flex items-center gap-3 ${className}`}>
      {/* Outer Halo Perimeter */}
      <div
        className={`relative rounded-full border ${current.border} ${current.glow} ${sz.ring} transition-all duration-steady ease-abyssal bg-surface-2`}
      >
        <div
          className={`flex items-center justify-center rounded-full overflow-hidden bg-surface-3 text-white font-mono font-bold ${sz.container}`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className={`${sz.text} tracking-wider text-slate-200`}>{initials}</span>
          )}
        </div>

        {/* Bioluminescent Micro Status Ring Indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 z-20">
          <StatusPulse status={current.pulseStatus} size="sm" />
        </div>
      </div>

      {/* Optional Metadata Block */}
      {size !== "sm" && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-slate-100 text-scale-sm tracking-tight">
              {name}
            </span>
          </div>
          <span className="font-mono text-scale-xs text-slate-400 truncate max-w-[150px]">
            {role}
          </span>
        </div>
      )}
    </div>
  );
};

export default AgentAvatar;
