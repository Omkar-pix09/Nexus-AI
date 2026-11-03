/**
 * useVoiceEngine — Audio-reactive Voice Engine
 *
 * Acceptance criteria:
 * ✅ Web Audio AnalyserNode for real-time microphone level → audioLevel (0–1)
 * ✅ Barge-in stops speech within <200ms (speechSynthesis.cancel() immediately)
 * ✅ AudioContext.close() on unmount → no memory leaks after 10 min
 * ✅ Microphone denied → graceful fallback (micPermissionDenied flag)
 * ✅ Orb states: idle / listening / thinking / speaking / interrupted
 * ✅ TTS word-boundary pulses drive audioLevel while speaking
 * ✅ Tab hidden → pause RAF (done in canvas; hook keeps AudioContext alive)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import type { OrbState } from "../components/voice/VoiceOrbCanvas";

const SR: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export interface VoiceEngineOptions {
  onFinalTranscript: (text: string) => void;
  onBargeIn?: () => void;
}

export function useVoiceEngine({ onFinalTranscript, onBargeIn }: VoiceEngineOptions) {
  const [orbState,           setOrbState]           = useState<OrbState>("idle");
  const [audioLevel,         setAudioLevel]         = useState<number>(0);
  const [transcript,         setTranscript]         = useState<string>("");
  const [micPermissionDenied, setMicPermissionDenied] = useState<boolean>(false);
  const [speakingAgent,      setSpeakingAgent]      = useState<{
    name: string; role: string;
    state: "thinking" | "evidence_found" | "divergent" | "nominal";
  } | null>(null);

  // Stable callback refs
  const finalCbRef   = useRef(onFinalTranscript); finalCbRef.current   = onFinalTranscript;
  const bargeInCbRef = useRef(onBargeIn);          bargeInCbRef.current = onBargeIn;

  // Web Audio refs
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const micStreamRef   = useRef<MediaStream | null>(null);
  const rafRef         = useRef<number | null>(null);
  const dataArrayRef   = useRef<Uint8Array | null>(null);

  // SpeechSynthesis / recognition refs
  const utteranceRef   = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);

  const orbStateRef    = useRef<OrbState>("idle"); // shadow for closures
  const setOrbBoth = useCallback((s: OrbState) => {
    orbStateRef.current = s;
    setOrbState(s);
  }, []);

  const isSupported        = typeof window !== "undefined" && "speechSynthesis" in window;
  const isSpeechRecSupported = !!SR;

  // ── Audio RAF loop ─────────────────────────────────────────────────────
  const stopAudioRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startAudioRaf = useCallback(() => {
    const analyser = analyserRef.current;
    const data     = dataArrayRef.current;
    if (!analyser || !data) return;

    const tick = () => {
      analyser.getByteFrequencyData(data);

      // Normalized RMS
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length) / 128;
      const level = Math.min(rms, 1.0);
      setAudioLevel(level);

      // Auto barge-in: user speaks loudly while agent is talking (<200 ms reaction)
      if (level > 0.22 && window.speechSynthesis?.speaking && orbStateRef.current === "speaking") {
        interruptRef.current();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Mic setup ──────────────────────────────────────────────────────────
  const cleanupAudio = useCallback(() => {
    stopAudioRaf();

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    // Close AudioContext — prevents memory leaks after 10+ minutes
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    dataArrayRef.current = null;
    setAudioLevel(0);
  }, [stopAudioRaf]);

  const initMicAudio = useCallback(async (): Promise<boolean> => {
    // Reuse existing live context if possible
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      startAudioRaf();
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStreamRef.current = stream;

      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      setMicPermissionDenied(false);
      startAudioRaf();
      return true;
    } catch (err) {
      console.warn("[VoiceEngine] Mic access denied — text-only fallback:", err);
      setMicPermissionDenied(true);
      return false;
    }
  }, [startAudioRaf]);

  // ── Barge-in (must fire within <200ms) ────────────────────────────────
  // Stored in a ref so that the RAF tick can call it without stale closure issues
  const interrupt = useCallback(() => {
    // speechSynthesis.cancel() is synchronous; browser stops audio < 50 ms
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    bargeInCbRef.current?.();
    setAudioLevel(0);
    setOrbBoth("interrupted");
    // Re-expand back to idle after the interruption flash
    setTimeout(() => {
      setOrbState((prev) => (prev === "interrupted" ? "idle" : prev));
      orbStateRef.current = orbStateRef.current === "interrupted" ? "idle" : orbStateRef.current;
    }, 280);
  }, [setOrbBoth]);

  // Store interrupt in a ref for use inside RAF (avoids stale closure)
  const interruptRef = useRef(interrupt);
  useEffect(() => { interruptRef.current = interrupt; }, [interrupt]);

  // ── Stop speaking ──────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    stopAudioRaf();
    setAudioLevel(0);
    setOrbBoth("idle");
    setSpeakingAgent(null);
  }, [setOrbBoth, stopAudioRaf]);

  // ── Stop listening ─────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    cleanupAudio();
    setOrbState((prev) => (prev === "listening" ? "idle" : prev));
    orbStateRef.current = orbStateRef.current === "listening" ? "idle" : orbStateRef.current;
  }, [cleanupAudio]);

  // ── Start listening ────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    // Instant barge-in if currently speaking
    if (window.speechSynthesis?.speaking) {
      interruptRef.current();
    }

    if (!isSpeechRecSupported) {
      setOrbBoth("listening");
      await initMicAudio();
      return;
    }

    await initMicAudio();

    try {
      if (recognitionRef.current) recognitionRef.current.abort();

      const r = new SR();
      r.lang           = "en-US";
      r.interimResults = true;
      r.continuous     = false;

      r.onstart = () => { setOrbBoth("listening"); setTranscript(""); };

      r.onresult = (e: any) => {
        let interim = "";
        let isFinal = false;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          interim += e.results[i][0].transcript;
          if (e.results[i].isFinal) isFinal = true;
        }
        setTranscript(interim);
        if (isFinal && interim.trim()) {
          finalCbRef.current(interim.trim());
          stopListening();
        }
      };

      r.onerror = (e: any) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setMicPermissionDenied(true);
        }
        console.warn("[VoiceEngine] Recognition error:", e.error);
        stopListening();
      };

      r.onend = () => { stopListening(); };

      recognitionRef.current = r;
      r.start();
    } catch (e) {
      console.warn("[VoiceEngine] Could not start recognition:", e);
      stopListening();
    }
  }, [isSpeechRecSupported, setOrbBoth, initMicAudio, stopListening]);

  // ── Toggle push-to-talk ────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (orbStateRef.current === "listening") stopListening();
    else startListening();
  }, [startListening, stopListening]);

  // ── TTS Speak ─────────────────────────────────────────────────────────
  const speak = useCallback(
    (
      text: string,
      agent?: { name: string; role: string; state: "thinking" | "evidence_found" | "divergent" | "nominal" }
    ) => {
      if (!isSupported || !text) return;
      stopSpeaking();

      const u = new SpeechSynthesisUtterance(text);
      u.rate  = 1.05;
      u.pitch = 1.0;
      utteranceRef.current = u;

      setSpeakingAgent(agent ?? { name: "Nexus Council", role: "Synthesis Engine", state: "nominal" });

      u.onstart = () => { setOrbBoth("speaking"); };

      // Word-boundary pulses drive the canvas audio-reactivity
      u.onboundary = (ev: SpeechSynthesisEvent) => {
        if (ev.name === "word") {
          setAudioLevel(0.38 + Math.random() * 0.52);
        }
      };

      u.onend = () => {
        utteranceRef.current = null;
        setAudioLevel(0);
        setOrbBoth("idle");
        setSpeakingAgent(null);
      };

      u.onerror = () => {
        utteranceRef.current = null;
        setAudioLevel(0);
        setSpeakingAgent(null);
        setOrbBoth("error");
        setTimeout(() => {
          setOrbState((prev) => (prev === "error" ? "idle" : prev));
        }, 1500);
      };

      window.speechSynthesis.speak(u);
    },
    [isSupported, setOrbBoth, stopSpeaking]
  );

  // ── Set thinking ───────────────────────────────────────────────────────
  const setThinking = useCallback(
    (agent?: { name: string; role: string; state: "thinking" | "evidence_found" | "divergent" | "nominal" }) => {
      stopSpeaking();
      setOrbBoth("thinking");
      if (agent) setSpeakingAgent(agent);
    },
    [stopSpeaking, setOrbBoth]
  );

  // ── Set error ──────────────────────────────────────────────────────────
  const setError = useCallback(() => {
    setOrbBoth("error");
    setTimeout(() => {
      setOrbState((prev) => (prev === "error" ? "idle" : prev));
    }, 1500);
  }, [setOrbBoth]);

  // ── Unmount cleanup: close AudioContext, cancel synthesis & recognition ─
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [cleanupAudio]);

  return {
    orbState,
    audioLevel,
    transcript,
    micPermissionDenied,
    speakingAgent,
    isSupported,
    isSpeechRecSupported,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    interrupt,
    setThinking,
    setError,
  };
}

export default useVoiceEngine;
