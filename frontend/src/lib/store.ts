import { create } from "zustand";

interface AppState {
  fy: string;
  setFY: (fy: string) => void;
  regime: "old" | "new";
  setRegime: (regime: "old" | "new") => void;
  itrForm: "ITR-3" | "ITR-4";
  setItrForm: (form: "ITR-3" | "ITR-4") => void;
}

export const useAppStore = create<AppState>((set) => ({
  fy: "2025-26",
  setFY: (fy) => set({ fy }),
  regime: "new",
  setRegime: (regime) => set({ regime }),
  itrForm: "ITR-4",
  setItrForm: (itrForm) => set({ itrForm }),
}));
