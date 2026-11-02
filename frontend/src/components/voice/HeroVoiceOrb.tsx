import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Square,
  Send,
  Sparkles,
  Terminal,
  Volume2,
  VolumeX,
  Keyboard,
  ShieldAlert,
  Flame,
  CornerDownLeft,
} from "lucide-react";
import VoiceOrbCanvas, { OrbState } from "./VoiceOrbCanvas";
import LiveCaptions from "./LiveCaptions";
import useVoiceEngine from "../../hooks/useVoiceEngine";
import { GlassPanel } from "../ds/GlassPanel";
import { AgentAvatar } from "../ds/AgentAvatar";
import { api } from "../../lib/api";
import { useStore } from "../../lib/store";
import { useNavigate } from "react-router-dom";

// Council of Specialized Agents
export const COUNCIL_AGENTS = [
  {
    id: "synthesizer",
    name: "Dr. Elena Vance",
    role: "Bayesian Graph Architect",
    avatarUrl: "",
    state: "nominal" as const,
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
    state: "thinking" as const,
    voiceTrigger: "progress",
  },
];

interface HeroVoiceOrbProps {
  onPlanAdopted?: () => void;
  className?: string;
}

export const HeroVoiceOrb: React.FC<HeroVoiceOrbProps> = ({
  onPlanAdopted,
  className = "",
}) => {
  const navigate = useNavigate();
  const { target, refresh } = useStore();
  const [inputText, setInputText] = useState("");
  const [activeCouncilAgent, setActiveCouncilAgent] = useState(COUNCIL_AGENTS[0]);
  const [latestMessage, setLatestMessage] = useState<{
    role: "you" | "nexus";
    text: string;
    agent?: (typeof COUNCIL_AGENTS)[0] | null;
  }>({
    role: "nexus",
    text: "Command Center online. Hold Space or click the Voice Orb to issue commands or ask about career gaps.",
    agent: COUNCIL_AGENTS[3],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHoldingSpaceRef = useRef(false);

  // Command submission handler
  const handleCommand = useCallback(
    async (cmdText: string) => {
      const query = cmdText.trim();
      if (!query) return;

      // Update state to operator utterance
      setLatestMessage({
        role: "you",
        text: query,
        agent: null,
      });
      setInputText("");

      // Pick corresponding council agent depending on command content
      let selectedAgent = COUNCIL_AGENTS[3]; // Nexus Core default
      const lower = query.toLowerCase();
      if (lower.includes("simulate") || lower.includes("plan") || lower.includes("days") || lower.includes("week")) {
        selectedAgent = COUNCIL_AGENTS[0]; // Elena Vance
      } else if (lower.includes("gap") || lower.includes("graph") || lower.includes("missing")) {
        selectedAgent = COUNCIL_AGENTS[1]; // Commander Kaelen
      } else if (lower.includes("evidence") || lower.includes("why") || lower.includes("document") || lower.includes("resume")) {
        selectedAgent = COUNCIL_AGENTS[2]; // Vector Oracle
      }
      setActiveCouncilAgent(selectedAgent);

      // Set orb to thinking state with orbiting particles
      voice.setThinking(selectedAgent);

      try {
        const res = await api.command(query, target);
        const reply = res.reply || "Command analyzed and executed.";

        setLatestMessage({
          role: "nexus",
          text: reply,
          agent: selectedAgent,
        });

        // Speak the reply with TTS and audio boundary pulses
        voice.speak(reply, selectedAgent);

        if (res.intent === "progress") {
          refresh();
          onPlanAdopted?.();
        }

        if (res.navigate) {
          // Subtle delay before navigation so user hears response
          setTimeout(() => {
            navigate(res.navigate, { state: { command: res } });
          }, 1400);
        }
      } catch (e: any) {
        voice.setError();
        setLatestMessage({
          role: "nexus",
          text: `Telemetry Error: ${e.message || "Failed to process command"}`,
          agent: COUNCIL_AGENTS[1],
        });
      }
    },
    [target, refresh, onPlanAdopted, navigate]
  );

  // Initialize voice engine
  const voice = useVoiceEngine({
    onFinalTranscript: (finalText) => {
      handleCommand(finalText);
    },
    onBargeIn: () => {
      // User barged in: stop speech immediately
      console.log("[HeroVoiceOrb] User barge-in detected (<200ms interruption reaction)");
    },
  });

  // Global Spacebar Push-to-Talk listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.code === "Space" && !e.repeat && !isHoldingSpaceRef.current) {
        e.preventDefault();
        isHoldingSpaceRef.current = true;
        voice.startListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.code === "Space" && isHoldingSpaceRef.current) {
        e.preventDefault();
        isHoldingSpaceRef.current = false;
        voice.stopListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [voice]);

  // Sync real-time interim transcript into live message
  useEffect(() => {
    if (voice.orbState === "listening" && voice.transcript) {
      setLatestMessage({
        role: "you",
        text: voice.transcript,
        agent: null,
      });
    }
  }, [voice.orbState, voice.transcript]);

  // State label & color badges
  const stateMeta: Record<OrbState, { label: string; color: string }> = {
    idle: { label: "Orb Standby", color: "text-slate-400 border-white/10" },
    listening: { label: "Microphone Listening...", color: "text-sonar border-sonar/40 bg-sonar/10 animate-pulse" },
    thinking: { label: "Council Synthesizing...", color: "text-plasma border-plasma/40 bg-plasma/10 animate-pulse" },
    speaking: { label: "Council Speaking (Talk to interrupt)", color: "text-signal border-signal/40 bg-signal/10" },
    interrupted: { label: "User Barge-In Interrupted!", color: "text-alarm border-alarm/40 bg-alarm/10" },
    error: { label: "Command Error", color: "text-alarm border-alarm/40 bg-alarm/10" },
  };
  const activeMeta = stateMeta[voice.orbState] || stateMeta.idle;

  return (
    <GlassPanel
      elevation={3}
      aiActive={voice.orbState !== "idle"}
      glow={voice.orbState === "listening" ? "sonar" : voice.orbState === "thinking" ? "plasma" : voice.orbState === "interrupted" ? "alarm" : "signal"}
      className={`relative overflow-hidden p-6 sm:p-8 flex flex-col items-center justify-between min-h-[460px] ${className}`}
    >
      {/* Background Mission Control Grid & Radial Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,230,201,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* Top Telemetry Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 z-10 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-scale-xs uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-sonar" />
            Autonomous Voice Orb
          </span>
          <span className={`font-mono text-[11px] px-2 py-0.5 rounded-nexus-sm border ${activeMeta.color}`}>
            {activeMeta.label}
          </span>
        </div>

        {/* Council Agent Chips Selection */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider hidden sm:inline">
            Council Agents:
          </span>
          {COUNCIL_AGENTS.map((agent) => {
            const isSelected = activeCouncilAgent.id === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => {
                  setActiveCouncilAgent(agent);
                  voice.speak(`Synthesizer initialized. ${agent.name} standing by for ${agent.role}.`, agent);
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-nexus-sm text-xs font-mono transition border ${
                  isSelected
                    ? "bg-sonar/20 text-sonar border-sonar/50 font-bold shadow-glow-sonar"
                    : "bg-surface-2 text-slate-400 border-white/5 hover:border-white/20"
                }`}
                title={`Select ${agent.name} (${agent.role})`}
              >
                <AgentAvatar name={agent.name} size="sm" state={agent.state} />
                <span className="hidden md:inline">{agent.name.split(" ")[1] || agent.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Visual Area: Audio-Reactive Orb Canvas with Click Push-to-Talk */}
      <div className="relative my-4 flex flex-col items-center justify-center w-full z-10">
        <div
          onClick={voice.toggleListening}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && voice.toggleListening()}
          aria-label={voice.orbState === "listening" ? "Stop listening" : "Click or hold space to talk"}
          className="relative cursor-pointer group rounded-full p-2 transition-transform active:scale-95"
        >
          {/* Audio-Reactive WebGL / Optimized 2D Canvas */}
          <VoiceOrbCanvas
            state={voice.orbState}
            audioLevel={voice.audioLevel}
            className="w-64 h-64 sm:w-72 sm:h-72"
          />

          {/* Quick HUD Action Button overlayed in Orb Center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`p-3 rounded-full backdrop-blur-md border transition-all duration-fast ${
                voice.orbState === "listening"
                  ? "bg-sonar/20 border-sonar text-sonar scale-110 shadow-glow-sonar"
                  : voice.orbState === "speaking"
                  ? "bg-signal/20 border-signal text-signal animate-pulse"
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

        {/* Microphone Denied Graceful Fallback Warning */}
        {voice.micPermissionDenied && (
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-alarm bg-alarm/10 px-3 py-1.5 rounded-nexus-sm border border-alarm/30">
            <ShieldAlert size={14} />
            <span>Microphone access blocked. Use the 'Type Instead' prompt below.</span>
          </div>
        )}

        {/* Live Barge-in Prompt Notification */}
        {voice.orbState === "speaking" && (
          <div className="mt-2 flex items-center gap-2 text-xs font-mono text-signal bg-signal/10 px-3 py-1 rounded-nexus-sm border border-signal/30 animate-pulse">
            <Flame size={12} />
            <span>User Barge-In enabled — Speak or click orb to interrupt immediately</span>
            <button
              type="button"
              onClick={voice.interrupt}
              className="ml-2 underline text-white hover:text-signal"
            >
              Interrupt
            </button>
          </div>
        )}
      </div>

      {/* Live Captions Display Area */}
      <div className="w-full max-w-2xl z-10 space-y-3">
        <LiveCaptions
          text={latestMessage.text}
          role={latestMessage.role}
          agent={latestMessage.agent || activeCouncilAgent}
          isStreaming={voice.orbState === "speaking" || voice.orbState === "listening"}
        />

        {/* Type Instead Always-Visible Input with Push-to-Talk Controls */}
        <div className="flex items-center gap-2 bg-surface-2/95 border border-white/15 p-2 rounded-nexus-md shadow-2xl backdrop-blur-md">
          <div className="flex items-center pl-2 text-slate-400">
            <Keyboard size={16} />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCommand(inputText)}
            placeholder="Type a command (e.g. 'Simulate DSA plan for 45 days', 'Show skill gaps')..."
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

          <div className="h-5 w-px bg-white/10" />

          {/* Quick Spacebar / Push-to-Talk Indicator */}
          <button
            type="button"
            onClick={voice.toggleListening}
            className={`btn text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-nexus-sm ${
              voice.orbState === "listening" ? "!bg-sonar !text-surface-0 shadow-glow-sonar" : ""
            }`}
            title="Press Space or Click to speak"
            aria-label="Toggle voice listening"
          >
            {voice.orbState === "listening" ? <MicOff size={14} /> : <Mic size={14} />}
            <span className="hidden sm:inline font-mono">
              {voice.orbState === "listening" ? "Listening..." : "Space: Talk"}
            </span>
          </button>

          {voice.orbState === "speaking" && (
            <button
              type="button"
              onClick={voice.stopSpeaking}
              className="btn-ghost text-xs text-signal p-2"
              title="Stop speaking"
              aria-label="Mute assistant audio"
            >
              <Square size={13} />
            </button>
          )}
        </div>

        {/* Helpful Voice Command Suggestions */}
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-1 px-1">
          <span className="flex items-center gap-1">
            <Terminal size={12} className="text-sonar" />
            Try: <button type="button" onClick={() => handleCommand("Should I focus on DSA or AI in the next 45 days?")} className="text-slate-300 hover:text-sonar underline ml-1">“DSA vs AI 45-day simulation”</button>
          </span>
          <span className="hidden md:inline text-slate-500">
            Push-to-talk: Hold <kbd className="px-1 py-0.5 rounded bg-surface-1 border border-white/10 text-slate-300">Space</kbd>
          </span>
        </div>
      </div>
    </GlassPanel>
  );
};

export default HeroVoiceOrb;
