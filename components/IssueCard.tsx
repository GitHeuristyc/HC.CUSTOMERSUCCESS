"use client";

import { PROJECTS } from "@/lib/mock-data";
import type { Issue } from "@/lib/types";
import { Avatar, Pill, PriorityDot, ProjectBadge } from "./atoms";

type Props = {
  issue: Issue;
  onOpen?: (issue: Issue) => void;
};

export function IssueCard({ issue, onOpen }: Props) {
  const proj = PROJECTS[issue.project];
  const highlight = issue.priority === "High";
  const awaiting = issue.awaitingApproval;
  const stale = issue.stale;

  return (
    <div
      onClick={() => onOpen?.(issue)}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: "var(--card-pad-y) var(--card-pad-x)",
        cursor: "pointer",
        transition: "all .14s ease",
        boxShadow: highlight
          ? `inset 3px 0 0 0 var(--rose)`
          : `inset 3px 0 0 0 ${proj.color}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-2)";
        e.currentTarget.style.borderColor =
          "color-mix(in oklch, var(--ink-3) 30%, var(--line))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--surface)";
        e.currentTarget.style.borderColor = "var(--line)";
      }}
    >
      {/* Header: project + key + avatar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <ProjectBadge projectKey={issue.project} />
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.02em" }}
          >
            {issue.key}
          </span>
        </div>
        <Avatar userId={issue.assignee} size={20} />
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.35,
          color: "var(--ink)",
          fontWeight: 500,
          textWrap: "pretty",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {issue.title}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 10,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PriorityDot priority={issue.priority} />
          <span
            style={{
              fontSize: 10.5,
              color: "var(--ink-4)",
              fontFamily: "var(--font-geist-mono), Geist Mono, ui-monospace, monospace",
            }}
          >
            {issue.type}
          </span>
        </div>
        <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>upd {issue.updated}</span>
      </div>

      {/* Alert chips */}
      {(awaiting || stale) && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {awaiting && <Pill color="var(--amber)">Awaiting approval</Pill>}
          {stale && <Pill color="var(--stale)">Stale · &gt;7d</Pill>}
        </div>
      )}
    </div>
  );
}
