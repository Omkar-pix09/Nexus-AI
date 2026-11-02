import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Node3D, Edge3D } from "./types";
import InstancedConstellation from "./InstancedConstellation";
import FlowingEdgeParticles from "./FlowingEdgeParticles";
import ConstellationLabels from "./ConstellationLabels";
import CameraFlyController from "./CameraFlyController";
import PerformanceMonitor from "./PerformanceMonitor";

interface ConstellationSceneProps {
  nodes: Node3D[];
  edges: Edge3D[];
  timeMorph: number;
  hoveredId: string | null;
  selectedNode: Node3D | null;
  onHover: (id: string | null) => void;
  onSelect: (node: Node3D) => void;
  reducedMotion: boolean;
  onFpsUpdate?: (fps: number) => void;
  onLowFpsTrigger?: (fps: number) => void;
  onFirstFrameReady?: () => void;
}

export const ConstellationScene: React.FC<ConstellationSceneProps> = ({
  nodes,
  edges,
  timeMorph,
  hoveredId,
  selectedNode,
  onHover,
  onSelect,
  reducedMotion,
  onFpsUpdate,
  onLowFpsTrigger,
  onFirstFrameReady,
}) => {
  const [cameraDistance, setCameraDistance] = React.useState(36);

  return (
    <Canvas
      camera={{ position: [0, 0, 36], fov: 50, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
      }}
      onCreated={({ gl }) => {
        onFirstFrameReady?.();
      }}
      className="w-full h-full cursor-grab active:cursor-grabbing"
    >
      {/* Abyssal Deep Fog (#04060b Void Black) */}
      <color attach="background" args={["#04060b"]} />
      <fogExp2 attach="fog" args={["#04060b", 0.022]} />

      {/* Atmospheric Space Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[15, 20, 10]} intensity={1.2} color="#ffffff" />
      <pointLight position={[0, 0, 0]} intensity={2.0} color="#22e6c9" distance={45} />
      <pointLight position={[-15, -10, -5]} intensity={1.5} color="#8b5cf6" distance={35} />

      <Suspense fallback={null}>
        {/* Instanced Sphere Mesh with Uncertainty Halo */}
        <InstancedConstellation
          nodes={nodes}
          timeMorph={timeMorph}
          hoveredId={hoveredId}
          selectedId={selectedNode?.id ?? null}
          onHover={onHover}
          onSelect={onSelect}
          reducedMotion={reducedMotion}
        />

        {/* Structural Edge Links & Bioluminescent Particles */}
        <FlowingEdgeParticles edges={edges} reducedMotion={reducedMotion} />

        {/* Dynamic Label LOD */}
        <ConstellationLabels
          nodes={nodes}
          hoveredId={hoveredId}
          selectedId={selectedNode?.id ?? null}
          cameraDistance={cameraDistance}
        />

        {/* Camera Fly Controller with Idle Auto-Orbit */}
        <CameraFlyController
          selectedNode={selectedNode}
          reducedMotion={reducedMotion}
          onDistanceChange={setCameraDistance}
        />

        {/* Real-time FPS Performance Safeguard */}
        <PerformanceMonitor
          onFpsUpdate={onFpsUpdate}
          onLowFpsTrigger={onLowFpsTrigger}
        />

        {/* Subtle Postprocessing Bloom */}
        {!reducedMotion && (
          <EffectComposer multisampling={0}>
            <Bloom
              luminanceThreshold={0.55}
              luminanceSmoothing={0.3}
              intensity={0.65}
              kernelSize={3}
            />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
};

export default ConstellationScene;
