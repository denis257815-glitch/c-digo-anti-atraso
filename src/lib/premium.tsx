import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadState, saveState } from "./storage";

type PremiumCtx = {
  isPremium: boolean;
  setPremium: (v: boolean) => void;
  showPaywall: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
};

const Ctx = createContext<PremiumCtx | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  // Temporariamente: todas as abas liberadas para todos os usuários.
  const [isPremium, setIsPremium] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    // Mantém o storage em sincronia mas força true por enquanto.
    saveState("aa.premium", true);
    setIsPremium(true);
    void loadState;
  }, []);

  const setPremium = (v: boolean) => {
    setIsPremium(v);
    saveState("aa.premium", v);
  };

  return (
    <Ctx.Provider
      value={{
        isPremium,
        setPremium,
        showPaywall,
        openPaywall: () => setShowPaywall(true),
        closePaywall: () => setShowPaywall(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePremium must be used inside PremiumProvider");
  return ctx;
}
