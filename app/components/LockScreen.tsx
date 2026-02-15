"use client";

import { useEffect, useRef } from "react";
import { Citrus } from "lucide-react";
import { useLock } from "@/app/contexts/LockContext";

export default function LockScreen() {
  const { isRegistered, isAuthenticating, error, register, unlock } = useLock();
  const attempted = useRef(false);

  // Auto-trigger Face ID on mount when already registered
  useEffect(() => {
    if (isRegistered && !attempted.current) {
      attempted.current = true;
      unlock();
    }
  }, [isRegistered, unlock]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Citrus className="w-8 h-8 text-positive" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold">Fin</h1>
        </div>

        {!isRegistered ? (
          <>
            <p className="text-muted text-sm">
              Set up Face ID to secure your app.
            </p>

            {error && (
              <div className="bg-negative/[0.06] border border-negative/10 rounded-xl px-4 py-3">
                <p className="text-negative text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={register}
              disabled={isAuthenticating}
              className="w-full py-2.5 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isAuthenticating ? "Setting up..." : "Enable Face ID"}
            </button>
          </>
        ) : (
          <>
            <p className="text-muted text-sm">
              {isAuthenticating ? "Verifying..." : "App is locked."}
            </p>

            {error && (
              <div className="bg-negative/[0.06] border border-negative/10 rounded-xl px-4 py-3">
                <p className="text-negative text-sm">{error}</p>
              </div>
            )}

            {!isAuthenticating && (
              <button
                onClick={() => {
                  attempted.current = false;
                  unlock();
                }}
                className="w-full py-2.5 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {error ? "Try Again" : "Unlock"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
