import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  fy: string;
  setFY: (fy: string) => void;
  regime: "old" | "new";
  setRegime: (regime: "old" | "new") => void;
  itrForm: "ITR-3" | "ITR-4";
  setItrForm: (form: "ITR-3" | "ITR-4") => void;
  userName: string;
  setUserName: (name: string) => void;
  onboarded: boolean;
  setOnboarded: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      fy: "2025-26",
      setFY: (fy) => set({ fy }),
      regime: "new",
      setRegime: (regime) => set({ regime }),
      itrForm: "ITR-4",
      setItrForm: (itrForm) => set({ itrForm }),
      userName: "",
      setUserName: (userName) => set({ userName }),
      onboarded: false,
      setOnboarded: (onboarded) => set({ onboarded }),
    }),
    {
      name: "freefile-store",
      partialize: (state) => ({
        fy: state.fy,
        regime: state.regime,
        itrForm: state.itrForm,
        userName: state.userName,
        onboarded: state.onboarded,
      }),
    }
  )
);
