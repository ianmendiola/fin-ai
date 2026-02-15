"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  isWebAuthnAvailable,
  registerPasskey,
  authenticatePasskey,
} from "@/app/lib/webauthn";

const CREDENTIAL_KEY = "fin-lock-credential-id";
const LAST_ACTIVE_KEY = "fin-lock-last-active";
const IDLE_TIMEOUT = 1 * 60 * 1000; // 1 minute
const CHECK_INTERVAL = 30 * 1000; // 30 seconds

export function useAppLock() {
  const pathname = usePathname();
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastActivityRef = useRef(Date.now());

  const isLoginPage = pathname === "/login";
  const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem(LAST_ACTIVE_KEY, String(now));
  }, []);

  // Check WebAuthn support and registration on mount
  useEffect(() => {
    if (isLoginPage || isLocalhost) return;

    isWebAuthnAvailable().then((available) => {
      setIsSupported(available);
      if (available) {
        const credId = localStorage.getItem(CREDENTIAL_KEY);
        setIsRegistered(!!credId);
        if (!credId) {
          // Not registered yet — show setup prompt
          setIsLocked(true);
        }
      }
    });
  }, [isLoginPage]);

  // Activity listeners
  useEffect(() => {
    if (isLoginPage || isLocalhost || !isSupported) return;

    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
    };
  }, [isLoginPage, isSupported, updateActivity]);

  // Idle check interval
  useEffect(() => {
    if (isLoginPage || isLocalhost || !isSupported || !isRegistered) return;

    const id = setInterval(() => {
      if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT) {
        setIsLocked(true);
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(id);
  }, [isLoginPage, isSupported, isRegistered]);

  // Visibility change
  useEffect(() => {
    if (isLoginPage || isLocalhost || !isSupported || !isRegistered) return;

    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      } else {
        const stored = localStorage.getItem(LAST_ACTIVE_KEY);
        if (stored && Date.now() - Number(stored) > IDLE_TIMEOUT) {
          setIsLocked(true);
        } else {
          lastActivityRef.current = Date.now();
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isLoginPage, isSupported, isRegistered]);

  const register = useCallback(async () => {
    setError(null);
    setIsAuthenticating(true);
    try {
      const credId = await registerPasskey();
      localStorage.setItem(CREDENTIAL_KEY, credId);
      setIsRegistered(true);
      setIsLocked(false);
      updateActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setIsAuthenticating(false);
    }
  }, [updateActivity]);

  const unlock = useCallback(async () => {
    const credId = localStorage.getItem(CREDENTIAL_KEY);
    if (!credId) return;

    setError(null);
    setIsAuthenticating(true);
    try {
      const ok = await authenticatePasskey(credId);
      if (ok) {
        setIsLocked(false);
        updateActivity();
      } else {
        setError("Authentication failed. Try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  }, [updateActivity]);

  const lock = useCallback(() => {
    setIsLocked(true);
  }, []);

  return {
    isLocked: isLoginPage || isLocalhost ? false : isLocked,
    isSupported,
    isRegistered,
    isAuthenticating,
    error,
    register,
    unlock,
    lock,
  };
}
