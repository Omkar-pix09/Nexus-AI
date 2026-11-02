import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  Command,
  ArrowRight,
  Sparkles,
  Database,
  Cpu,
  Layers,
  Activity,
  X,
} from "lucide-react";
import GlassPanel from "./GlassPanel";

export interface CommandItem {
  id: string;
  title: string;
  category: "Simulations" | "Telemetry" | "Evidence" | "System";
  shortcut?: string;
  semantic?: "calculated" | "evidence" | "estimated" | "gap";
  onSelect?: () => void;
}

export interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
  items?: CommandItem[];
}

const defaultCommands: CommandItem[] = [
  {
    id: "run-sim",
    title: "Execute Multi-Branch Career Monte Carlo (10,000 runs)",
    category: "Simulations",
    shortcut: "⌘↵",
    semantic: "calculated",
  },
  {
    id: "inspect-evidence",
    title: "Inspect Vector Store Provenance & Consensus Graph",
    category: "Evidence",
    shortcut: "⌘E",
    semantic: "evidence",
  },
  {
    id: "gap-analysis",
    title: "Run Deep-Sea Sonar Discrepancy & Skill Gap Scan",
    category: "Telemetry",
    shortcut: "⌘G",
    semantic: "gap",
  },
  {
    id: "estimate-p90",
    title: "Recompute p10/p90 Credible Intervals on Compensation",
    category: "Simulations",
    shortcut: "⌘P",
    semantic: "estimated",
  },
  {
    id: "sys-diagnostic",
    title: "Run Abyssal Mission Control Hardware & LLM Ping",
    category: "System",
    shortcut: "⌘D",
    semantic: "calculated",
  },
];

/**
 * CommandPalette Component (Cmd+K / Ctrl+K)
 * Mission Control command terminal with keyboard navigation, category filtering,
 * and high-contrast accessibility.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  items = defaultCommands,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (controlledIsOpen === undefined) {
          setInternalOpen((prev) => !prev);
        } else if (onClose && isOpen) {
          onClose();
        }
      } else if (e.key === "Escape" && isOpen) {
        if (controlledIsOpen === undefined) setInternalOpen(false);
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, controlledIsOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation within list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].onSelect?.();
      handleClose();
    }
  };

  const handleClose = () => {
    if (controlledIsOpen === undefined) setInternalOpen(false);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <GlassPanel
          elevation={5}
          aiActive={true}
          glow="sonar"
          className="p-3 shadow-2xl border-white/20"
        >
          {/* Top Search Input */}
          <div className="relative flex items-center border-b border-white/10 pb-3 px-2">
            <Search className="text-sonar mr-3 shrink-0" size={20} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search mission protocols, simulations, evidence vectors... (Esc to close)"
              className="w-full bg-transparent text-white font-sans text-scale-base placeholder:text-slate-500 outline-none"
              aria-label="Filter command items"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] bg-white/10 border border-white/20 text-slate-300 px-2 py-0.5 rounded ml-2">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto py-2 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-mono text-scale-sm">
                No active protocols matching "{query}"
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const semAccent =
                  item.semantic === "calculated"
                    ? "text-sonar"
                    : item.semantic === "evidence"
                    ? "text-plasma"
                    : item.semantic === "estimated"
                    ? "text-signal"
                    : "text-alarm";

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.onSelect?.();
                      handleClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-nexus-md text-left transition-colors duration-instant ${
                      isSelected
                        ? "bg-surface-4 border border-sonar/40 shadow-glow-sonar"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className={`font-mono text-scale-xs uppercase tracking-wider ${semAccent}`}>
                        [{item.category}]
                      </span>
                      <span
                        className={`text-scale-sm font-medium truncate ${
                          isSelected ? "text-white" : "text-slate-300"
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {item.shortcut && (
                        <kbd className="font-mono text-[11px] bg-black/40 border border-white/10 text-slate-400 px-2 py-0.5 rounded">
                          {item.shortcut}
                        </kbd>
                      )}
                      <ArrowRight
                        size={14}
                        className={`transition-opacity ${isSelected ? "opacity-100 text-sonar" : "opacity-0"}`}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="border-t border-white/10 pt-2 px-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>↵ Execute Protocol</span>
            </div>
            <span>NEXUS Mission Control v2.4</span>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default CommandPalette;
