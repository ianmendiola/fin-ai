"use client";

import { createContext, useContext } from "react";
import { useAppLock } from "@/app/hooks/useAppLock";
import LockScreen from "@/app/components/LockScreen";

type LockContextValue = ReturnType<typeof useAppLock>;

const LockContext = createContext<LockContextValue | null>(null);

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error("useLock must be used within LockProvider");
  return ctx;
}

export function LockProvider({ children }: { children: React.ReactNode }) {
  const lock = useAppLock();

  return (
    <LockContext.Provider value={lock}>
      {children}
      {lock.isSupported && lock.isLocked && <LockScreen />}
    </LockContext.Provider>
  );
}
