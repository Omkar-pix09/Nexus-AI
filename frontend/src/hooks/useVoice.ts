import { useCallback, useEffect, useRef, useState } from "react";

/* Voice-first: Web Speech API (recognition + synthesis). Barge-in: the moment the user starts
   speaking, any ongoing synthesis is cancelled. Push-to-talk (hold) and toggle both supported. */
const SR: any = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

export function useVoice(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const rec = useRef<any>(null);
  const finalCb = useRef(onFinal);
  finalCb.current = onFinal;
  const supported = !!SR && "speechSynthesis" in window;

  const stopSpeaking = useCallback(() => { window.speechSynthesis?.cancel(); setSpeaking(false); }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window) || !text) return;
    stopSpeaking();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.onstart = () => setSpeaking(true);
    u.onend = u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [stopSpeaking]);

  const start = useCallback(() => {
    if (!SR || rec.current) return;
    stopSpeaking(); // barge-in
    const r = new SR();
    r.lang = "en-IN"; r.interimResults = true; r.continuous = false;
    r.onresult = (e: any) => {
      stopSpeaking();
      let text = ""; let final = false;
      for (const res of e.results) { text += res[0].transcript; final = final || res.isFinal; }
      setTranscript(text);
      if (final) finalCb.current(text);
    };
    r.onend = () => { rec.current = null; setListening(false); };
    r.onerror = () => { rec.current = null; setListening(false); };
    rec.current = r; setTranscript(""); setListening(true); r.start();
  }, [stopSpeaking]);

  const stop = useCallback(() => rec.current?.stop(), []);
  useEffect(() => () => { rec.current?.abort(); window.speechSynthesis?.cancel(); }, []);
  return { supported, listening, speaking, transcript, setTranscript, start, stop, speak, stopSpeaking };
}
