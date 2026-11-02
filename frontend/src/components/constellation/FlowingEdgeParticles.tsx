import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Edge3D } from "./types";

interface FlowingEdgeParticlesProps {
  edges: Edge3D[];
  reducedMotion: boolean;
}

export const FlowingEdgeParticles: React.FC<FlowingEdgeParticlesProps> = ({
  edges,
  reducedMotion,
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Filter evidence links
  const evidenceEdges = useMemo(() => {
    return edges.filter(
      (e) => e.type === "evidences" && e.sourceNode && e.targetNode
    );
  }, [edges]);

  // Total particles = 5 particles per evidence edge
  const particlesPerEdge = 4;
  const count = evidenceEdges.length * particlesPerEdge;

  const [positions, progressArray, edgeIndices] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const prog = new Float32Array(count);
    const indices = new Int32Array(count);

    let idx = 0;
    evidenceEdges.forEach((e, edgeIdx) => {
      for (let p = 0; p < particlesPerEdge; p++) {
        prog[idx] = (p / particlesPerEdge) + Math.random() * 0.1;
        indices[idx] = edgeIdx;
        idx++;
      }
    });

    return [pos, prog, indices];
  }, [evidenceEdges, count]);

  // Static lines geometry for edge rendering
  const linesGeometry = useMemo(() => {
    const coords: number[] = [];
    const colors: number[] = [];

    const colorReq = new THREE.Color("#fbbf24");
    const colorPrereq = new THREE.Color("#ffffff");
    const colorEv = new THREE.Color("#8b5cf6");
    const colorImp = new THREE.Color("#22e6c9");

    edges.forEach((e) => {
      if (!e.sourceNode || !e.targetNode) return;
      coords.push(
        e.sourceNode.x, e.sourceNode.y, e.sourceNode.z,
        e.targetNode.x, e.targetNode.y, e.targetNode.z
      );

      let c = colorPrereq;
      if (e.type === "required") c = colorReq;
      else if (e.type === "evidences") c = colorEv;
      else if (e.type === "improves") c = colorImp;

      colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(coords, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geom;
  }, [edges]);

  // Update flowing particle positions along evidence links
  useFrame((_, delta) => {
    if (!pointsRef.current || reducedMotion || count === 0) return;

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const speed = 0.35; // Slow, deliberate mission control particle flow

    for (let i = 0; i < count; i++) {
      progressArray[i] = (progressArray[i] + delta * speed) % 1.0;
      const edge = evidenceEdges[edgeIndices[i]];
      if (!edge || !edge.sourceNode || !edge.targetNode) continue;

      const p = progressArray[i];
      // Linear interpolation with slight curved loft
      const x = THREE.MathUtils.lerp(edge.sourceNode.x, edge.targetNode.x, p);
      const y = THREE.MathUtils.lerp(edge.sourceNode.y, edge.targetNode.y, p);
      const z = THREE.MathUtils.lerp(edge.sourceNode.z, edge.targetNode.z, p);

      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* Structural Network Wireframe Edges */}
      <lineSegments geometry={linesGeometry}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Bioluminescent Flowing Particles on Evidence Links */}
      {!reducedMotion && count > 0 && (
        <points ref={pointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={count}
              array={positions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.22}
            color="#8b5cf6" // Plasma Violet evidence particle
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
};

export default FlowingEdgeParticles;
