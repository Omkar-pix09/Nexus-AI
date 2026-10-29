import { useState } from "react";
import { Mic, MicOff, Square, Send, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { useVoice } from "../hooks/useVoice";

export default function VoiceDock() {
  const nav = useNavigate();
  const { target, refresh } = useStore();
  const [log, setLog] = useState<{ role: "you" | "nexus"; text: string }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);

  const send = async (t: string) => {
    if (!t.trim()) return;
    setBusy(true); setLog((l) => [...l, { role: "you", text: t }]); setText("");
    try {
      const r = await api.command(t, target);
      setLog((l) => [...l, { role: "nexus", text: r.reply }]);
      v.speak(r.reply);
      if (r.intent === "progress") refresh();
      if (r.navigate) nav(r.navigate, { state: { command: r } });
    } catch (e: any) { setLog((l) => [...l, { role: "nexus", text: `Error: ${e.message}` }]); }
    finally { setBusy(false); }
  };
  const v = useVoice(send);
  const state = v.listening ? "Listening…" : v.speaking ? "Speaking — talk to interrupt" : busy ? "Thinking…" : "Idle";

  return (
    <div className="glass fixed bottom-4 right-4 z-30 w-[min(92vw,380px)] p-3">
      <div className="flex items-center justify-between">
        <span className="label">Voice command · {state}</span>
        <button className="text-xs text-slate-400" onClick={() => setOpen(!open)} aria-label="Toggle voice panel">{open ? "–" : "+"}</button>
      </div>
      {open && (
        <>
          <div className="my-2 max-h-40 space-y-1 overflow-y-auto text-sm" aria-live="polite">
            {log.slice(-6).map((m, i) => (
              <p key={i} className={m.role === "you" ? "text-slate-300" : "text-neon"}><span className="label mr-2">{m.role}</span>{m.text}</p>
            ))}
            {v.listening && <p className="italic text-slate-400">{v.transcript || "…"}</p>}
            {!log.length && !v.listening && <p className="text-slate-500">Try: “Should I focus on DSA in the next 45 days?”</p>}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              {v.listening && <span className="absolute inset-0 animate-ring rounded-full bg-neon/40" />}
              <button
                className="btn relative rounded-full !p-3" disabled={!v.supported}
                title={v.supported ? "Hold to talk (release to send) or click to toggle" : "Voice not supported in this browser — type instead"}
                onPointerDown={(e) => { if (e.pointerType !== "touch") v.start(); }}
                onPointerUp={(e) => { if (e.pointerType !== "touch") v.stop(); }}
                onClick={(e) => { if ((e as any).nativeEvent.pointerType === "touch") (v.listening ? v.stop() : v.start()); }}
                aria-label="Push to talk">
                {v.listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>
            {v.speaking && <button className="btn-ghost" onClick={v.stopSpeaking} aria-label="Stop speaking"><Square size={14} /></button>}
            <input className="input" placeholder="…or type a command" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(text)} />
            <button className="btn-ghost" onClick={() => send(text)} aria-label="Send"><Send size={14} /></button>
          </div>
          {!v.supported && <p className="mt-2 flex items-center gap-1 text-xs text-amber"><Volume2 size={12} /> Push-to-talk needs Chrome/Edge; text input works everywhere.</p>}
        </>
      )}
    </div>
  );
}
