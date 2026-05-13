"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed: "Solo cuentas @heuristyc.com pueden ingresar.",
  user_not_provisioned: "Tu usuario no está habilitado en este board. Pedile al admin que te de acceso.",
  callback_failed: "Hubo un error al iniciar sesión. Probá de nuevo.",
  invalid_session: "Sesión inválida. Probá de nuevo.",
};

function LoginInner() {
  const params = useSearchParams();
  const error = params.get("error");
  const next = params.get("next") ?? "/";

  const [emailValue, setEmailValue] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : undefined;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValue) return;
    setBusy(true);
    setLocalError(null);
    const supabase = getBrowserSupabase();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: emailValue,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    setBusy(false);
    if (err) {
      setLocalError(err.message);
      return;
    }
    setMagicSent(true);
  }

  const errorMsg = localError ?? (error ? ERROR_MESSAGES[error] ?? error : null);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          padding: 28,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--ext), var(--ai))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bg)",
              fontWeight: 700,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            H
          </div>
          <div>
            <div className="serif" style={{ fontSize: 20, color: "var(--ink)" }}>
              Heuristyc Board
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-4)" }}>Sign in with magic link</div>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: "8px 12px",
              background: "color-mix(in oklch, var(--rose) 12%, transparent)",
              border: "1px solid color-mix(in oklch, var(--rose) 25%, transparent)",
              color: "var(--rose)",
              borderRadius: 8,
              fontSize: 12.5,
            }}
          >
            {errorMsg}
          </div>
        )}

        {magicSent ? (
          <div
            style={{
              padding: "12px 14px",
              background: "color-mix(in oklch, var(--emerald) 10%, transparent)",
              border: "1px solid color-mix(in oklch, var(--emerald) 25%, transparent)",
              borderRadius: 10,
              fontSize: 13,
              color: "var(--ink-2)",
            }}
          >
            Revisá tu casilla — te mandamos un link a <b>{emailValue}</b> para entrar.
          </div>
        ) : (
          <form onSubmit={sendMagicLink} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="email"
              required
              autoFocus
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="tu-email@heuristyc.com"
              style={{
                padding: "10px 12px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--ink)",
              }}
            />
            <button
              type="submit"
              disabled={busy || !emailValue}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "var(--ext)",
                color: "var(--bg)",
                border: "1px solid var(--ext)",
                fontSize: 13,
                fontWeight: 500,
                cursor: busy || !emailValue ? "default" : "pointer",
                opacity: busy || !emailValue ? 0.6 : 1,
              }}
            >
              {busy ? "Enviando…" : "Enviarme magic link"}
            </button>
          </form>
        )}

        <div style={{ fontSize: 11, color: "var(--ink-4)", textAlign: "center" }}>
          Acceso restringido a @heuristyc.com habilitados
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
