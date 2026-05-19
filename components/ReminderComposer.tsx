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

type ComposerVariant = "rail" | "modal";

type ComposerProps = {
  onCancel: () => void;
  onSave: (draft: ComposerDraft, opts?: { keepOpen?: boolean }) => void;
  variant?: ComposerVariant;
  allowAddAnother?: boolean;
};

export function ReminderComposer({
  onCancel,
  onSave,
  variant = "rail",
  allowAddAnother = false,
}: ComposerProps) {
  const isModal = variant === "modal";
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<ReminderAssignee>("david");
  const [due, setDue] = useState<ReminderDue>("today");
  const [linkedKey, setLinkedKey] = useState("");
  const [addAnother, setAddAnother] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const save = () => {
    if (!title.trim()) return;
    const keepOpen = isModal && allowAddAnother && addAnother;
    onSave(
      {
        title: title.trim(),
        assignee,
        due,
        linked_jira_key: linkedKey.trim() || null,
      },
      { keepOpen }
    );
    if (keepOpen) {
      setTitle("");
      setLinkedKey("");
      setJustAdded(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setJustAdded(false), 2200);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
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

  const canSave = !!title.trim();
  const primaryLabel = isModal
    ? addAnother && allowAddAnother
      ? "Add & next"
      : "Add reminder"
    : "Save reminder";

  return (
    <div
      style={
        isModal
          ? {
              background: "transparent",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }
          : {
              background: "var(--surface)",
              border: "1px solid var(--ext)",
              borderRadius: 12,
              padding: 12,
              boxShadow: "0 0 0 3px color-mix(in oklch, var(--ext) 18%, transparent)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              animation: "rowin .22s ease",
            }
      }
    >
      {!isModal && (
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
      )}

      <textarea
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs doing? e.g. Reply to Laura re: onboarding dates"
        rows={isModal ? 3 : 2}
        style={{
          width: "100%",
          resize: "none",
          padding: isModal ? "12px 14px" : "8px 10px",
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          color: "var(--ink)",
          borderRadius: isModal ? 10 : 8,
          fontSize: isModal ? 15 : 13,
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

      <div
        style={
          isModal
            ? {
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 4,
                paddingTop: 12,
                borderTop: "1px solid var(--line-2)",
              }
            : { display: "flex", alignItems: "center", gap: 8, marginTop: 2 }
        }
      >
        {isModal && allowAddAnother ? (
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11.5,
              color: "var(--ink-2)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: addAnother
                  ? "var(--ext)"
                  : "transparent",
                border: `1px solid ${addAnother ? "var(--ext)" : "var(--line-2)"}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .12s",
              }}
            >
              {addAnother && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <input
              type="checkbox"
              checked={addAnother}
              onChange={(e) => setAddAnother(e.target.checked)}
              style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
              tabIndex={-1}
            />
            Keep open for another
          </label>
        ) : (
          <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
            <span className="mono">⌘</span> + <span className="mono">↵</span> to save ·{" "}
            <span className="mono">Esc</span> to cancel
          </span>
        )}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {justAdded && (
            <span
              style={{
                fontSize: 11,
                color: "var(--emerald)",
                fontWeight: 500,
              }}
            >
              Added ✓
            </span>
          )}
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
            {isModal ? "Close" : "Cancel"}
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            style={
              isModal
                ? {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: canSave ? "var(--bg)" : "var(--ink-4)",
                    padding: "7px 8px 7px 14px",
                    borderRadius: 8,
                    background: canSave ? "var(--ext)" : "var(--surface-2)",
                    border: "1px solid " + (canSave ? "var(--ext)" : "var(--line)"),
                    cursor: canSave ? "pointer" : "not-allowed",
                    transform: pressed && canSave ? "scale(0.97)" : "scale(1)",
                    transition: "transform .08s",
                  }
                : {
                    fontSize: 11.5,
                    color: canSave ? "var(--bg)" : "var(--ink-4)",
                    padding: "5px 12px",
                    borderRadius: 6,
                    background: canSave ? "var(--ext)" : "var(--surface-2)",
                    border: "1px solid " + (canSave ? "var(--ext)" : "var(--line)"),
                    fontWeight: 500,
                    cursor: canSave ? "pointer" : "not-allowed",
                  }
            }
          >
            {primaryLabel}
            {isModal && (
              <span
                className="mono"
                style={{
                  fontSize: 10.5,
                  padding: "2px 6px",
                  borderRadius: 5,
                  background: "color-mix(in oklch, black 25%, transparent)",
                  color: canSave
                    ? "color-mix(in oklch, var(--bg) 70%, white)"
                    : "var(--ink-4)",
                }}
              >
                ⌘↵
              </span>
            )}
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
          top: "16vh",
          left: "50%",
          transform: "translateX(-50%)",
          width: 560,
          maxWidth: "92vw",
          zIndex: 70,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)",
          animation: "rowin .2s ease",
          overflow: "hidden",
        }}
      >
        {/* Header band */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px 14px",
            borderBottom: "1px solid var(--line-2)",
            background: "color-mix(in oklch, var(--ext) 5%, transparent)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "color-mix(in oklch, var(--ext) 18%, transparent)",
              border: "1px solid color-mix(in oklch, var(--ext) 35%, transparent)",
              color: "var(--ext)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 28px",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              className="serif"
              style={{
                margin: 0,
                fontSize: 20,
                color: "var(--ink)",
                lineHeight: 1.2,
              }}
            >
              New reminder
            </h2>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
              Goes into the 2h routine queue ·{" "}
              <span className="mono">esc</span> to close
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--ink-3)",
              cursor: "pointer",
              fontSize: 16,
              transition: "all .12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--ink-3)";
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px 16px" }}>
          <ReminderComposer
            variant="modal"
            allowAddAnother
            onCancel={onClose}
            onSave={(draft, opts) => {
              onCreate(draft);
              if (!opts?.keepOpen) onClose();
            }}
          />
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
