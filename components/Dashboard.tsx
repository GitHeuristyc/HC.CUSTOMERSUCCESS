"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  COLUMNS,
  ISSUES as MOCK_ISSUES,
  PROJECTS,
  REMINDERS as MOCK_REMINDERS,
} from "@/lib/mock-data";
import type { ColumnId, Issue, Reminder, UserFilter } from "@/lib/types";

/* ---------- synthetic trend / routine runs (fallback until real metrics wired) ---------- */

type TrendDay = { date: string; label: string; created: number; closed: number };

function buildTrend(): TrendDay[] {
  const days: TrendDay[] = [];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const created = [3, 2, 5, 4, 3, 1, 2];
  const closed = [2, 3, 4, 6, 5, 0, 1];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().slice(5, 10),
      label: labels[(d.getDay() + 6) % 7],
      created: created[6 - i],
      closed: closed[6 - i],
    });
  }
  return days;
}

type RoutineRun = {
  when: string;
  status: "ok" | "warn" | "fail";
  items: number;
  dur: string;
};

const ROUTINE_RUNS: RoutineRun[] = [
  { when: "today 15:00", status: "ok", items: 2, dur: "38s" },
  { when: "today 13:00", status: "ok", items: 0, dur: "12s" },
  { when: "today 11:00", status: "ok", items: 3, dur: "41s" },
  { when: "today 09:00", status: "warn", items: 1, dur: "1m 22s" },
  { when: "today 07:00", status: "ok", items: 0, dur: "9s" },
  { when: "yday  19:00", status: "ok", items: 1, dur: "28s" },
  { when: "yday  17:00", status: "ok", items: 4, dur: "52s" },
  { when: "yday  15:00", status: "fail", items: 0, dur: "timeout" },
  { when: "yday  13:00", status: "ok", items: 2, dur: "33s" },
];

const statusColorFor = (s: RoutineRun["status"]) =>
  s === "ok" ? "var(--emerald)" : s === "warn" ? "var(--amber)" : "var(--rose)";

/* ---------- atoms ---------- */

function Spark({ values, color = "var(--ext)", height = 28 }: { values: number[]; color?: string; height?: number }) {
  const max = Math.max(...values, 1);
  const w = 120;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values
    .map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`)
    .join(" ");
  return (
    <svg width={w} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={height - (v / max) * (height - 4) - 2} r={1.75} fill={color} />
      ))}
    </svg>
  );
}

function HBar({
  label,
  value,
  max,
  color,
  badge,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  badge?: React.ReactNode;
}) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <div
        style={{
          width: 74,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: "var(--ink-2)",
          fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />
        {label}
      </div>
      <div style={{ flex: 1, height: 14, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, color-mix(in oklch, ${color} 75%, var(--ink)))`,
            borderRadius: 4,
            animation: "grow-w .7s cubic-bezier(.2,.8,.2,1)",
          }}
        />
      </div>
      <div
        style={{
          width: 42,
          textAlign: "right",
          fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
          fontSize: 12,
          color: "var(--ink)",
        }}
      >
        {value}
      </div>
      {badge && <div style={{ width: 28, textAlign: "right" }}>{badge}</div>}
    </div>
  );
}

function Legend({ c, label }: { c: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-3)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
      {label}
    </span>
  );
}

/* ---------- KPI ---------- */

