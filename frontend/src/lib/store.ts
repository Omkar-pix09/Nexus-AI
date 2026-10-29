import { create } from "zustand";

interface State {
  target: string;
  setTarget: (t: string) => void;
  tick: number;           // bump to make data views refetch (after upload / task / voice action)
  refresh: () => void;
}
export const useStore = create<State>((set) => ({
  target: "ai_ml_engineer",
  setTarget: (target) => set({ target }),
  tick: 0,
  refresh: () => set((s) => ({ tick: s.tick + 1 })),
}));
