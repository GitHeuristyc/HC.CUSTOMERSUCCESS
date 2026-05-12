"use client";

import type { CSSProperties, ReactNode } from "react";
import { PROJECTS, USERS } from "@/lib/mock-data";
import type { Priority, ProjectKey, UserId } from "@/lib/types";

export const cx = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

type PillProps = {
  children: ReactNode;
  color: string;
  tone?: "soft" | "solid";
  mono?: boolean;
  style?: CSSProperties;
};

export function Pill({ children, color, tone = "soft", mono, style }: PillProps) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    lineHeight: "18px",
    fontWeight: 500,
    whiteSpace: "nowrap",
    fontFamily: mono ? "var(--font-geist-mono), Geist Mono, ui-monospace, monospace" : "inherit",
    letterSpacing: mono ? "0.01em" : "0",
    ...style,
  };
  const styles: CSSProperties =
    tone === "solid"
      ? { ...base, background: color, color: "var(--bg)" }
      : {
          ...base,
          background: `color-mix(in oklch, ${color} 18%, transparent)`,
          color,
          border: `1px solid color-mix(in oklch, ${color} 28%, transparent)`,
        };
  return <span style={styles}>{children}</span>;
}

export function ProjectBadge({ projectKey }: { projectKey: ProjectKey }) {
  const p = PROJECTS[projectKey];
  if (!p) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 7px 2px 6px",
        borderRadius: 6,
        background: `color-mix(in oklch, ${p.color} 14%, transparent)`,
        border: `1px solid color-mix(in oklch, ${p.color} 22%, transparent)`,
        color: p.color,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.04em",
        fontFamily: "var(--font-geist-mono), Geist Mono, ui-monospace, monospace",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 2, background: p.color }} />
      {p.key}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: Priority }) {
  const map: Record<Priority, { c: string; label: string }> = {
    High: { c: "var(--rose)", label: "High" },
    Medium: { c: "var(--amber)", label: "Med" },
    Low: { c: "var(--ink-4)", label: "Low" },
  };
  const m = map[priority] || map.Low;
  return (
    <span
      title={`Priority: ${m.label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        color: "var(--ink-3)",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: m.c,
          boxShadow:
            priority === "High"
              ? `0 0 0 3px color-mix(in oklch, ${m.c} 20%, transparent)`
              : "none",
          animation: priority === "High" ? "pulse-dot 2.2s ease-in-out infinite" : "none",
        }}
      />
      {m.label}
    </span>
  );
}

export function Avatar({ userId, size = 22 }: { userId: UserId; size?: number }) {
  const u = USERS[userId];
  if (!u) return null;
  return (
    <span
      title={u.name}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        background: `color-mix(in oklch, ${u.color} 22%, var(--surface-2))`,
        color: u.color,
        fontSize: size * 0.42,
        fontWeight: 600,
        letterSpacing: "0.02em",
        border: `1px solid color-mix(in oklch, ${u.color} 30%, transparent)`,
      }}
    >
      {u.initials}
    </span>
  );
}

type IconBtnProps = {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  active?: boolean;
};

export function IconBtn({ label, onClick, children, active }: IconBtnProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: 8,
        background: active ? "var(--surface-2)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-3)",
        border: "1px solid " + (active ? "var(--line)" : "transparent"),
        transition: "all .12s ease",
      }}
    >
      {children}
    </button>
  );
}
