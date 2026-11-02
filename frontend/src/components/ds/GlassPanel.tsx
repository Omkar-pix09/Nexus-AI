import React from "react";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 1 | 2 | 3 | 4 | 5;
  glow?: "none" | "sonar" | "plasma" | "signal" | "alarm";
  aiActive?: boolean;
  withGrain?: boolean;
  withHighlight?: boolean;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const elevationBg = {
  1: "bg-surface-1/90",
  2: "bg-surface-2/80",
  3: "bg-surface-3/75",
  4: "bg-surface-4/80",
  5: "bg-surface-5/90",
};

const glowStyles = {
  none: "",
  sonar: "shadow-glow-sonar border-sonar/40",
  plasma: "shadow-glow-plasma border-plasma/40",
  signal: "shadow-glow-signal border-signal/40",
  alarm: "shadow-glow-alarm border-alarm/40",
};

/**
 * Abyssal GlassPanel
 * Core recipe: blur(24px), 1px inner border white/10, top-edge highlight gradient,
 * 2% noise grain overlay, bioluminescent glow only when AI is active.
 */
export const GlassPanel: React.FC<GlassPanelProps> = ({
  elevation = 3,
  glow = "none",
  aiActive = false,
  withGrain = true,
  withHighlight = true,
  interactive = false,
  className = "",
  children,
  ...props
}) => {
  const activeGlow = aiActive && glow !== "none" ? glowStyles[glow] : "";

  return (
    <div
      className={`
        relative overflow-hidden rounded-nexus-lg
        backdrop-blur-[24px]
        border border-white/10
        ${elevationBg[elevation]}
        ${interactive ? "transition-all duration-fast ease-abyssal hover:border-sonar/40 hover:bg-surface-4/85 cursor-pointer" : ""}
        ${activeGlow}
        ${withGrain ? "abyssal-grain" : ""}
        ${className}
      `}
      {...props}
    >
      {/* Top-edge highlight gradient */}
      {withHighlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"
        />
      )}

      {/* Bioluminescent active breathing indicator on top rim if active */}
      {aiActive && glow !== "none" && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] z-10 animate-pulse ${
            glow === "sonar"
              ? "bg-sonar shadow-glow-sonar"
              : glow === "plasma"
              ? "bg-plasma shadow-glow-plasma"
              : glow === "signal"
              ? "bg-signal shadow-glow-signal"
              : "bg-alarm shadow-glow-alarm"
          }`}
        />
      )}

      {/* Content wrapper with relative z-index above grain */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};

export default GlassPanel;
