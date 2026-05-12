"use client";

import { useState } from "react";
import { PROJECTS, USERS } from "@/lib/mock-data";
import type { ProjectKey, Reminder, ReminderStatus, UserId } from "@/lib/types";
import { Avatar, Pill } from "./atoms";
import {
  EmailIngestCard,
  ReminderComposer,
  type ComposerDraft,
} from "./ReminderComposer";

type ReminderCardProps = {
  r: Reminder;
  onStatus: (id: string, status: ReminderStatus) => void;
};

function ReminderCard({ r, onStatus }: ReminderCardProps) {
  const fathom = r.source === "fathom";
  const user = r.assignee === "both" ? null : USERS[r.assignee as UserId];
  const linkedProjectKey = r.linked_jira_key
    ? (r.linked_jira_key.split("-")[0] as ProjectKey)
    : null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        opacity: r.status === "completed" ? 0.55 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <Pill color={fathom ? "var(--ai)" : "var(--ink-3)"}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: fathom ? "var(--ai)" : "var(--ink-3)",
            }}
          />
          {fathom ? "Fathom" : "Manual"}
        </Pill>
        {r.linked_jira_key && (
          <Pill
            color={
              (linkedProjectKey && PROJECTS[linkedProjectKey]?.color) || "var(--ink-3)"
            }
            mono
          >
            ↳ {r.linked_jira_key}
          </Pill>
        )}
        {r.assignee === "both" && <Pill color="var(--emerald)">Both</Pill>}
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--ink-4)" }}>
          {r.captured_at}
        </span>
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.4,
          color: "var(--ink)",
          textDecoration: r.status === "completed" ? "line-through" : "none",
          textDecorationColor: "var(--ink-4)",
          textWrap: "pretty",
        }}
      >
        {r.title}
      </div>

      {r.meeting_title && (
        <div
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{ width: 4, height: 4, borderRadius: 999, background: "var(--ink-4)" }}
          />
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {r.meeting_title}
          </span>
          <span style={{ color: "var(--ink-4)" }}>· {r.meeting_date}</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
        {user && <Avatar userId={user.id} size={18} />}
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {r.status !== "completed" && (
            <>
              <button
                onClick={() =>
                  onStatus(r.id, r.status === "new" ? "reviewed" : "new")
                }
                style={{
                  fontSize: 11,
                  color: "var(--ink-2)",
                  padding: "3px 8px",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                }}
              >
                {r.status === "new" ? "Mark reviewed" : "Unreview"}
              </button>
              <button
                onClick={() => onStatus(r.id, "completed")}
                style={{
                  fontSize: 11,
                  color: "var(--emerald)",
                  padding: "3px 8px",
                  border: "1px solid color-mix(in oklch, var(--emerald) 30%, transparent)",
                  background: "color-mix(in oklch, var(--emerald) 10%, transparent)",
                  borderRadius: 6,
                }}
              >
                Done
              </button>
            </>
          )}
          {r.status === "completed" && (
            <button
              onClick={() => onStatus(r.id, "new")}
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                padding: "3px 8px",
                border: "1px solid var(--line)",
                borderRadius: 6,
              }}
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type RailProps = {
  reminders: Reminder[];
  onStatus: (id: string, status: ReminderStatus) => void;
  onClose: () => void;
  onCreate: (draft: ComposerDraft) => void;
};

export function RemindersRail({ reminders, onStatus, onClose, onCreate }: RailProps) {
  const [filter, setFilter] = useState<"active" | "all" | "done">("active");
  const [composing, setComposing] = useState(false);
  const shown = reminders.filter((r) =>
    filter === "all" ? true : filter === "done" ? r.status === "completed" : r.status !== "completed"
  );
  const fathomCount = reminders.filter(
    (r) => r.source === "fathom" && r.status !== "completed"
  ).length;

  return (
    <aside
      style={{
        width: 380,
        flex: "0 0 380px",
        borderLeft: "1px solid var(--line)",
        background: "var(--bg-2)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--line-2)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 22, color: "var(--ink)" }}>
              Reminders
            </h2>
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
              {fathomCount} new from Fathom
            </span>
          </div>
          <button
            onClick={onClose}
            title="Hide"
            style={{
              fontSize: 16,
              color: "var(--ink-3)",
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            marginTop: 12,
            padding: 3,
            background: "var(--surface)",
            borderRadius: 10,
            border: "1px solid var(--line)",
          }}
        >
          {(
            [
              { id: "active", label: "Active" },
              { id: "all", label: "All" },
              { id: "done", label: "Done" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              style={{
                flex: 1,
                fontSize: 12,
                fontWeight: 500,
                padding: "6px 10px",
                borderRadius: 7,
                background: filter === t.id ? "var(--surface-2)" : "transparent",
                color: filter === t.id ? "var(--ink)" : "var(--ink-3)",
                transition: "all .12s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            padding: "8px 10px",
            background: "color-mix(in oklch, var(--ai) 10%, transparent)",
            border: "1px solid color-mix(in oklch, var(--ai) 25%, transparent)",
            borderRadius: 8,
            fontSize: 11,
            color: "var(--ink-2)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--ai)",
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          />
          <span>
            Routine synced <b style={{ color: "var(--ink)" }}>2h ago</b> · next 3pm
          </span>
        </div>
      </div>

      {/* List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {shown.map((r) => (
          <ReminderCard key={r.id} r={r} onStatus={onStatus} />
        ))}
        {composing ? (
          <ReminderComposer
            onCancel={() => setComposing(false)}
            onSave={(draft) => {
              onCreate(draft);
              setComposing(false);
            }}
          />
        ) : (
          <button
            onClick={() => setComposing(true)}
            style={{
              border: "1px dashed var(--line)",
              borderRadius: 12,
              padding: "14px",
              color: "var(--ink-3)",
              fontSize: 12,
              textAlign: "center",
              transition: "all .15s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--ext)";
              e.currentTarget.style.color = "var(--ink-2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.color = "var(--ink-3)";
            }}
          >
            + New manual reminder
          </button>
        )}
        <EmailIngestCard />
      </div>
    </aside>
  );
}
