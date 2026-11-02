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
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>("");
  const [micPermissionDenied, setMicPermissionDenied] = useState<boolean>(false);
  const [speakingAgent, setSpeakingAgent] = useState<{ name: string; role: string; state: "thinking" | "evidence_found" | "divergent" | "nominal" } | null>(null);

  // References
  const finalCbRef = useRef(onFinalTranscript);
  finalCbRef.current = onFinalTranscript;
  const bargeInCbRef = useRef(onBargeIn);
  bargeInCbRef.current = onBargeIn;

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const isSpeechRecSupported = !!SR;

  // Cleanup Web Audio & recognition cleanly on unmount to prevent memory leaks
  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Instant barge-in: Stops TTS speech within <200ms and switches state
  const interrupt = useCallback(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    bargeInCbRef.current?.();
    setOrbState("interrupted");
    setTimeout(() => {
      setOrbState((prev: OrbState) => (prev === "interrupted" ? "idle" : prev));
    }, 280);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setOrbState("idle");
    setSpeakingAgent(null);
  }, []);

  // Initialize Web Audio AnalyserNode for microphone frequency tracking
  const initMicrophoneAudio = async () => {
    try {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        cleanupAudio();
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const trackAudioLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Compute normalized Root Mean Square (RMS)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(avg / 128, 1.0);
        setAudioLevel(normalized);

        // Auto barge-in trigger: If user speaks loudly while agent is speaking
        if (normalized > 0.28 && window.speechSynthesis && window.speechSynthesis.speaking) {
          interrupt();
        }

        animFrameRef.current = requestAnimationFrame(trackAudioLevel);
      };

      trackAudioLevel();
      setMicPermissionDenied(false);
    } catch (err: any) {
      console.warn("[VoiceEngine] Microphone access denied or not available, falling back to manual/text mode:", err);
      setMicPermissionDenied(true);
    }
  };

  // Start Voice Listening
  const startListening = useCallback(async () => {
    // If agent is currently speaking, barge-in immediately!
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      interrupt();
    }

    if (!isSpeechRecSupported) {
      setOrbState("listening");
      return;
    }

    // Initialize microphone audio analyser for real-time orb pulses
    await initMicrophoneAudio();

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const r = new SR();
      r.lang = "en-US";
      r.interimResults = true;
      r.continuous = false;

      r.onstart = () => {
        setOrbState("listening");
        setTranscript("");
      };

      r.onresult = (e: any) => {
        let interim = "";
        let isFinal = false;

        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const res = e.results[i];
          if (res.isFinal) {
            interim += res[0].transcript;
            isFinal = true;
          } else {
            interim += res[0].transcript;
          }
        }

        setTranscript(interim);

        if (isFinal) {
          const cleanText = interim.trim();
          if (cleanText) {
            finalCbRef.current(cleanText);
          }
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

      r.onend = () => {
        stopListening();
      };

      recognitionRef.current = r;
      r.start();
    } catch (e) {
      console.warn("[VoiceEngine] Could not start speech recognition:", e);
      stopListening();
    }
  }, [isSpeechRecSupported, interrupt]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    cleanupAudio();
    setOrbState((prev: OrbState) => (prev === "listening" ? "idle" : prev));
  }, [cleanupAudio]);

  // Push-to-talk toggle
  const toggleListening = useCallback(() => {
    if (orbState === "listening") {
      stopListening();
    } else {
      startListening();
    }
  }, [orbState, startListening, stopListening]);

  // Speak TTS with rhythmic audio synthesis simulation
  const speak = useCallback(
    (
      text: string,
      agent?: { name: string; role: string; state: "thinking" | "evidence_found" | "divergent" | "nominal" }
    ) => {
      if (!isSupported || !text) return;

      stopSpeaking();

      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 1.0;
      utteranceRef.current = u;

      if (agent) {
        setSpeakingAgent(agent);
      } else {
        setSpeakingAgent({
          name: "Nexus Council",
          role: "Synthesis Engine",
          state: "nominal",
        });
      }

      u.onstart = () => {
        setOrbState("speaking");
      };

      u.onboundary = () => {
        // Generate dynamic audio level pulses on word boundaries
        setAudioLevel(0.4 + Math.random() * 0.55);
      };

      u.onend = () => {
        setOrbState("idle");
        setSpeakingAgent(null);
        setAudioLevel(0);
        utteranceRef.current = null;
      };

      u.onerror = () => {
        setOrbState("error");
        setTimeout(() => setOrbState("idle"), 1200);
        setSpeakingAgent(null);
        setAudioLevel(0);
        utteranceRef.current = null;
      };

      window.speechSynthesis.speak(u);
    },
    [isSupported, stopSpeaking]
  );

  // Set thinking state when awaiting backend reasoning
  const setThinking = useCallback(
    (agent?: { name: string; role: string; state: "thinking" | "evidence_found" | "divergent" | "nominal" }) => {
      stopSpeaking();
      setOrbState("thinking");
      if (agent) setSpeakingAgent(agent);
    },
    [stopSpeaking]
  );

  const setError = useCallback(() => {
    setOrbState("error");
    setTimeout(() => setOrbState("idle"), 1500);
  }, []);

  // Cleanup on unmount (Check AudioContext is closed, preventing memory leaks after 10+ min)
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
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