function KpiTile({
  label,
  num,
  sub,
  spark,
  color,
}: {
  label: string;
  num: number | string;
  sub: string;
  spark: number[];
  color: string;
}) {
  return (
    <div className="kpi">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="kpi-label">{label}</div>
        <Spark values={spark} color={color} height={28} />
      </div>
      <div className="kpi-num" style={{ color }}>
        {num}
      </div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

/* ---------- Routine sync health ---------- */

function RoutineHealth() {
  const total = ROUTINE_RUNS.length;
  const ok = ROUTINE_RUNS.filter((r) => r.status === "ok").length;
  const warn = ROUTINE_RUNS.filter((r) => r.status === "warn").length;
  const fail = ROUTINE_RUNS.filter((r) => r.status === "fail").length;
  const okPct = Math.round((ok / total) * 100);

  return (
    <div className="dash-card" style={{ gridColumn: "span 2" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div className="dash-card-title" style={{ margin: 0 }}>Routine sync health</div>
          <div className="dash-card-h2" style={{ marginTop: 6 }}>
            {okPct}%{" "}
            <span style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>
              success (last 7 days)
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-3)" }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: "var(--emerald)",
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          />
          Next run · 15:00
        </div>
      </div>

      <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
        {Array.from({ length: 35 }).map((_, i) => {
          const r = ROUTINE_RUNS[i] ?? { status: i % 11 === 0 ? "warn" : "ok", when: "", items: 0, dur: "" };
          return (
            <div
              key={i}
              title={r.when}
              style={{
                flex: 1,
                height: 26,
                background: statusColorFor(r.status),
                opacity: 0.35 + (i / 35) * 0.6,
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 18, marginBottom: 14, fontSize: 11.5 }}>
        <Legend c="var(--emerald)" label={`OK · ${ok}`} />
        <Legend c="var(--amber)" label={`Warn · ${warn}`} />
        <Legend c="var(--rose)" label={`Fail · ${fail}`} />
        <span style={{ marginLeft: "auto", color: "var(--ink-3)" }}>7/day cadence · Mon–Fri 7–19h</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {ROUTINE_RUNS.slice(0, 5).map((r, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr 60px 70px",
              alignItems: "center",
              gap: 10,
              padding: "7px 10px",
              borderTop: i === 0 ? "1px solid var(--line-2)" : "none",
              borderBottom: "1px solid var(--line-2)",
              fontSize: 12,
              fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
            }}
          >
            <span style={{ color: "var(--ink-3)" }}>{r.when}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-2)" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: statusColorFor(r.status) }} />
              {r.status.toUpperCase()}
            </span>
            <span style={{ textAlign: "right", color: "var(--ink-2)" }}>{r.items} items</span>
            <span style={{ textAlign: "right", color: "var(--ink-4)" }}>{r.dur}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Tickets by project ---------- */

function TicketsByProject({ issues }: { issues: Issue[] }) {
  const rows = useMemo(() => {
    const byProj: Record<string, { open: number; stale: number; awaiting: number; high: number }> = {};
    issues.forEach((is) => {
      if (!byProj[is.project]) byProj[is.project] = { open: 0, stale: 0, awaiting: 0, high: 0 };
      byProj[is.project].open++;
      if (is.stale) byProj[is.project].stale++;
      if (is.awaitingApproval) byProj[is.project].awaiting++;
      if (is.priority === "High") byProj[is.project].high++;
    });
    return Object.keys(byProj)
      .map((k) => ({ key: k, ...byProj[k] }))
      .sort((a, b) => b.open - a.open);
  }, [issues]);
  const max = Math.max(...rows.map((r) => r.open), 1);

  return (
    <div className="dash-card" style={{ gridColumn: "span 2" }}>
      <div className="dash-card-title">Tickets by project · open now</div>
      <div>
        {rows.map((r) => {
          const p = PROJECTS[r.key as keyof typeof PROJECTS];
          if (!p) return null;
          return (
            <HBar
              key={r.key}
              label={r.key}
              value={r.open}
              max={max}
              color={p.color}
              badge={
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  {r.high > 0 && (
                    <span style={{ fontSize: 10, color: "var(--rose)", fontFamily: "var(--font-geist-mono), Geist Mono, monospace" }}>
                      {r.high}H
                    </span>
                  )}
                  {r.awaiting > 0 && (
                    <span style={{ fontSize: 10, color: "var(--amber)", fontFamily: "var(--font-geist-mono), Geist Mono, monospace" }}>
                      {r.awaiting}A
                    </span>
                  )}
                  {r.stale > 0 && (
                    <span style={{ fontSize: 10, color: "var(--stale)", fontFamily: "var(--font-geist-mono), Geist Mono, monospace" }}>
                      {r.stale}S
                    </span>
                  )}
                </div>
              }
            />
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: 14,
          fontSize: 10.5,
          color: "var(--ink-4)",
          fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
        }}
      >
        <span>
          <b style={{ color: "var(--rose)" }}>H</b> high priority
        </span>
        <span>
          <b style={{ color: "var(--amber)" }}>A</b> awaiting approval
        </span>
        <span>
          <b style={{ color: "var(--stale)" }}>S</b> stale &gt;7d
        </span>
      </div>
    </div>
  );
}

/* ---------- Tickets by status ---------- */

function TicketsByStatus({ issues }: { issues: Issue[] }) {
  const rows = COLUMNS.map((c) => ({ id: c.id, count: issues.filter((i) => i.status === c.id).length }));
  const max = Math.max(...rows.map((r) => r.count), 1);
  const statusColor: Record<ColumnId, string> = {
    Backlog: "var(--ink-4)",
    "To Do": "var(--pk)",
    Discovery: "var(--ai)",
    "In Progress": "var(--ext)",
    Open: "var(--amber)",
    Revision: "var(--rose)",
  };
  return (
    <div className="dash-card" style={{ gridColumn: "span 2" }}>
      <div className="dash-card-title">Tickets by status</div>
      {rows.map((r) => (
        <HBar key={r.id} label={r.id} value={r.count} max={max} color={statusColor[r.id]} />
      ))}
    </div>
  );
}

/* ---------- Fathom funnel ---------- */

function FathomFunnel({ reminders }: { reminders: Reminder[] }) {
  const source = reminders.filter((r) => r.source === "fathom");
  const nNew = source.filter((r) => r.status === "new").length;
  const nRev = source.filter((r) => r.status === "reviewed").length;
  const nDone = source.filter((r) => r.status === "completed").length;
  const manualNew = reminders.filter((r) => r.source === "manual" && r.status !== "completed").length;
  const total = source.length;

  const steps = [
    { label: "New", val: nNew, color: "var(--ext)" },
    { label: "Reviewed", val: nRev, color: "var(--ai)" },
    { label: "Done", val: nDone, color: "var(--emerald)" },
  ];
  const max = Math.max(...steps.map((s) => s.val), 1);

  return (
    <div className="dash-card" style={{ gridColumn: "span 2" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div className="dash-card-title" style={{ margin: 0 }}>Fathom reminders funnel</div>
          <div className="dash-card-h2" style={{ marginTop: 6 }}>
            {total}{" "}
            <span style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>
              captured · 7 days
            </span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>+{manualNew} manual open</div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 18, height: 150 }}>
        {steps.map((s) => {
          const h = (s.val / max) * 130;
          return (
            <div key={s.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  fontFamily: "var(--font-instrument-serif), Instrument Serif, Georgia, serif",
                  fontSize: 32,
                  color: "var(--ink)",
                  lineHeight: 1,
                }}
              >
                {s.val}
              </div>
              <div
                style={{
                  width: "100%",
                  height: Math.max(h, 4),
                  background: `linear-gradient(180deg, ${s.color}, color-mix(in oklch, ${s.color} 60%, var(--bg)))`,
                  borderRadius: "8px 8px 0 0",
                  transition: "height .4s ease",
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ink-2)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: "10px 12px",
          background: "color-mix(in oklch, var(--ai) 10%, transparent)",
          border: "1px solid color-mix(in oklch, var(--ai) 22%, transparent)",
          borderRadius: 10,
          fontSize: 11.5,
          color: "var(--ink-2)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--ai)" }} />
        Conversion New → Done ·{" "}
        <b style={{ color: "var(--ink)" }}>{total ? Math.round((nDone / total) * 100) : 0}%</b>
      </div>
    </div>
  );
}

/* ---------- Throughput 7d ---------- */

function Throughput7d() {
  const trend = useMemo(() => buildTrend(), []);
  const max = Math.max(...trend.flatMap((d) => [d.created, d.closed]), 1);
  const totalCreated = trend.reduce((s, d) => s + d.created, 0);
  const totalClosed = trend.reduce((s, d) => s + d.closed, 0);

  return (
    <div className="dash-card" style={{ gridColumn: "span 2" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div className="dash-card-title" style={{ margin: 0 }}>Throughput · 7 days</div>
          <div className="dash-card-h2" style={{ marginTop: 6 }}>
            {totalCreated} in{" "}
            <span style={{ color: "var(--ink-3)", fontSize: 14, fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>·</span>{" "}
            {totalClosed} out
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
          <Legend c="var(--ext)" label="Created" />
          <Legend c="var(--emerald)" label="Closed" />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 18, height: 160 }}>
        {trend.map((d, i) => {
          const createdH = (d.created / max) * 140;
          const closedH = (d.closed / max) * 140;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140 }}>
                <div
                  title={`Created: ${d.created}`}
                  style={{
                    width: 14,
                    height: createdH,
                    borderRadius: "4px 4px 0 0",
                    background: "var(--ext)",
                    animation: "grow-w .6s ease",
                    minHeight: d.created > 0 ? 2 : 0,
                  }}
                />
                <div
                  title={`Closed: ${d.closed}`}
                  style={{
                    width: 14,
                    height: closedH,
                    borderRadius: "4px 4px 0 0",
                    background: "var(--emerald)",
                    minHeight: d.closed > 0 ? 2 : 0,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                  fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
                }}
              >
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Awaiting approval ---------- */

function AwaitingList({ issues }: { issues: Issue[] }) {
  const rows = issues
    .filter((i) => i.awaitingApproval)
    .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
  return (
    <div className="dash-card" style={{ gridColumn: "span 2" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div className="dash-card-title" style={{ margin: 0 }}>Awaiting approval</div>
          <div className="dash-card-h2" style={{ marginTop: 6 }}>
            {rows.length}{" "}
            <span style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>
              blocked on review
            </span>
          </div>
        </div>
        <Link
          href="/"
          style={{
            fontSize: 11,
            color: "var(--amber)",
            padding: "4px 10px",
            border: "1px solid color-mix(in oklch, var(--amber) 30%, transparent)",
            borderRadius: 999,
            textDecoration: "none",
          }}
        >
          Open on board →
        </Link>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
        {rows.map((r) => {
          const p = PROJECTS[r.project];
          return (
            <div
              key={r.key}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 80px 1fr auto",
                alignItems: "center",
                gap: 10,
                padding: "10px 4px",
                borderTop: "1px solid var(--line-2)",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 2, background: p.color }} />
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {r.key}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.title}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                  fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
                }}
              >
                upd {r.updated}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- main ---------- */

export function Dashboard() {
  const [userFilter, setUserFilter] = useState<UserFilter>("both");
  const [issuesData, setIssuesData] = useState<Issue[]>(MOCK_ISSUES);
  const [remindersData, setRemindersData] = useState<Reminder[]>(MOCK_REMINDERS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [jRes, rRes] = await Promise.all([
          fetch("/api/jira/issues").then((r) => r.json()).catch(() => null),
          fetch("/api/reminders").then((r) => r.json()).catch(() => null),
        ]);
        if (cancelled) return;
        if (jRes?.issues && Array.isArray(jRes.issues) && jRes.issues.length > 0) {
          setIssuesData(jRes.issues as Issue[]);
        }
        if (rRes?.reminders && Array.isArray(rRes.reminders) && rRes.reminders.length > 0) {
          setRemindersData(rRes.reminders as Reminder[]);
        }
      } catch {
        /* fallback already set */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const issues = useMemo(
    () => issuesData.filter((i) => (userFilter === "both" ? true : i.assignee === userFilter)),
    [issuesData, userFilter]
  );

  const total = issues.length;
  const awaiting = issues.filter((i) => i.awaitingApproval).length;
  const stale = issues.filter((i) => i.stale).length;
  const high = issues.filter((i) => i.priority === "High").length;
  const fathomNew = remindersData.filter((r) => r.source === "fathom" && r.status === "new").length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 24px",
          borderBottom: "1px solid var(--line-2)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit", minWidth: 220 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--ext), var(--ai))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bg)",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
            }}
          >
            H
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span className="serif" style={{ fontSize: 18 }}>
              Heuristyc Board
            </span>
            <span style={{ fontSize: 10.5, color: "var(--ink-4)", letterSpacing: "0.04em" }}>
              Jira · Fathom · 2h routine
            </span>
          </div>
        </Link>

        <nav
          style={{
            display: "flex",
            gap: 2,
            padding: 3,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 10,
          }}
        >
          <Link
            href="/"
            style={{
              padding: "5px 12px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 500,
              color: "var(--ink-3)",
              textDecoration: "none",
            }}
          >
            Board
          </Link>
          <span
            style={{
              padding: "5px 12px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 500,
              background: "var(--surface-2)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Dashboard
          </span>
        </nav>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: 3,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 10,
          }}
        >
          {[
            { id: "jesus" as const, label: "Jesus", c: "var(--ext)" },
            { id: "david" as const, label: "David", c: "var(--pk)" },
            { id: "both" as const, label: "Both", c: null as string | null },
          ].map((o) => {
            const active = userFilter === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setUserFilter(o.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 500,
                  background: active ? "var(--surface-2)" : "transparent",
                  color: active ? "var(--ink)" : "var(--ink-3)",
                  border: active ? "1px solid var(--line)" : "1px solid transparent",
                }}
              >
                {o.c && <span style={{ width: 6, height: 6, borderRadius: 2, background: o.c }} />}
                {o.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            padding: "6px 10px",
            border: "1px solid var(--line)",
            borderRadius: 999,
          }}
        >
          Last 7 days
        </div>
      </header>

      <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "baseline", gap: 14 }}>
        <h1 className="serif" style={{ fontSize: 36, margin: 0, letterSpacing: "-0.015em", color: "var(--ink)" }}>
          How the tickets are going
        </h1>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
          snapshot ·{" "}
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, padding: 24 }}>
        <KpiTile label="Open tickets" num={total} sub={`${high} high · ${stale} stale`} spark={[5, 6, 5, 7, 6, 5, total]} color="var(--ink)" />
        <KpiTile label="Awaiting approval" num={awaiting} sub="David · EXT queue" spark={[4, 5, 6, 6, 6, 6, awaiting]} color="var(--amber)" />
        <KpiTile label="Stale >7d" num={stale} sub="no updates in a week" spark={[1, 2, 2, 3, 3, 3, stale]} color="var(--stale)" />
        <KpiTile label="High priority" num={high} sub="AI-150 · EXT-2919 · PRD-182" spark={[3, 3, 3, 3, 3, 3, high]} color="var(--rose)" />
        <KpiTile label="Fathom · new" num={fathomNew} sub="needs triage" spark={[2, 3, 1, 5, 3, 2, fathomNew]} color="var(--ai)" />
        <KpiTile label="Routine uptime" num="89%" sub="7d rolling · 1 fail" spark={[100, 100, 88, 100, 100, 80, 89]} color="var(--emerald)" />

        <RoutineHealth />
        <FathomFunnel reminders={remindersData} />
        <TicketsByProject issues={issues} />

        <Throughput7d />
        <TicketsByStatus issues={issues} />
        <AwaitingList issues={issues} />
      </div>

      <footer
        style={{
          padding: "18px 24px",
          borderTop: "1px solid var(--line-2)",
          fontSize: 11,
          color: "var(--ink-4)",
          display: "flex",
          gap: 16,
        }}
      >
        <span>Heuristyc Board · v0.1</span>
        <span>Data snapshot 4m ago · next Jira sync in 6m</span>
        <span style={{ marginLeft: "auto" }}>
          Fathom routine: next 15:00 · Cron <span className="mono">0 7,9,11,13,15,17,19 * * 1-5</span>
        </span>
      </footer>
    </div>
  );
}
