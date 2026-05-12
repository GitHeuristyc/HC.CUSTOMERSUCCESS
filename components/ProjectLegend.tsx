"use client";

import { PROJECTS } from "@/lib/mock-data";
import type { ProjectKey, UserFilter } from "@/lib/types";

type Props = {
  projectFilter: Set<ProjectKey>;
  setProjectFilter: (updater: (prev: Set<ProjectKey>) => Set<ProjectKey>) => void;
  userFilter: UserFilter;
};

export function ProjectLegend({ projectFilter, setProjectFilter, userFilter }: Props) {
  const keys = (Object.keys(PROJECTS) as ProjectKey[]).filter((k) => {
    if (userFilter === "both") return true;
    return PROJECTS[k].owner === userFilter;
  });

  const toggle = (k: ProjectKey) => {
    setProjectFilter((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const allOn = keys.every((k) => projectFilter.has(k));
  const setAll = () => {
    setProjectFilter((prev) => {
      const next = new Set(prev);
      if (allOn) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "14px 18px 10px",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          color: "var(--ink-4)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginRight: 4,
        }}
      >
        Projects
      </span>
      {keys.map((k) => {
        const p = PROJECTS[k];
        const on = projectFilter.has(k);
        return (
          <button
            key={k}
            onClick={() => toggle(k)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 9px",
              borderRadius: 999,
              background: on
                ? `color-mix(in oklch, ${p.color} 14%, transparent)`
                : "transparent",
              border: `1px solid ${
                on ? `color-mix(in oklch, ${p.color} 30%, transparent)` : "var(--line)"
              }`,
              color: on ? p.color : "var(--ink-4)",
              fontSize: 11,
              fontWeight: 500,
              fontFamily: "var(--font-geist-mono), Geist Mono, ui-monospace, monospace",
              letterSpacing: "0.02em",
              opacity: on ? 1 : 0.7,
              transition: "all .12s",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 2,
                background: on ? p.color : "var(--ink-4)",
              }}
            />
            {p.key}
            <span style={{ color: on ? p.color : "var(--ink-4)", opacity: 0.6 }}>
              · {p.name}
            </span>
          </button>
        );
      })}
      <button
        onClick={setAll}
        style={{
          fontSize: 11,
          color: "var(--ink-3)",
          padding: "4px 9px",
          marginLeft: 4,
          border: "1px solid var(--line)",
          borderRadius: 999,
        }}
      >
        {allOn ? "Clear" : "Select all"}
      </button>
    </div>
  );
}
