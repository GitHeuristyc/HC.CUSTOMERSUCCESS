"use client";

import type { ColumnDef, Issue } from "@/lib/types";
import { IssueCard } from "./IssueCard";

type Props = {
  column: ColumnDef;
  issues: Issue[];
  onOpen?: (issue: Issue) => void;
};

export function Column({ column, issues, onOpen }: Props) {
  return (
    <div
      style={{
        flex: `0 0 var(--col-w)`,
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 4px 10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-2)",
            }}
          >
            {column.label}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--ink-4)",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "1px 7px",
              fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
            }}
          >
            {issues.length}
          </span>
        </div>
        <button
          style={{
            fontSize: 14,
            color: "var(--ink-4)",
            padding: "2px 6px",
            borderRadius: 6,
          }}
          title="Add issue"
        >
          +
        </button>
      </div>

      {/* Scroll area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          overflowY: "auto",
          paddingRight: 4,
          paddingBottom: 32,
          flex: 1,
          minHeight: 0,
        }}
      >
        {issues.length === 0 && (
          <div
            style={{
              padding: "32px 12px",
              textAlign: "center",
              fontSize: 12,
              color: "var(--ink-4)",
              border: "1px dashed var(--line)",
              borderRadius: "var(--radius)",
            }}
          >
            No issues
          </div>
        )}
        {issues.map((is, i) => (
          <div key={is.key} style={{ animation: `rowin .28s ease ${i * 0.02}s both` }}>
            <IssueCard issue={is} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </div>
  );
}
