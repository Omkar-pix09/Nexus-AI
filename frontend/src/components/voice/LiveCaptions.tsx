import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentAvatar } from "../ds/AgentAvatar";
import { Sparkles, Terminal, Volume2 } from "lucide-react";

export interface LiveCaptionWord {
  id: string;
  word: string;
  index: number;
}

interface LiveCaptionsProps {
  text: string;
  role: "you" | "nexus";
  agent?: {
    name: string;
    role: string;
    state: "thinking" | "evidence_found" | "divergent" | "nominal";
  } | null;
  isStreaming?: boolean;
  className?: string;
}

export const LiveCaptions: React.FC<LiveCaptionsProps> = ({
  text,
  role,
  agent,
  isStreaming = false,
  className = "",
}) => {
  // Break text into words for staggered fade-in
  const words = useMemo<LiveCaptionWord[]>(() => {
    if (!text.trim()) return [];
    return text.split(/\s+/).map((w, idx) => ({
      id: `${idx}-${w}`,
      word: w,
      index: idx,
    }));
  }, [text]);

  if (!text.trim()) {
    return (
      <div className={`flex items-center justify-center p-3 text-slate-500 font-mono text-xs ${className}`}>
        <span className="flex items-center gap-2">
          <Terminal size={14} className="text-slate-600" />
          Press <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-white/10 text-slate-300">Space</kbd> to talk or type below...
        </span>
      </div>
    );
  }

  const isUser = role === "you";

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`relative p-4 rounded-nexus-md border transition-all duration-fast ${
        isUser
          ? "bg-sonar/10 border-sonar/30 text-white"
          : "bg-surface-2/90 border-white/15 text-slate-100 shadow-lg backdrop-blur-md"
      } ${className}`}
    >
      {/* Speaker Header with Council Agent Chip */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          {isUser ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sonar" />
              <span className="font-mono text-scale-xs font-bold uppercase tracking-wider text-sonar">
                You (Operator)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AgentAvatar
                name={agent?.name || "Nexus Council"}
                role={agent?.role || "Mission AI Core"}
                state={agent?.state || "nominal"}
                size="sm"
              />
              <div className="flex flex-col">
                <span className="font-display text-scale-xs font-bold text-white flex items-center gap-1">
                  {agent?.name || "Nexus Council"}
                  <Sparkles size={11} className="text-sonar" />
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {agent?.role || "Autonomous Synthesis Agent"}
                </span>
              </div>
            </div>
          )}
        </div>

        <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
          {isStreaming ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-sonar animate-ping" />
              Live Captions
            </>
          ) : (
            <>
              <Volume2 size={12} className="text-signal" />
              Transcript
            </>
          )}
        </span>
      </div>

      {/* Word-level animated fade-in */}
      <div className="font-sans text-sm sm:text-base leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1">
        <AnimatePresence mode="popLayout">
          {words.map((item) => (
            <motion.span
              key={item.id}
              initial={{ opacity: 0, y: 3, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: 0.18,
                ease: "easeOut",
              }}
              className="inline-block"
            >
              {item.word}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LiveCaptions;
