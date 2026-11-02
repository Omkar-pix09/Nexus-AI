import React, { useEffect, useRef } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "interrupted" | "error";

interface VoiceOrbCanvasProps {
  state: OrbState;
  audioLevel: number; // 0.0 to 1.0 (from Web Audio AnalyserNode or TTS synthesiser)
  reducedMotion?: boolean;
  className?: string;
}

// Color palettes for states:
// - listening: cyan (#22e6c9)
// - thinking: violet (#8b5cf6)
// - speaking: amber (#fbbf24)
// - error / interrupted: coral (#fb7185)
// - idle: deep bioluminescent cyan-teal (#14b8a6)
const STATE_COLORS: Record<OrbState, { r: number; g: number; b: number; hex: string }> = {
  idle: { r: 20, g: 184, b: 166, hex: "#14b8a6" },
  listening: { r: 34, g: 230, b: 201, hex: "#22e6c9" }, // cyan
  thinking: { r: 139, g: 92, b: 246, hex: "#8b5cf6" }, // violet
  speaking: { r: 251, g: 191, b: 36, hex: "#fbbf24" }, // amber
  interrupted: { r: 251, g: 113, b: 133, hex: "#fb7185" }, // coral
  error: { r: 251, g: 113, b: 133, hex: "#fb7185" }, // coral
};

interface Particle {
  angle: number;
  radiusOffset: number;
  speed: number;
  size: number;
  alpha: number;
  phase: number;
}

