"use client";

import type { ReactNode } from "react";
import { PROJECTS, REMINDERS, USERS } from "@/lib/mock-data";
import type { Issue } from "@/lib/types";
import { Avatar, Pill, PriorityDot, ProjectBadge } from "./atoms";

const JIRA_BROWSE_BASE =
  process.env.NEXT_PUBLIC_JIRA_BASE_URL ?? "https://heuristyc.atlassian.net";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-3)",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

type Props = {
  issue: Issue;
  onClose: () => void;
};

export function DetailPanel({ issue, onClose }: Props) {
  const proj = PROJECTS[issue.project];
  const linkedReminders = REMINDERS.filter((r) => r.linked_jira_key === issue.key);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "color-mix(in oklch, black 40%, transparent)",
          zIndex: 40,
          animation: "rowin .2s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          background: "var(--bg-2)",
          borderLeft: "1px solid var(--line)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          animation: "rowin .22s ease",
        }}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line-2)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ProjectBadge projectKey={issue.project} />
              <a
                href={`${JIRA_BROWSE_BASE}/browse/${issue.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mono"
                style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--ink)";
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--ink-3)";
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                {issue.key}
              </a>
            </div>
            <button
              onClick={onClose}
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
          <h2
            className="serif"
            style={{
              margin: "12px 0 0",
              fontSize: 26,
              lineHeight: 1.2,
              color: "var(--ink)",
              textWrap: "balance",
            }}
          >
            {issue.title}
          </h2>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Avatar userId={issue.assignee} size={22} />
              <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
                {USERS[issue.assignee].name}
              </span>
            </div>
            <PriorityDot priority={issue.priority} />
            <Pill color={proj.color}>{issue.status}</Pill>
            <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
              updated {issue.updated} · created {issue.created}
            </span>
          </div>
        </div>

        <div
          style={{
            padding: "18px 22px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <Section title="Linked Fathom items">
            {linkedReminders.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-4)" }}>
                No meetings have referenced this issue yet.
              </div>
            ) : (
              linkedReminders.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: "10px 12px",
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    fontSize: 12.5,
                    color: "var(--ink-2)",
                  }}
                >
                  <div style={{ color: "var(--ink)" }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
                    {r.meeting_title} · {r.meeting_date}
                  </div>
                </div>
              ))
            )}
          </Section>

          <Section title="Notes">
            <textarea
              placeholder="Add a note — context, blockers, next step…"
              style={{
                width: "100%",
                minHeight: 80,
                resize: "vertical",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            />
          </Section>

          <Section title="Activity">
            <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>
              <div>· Synced from Jira {issue.updated} ago</div>
              <div>· Created {issue.created} ago</div>
              {issue.awaitingApproval && (
                <div style={{ color: "var(--amber)" }}>· Awaiting approval</div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
