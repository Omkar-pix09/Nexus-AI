export type Json = Record<string, any>;

async function req<T = any>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api${path}`, init);
  if (!r.ok) throw new Error((await r.json().catch(() => ({ detail: r.statusText }))).detail ?? r.statusText);
  return r.json();
}
const post = (p: string, body: unknown) =>
  req(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const api = {
  health: () => req("/health"),
  dashboard: (target: string) => req(`/dashboard?target=${target}`),
  roles: () => req<{ id: string; name: string }[]>("/roles"),
  documents: () => req<Json[]>("/documents"),
  upload: (file: File) => { const f = new FormData(); f.append("file", file); return req("/documents", { method: "POST", body: f }); },
  removeDoc: (id: string) => req(`/documents/${id}`, { method: "DELETE" }),
  search: (q: string, mode: string) => req<Json[]>(`/search?q=${encodeURIComponent(q)}&mode=${mode}&k=6`),
  ask: (question: string, mode: string) => post("/ask", { question, mode }),
  simulate: (body: Json) => post("/simulate", body),
  graph: (target: string) => req(`/graph?target=${target}`),
  tasks: () => req<Json[]>("/tasks"),
  addTask: (title: string, skill: string, hours: number) => post("/tasks", { title, skill, hours }),
  completeTask: (id: string) => post(`/tasks/${id}/complete`, {}),
  timeline: () => req<Json[]>("/timeline"),
  command: (text: string, target: string) => post("/command", { text, target }),
  evalRun: () => req("/eval/run"),
};

export function streamAgent(question: string, target: string, days: number, onEvent: (e: Json) => void, onEnd: () => void) {
  const es = new EventSource(`/api/agent/stream?question=${encodeURIComponent(question)}&target=${target}&days=${days}`);
  es.onmessage = (m) => onEvent(JSON.parse(m.data));
  es.addEventListener("end", () => { es.close(); onEnd(); });
  es.onerror = () => { es.close(); onEnd(); };
  return () => es.close();
}
