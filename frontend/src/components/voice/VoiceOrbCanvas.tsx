import React, { useEffect, useRef, useCallback } from "react";

export type OrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error";

interface VoiceOrbCanvasProps {
  state: OrbState;
  /** 0.0–1.0 from Web Audio AnalyserNode or TTS boundary pulses */
  audioLevel: number;
  reducedMotion?: boolean;
  className?: string;
}

// ─── Colour Palette ────────────────────────────────────────────────────────
// idle      : teal bioluminescent
// listening : cyan  (#22e6c9)
// thinking  : violet (#8b5cf6)
// speaking  : amber  (#fbbf24)
// error / interrupted : coral (#fb7185)
const STATE_COLORS: Record<OrbState, [number, number, number]> = {
  idle:        [20,  184, 166],
  listening:   [34,  230, 201],
  thinking:    [139, 92,  246],
  speaking:    [251, 191, 36 ],
  interrupted: [251, 113, 133],
  error:       [251, 113, 133],
};

// ─── State ID mapping (matches GLSL u_state) ──────────────────────────────
const STATE_ID: Record<OrbState, number> = {
  idle: 0, listening: 1, thinking: 2, speaking: 3, interrupted: 4, error: 4,
};

// ─── WebGL Shader Sources ──────────────────────────────────────────────────
const VERT_SRC = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_SRC = `
  precision highp float;
  uniform vec2  u_res;
  uniform float u_time;
  uniform vec3  u_color;
  uniform float u_audio;
  uniform float u_contraction;
  uniform float u_state;

  #define PI 3.14159265358979

  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p); vec2 f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
  }
  float fbm(vec2 p) {
    float v=0.0; float a=0.5;
    for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}
    return v;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy*2.0 - u_res) / min(u_res.x, u_res.y);
    float dist = length(uv);
    float t = u_time;
    float st = u_state;

    float baseR = 0.55 * u_contraction;
    float reactR = baseR;

    if (st < 0.5) {
      // idle: slow breathing
      reactR = baseR * (1.0 + 0.04*sin(t*2.2));
    } else if (st < 1.5) {
      // listening: expands with mic
      reactR = baseR * (1.0 + 0.45*u_audio);
    } else if (st < 2.5) {
      // thinking: tight oscillation
      reactR = baseR*0.94 + 0.02*sin(t*6.5);
    } else if (st < 3.5) {
      // speaking: rhythmic pulse
      reactR = baseR*(1.0+0.3*u_audio) + 0.04*sin(t*8.0)*(0.4+u_audio*0.6);
    } else {
      // interrupted/error: contracted
      reactR = baseR * 0.85;
    }

    // Surface ripple amplitude
    float wAmp = 0.004;
    if (st < 1.5 || (st > 2.5 && st < 3.5)) wAmp = 0.012 + u_audio*0.055;
    else if (st > 1.5 && st < 2.5)            wAmp = 0.008;

    float theta = atan(uv.y, uv.x);
    float ripple = wAmp * sin(theta*6.0+t*5.0) * cos(theta*4.0-t*3.0);

    // Organic FBM warp
    float surfNoise = fbm(uv*3.5 + t*0.18) * 0.06;
    float warpedR = reactR + surfNoise;
    float warpedDist = dist - ripple;

    vec3 col = vec3(0.0);
    float alpha = 0.0;

    // Outer aura glow
    float auraR = reactR * (1.85 + u_audio*0.55);
    float aura = smoothstep(auraR, auraR*0.3, warpedDist) * 0.35;
    col += u_color * aura;
    alpha = max(alpha, aura*0.9);

    // Emission rings (listening / speaking)
    if (st < 1.5 || (st > 2.5 && st < 3.5)) {
      for (int k=1; k<=3; k++) {
        float fk = float(k);
        float rp = mod(t*0.8 + fk/3.0, 1.0);
        float rR = reactR + rp*(0.45*(0.8+u_audio));
        float ra = (1.0-rp)*(0.28+u_audio*0.3);
        float ring = smoothstep(0.008, 0.0, abs(dist-rR));
        col += u_color * ring * ra;
        alpha = max(alpha, ring*ra);
      }
    }

    // Core sphere body
    float bodyEdge = smoothstep(warpedR, warpedR*0.92, warpedDist);
    if (bodyEdge > 0.0) {
      float radial = length(uv - vec2(-0.18, 0.22));
      vec3 specular = vec3(1.0);
      vec3 mid = u_color;
      vec3 dark = u_color*0.15 + vec3(0.016,0.024,0.043);
      float t0 = smoothstep(0.0,  0.18, radial);
      float t1 = smoothstep(0.18, warpedR, radial);
      vec3 bodyCol = mix(specular, mid, t0);
          bodyCol  = mix(bodyCol,  dark, t1);
      float shimmer = 0.04*sin(theta*12.0+t*4.0);
      bodyCol += shimmer * u_color;
      col   = mix(col,   bodyCol,  bodyEdge);
      alpha = mix(alpha, 0.93,     bodyEdge);
    }

    // Rim fresnel
    float rim = smoothstep(warpedR*0.78, warpedR, warpedDist) *
                (1.0 - smoothstep(warpedR*0.99, warpedR*1.06, warpedDist));
    col  += u_color * rim * (0.6 + u_audio*0.5);
    alpha = max(alpha, rim*0.7);

    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── Particle definition ──────────────────────────────────────────────────
interface Particle {
  angle: number; radiusOffset: number; speed: number;
  size: number;  alpha: number;         phase: number;
}

function makeParticles(n = 40): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    angle:        (i / n) * Math.PI * 2,
    radiusOffset: (Math.random() - 0.5) * 28,
    speed:        0.012 + Math.random() * 0.022,
    size:         1.4   + Math.random() * 2.4,
    alpha:        0.28  + Math.random() * 0.65,
    phase:        Math.random() * Math.PI * 2,
  }));
}

// ─── WebGL helpers ────────────────────────────────────────────────────────
function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) ?? "shader error");
  return s;
}

function linkProgram(gl: WebGLRenderingContext): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(prog) ?? "link error");
  return prog;
}

// ─── Component ────────────────────────────────────────────────────────────
export const VoiceOrbCanvas: React.FC<VoiceOrbCanvasProps> = ({
  state,
  audioLevel,
  reducedMotion = false,
  className = "",
}) => {
  const glRef   = useRef<HTMLCanvasElement>(null);
  const partRef = useRef<HTMLCanvasElement>(null);
  const stateRef     = useRef(state);
  const audioRef     = useRef(audioLevel);
  const reducedRef   = useRef(reducedMotion);
  const contrRef     = useRef(1.0);
  const tgtContrRef  = useRef(1.0);
  const particlesRef = useRef<Particle[]>(makeParticles(40));

  stateRef.current   = state;
  audioRef.current   = audioLevel;
  reducedRef.current = reducedMotion;

  // Instant contraction on barge-in
  useEffect(() => {
    if (state === "interrupted") {
      tgtContrRef.current = 0.68;
      const tid = setTimeout(() => { tgtContrRef.current = 1.0; }, 260);
      return () => clearTimeout(tid);
    } else {
      tgtContrRef.current = 1.0;
    }
  }, [state]);

  // ── WebGL pass ────────────────────────────────────────────────────────
  const runWebGL = useCallback(() => {
    const canvas = glRef.current;
    if (!canvas) return () => {};

    let gl: WebGLRenderingContext | null = null;
    let prog: WebGLProgram | null = null;
    let animId = 0;
    let isHidden = false;
    const t0 = performance.now();
    let lastT = t0;
    let [curR, curG, curB] = STATE_COLORS[stateRef.current];
    let smoothAudio = 0;

    try {
      gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false })!;
      if (!gl) return () => {};
      prog = linkProgram(gl);
    } catch { return () => {}; }

    const p = prog!;
    gl.useProgram(p);

    const quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(p, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes   = gl.getUniformLocation(p, "u_res");
    const uTime  = gl.getUniformLocation(p, "u_time");
    const uColor = gl.getUniformLocation(p, "u_color");
    const uAudio = gl.getUniformLocation(p, "u_audio");
    const uContr = gl.getUniformLocation(p, "u_contraction");
    const uState = gl.getUniformLocation(p, "u_state");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = r.width  * dpr;
      canvas.height = r.height * dpr;
      gl!.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onVis = () => {
      isHidden = document.hidden;
      if (!isHidden) { lastT = performance.now(); animId = requestAnimationFrame(render); }
    };
    document.addEventListener("visibilitychange", onVis);

    const render = (now: number) => {
      if (isHidden || !gl) return;
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;

      const cs = stateRef.current;
      const [tR, tG, tB] = STATE_COLORS[cs];
      const k = cs === "interrupted" ? 0.5 : Math.min(dt * 8, 1);
      curR += (tR - curR) * k; curG += (tG - curG) * k; curB += (tB - curB) * k;

      contrRef.current += (tgtContrRef.current - contrRef.current) * Math.min(dt * 14, 1);
      smoothAudio += (audioRef.current - smoothAudio) * Math.min(dt * 12, 1);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform2f(uRes,   canvas.width, canvas.height);
      gl.uniform1f(uTime,  (now - t0) / 1000);
      gl.uniform3f(uColor, curR / 255, curG / 255, curB / 255);
      gl.uniform1f(uAudio,  smoothAudio);
      gl.uniform1f(uContr,  contrRef.current);
      gl.uniform1f(uState,  STATE_ID[cs]);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      gl?.deleteProgram(p);
      gl?.deleteBuffer(quad);
    };
  }, []);

  // ── Canvas-2D particle overlay (thinking + idle orbit) ────────────────
  const runParticles = useCallback(() => {
    const canvas = partRef.current;
    if (!canvas) return () => {};
    const ctx = canvas.getContext("2d", { alpha: true })!;
    if (!ctx) return () => {};

    let animId = 0;
    let isHidden = false;
    let lastT = performance.now();
    let elapsed = 0;
    let [curR, curG, curB] = STATE_COLORS[stateRef.current];

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = r.width  * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onVis = () => {
      isHidden = document.hidden;
      if (!isHidden) { lastT = performance.now(); animId = requestAnimationFrame(render); }
    };
    document.addEventListener("visibilitychange", onVis);

    const render = (now: number) => {
      if (isHidden) return;
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;
      elapsed += dt;

      const cs = stateRef.current;
      const [tR, tG, tB] = STATE_COLORS[cs];
      const k = cs === "interrupted" ? 0.5 : Math.min(dt * 8, 1);
      curR += (tR - curR) * k; curG += (tG - curG) * k; curB += (tB - curB) * k;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      if (!reducedRef.current && (cs === "thinking" || cs === "idle")) {
        const speedMul = cs === "thinking" ? 2.6 : 0.75;
        const baseR    = Math.min(w, h) * 0.28 * contrRef.current;
        const orbitR   = baseR * (cs === "thinking" ? 1.36 : 1.26);
        const rI = Math.round(curR), gI = Math.round(curG), bI = Math.round(curB);

        particlesRef.current.forEach((p) => {
          p.angle += p.speed * speedMul * dt * 60;
          const pr = orbitR + p.radiusOffset + Math.sin(elapsed * 3 + p.phase) * 7;
          const px = w / 2 + Math.cos(p.angle) * pr;
          const py = h / 2 + Math.sin(p.angle) * (pr * 0.82);

          const grd = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3.5);
          grd.addColorStop(0, `rgba(${rI},${gI},${bI},${p.alpha * 0.88})`);
          grd.addColorStop(1, `rgba(${rI},${gI},${bI},0)`);
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(px, py, p.size * 3, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = `rgba(255,255,255,${p.alpha * 0.9})`;
          ctx.beginPath(); ctx.arc(px, py, p.size * 0.75, 0, Math.PI * 2); ctx.fill();
        });
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const c1 = runWebGL();
    const c2 = runParticles();
    return () => { c1(); c2(); };
  }, [runWebGL, runParticles]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* WebGL shader — orb body, aura, rings */}
      <canvas
        ref={glRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />
      {/* Canvas 2D — orbiting particles (thinking / idle) */}
      <canvas
        ref={partRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
};

export default VoiceOrbCanvas;
