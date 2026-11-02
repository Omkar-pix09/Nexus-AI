import React, { useMemo } from "react";
import { Html } from "@react-three/drei";
import { Node3D } from "./types";

interface ConstellationLabelsProps {
  nodes: Node3D[];
  hoveredId: string | null;
  selectedId: string | null;
  cameraDistance: number;
}

export const ConstellationLabels: React.FC<ConstellationLabelsProps> = ({
  nodes,
  hoveredId,
  selectedId,
  cameraDistance,
}) => {
  // Label Level of Detail (LOD) Rules:
  // - Goal & Selected/Hovered always shown
  // - Near (distance < 38): show goals, high weight skills, and active gaps
  // - Far (distance >= 38): only show goal + hovered/selected node
  const visibleNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (n.id === hoveredId || n.id === selectedId) return true;
      if (n.type === "goal") return true;

      if (cameraDistance < 32) {
        // Show prominent skills and critical gaps
        if (n.gap) return true;
        if (n.type === "skill" && n.weight >= 0.6) return true;
      }
      return false;
    });
  }, [nodes, hoveredId, selectedId, cameraDistance]);

  return (
    <group>
      {visibleNodes.map((n) => {
        const isHovered = n.id === hoveredId;
        const isSelected = n.id === selectedId;

        const badgeColor =
          n.gap
            ? "bg-alarm/20 text-alarm border-alarm/40"
            : n.type === "evidence"
            ? "bg-plasma/20 text-plasma border-plasma/40"
            : n.type === "goal"
            ? "bg-signal/20 text-signal border-signal/40"
            : "bg-sonar/20 text-sonar border-sonar/40";

        return (
          <Html
            key={n.id}
            position={[n.x, n.y + 0.9, n.z]}
            center
            distanceFactor={22}
            className="pointer-events-none select-none"
          >
            <div
              className={`flex flex-col items-center transition-transform duration-instant ${
                isHovered || isSelected ? "scale-110 z-30" : "opacity-85 z-10"
              }`}
            >
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-nexus-sm border backdrop-blur-md text-[11px] font-mono shadow-lg whitespace-nowrap bg-surface-1/90 ${badgeColor}`}
              >
                <span className="font-semibold">{n.label}</span>
                {n.type === "skill" && (
                  <span className="opacity-75 tabular-data">
                    {Math.round(n.level * 100)}%
                  </span>
                )}
                {n.gap && (
                  <span className="w-1.5 h-1.5 rounded-full bg-alarm animate-ping" />
                )}
              </div>
            </div>
          </Html>
        );
      })}
    </group>
  );
};

export default ConstellationLabels;
