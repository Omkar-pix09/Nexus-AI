import React, { useEffect, useRef } from "react";

export interface SonarRadarProps {
  size?: number;
  sweepSpeedSec?: number;
  blips?: Array<{ x: number; y: number; label: string; type: "agent" | "signal" | "anomaly" }>;
  className?: string;
}

/**
 * SonarRadar AI Effect (Custom 10X Enhancement)
 * Deep-sea mission control radar with sweep beam, concentric range rings, and active agent blips.
 */
export const SonarRadar: React.FC<SonarRadarProps> = ({
  size = 280,
  sweepSpeedSec = 4,
  blips = [
    { x: 0.65, y: 0.35, label: "Agent-01", type: "agent" },
    { x: 0.3, y: 0.7, label: "Vector Cluster", type: "signal" },
    { x: 0.8, y: 0.75, label: "Gap Delta", type: "anomaly" },
  ],
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;
    const center = size / 2;
    const radius = center - 8;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      // Concentric range circles
      ctx.strokeStyle = "rgba(34, 230, 201, 0.15)";
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75, 1].forEach((r) => {
        ctx.beginPath();
        ctx.arc(center, center, radius * r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(center, 4);
      ctx.lineTo(center, size - 4);
      ctx.moveTo(4, center);
      ctx.lineTo(size - 4, center);
      ctx.strokeStyle = "rgba(34, 230, 201, 0.10)";
      ctx.stroke();

      // Sweeping arc beam with gradient
      const sweepGradient = ctx.createConicGradient(angle, center, center);
      sweepGradient.addColorStop(0, "rgba(34, 230, 201, 0.35)");
      sweepGradient.addColorStop(0.12, "rgba(34, 230, 201, 0.05)");
      sweepGradient.addColorStop(0.2, "rgba(34, 230, 201, 0)");
      sweepGradient.addColorStop(1, "rgba(34, 230, 201, 0)");

      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = sweepGradient;
      ctx.fill();
      ctx.restore();

      // Draw blips
      blips.forEach((b) => {
        const bx = center + (b.x - 0.5) * radius * 1.6;
        const by = center + (b.y - 0.5) * radius * 1.6;

        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        if (b.type === "anomaly") {
          ctx.fillStyle = "#fb7185";
          ctx.shadowColor = "#fb7185";
        } else if (b.type === "signal") {
          ctx.fillStyle = "#fbbf24";
          ctx.shadowColor = "#fbbf24";
        } else {
          ctx.fillStyle = "#22e6c9";
          ctx.shadowColor = "#22e6c9";
        }
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = "9px 'JetBrains Mono'";
        ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
        ctx.fillText(b.label, bx + 6, by - 4);
      });

      angle += (Math.PI * 2) / (sweepSpeedSec * 60);
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [size, sweepSpeedSec, blips]);

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full bg-surface-1 border border-sonar/30 shadow-[0_0_25px_rgba(34,230,201,0.15)]"
      />
      <div className="absolute top-2 left-3 font-mono text-[9px] uppercase tracking-widest text-sonar/70 pointer-events-none">
        SONAR 360° RANGE
      </div>
    </div>
  );
};

export default SonarRadar;
