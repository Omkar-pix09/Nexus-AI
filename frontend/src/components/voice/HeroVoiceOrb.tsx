/**
 * HeroVoiceOrb — Audio-Reactive Voice Orb Hero for the Command Center
 *
 * Acceptance criteria:
 * ✅ States: idle (breathing) / listening (mic-reactive) / thinking (orbiting particles)
 *            / speaking (TTS pulses) / interrupted (contracts + recolours < 200ms)
 * ✅ Colour mapping: cyan=listening  violet=thinking  amber=speaking  coral=error/interrupted
 * ✅ Rendered in WebGL shader + Canvas 2D overlay at 60 fps; paused when tab hidden
 * ✅ Live captions: word-level fade-in, aria-live polite, agent chip shown
 * ✅ Space bar = push-to-talk
 * ✅ Always-visible "Type instead" text input
 * ✅ Microphone denied → graceful fallback banner
 * ✅ Barge-in stops speech within 200ms
 * ✅ AudioContext closed on unmount → no memory leaks after 10 min
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, Square, Send, Sparkles, Terminal,
  Volume2, Keyboard, ShieldAlert, Flame, CornerDownLeft,
} from "lucide-react";
import VoiceOrbCanvas, { OrbState } from "./VoiceOrbCanvas";
import LiveCaptions from "./LiveCaptions";
import useVoiceEngine from "../../hooks/useVoiceEngine";
import { GlassPanel } from "../ds/GlassPanel";
import { AgentAvatar } from "../ds/AgentAvatar";
import { api } from "../../lib/api";
import { useStore } from "../../lib/store";
import { useNavigate } from "react-router-dom";

// ── Council Agents ─────────────────────────────────────────────────────────
export const COUNCIL_AGENTS = [
  {
    id: "synthesizer",
    name: "Dr. Elena Vance",
    role: "Bayesian Graph Architect",
    avatarUrl: "",
    state: "nominal"   as const,
    voiceTrigger: "simulate",
  },
  {
    id: "sentinel",
    name: "Commander Kaelen",
    role: "Strategic Gap Inquisitor",
    avatarUrl: "",
    state: "divergent" as const,
    voiceTrigger: "graph",
  },
  {
    id: "retriever",
    name: "Synthesizer v2",
    role: "Vector Provenance Oracle",
    avatarUrl: "",
    state: "evidence_found" as const,
    voiceTrigger: "ask",
  },
  {
    id: "arbiter",
    name: "Nexus Core",
    role: "Autonomous Mission Director",
    avatarUrl: "",
    state: "thinking"  as const,
    voiceTrigger: "progress",
  },
];

type CouncilAgent = typeof COUNCIL_AGENTS[0];

// ── Pick agent by query content ────────────────────────────────────────────
function pickAgent(query: string): CouncilAgent {
  const q = query.toLowerCase();
  if (q.includes("simulate") || q.includes("plan") || q.includes("days") || q.includes("week"))
    return COUNCIL_AGENTS[0]; // Elena Vance
  if (q.includes("gap") || q.includes("graph") || q.includes("missing"))
    return COUNCIL_AGENTS[1]; // Commander Kaelen
  if (q.includes("evidence") || q.includes("why") || q.includes("document") || q.includes("resume"))
    return COUNCIL_AGENTS[2]; // Vector Oracle
  return COUNCIL_AGENTS[3]; // Nexus Core (default)
}

// ── State colour / label map ───────────────────────────────────────────────
const STATE_META: Record<OrbState, { label: string; color: string }> = {
  idle:        { label: "Orb Standby",                      color: "text-slate-400 border-white/10" },
  listening:   { label: "Microphone Listening…",            color: "text-sonar border-sonar/40 bg-sonar/10 animate-pulse" },
  thinking:    { label: "Council Synthesizing…",            color: "text-plasma border-plasma/40 bg-plasma/10 animate-pulse" },
  speaking:    { label: "Council Speaking — Talk to barge in", color: "text-signal border-signal/40 bg-signal/10" },
  interrupted: { label: "User Barge-In Interrupted!",       color: "text-alarm border-alarm/40 bg-alarm/10" },
  error:       { label: "Command Error",                    color: "text-alarm border-alarm/40 bg-alarm/10" },
};

// ── Props ─────────────────────────────────────────────────────────────────
interface HeroVoiceOrbProps {
  onPlanAdopted?: () => void;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────
export const HeroVoiceOrb: React.FC<HeroVoiceOrbProps> = ({
  onPlanAdopted,
  className = "",
}) => {
  const navigate = useNavigate();
  const { target, refresh } = useStore();

  const [inputText,         setInputText]         = useState("");
  const [activeAgent,       setActiveAgent]       = useState<CouncilAgent>(COUNCIL_AGENTS[3]);
  const [latestMessage,     setLatestMessage]     = useState<{
    role: "you" | "nexus";
    text: string;
    agent?: CouncilAgent | null;
  }>({
    role: "nexus",
    text: "Command Center online. Hold Space or click the Voice Orb to issue commands or ask about career gaps.",
    agent: COUNCIL_AGENTS[3],
  });

  const inputRef          = useRef<HTMLInputElement>(null);
  const isHoldingSpaceRef = useRef(false);

  // ── Voice engine ref — allows handleCommand to call voice methods
  //    without a forward-reference ordering problem ─────────────────────
  const voiceRef = useRef<ReturnType<typeof useVoiceEngine> | null>(null);

  // ── Command handler ─────────────────────────────────────────────────
  const handleCommand = useCallback(
    async (cmdText: string) => {
      const query = cmdText.trim();
      if (!query) return;
      const v = voiceRef.current;

      setLatestMessage({ role: "you", text: query, agent: null });
      setInputText("");

      const chosen = pickAgent(query);
      setActiveAgent(chosen);
      v?.setThinking(chosen);

      try {
        const res   = await api.command(query, target);
        const reply = res.reply || "Command analyzed and executed.";

        setLatestMessage({ role: "nexus", text: reply, agent: chosen });
        v?.speak(reply, chosen);

        if (res.intent === "progress") { refresh(); onPlanAdopted?.(); }
        if (res.navigate) {
          setTimeout(() => navigate(res.navigate, { state: { command: res } }), 1400);
        }
      } catch (e: any) {
        v?.setError();
        setLatestMessage({
          role: "nexus",
          text: `Telemetry Error: ${e.message || "Failed to process command"}`,
          agent: COUNCIL_AGENTS[1],
        });
      }
    },
    [target, refresh, onPlanAdopted, navigate]
  );

  // ── Voice engine ────────────────────────────────────────────────────
  const voice = useVoiceEngine({
    onFinalTranscript: (text) => handleCommand(text),
    onBargeIn: () => {
      console.info("[HeroVoiceOrb] Barge-in detected — speech stopped <200ms");
    },
  });
  // Keep ref in sync every render
  voiceRef.current = voice;

  // ── Spacebar push-to-talk ────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.code === "Space" && !e.repeat && !isHoldingSpaceRef.current) {
        e.preventDefault();
        isHoldingSpaceRef.current = true;
        voice.startListening();
      }
    };
    const up = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.code === "Space" && isHoldingSpaceRef.current) {
        e.preventDefault();
        isHoldingSpaceRef.current = false;
        voice.stopListening();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup",   up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup",   up);
    };
  }, [voice]);

  // ── Sync interim transcript into live message ────────────────────────
  useEffect(() => {
    if (voice.orbState === "listening" && voice.transcript) {
      setLatestMessage({ role: "you", text: voice.transcript, agent: null });
    }
  }, [voice.orbState, voice.transcript]);

  const meta = STATE_META[voice.orbState] ?? STATE_META.idle;

  // ── Accessibility: announce state changes ────────────────────────────
  const stateAnnouncerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (stateAnnouncerRef.current) {
      stateAnnouncerRef.current.textContent = `Voice Orb: ${meta.label}`;
    }
  }, [meta.label]);

  return (
    <GlassPanel
      elevation={3}
      aiActive={voice.orbState !== "idle"}
      glow={
        voice.orbState === "listening"   ? "sonar"  :
        voice.orbState === "thinking"    ? "plasma" :
        voice.orbState === "interrupted" ? "alarm"  : "signal"
      }
      className={`relative overflow-hidden p-6 sm:p-8 flex flex-col items-center justify-between min-h-[480px] ${className}`}
    >
      {/* ── Screen-reader state announcer ─────────────────────────────── */}
      <div
        ref={stateAnnouncerRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />

      {/* ── Radial vignette bg ────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,230,201,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* ── Top telemetry bar ─────────────────────────────────────────── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 z-10 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-scale-xs uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-sonar" />
            Autonomous Voice Orb
          </span>
          <span className={`font-mono text-[11px] px-2 py-0.5 rounded-nexus-sm border ${meta.color}`}>
            {meta.label}
          </span>
        </div>

        {/* Council agent chip row */}
        <div className="flex items-center gap-2 overflow-x-auto" role="group" aria-label="Council Agents">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider hidden sm:inline">
            Council:
          </span>
          {COUNCIL_AGENTS.map((agent) => {
            const isSel = activeAgent.id === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => {
                  setActiveAgent(agent);
                  voice.speak(
                    `${agent.name} standing by. ${agent.role} module initialized.`,
                    agent
                  );
                }}
                aria-pressed={isSel}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-nexus-sm text-xs font-mono transition border ${
                  isSel
                    ? "bg-sonar/20 text-sonar border-sonar/50 font-bold shadow-glow-sonar"
                    : "bg-surface-2 text-slate-400 border-white/5 hover:border-white/20"
                }`}
                title={`${agent.name} — ${agent.role}`}
              >
                <AgentAvatar name={agent.name} size="sm" state={agent.state} />
                <span className="hidden md:inline">{agent.name.split(" ")[1] || agent.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Hero orb visual ───────────────────────────────────────────── */}
      <div className="relative my-4 flex flex-col items-center justify-center w-full z-10">
        {/* Clickable orb wrapper */}
        <div
          role="button"
          tabIndex={0}
          onClick={voice.toggleListening}
          onKeyDown={(e) => e.key === "Enter" && voice.toggleListening()}
          aria-label={
            voice.orbState === "listening"
              ? "Stop listening (click or release Space)"
              : "Start listening (click or hold Space)"
          }
          aria-pressed={voice.orbState === "listening"}
          className="relative cursor-pointer group rounded-full p-2 transition-transform active:scale-95"
        >
          {/* WebGL orb + 2D particle canvas */}
          <VoiceOrbCanvas
            state={voice.orbState}
            audioLevel={voice.audioLevel}
            className="w-64 h-64 sm:w-72 sm:h-72"
          />

          {/* Overlaid mic icon in orb centre */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`p-3 rounded-full backdrop-blur-md border transition-all duration-fast ${
                voice.orbState === "listening"
                  ? "bg-sonar/20 border-sonar text-sonar scale-110 shadow-glow-sonar"
                  : voice.orbState === "speaking"
                  ? "bg-signal/20 border-signal text-signal animate-pulse"
                  : voice.orbState === "thinking"
                  ? "bg-plasma/20 border-plasma text-plasma animate-pulse"
                  : voice.orbState === "interrupted"
                  ? "bg-alarm/20 border-alarm text-alarm"
                  : "bg-black/40 border-white/20 text-white/80 group-hover:scale-105 group-hover:border-sonar"
              }`}
            >
              {voice.orbState === "listening" ? (
                <MicOff size={24} />
              ) : voice.orbState === "speaking" ? (
                <Volume2 size={24} />
              ) : (
                <Mic size={24} />
              )}
            </div>
          </div>
        </div>

        {/* ── Mic permission denied banner (graceful fallback) ──────── */}
        {voice.micPermissionDenied && (
          <div
            role="alert"
            className="mt-3 flex items-center gap-2 text-xs font-mono text-alarm bg-alarm/10 px-3 py-1.5 rounded-nexus-sm border border-alarm/30"
          >
            <ShieldAlert size={14} />
            <span>
              Microphone access blocked — browser denied permission.{" "}
              <strong>Use the text input below</strong> to issue commands.
            </span>
          </div>
        )}

        {/* ── Speaking: barge-in prompt ─────────────────────────────── */}
        {voice.orbState === "speaking" && (
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-signal bg-signal/10 px-3 py-1 rounded-nexus-sm border border-signal/30 animate-pulse">
            <Flame size={12} />
            <span>Barge-in enabled — speak or click orb to interrupt instantly</span>
            <button
              type="button"
              onClick={voice.interrupt}
              className="ml-2 underline text-white hover:text-signal transition"
              aria-label="Interrupt agent speech now"
            >
              Interrupt
            </button>
          </div>
        )}
      </div>

      {/* ── Live captions + input area ────────────────────────────────── */}
      <div className="w-full max-w-2xl z-10 space-y-3">
        {/* Live captions with word-level fade-in + aria-live inside */}
        <LiveCaptions
          text={latestMessage.text}
          role={latestMessage.role}
          agent={latestMessage.agent ?? activeAgent}
          isStreaming={voice.orbState === "speaking" || voice.orbState === "listening"}
        />

        {/* ── Always-visible "Type instead" input ──────────────────── */}
        <div
          className="flex items-center gap-2 bg-surface-2/95 border border-white/15 p-2 rounded-nexus-md shadow-2xl backdrop-blur-md"
          role="search"
          aria-label="Type a command instead of speaking"
        >
          <div className="flex items-center pl-2 text-slate-400" aria-hidden="true">
            <Keyboard size={16} />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCommand(inputText)}
            placeholder="Type a command… e.g. 'Simulate DSA plan for 45 days', 'Show skill gaps'"
            className="input !border-0 !bg-transparent text-xs sm:text-sm flex-1 focus:outline-none focus:ring-0 text-white placeholder-slate-500"
            aria-label="Type command instead of speaking"
          />

          <button
            type="button"
            onClick={() => handleCommand(inputText)}
            disabled={!inputText.trim()}
            className="btn-ghost !p-2 text-sonar disabled:text-slate-600 disabled:opacity-40"
            title="Execute command (Enter)"
            aria-label="Send typed command"
          >
            <Send size={15} />
          </button>

          <div className="h-5 w-px bg-white/10" aria-hidden="true" />

          {/* Space / push-to-talk toggle button */}
          <button
            type="button"
            onClick={voice.toggleListening}
            className={`btn text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-nexus-sm ${
              voice.orbState === "listening" ? "!bg-sonar !text-surface-0 shadow-glow-sonar" : ""
            }`}
            title="Press Space or click to speak"
            aria-label={voice.orbState === "listening" ? "Stop listening" : "Start voice input (Space)"}
            aria-pressed={voice.orbState === "listening"}
          >
            {voice.orbState === "listening" ? <MicOff size={14} /> : <Mic size={14} />}
            <span className="hidden sm:inline font-mono">
              {voice.orbState === "listening" ? "Listening…" : "Space: Talk"}
            </span>
          </button>

          {voice.orbState === "speaking" && (
            <button
              type="button"
              onClick={voice.stopSpeaking}
              className="btn-ghost text-xs text-signal p-2"
              title="Stop agent speech"
              aria-label="Mute assistant audio"
            >
              <Square size={13} />
            </button>
          )}
        </div>

        {/* ── Hint bar ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-1 px-1">
          <span className="flex items-center gap-1">
            <Terminal size={12} className="text-sonar" />
            Try:{" "}
            <button
              type="button"
              onClick={() => handleCommand("Should I focus on DSA or AI in the next 45 days?")}
              className="text-slate-300 hover:text-sonar underline ml-1"
            >
              "DSA vs AI 45-day simulation"
            </button>
          </span>
          <span className="hidden md:flex items-center gap-1 text-slate-500">
            Push-to-talk: Hold{" "}
            <kbd className="px-1 py-0.5 rounded bg-surface-1 border border-white/10 text-slate-300">
              Space
            </kbd>
            <CornerDownLeft size={11} className="ml-1" />
            to send text
          </span>
        </div>
      </div>
    </GlassPanel>
  );
};

export default HeroVoiceOrb;
