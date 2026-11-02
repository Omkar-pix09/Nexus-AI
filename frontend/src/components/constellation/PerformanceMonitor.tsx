import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

interface PerformanceMonitorProps {
  onFpsUpdate?: (fps: number) => void;
  onLowFpsTrigger?: (fps: number) => void;
}

/**
 * Monitors real-time frame rates and triggers automatic fallback
 * if FPS stays below 30 for 3 consecutive seconds.
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  onFpsUpdate,
  onLowFpsTrigger,
}) => {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const lowFpsStartTime = useRef<number | null>(null);

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    const elapsed = now - lastTime.current;

    if (elapsed >= 1000) {
      const currentFps = Math.round((frameCount.current * 1000) / elapsed);
      frameCount.current = 0;
      lastTime.current = now;

      onFpsUpdate?.(currentFps);

      // Check for low FPS safeguard (< 30 fps)
      if (currentFps < 30) {
        if (!lowFpsStartTime.current) {
          lowFpsStartTime.current = now;
        } else if (now - lowFpsStartTime.current >= 3000) {
          console.warn(`[NEXUS 3D] Sustained low FPS detected (${currentFps} FPS for 3s). Triggering 2D fallback.`);
          onLowFpsTrigger?.(currentFps);
        }
      } else {
        lowFpsStartTime.current = null;
      }
    }
  });

  return null;
};

export default PerformanceMonitor;
