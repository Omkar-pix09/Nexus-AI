import React, { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Node3D } from "./types";

interface CameraFlyControllerProps {
  selectedNode: Node3D | null;
  reducedMotion: boolean;
  onDistanceChange?: (dist: number) => void;
  onCameraIdle?: (isIdle: boolean) => void;
}

export const CameraFlyController: React.FC<CameraFlyControllerProps> = ({
  selectedNode,
  reducedMotion,
  onDistanceChange,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const targetCamPos = useRef(new THREE.Vector3(0, 0, 36));
  const isFlying = useRef(false);

  // When selectedNode changes, fly camera to node
  useEffect(() => {
    if (!selectedNode) return;

    if (reducedMotion) {
      // Instant transition without animation
      targetLookAt.current.set(selectedNode.x, selectedNode.y, selectedNode.z);
      controlsRef.current?.target.copy(targetLookAt.current);
      camera.position.set(selectedNode.x, selectedNode.y + 2, selectedNode.z + 10);
      controlsRef.current?.update();
    } else {
      isFlying.current = true;
      targetLookAt.current.set(selectedNode.x, selectedNode.y, selectedNode.z);
      // Position camera offset to view the node comfortably
      targetCamPos.current.set(
        selectedNode.x + 3,
        selectedNode.y + 2,
        selectedNode.z + 10
      );
    }
  }, [selectedNode, reducedMotion, camera]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    if (isFlying.current && !reducedMotion) {
      // Smooth fly lerp with standard easing
      const factor = Math.min(delta * 4, 1);
      controlsRef.current.target.lerp(targetLookAt.current, factor);
      camera.position.lerp(targetCamPos.current, factor);

      if (
        controlsRef.current.target.distanceTo(targetLookAt.current) < 0.05 &&
        camera.position.distanceTo(targetCamPos.current) < 0.05
      ) {
        isFlying.current = false;
      }
      controlsRef.current.update();
    }

    // Report distance for LOD
    if (onDistanceChange) {
      const dist = camera.position.distanceTo(controlsRef.current.target);
      onDistanceChange(dist);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      autoRotate={!reducedMotion && !selectedNode} // Auto-orbit when idle
      autoRotateSpeed={0.5}
      minDistance={4}
      maxDistance={65}
      maxPolarAngle={Math.PI / 1.7}
      minPolarAngle={Math.PI / 5}
    />
  );
};

export default CameraFlyController;
