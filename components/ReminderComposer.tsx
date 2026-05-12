"use client";

import { useEffect, useRef, useState } from "react";
import { USERS } from "@/lib/mock-data";
import type { ReminderAssignee, ReminderDue } from "@/lib/types";
import { Avatar } from "./atoms";

export type ComposerDraft = {
  title: string;
  assignee: ReminderAssignee;
  due: ReminderDue;
  linked_jira_key: string | null;
};

type ComposerProps = {
  onCancel: () => void;
  onSave: (draft: ComposerDraft) => void;
};

export function ReminderComposer({ onCancel, onSave }: ComposerProps) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<ReminderAssignee>("david");
  const [due, setDue] = useState<ReminderDue>("today");
  const [linkedKey, setLinkedKey] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const save = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      assignee,
      due,
      linked_jira_key: linkedKey.trim() || null,
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--ext)",
        borderRadius: 12,
        padding: 12,
        boxShadow: "0 0 0 3px color-mix(in oklch, var(--ext) 18%, transparent)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animation: "rowin .22s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 10.5,
          color: "var(--ink-3)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--ext)" }} />
        New reminder · Manual
      </div>

      <textarea
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs doing? e.g. Reply to Laura re: onboarding dates"
        rows={2}
        style={{
          width: "100%",
          resize: "none",
          padding: "8px 10px",
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          color: "var(--ink)",
          borderRadius: 8,
          fontSize: 13,
          lineHeight: 1.4,
          fontFamily: "inherit",
        }}
      />

      <Row label="For">
        {(["jesus", "david", "both"] as ReminderAssignee[]).map((id) => {
          const active = assignee === id;
          const u = id === "both" ? null : USERS[id];
          return (
            <Chip key={id} active={active} onClick={() => setAssignee(id)}>
              {u ? <Avatar userId={u.id} size={14} /> : null}
              {u ? u.name.split(" ")[0] : "Both"}
            </Chip>
          );
        })}
      </Row>

      <Row label="When">
        {(
          [
            { id: "today", label: "Today" },
            { id: "tomorrow", label: "Tomorrow" },
            { id: "thisweek", label: "This week" },
            { id: "nextweek", label: "Next week" },
          ] as { id: ReminderDue; label: string }[]
        ).map((o) => (
          <Chip key={o.id} active={due === o.id} onClick={() => setDue(o.id)}>
            {o.label}
          </Chip>
        ))}
      </Row>

      <Row label="Link">
        <input
          value={linkedKey}
          onChange={(e) => setLinkedKey(e.target.value.toUpperCase())}
          placeholder="optional · e.g. EXT-2774"
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: 11.5,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            borderRadius: 6,
            fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
          }}
        />
      </Row>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
        <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
          <span className="mono">⌘</span> + <span className="mono">↵</span> to save ·{" "}
          <span className="mono">Esc</span> to cancel
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={onCancel}
            style={{
              fontSize: 11.5,
              color: "var(--ink-3)",
              padding: "5px 10px",
              border: "1px solid var(--line)",
              borderRadius: 6,
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!title.trim()}
            style={{
              fontSize: 11.5,
              color: title.trim() ? "var(--bg)" : "var(--ink-4)",
              padding: "5px 12px",
              borderRadius: 6,
              background: title.trim() ? "var(--ext)" : "var(--surface-2)",
              border: "1px solid " + (title.trim() ? "var(--ext)" : "var(--line)"),
              fontWeight: 500,
              cursor: title.trim() ? "pointer" : "not-allowed",
            }}
          >
            Save reminder
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 40,
          fontSize: 10.5,
          color: "var(--ink-4)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 999,
        background: active ? "color-mix(in oklch, var(--ext) 18%, transparent)" : "var(--bg-2)",
        border: `1px solid ${
          active ? "color-mix(in oklch, var(--ext) 35%, transparent)" : "var(--line)"
        }`,
        color: active ? "var(--ext)" : "var(--ink-3)",
        fontSize: 11,
        fontWeight: 500,
        transition: "all .12s",
      }}
    >
      {children}
    </button>
  );
}

type GlobalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: ComposerDraft) => void;
};

export function GlobalComposer({ open, onClose, onCreate }: GlobalProps) {
  if (!open) return null;
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "color-mix(in oklch, black 35%, transparent)",
          zIndex: 60,
          animation: "rowin .15s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "18vh",
          left: "50%",
          transform: "translateX(-50%)",
          width: 520,
          maxWidth: "92vw",
          zIndex: 70,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)",
          animation: "rowin .2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10.5,
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 600,
              }}
            >
              Quick add
            </div>
            <h2
              className="serif"
              style={{ margin: "4px 0 0", fontSize: 24, color: "var(--ink)" }}
            >
              New reminder
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ color: "var(--ink-3)", fontSize: 16, padding: "2px 8px" }}
          >
            ×
          </button>
        </div>
        <ReminderComposer
          onCancel={onClose}
          onSave={(draft) => {
            onCreate(draft);
            onClose();
          }}
        />
        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 6,
            alignItems: "center",
            fontSize: 11,
            color: "var(--ink-4)",
          }}
        >
          <span
            className="mono"
            style={{
              padding: "1px 5px",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 4,
            }}
          >
            ⌘
          </span>
          <span
            className="mono"
            style={{
              padding: "1px 5px",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 4,
            }}
          >
            K
          </span>
          <span>to open this from anywhere</span>
        </div>
      </div>
    </>
  );
}

export function EmailIngestCard() {
  const [copied, setCopied] = useState(false);
  const email = "reminders@heuristyc-routine.io";
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div
      style={{
        marginTop: 2,
        padding: "12px 14px",
        background: "color-mix(in oklch, var(--ai) 8%, transparent)",
        border: "1px dashed color-mix(in oklch, var(--ai) 30%, transparent)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ai)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
        <span
          style={{
            fontSize: 10.5,
            color: "var(--ai)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          Forward to reminder
        </span>
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.45 }}>
        Forward any email here and the 2h routine will ingest it as a manual reminder.
      </div>
      <button
        onClick={copy}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 6,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          fontSize: 11.5,
          color: "var(--ink)",
          fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
        }}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{email}</span>
        <span
          style={{
            fontSize: 10.5,
            color: copied ? "var(--emerald)" : "var(--ink-3)",
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </span>
      </button>
    </div>
  );
}
