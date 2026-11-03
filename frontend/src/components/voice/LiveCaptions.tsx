/**
 * LiveCaptions — word-level fade-in with aria-live="polite"
 *
 * Acceptance criteria:
 * ✅ Word-level staggered fade-in (each word enters independently)
 * ✅ aria-live="polite" for screen-reader accessibility
 * ✅ Shows which council agent is speaking as a small avatar chip
 * ✅ Streaming indicator dot when isStreaming=true
 */
import React, { useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentAvatar } from "../ds/AgentAvatar";
import { Sparkles, Terminal, Volume2 } from "lucide-react";

export interface LiveCaptionsAgent {
  name: string;
  role: string;
  state: "thinking" | "evidence_found" | "divergent" | "nominal";
}

interface LiveCaptionsProps {
  text: string;
  role: "you" | "nexus";
  agent?: LiveCaptionsAgent | null;
  isStreaming?: boolean;
  className?: string;
}

/**
 * Each word gets a unique, stable key so AnimatePresence can track additions
 * without re-animating words that are already visible.
 * We prefix with the text's hash to force re-animation on full text change.
 */
function buildWordKeys(text: string): { key: string; word: string }[] {
  const words = text.trim().split(/\s+/);
  return words.map((w, i) => ({ key: `${i}-${w}`, word: w }));
}

export const LiveCaptions: React.FC<LiveCaptionsProps> = ({
  text,
  role,
  agent,
  isStreaming = false,
  className = "",
}) => {
  const wordItems = useMemo(() => (text.trim() ? buildWordKeys(text) : []), [text]);
  const isUser    = role === "you";

  // Announce full text to screen readers whenever it changes
  const ariaRef = useRef<HTMLDivElement>(null);

  // Empty state
  if (!text.trim()) {
    return (
      <div className={`flex items-center justify-center p-3 text-slate-500 font-mono text-xs ${className}`}>
        <span className="flex items-center gap-2">
          <Terminal size={14} className="text-slate-600" />
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-white/10 text-slate-300">
            Space
          </kbd>{" "}
          to talk or type below…
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative p-4 rounded-nexus-md border transition-all duration-fast ${
        isUser
          ? "bg-sonar/10 border-sonar/30 text-white"
          : "bg-surface-2/90 border-white/15 text-slate-100 shadow-lg backdrop-blur-md"
      } ${className}`}
    >
      {/* ── Hidden aria-live region for screen readers ─────────────────── */}
      <div
        ref={ariaRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {text}
      </div>

      {/* ── Speaker header ─────────────────────────────────────────────── */}
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
            // ── Agent avatar chip ───────────────────────────────────────
            <div className="flex items-center gap-2">
              <AgentAvatar
                name={agent?.name || "Nexus Council"}
                role={agent?.role  || "Mission AI Core"}
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

        {/* Streaming / transcript indicator */}
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

      {/* ── Word-level staggered fade-in ──────────────────────────────── */}
      {/*
        aria-hidden on this visual layer because the sr-only div above
        handles the accessible announcement.
      */}
      <div
        aria-hidden="true"
        className="font-sans text-sm sm:text-base leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {wordItems.map((item, idx) => (
            <motion.span
              key={item.key}
              initial={{ opacity: 0, y: 4, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(2px)" }}
              transition={{
                duration: 0.16,
                delay: Math.min(idx * 0.022, 0.55), // stagger, cap at 550ms total
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
