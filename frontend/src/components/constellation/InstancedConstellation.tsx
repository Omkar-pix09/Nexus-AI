import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Node3D } from "./types";

interface InstancedConstellationProps {
  nodes: Node3D[];
  timeMorph: number; // 0 = now, 1 = after plan
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (node: Node3D) => void;
  reducedMotion: boolean;
}

const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();
const tempVec = new THREE.Vector3();

export const InstancedConstellation: React.FC<InstancedConstellationProps> = ({
  nodes,
  timeMorph,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  reducedMotion,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const haloMeshRef = useRef<THREE.InstancedMesh>(null);

  // Pre-calculate base attributes
  const nodeCount = nodes.length;

  useFrame(({ clock }) => {
    if (!meshRef.current || !haloMeshRef.current) return;
    const t = clock.getElapsedTime();

    for (let i = 0; i < nodeCount; i++) {
      const n = nodes[i];
      // Interpolate level based on timeMorph
      const currentLevel = n.level + (n.levelAfterPlan - n.level) * timeMorph;

      // Base radius calculation: size = posterior mean skill level
      // Goal is largest (1.8), skill proportional (0.6 to 1.5), evidence (0.45)
      let baseSize = 0.6;
      if (n.type === "goal") {
        baseSize = 1.6;
      } else if (n.type === "skill") {
        baseSize = 0.5 + currentLevel * 0.9;
      } else if (n.type === "evidence") {
        baseSize = 0.45;
      } else {
        baseSize = 0.4;
      }

      const isHovered = n.id === hoveredId;
      const isSelected = n.id === selectedId;
      if (isHovered || isSelected) {
        baseSize *= 1.35;
      }

      // Coral gap pulsing
      if (n.gap && !reducedMotion) {
        const pulse = 1 + 0.22 * Math.sin(t * 5 + i);
        baseSize *= pulse;
      }

      // Set core sphere transform
      tempVec.set(n.x, n.y, n.z);
      tempMatrix.makeScale(baseSize, baseSize, baseSize);
      tempMatrix.setPosition(tempVec);
      meshRef.current.setMatrixAt(i, tempMatrix);

      // Determine Core Color
      if (n.gap) {
        tempColor.set("#fb7185"); // Alarm Coral
      } else if (n.type === "evidence") {
        tempColor.set("#8b5cf6"); // Plasma Violet
      } else if (n.type === "goal") {
        tempColor.set("#fbbf24"); // Signal Amber
      } else {
        // Skill: Sonar Cyan with brightness scaled by level
        tempColor.set("#22e6c9");
        tempColor.multiplyScalar(0.4 + currentLevel * 0.85);
      }
      meshRef.current.setColorAt(i, tempColor);

      // Halo transform: soft halo radius = uncertainty
      // Uncertainty standard deviation (0.1 to 0.5)
      const haloRadius = baseSize * (1.4 + n.uncertainty * 2.8);
      tempMatrix.makeScale(haloRadius, haloRadius, haloRadius);
      tempMatrix.setPosition(tempVec);
      haloMeshRef.current.setMatrixAt(i, tempMatrix);

      // Halo Color: slightly lighter and translucent
      if (n.gap) {
        tempColor.set("#fb7185");
      } else if (n.type === "evidence") {
        tempColor.set("#8b5cf6");
      } else {
        tempColor.set("#22e6c9");
      }
      haloMeshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    haloMeshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    if (haloMeshRef.current.instanceColor) haloMeshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* Core Instanced Sphere Mesh */}
      <instancedMesh
        ref={meshRef}
        args={[undefined as any, undefined as any, nodeCount]}
        onPointerMove={(e) => {
          e.stopPropagation();
          const instanceId = e.instanceId;
          if (instanceId !== undefined && nodes[instanceId]) {
            onHover(nodes[instanceId].id);
          }
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          const instanceId = e.instanceId;
          if (instanceId !== undefined && nodes[instanceId]) {
            onSelect(nodes[instanceId]);
          }
        }}
      >
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial
          roughness={0.15}
          metalness={0.8}
          emissiveIntensity={0.65}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Uncertainty Halo Instanced Mesh (Soft Blended Outer Shell) */}
      <instancedMesh
        ref={haloMeshRef}
        args={[undefined as any, undefined as any, nodeCount]}
      >
        <sphereGeometry args={[1, 14, 14]} />
        <meshBasicMaterial
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          wireframe={false}
        />
      </instancedMesh>
    </group>
  );
};

export default InstancedConstellation;
