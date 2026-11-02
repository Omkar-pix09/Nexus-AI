import React from "react";

export interface SkeletonProps {
  variant?: "text" | "rectangular" | "circular" | "metric";
  width?: string | number;
  height?: string | number;
  className?: string;
}

/**
 * Skeleton Shimmer Component
 * High-performance animated loading placeholder styled for Abyssal Mission Control.
 * Utilizes a deep ink-black glass gradient shimmer mimicking deep-sea sonar scans.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "rectangular",
  width,
  height,
  className = "",
}) => {
  const variantStyles = {
    text: "h-4 w-full rounded-nexus-sm",
    rectangular: "h-24 w-full rounded-nexus-md",
    circular: "h-12 w-12 rounded-full",
    metric: "h-28 w-full rounded-nexus-lg",
  }[variant];

  const inlineStyles: React.CSSProperties = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  return (
    <div
      style={inlineStyles}
      className={`relative overflow-hidden bg-surface-2 border border-white/5 ${variantStyles} ${className}`}
      aria-hidden="true"
    >
      {/* Abyssal Sonar Shimmer Beam */}
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(34, 230, 201, 0.08) 50%, transparent 100%)",
        }}
      />
    </div>
  );
};

export default Skeleton;