export const VoiceOrbCanvas: React.FC<VoiceOrbCanvasProps> = ({
  state,
  audioLevel,
  reducedMotion = false,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const audioLevelRef = useRef(audioLevel);
  audioLevelRef.current = audioLevel;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  // Interruption instant contraction factor
  const contractionRef = useRef(1.0);
  const targetContractionRef = useRef(1.0);

  // Particles for thinking/idle orbit
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    // Generate initial orbital particles
    const pts: Particle[] = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      pts.push({
        angle: (i / count) * Math.PI * 2,
        radiusOffset: (Math.random() - 0.5) * 24,
        speed: 0.015 + Math.random() * 0.02,
        size: 1.5 + Math.random() * 2.2,
        alpha: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = pts;
  }, []);

  // Handle instant contraction on interrupt
  useEffect(() => {
    if (state === "interrupted") {
      targetContractionRef.current = 0.68;
      // Re-expand smoothly back after 240ms
      const t = setTimeout(() => {
        targetContractionRef.current = 1.0;
      }, 260);
      return () => clearTimeout(t);
    } else {
      targetContractionRef.current = 1.0;
    }
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let t = 0;
    let isHidden = false;

    // Handle tab visibility change: Pause when tab is hidden
    const onVisibilityChange = () => {
      isHidden = document.hidden;
      if (!isHidden) {
        lastFrameTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // High DPI Canvas Scaling
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // Current smooth color transition
    let curR = STATE_COLORS[state].r;
    let curG = STATE_COLORS[state].g;
    let curB = STATE_COLORS[state].b;

    let smoothAudio = 0;
    let lastFrameTime = performance.now();

    const render = (now: number) => {
      if (isHidden) return;

      const delta = Math.min((now - lastFrameTime) / 1000, 0.1);
      lastFrameTime = now;
      t += delta;

      const currentState = stateRef.current;
      const targetColor = STATE_COLORS[currentState] || STATE_COLORS.idle;
      const motionOff = reducedMotionRef.current;

      // Color lerp (instant on interrupted, smooth on other transitions)
      const colorLerp = currentState === "interrupted" ? 0.45 : Math.min(delta * 8, 1);
      curR += (targetColor.r - curR) * colorLerp;
      curG += (targetColor.g - curG) * colorLerp;
      curB += (targetColor.b - curB) * colorLerp;

      // Contraction lerp
      contractionRef.current += (targetContractionRef.current - contractionRef.current) * Math.min(delta * 14, 1);

      // Smooth audio level
      const targetAudio = audioLevelRef.current;
      smoothAudio += (targetAudio - smoothAudio) * Math.min(delta * 12, 1);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Base radius calculation
      const minDimension = Math.min(w, h);
      const baseRadius = minDimension * 0.28 * contractionRef.current;

      // Dynamic reactive radius depending on state
      let reactiveRadius = baseRadius;
      if (currentState === "idle") {
        // Slow gentle breathing (0.35 Hz)
        const breathe = motionOff ? 0 : Math.sin(t * 2.2) * (baseRadius * 0.04);
        reactiveRadius = baseRadius + breathe;
      } else if (currentState === "listening") {
        // Reacts heavily to microphone audio analyser level
        reactiveRadius = baseRadius * (1.0 + smoothAudio * 0.45);
      } else if (currentState === "speaking") {
        // Pulses rhythmically with TTS speech
        const speechPulse = motionOff ? 0 : Math.sin(t * 8) * (baseRadius * 0.08) * (0.4 + smoothAudio * 0.6);
        reactiveRadius = baseRadius * (1.0 + smoothAudio * 0.3) + speechPulse;
      } else if (currentState === "thinking") {
        // Tight, fast quantum oscillation
        const thinkingPulse = motionOff ? 0 : Math.sin(t * 6.5) * (baseRadius * 0.035);
        reactiveRadius = baseRadius * 0.94 + thinkingPulse;
      } else if (currentState === "interrupted") {
        reactiveRadius = baseRadius * 0.85;
      }

      const rInt = Math.round(curR);
      const gInt = Math.round(curG);
      const bInt = Math.round(curB);

      // 1. Abyssal Outer Bioluminescent Aura Glow
      const glowRadius = reactiveRadius * (1.8 + smoothAudio * 0.6);
      const outerGlow = ctx.createRadialGradient(cx, cy, reactiveRadius * 0.4, cx, cy, glowRadius);
      outerGlow.addColorStop(0, `rgba(${rInt}, ${gInt}, ${bInt}, 0.35)`);
      outerGlow.addColorStop(0.4, `rgba(${rInt}, ${gInt}, ${bInt}, 0.12)`);
      outerGlow.addColorStop(0.7, `rgba(${rInt}, ${gInt}, ${bInt}, 0.04)`);
      outerGlow.addColorStop(1, `rgba(${rInt}, ${gInt}, ${bInt}, 0)`);

      ctx.save();
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Harmonic Resonance Waveform Rings (active in listening or speaking)
      if (!motionOff && (currentState === "listening" || currentState === "speaking")) {
        const ringCount = 3;
        for (let k = 1; k <= ringCount; k++) {
          const ringProgress = (t * 0.8 + k / ringCount) % 1.0;
          const rRing = reactiveRadius + ringProgress * 45 * (0.8 + smoothAudio);
          const rAlpha = (1.0 - ringProgress) * (0.28 + smoothAudio * 0.3);

          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, rRing, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rInt}, ${gInt}, ${bInt}, ${rAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Orbiting Bioluminescent Particles (Enhanced during 'thinking' and subtle in idle)
      if (!motionOff && (currentState === "thinking" || currentState === "idle")) {
        const speedMultiplier = currentState === "thinking" ? 2.5 : 0.8;
        const orbitRadius = reactiveRadius * (currentState === "thinking" ? 1.35 : 1.25);

        ctx.save();
        particlesRef.current.forEach((p) => {
          p.angle += p.speed * speedMultiplier * (delta * 60);
          const pR = orbitRadius + p.radiusOffset + Math.sin(t * 3 + p.phase) * 6;
          const px = cx + Math.cos(p.angle) * pR;
          const py = cy + Math.sin(p.angle) * (pR * 0.82); // elliptical orbit

          const particleGlow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3);
          particleGlow.addColorStop(0, `rgba(${rInt}, ${gInt}, ${bInt}, ${p.alpha * 0.9})`);
          particleGlow.addColorStop(1, `rgba(${rInt}, ${gInt}, ${bInt}, 0)`);

          ctx.fillStyle = particleGlow;
          ctx.beginPath();
          ctx.arc(px, py, p.size * 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // 4. Core Chromatic Sphere Body
      const coreGrad = ctx.createRadialGradient(
        cx - reactiveRadius * 0.28,
        cy - reactiveRadius * 0.32,
        reactiveRadius * 0.05,
        cx,
        cy,
        reactiveRadius
      );
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)"); // specular hot core
      coreGrad.addColorStop(0.2, `rgba(${rInt}, ${gInt}, ${bInt}, 0.9)`);
      coreGrad.addColorStop(0.65, `rgba(${Math.floor(rInt * 0.5)}, ${Math.floor(gInt * 0.5)}, ${Math.floor(bInt * 0.5)}, 0.85)`);
      coreGrad.addColorStop(1, `rgba(4, 6, 11, 0.95)`); // blends with void background

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, reactiveRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = `rgba(${rInt}, ${gInt}, ${bInt}, 0.75)`;
      ctx.shadowBlur = 24 + smoothAudio * 20;
      ctx.fill();
      ctx.restore();

      // 5. High-Frequency Surface Ripple Shader simulation
      if (!motionOff) {
        ctx.save();
        ctx.beginPath();
        const segments = 64;
        const waveAmp = (currentState === "listening" || currentState === "speaking")
          ? 3 + smoothAudio * 8
          : currentState === "thinking"
          ? 2.5
          : 1.2;

        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const wave = Math.sin(theta * 6 + t * 5) * Math.cos(theta * 4 - t * 3) * waveAmp;
          const rad = reactiveRadius + wave;
          const wx = cx + Math.cos(theta) * rad;
          const wy = cy + Math.sin(theta) * rad;
          if (i === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 + smoothAudio * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Loop RAF at 60fps
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
};

export default VoiceOrbCanvas;
