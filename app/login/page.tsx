"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Citrus } from "lucide-react";

function LoginForm() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Citrus className="w-8 h-8 text-positive" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold">Fin</h1>
        </div>
        <p className="text-muted text-sm">Sign in to access your finances.</p>

        {error && (
          <div className="bg-negative/[0.06] border border-negative/10 rounded-xl px-4 py-3">
            <p className="text-negative text-sm">
              {error === "AccessDenied"
                ? "Access denied. Your account is not authorized."
                : "Something went wrong. Please try again."}
            </p>
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full py-2.5 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
