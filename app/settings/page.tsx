"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppConfig } from "@/lib/config";
import { DEFAULT_CONFIG } from "@/lib/config";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [excludedDraft, setExcludedDraft] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/config");
        const json = await res.json();
        if (res.ok && json.config) setConfig(json.config);
      } catch (err) {
        setErrorMsg((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (patch: Partial<AppConfig>) => {
    setSaveState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setConfig(json.config);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    } catch (err) {
      setErrorMsg((err as Error).message);
      setSaveState("error");
    }
  };

  const addExcluded = () => {
    const keys = excludedDraft
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s && !config.excluded_projects.includes(s));
    if (keys.length === 0) return;
    save({ excluded_projects: [...config.excluded_projects, ...keys] });
    setExcludedDraft("");
  };

  const removeExcluded = (k: string) => {
    save({ excluded_projects: config.excluded_projects.filter((x) => x !== k) });
  };

  const forceSync = async () => {
    setSyncing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/jira/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSyncedAt(json.synced_at);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              className="serif"
              style={{ margin: 0, fontSize: 36, color: "var(--ink)" }}
            >
              Settings
            </h1>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
              Server-side configuration · applies to all users
            </div>
          </div>
          <Link
            href="/"
            style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none" }}
          >
            ← Back to board
          </Link>
        </div>

        {/* Save indicator */}
        <div
          style={{
            minHeight: 18,
            fontSize: 11,
            color:
              saveState === "error"
                ? "var(--rose)"
                : saveState === "saved"
                  ? "var(--emerald)"
                  : "var(--ink-3)",
            marginBottom: 8,
          }}
        >
          {loading
            ? "Loading config…"
            : saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "✓ Saved"
                : saveState === "error"
                  ? `⚠ ${errorMsg}`
                  : errorMsg
                    ? `⚠ ${errorMsg}`
                    : ""}
        </div>

        {/* Section: Excluded projects */}
        <Section
          title="Excluded projects"
          hint="Project keys NOT fetched from Jira. Add codes outside the 8 visible projects (PK, AI, EDU, EXT, PRD, IMP, PRIM, PM). Changing this clears the Jira cache."
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {config.excluded_projects.length === 0 && (
              <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
                None excluded
              </span>
            )}
            {config.excluded_projects.map((k) => (
              <span
                key={k}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono), monospace",
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  color: "var(--ink-2)",
                }}
              >
                {k}
                <button
                  onClick={() => removeExcluded(k)}
                  title="Remove"
                  style={{
                    color: "var(--ink-4)",
                    fontSize: 14,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={excludedDraft}
              onChange={(e) => setExcludedDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addExcluded();
              }}
              placeholder="Add project key(s), comma-separated"
              style={{
                flex: 1,
                fontSize: 12,
                padding: "7px 10px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 7,
                color: "var(--ink)",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            />
            <button
              onClick={addExcluded}
              style={{
                fontSize: 12,
                padding: "7px 14px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: 7,
                color: "var(--ink)",
              }}
            >
              Add
            </button>
          </div>
        </Section>

        {/* Section: Alert rules */}
        <Section title="Alert rules" hint="How the board highlights issues.">
          <Row label="Inactivity threshold (days)">
            <NumInput
              value={config.alert_rules.inactivity_days}
              min={1}
              onCommit={(n) =>
                save({
                  alert_rules: { ...config.alert_rules, inactivity_days: n },
                })
              }
            />
          </Row>
          <Row label="Highlight awaiting approval">
            <Toggle
              checked={config.alert_rules.highlight_awaiting_approval}
              onChange={(v) =>
                save({
                  alert_rules: {
                    ...config.alert_rules,
                    highlight_awaiting_approval: v,
                  },
                })
              }
            />
          </Row>
          <Row label="Highlight high priority">
            <Toggle
              checked={config.alert_rules.highlight_high_priority}
              onChange={(v) =>
                save({
                  alert_rules: {
                    ...config.alert_rules,
                    highlight_high_priority: v,
                  },
                })
              }
            />
          </Row>
        </Section>

        {/* Section: Sync */}
        <Section title="Sync" hint="Jira sync behavior.">
          <Row label="Sync interval (minutes)">
            <NumInput
              value={config.sync_interval_minutes}
              min={1}
              onCommit={(n) => save({ sync_interval_minutes: n })}
            />
          </Row>
          <Row label="Last routine sweep">
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {config.routine_last_sweep
                ? new Date(config.routine_last_sweep).toLocaleString()
                : "never"}
            </span>
          </Row>
          <Row label="Force Jira sync now">
            <button
              onClick={forceSync}
              disabled={syncing}
              style={{
                fontSize: 12,
                padding: "6px 12px",
                background: syncing ? "var(--line)" : "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: 7,
                color: "var(--ink)",
                cursor: syncing ? "progress" : "pointer",
              }}
            >
              {syncing ? "Syncing…" : syncedAt ? "✓ Synced · run again" : "Run now"}
            </button>
          </Row>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: "18px 20px",
        marginBottom: 14,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </h2>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>
          {hint}
        </div>
      </div>
      {children}
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderTop: "1px solid var(--line-2)",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 34,
        height: 20,
        borderRadius: 999,
        padding: 2,
        background: checked ? "var(--ext)" : "var(--line)",
        border: "none",
        display: "flex",
        alignItems: "center",
        transition: "background .15s",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          background: "var(--bg)",
          transform: `translateX(${checked ? 14 : 0}px)`,
          transition: "transform .18s ease",
        }}
      />
    </button>
  );
}

function NumInput({
  value,
  min,
  onCommit,
}: {
  value: number;
  min: number;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      type="number"
      min={min}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = Number(draft);
        if (Number.isFinite(n) && n >= min && n !== value) onCommit(n);
        else setDraft(String(value));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      style={{
        width: 70,
        fontSize: 12,
        padding: "5px 8px",
        textAlign: "right",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 6,
        color: "var(--ink)",
      }}
    />
  );
}
