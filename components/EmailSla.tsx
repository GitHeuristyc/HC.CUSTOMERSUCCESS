"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pill } from "./atoms";
import type {
  EmailSlaKpiDeltas,
  EmailSlaKpis,
  EmailThread,
  EmailThreadStatus,
} from "@/lib/types";

/* ---------- API payload types ---------- */

type KpisResponse = {
  week: {
    from: string;
    to: string;
    kpis: EmailSlaKpis;
    status_distribution: Record<EmailThreadStatus, number>;
  };
  prev_week: { kpis: EmailSlaKpis };
  month: { from: string; kpis: EmailSlaKpis };
  deltas: EmailSlaKpiDeltas;
  config: {
    sla_target_hours: number;
    at_risk_threshold_hours: number;
    timezone: string;
  };
};

type ThreadsResponse = {
  threads: EmailThread[];
  total: number;
};

type WeekdayAvg = {
  weekday: number;
  label: string;
  avg_hours: number | null;
  count: number;
};

type WeekdayResponse = { weekdays: WeekdayAvg[] };

/* ---------- helpers ---------- */

const STATUS_META: Record<EmailThreadStatus, { label: string; color: string }> = {
  vencido: { label: "Vencido", color: "var(--rose)" },
  en_riesgo: { label: "En riesgo", color: "var(--amber)" },
  pendiente: { label: "Pendiente", color: "var(--ai)" },
  respondido: { label: "Respondido", color: "var(--emerald)" },
};

const fmtHours = (h: number | null | undefined): string =>
  h === null || h === undefined ? "—" : `${h.toFixed(1)}h`;

const fmtPct = (p: number | null | undefined): string =>
  p === null || p === undefined ? "—" : `${Math.round(p)}%`;

type Tone = "good" | "warn" | "bad" | "neutral";

const toneColor: Record<Tone, string> = {
  good: "var(--emerald)",
  warn: "var(--amber)",
  bad: "var(--rose)",
  neutral: "var(--ink-3)",
};

function DeltaTag({
  delta,
  lowerIsBetter,
  unit,
}: {
  delta: number | null;
  lowerIsBetter: boolean;
  unit: "h" | "pp" | "";
}) {
  if (delta === null || Math.abs(delta) < 0.05) {
    return (
      <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
        {delta === null ? "sin semana previa" : "= vs semana previa"}
      </span>
    );
  }
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const color = improved ? "var(--emerald)" : "var(--rose)";
  const arrow = delta > 0 ? "▲" : "▼";
  const mag = unit === "h" ? `${Math.abs(delta).toFixed(1)}h` : unit === "pp" ? `${Math.abs(delta).toFixed(0)}pp` : `${Math.abs(delta).toFixed(0)}`;
  return (
    <span style={{ fontSize: 11, color, fontFamily: "var(--font-geist-mono), Geist Mono, monospace" }}>
      {arrow} {mag} vs semana previa
    </span>
  );
}

function MetricCard({
  label,
  value,
  tone,
  badge,
  sub,
  delta,
}: {
  label: string;
  value: string;
  tone: Tone;
  badge: string;
  sub: string;
  delta: React.ReactNode;
}) {
  return (
    <div className="kpi">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="kpi-label">{label}</div>
        <Pill color={toneColor[tone]}>{badge}</Pill>
      </div>
      <div className="kpi-num" style={{ fontSize: 44, color: toneColor[tone] === "var(--ink-3)" ? "var(--ink)" : toneColor[tone] }}>
        {value}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {delta}
        <span className="kpi-sub">{sub}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="dash-card"
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "56px 20px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 30 }}>📭</div>
      <div className="serif" style={{ fontSize: 22, color: "var(--ink)" }}>
        Esperando datos de la routine de email
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-3)", maxWidth: 480, lineHeight: 1.5 }}>
        Todavía no llegó ningún hilo. Cuando la routine empiece a empujar datos a{" "}
        <span className="mono" style={{ color: "var(--ink-2)" }}>POST /api/email/threads/batch</span>{" "}
        los KPIs aparecen acá automáticamente. El contrato del payload está en{" "}
        <span className="mono" style={{ color: "var(--ink-2)" }}>docs/email-routine-contract.md</span>.
      </div>
    </div>
  );
}

/* ---------- pending threads list ---------- */

function PendingList({ threads, total }: { threads: EmailThread[]; total: number }) {
  return (
    <div className="dash-card" style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div className="dash-card-title" style={{ margin: 0 }}>Hilos sin responder · por urgencia</div>
          <div className="dash-card-h2" style={{ marginTop: 6 }}>
            {total}{" "}
            <span style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>
              esperando primera respuesta
            </span>
          </div>
        </div>
      </div>
      {threads.length === 0 ? (
        <div style={{ padding: "22px 4px 8px", fontSize: 12.5, color: "var(--ink-3)" }}>
          Nada pendiente — todos los hilos tienen respuesta. ✓
        </div>
      ) : (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
          {threads.map((t) => {
            const meta = STATUS_META[t.status];
            const hot = t.status === "vencido" || t.status === "en_riesgo";
            return (
              <div
                key={t.thread_id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 1fr 90px 110px",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 8px",
                  borderTop: "1px solid var(--line-2)",
                  borderLeft: hot ? `2px solid ${meta.color}` : "2px solid transparent",
                  background: hot
                    ? `color-mix(in oklch, ${meta.color} 6%, transparent)`
                    : "transparent",
                }}
              >
                <span
                  title={t.sender_email}
                  style={{
                    fontSize: 12,
                    color: "var(--ink-2)",
                    fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.sender_email}
                </span>
                <span
                  title={t.subject}
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.subject || "(sin asunto)"}
                </span>
                <span
                  style={{
                    textAlign: "right",
                    fontSize: 12,
                    color: hot ? meta.color : "var(--ink-2)",
                    fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
                    fontWeight: hot ? 600 : 400,
                  }}
                >
                  {fmtHours(t.business_hours_elapsed)}
                </span>
                <span style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Pill color={meta.color}>{meta.label}</Pill>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- charts ---------- */

function WeekdayBars({ weekdays, target }: { weekdays: WeekdayAvg[]; target: number }) {
  const max = Math.max(...weekdays.map((w) => w.avg_hours ?? 0), target, 1);
  return (
    <div className="dash-card" style={{ gridColumn: "span 2" }}>
      <div className="dash-card-title">Primera respuesta por día de la semana · 4 semanas</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, position: "relative" }}>
        {/* línea de target */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: (target / max) * 130 + 24,
            borderTop: "1px dashed color-mix(in oklch, var(--rose) 55%, transparent)",
            zIndex: 0,
          }}
          title={`SLA target · ${target}h`}
        />
        {weekdays.map((w) => {
          const h = w.avg_hours === null ? 0 : (w.avg_hours / max) * 130;
          const over = w.avg_hours !== null && w.avg_hours > target;
          return (
            <div
              key={w.weekday}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 1 }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: w.avg_hours === null ? "var(--ink-4)" : "var(--ink-2)",
                  fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
                }}
              >
                {w.avg_hours === null ? "—" : w.avg_hours.toFixed(1)}
              </div>
              <div
                title={`${w.label}: ${fmtHours(w.avg_hours)} (${w.count} hilos)`}
                style={{
                  width: "70%",
                  height: Math.max(h, w.avg_hours === null ? 0 : 3),
                  minHeight: w.avg_hours === null ? 3 : undefined,
                  background: w.avg_hours === null
                    ? "var(--bg-2)"
                    : over
                      ? "linear-gradient(180deg, var(--rose), color-mix(in oklch, var(--rose) 60%, var(--bg)))"
                      : "linear-gradient(180deg, var(--ext), color-mix(in oklch, var(--ext) 60%, var(--bg)))",
                  borderRadius: "5px 5px 0 0",
                  transition: "height .4s ease",
                }}
              />
              <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-geist-mono), Geist Mono, monospace" }}>
                {w.label}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--ink-4)" }}>
        Horas laborales promedio hasta la primera respuesta ·{" "}
        <span style={{ color: "var(--rose)" }}>– – target {target}h</span>
      </div>
    </div>
  );
}

function StatusDistribution({
  distribution,
  total,
}: {
  distribution: Record<EmailThreadStatus, number>;
  total: number;
}) {
  const order: EmailThreadStatus[] = ["respondido", "pendiente", "en_riesgo", "vencido"];
  const max = Math.max(...order.map((s) => distribution[s]), 1);
  return (
    <div className="dash-card" style={{ gridColumn: "span 2" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div className="dash-card-title" style={{ margin: 0 }}>Estados de la semana</div>
          <div className="dash-card-h2" style={{ marginTop: 6 }}>
            {total}{" "}
            <span style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>
              hilos recibidos
            </span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        {order.map((s) => {
          const meta = STATUS_META[s];
          const v = distribution[s];
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <div
                style={{
                  width: 92,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "var(--ink-2)",
                  fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: 2, background: meta.color }} />
                {meta.label}
              </div>
              <div style={{ flex: 1, height: 14, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(v / max) * 100}%`,
                    background: `linear-gradient(90deg, ${meta.color}, color-mix(in oklch, ${meta.color} 75%, var(--ink)))`,
                    borderRadius: 4,
                    animation: "grow-w .7s cubic-bezier(.2,.8,.2,1)",
                  }}
                />
              </div>
              <div
                style={{
                  width: 36,
                  textAlign: "right",
                  fontSize: 12,
                  color: "var(--ink)",
                  fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
                }}
              >
                {v}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- main ---------- */

export function EmailSla() {
  const [kpisData, setKpisData] = useState<KpisResponse | null>(null);
  const [threadsData, setThreadsData] = useState<ThreadsResponse | null>(null);
  const [weekdayData, setWeekdayData] = useState<WeekdayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [k, t, w] = await Promise.all([
          fetch("/api/email/kpis").then((r) => r.json()),
          fetch("/api/email/threads?page_size=50").then((r) => r.json()),
          fetch("/api/email/weekday-avg").then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (k?.error || t?.error || w?.error) {
          setError(k?.error ?? t?.error ?? w?.error);
        } else {
          setKpisData(k as KpisResponse);
          setThreadsData(t as ThreadsResponse);
          setWeekdayData(w as WeekdayResponse);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const target = kpisData?.config.sla_target_hours ?? 24;
  const atRiskThreshold = kpisData?.config.at_risk_threshold_hours ?? 20;
  const week = kpisData?.week.kpis;
  const month = kpisData?.month.kpis;
  const deltas = kpisData?.deltas;

  const isEmpty = useMemo(() => {
    if (!kpisData || !threadsData) return false;
    return (
      kpisData.month.kpis.threads_total === 0 &&
      kpisData.week.kpis.threads_total === 0 &&
      kpisData.prev_week.kpis.threads_total === 0 &&
      threadsData.total === 0
    );
  }, [kpisData, threadsData]);

  const firstResponseTone: Tone =
    !week || week.avg_first_response_hours === null
      ? "neutral"
      : week.avg_first_response_hours < atRiskThreshold
        ? "good"
        : week.avg_first_response_hours <= target
          ? "warn"
          : "bad";

  const pctTone: Tone =
    !week || week.pct_within_sla === null
      ? "neutral"
      : week.pct_within_sla >= 90
        ? "good"
        : week.pct_within_sla >= 75
          ? "warn"
          : "bad";

  const unansweredTone: Tone = !week
    ? "neutral"
    : week.overdue > 0
      ? "bad"
      : week.at_risk > 0
        ? "warn"
        : "good";

  const resolutionTone: Tone =
    !week || week.avg_resolution_hours === null
      ? "neutral"
      : week.avg_resolution_hours <= target * 2
        ? "good"
        : week.avg_resolution_hours <= target * 4
          ? "warn"
          : "bad";

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
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit", minWidth: 220 }}
        >
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
              Jira · Fathom · Email
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
            style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, color: "var(--ink-3)", textDecoration: "none" }}
          >
            Board
          </Link>
          <Link
            href="/dashboard"
            style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, color: "var(--ink-3)", textDecoration: "none" }}
          >
            Dashboard
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
            Email SLA
          </span>
        </nav>

        <div style={{ flex: 1 }} />

        <div
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            padding: "6px 10px",
            border: "1px solid var(--line)",
            borderRadius: 999,
          }}
        >
          SLA · {target}h laborales · {kpisData?.config.timezone ?? "America/New_York"}
        </div>
      </header>

      <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "baseline", gap: 14 }}>
        <h1 className="serif" style={{ fontSize: 36, margin: 0, letterSpacing: "-0.015em", color: "var(--ink)" }}>
          Email SLA
        </h1>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
          semana actual + acumulado mensual ·{" "}
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            margin: "16px 24px 0",
            padding: "8px 14px",
            background: "color-mix(in oklch, var(--rose) 12%, transparent)",
            border: "1px solid color-mix(in oklch, var(--rose) 25%, transparent)",
            borderRadius: 10,
            fontSize: 12,
            color: "var(--rose)",
          }}
        >
          ⚠ No se pudieron cargar los datos de Email SLA: {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: 24 }}>
        {loading ? (
          <div className="dash-card" style={{ gridColumn: "1 / -1", padding: "40px 20px", textAlign: "center", fontSize: 12.5, color: "var(--ink-3)" }}>
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "var(--ai)",
                marginRight: 8,
                animation: "pulse-dot 1s ease-in-out infinite",
              }}
            />
            Cargando métricas de email…
          </div>
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <MetricCard
              label="1ª respuesta · avg"
              value={fmtHours(week?.avg_first_response_hours)}
              tone={firstResponseTone}
              badge={`target ${target}h`}
              sub={`mes: ${fmtHours(month?.avg_first_response_hours)} · ${week?.responded ?? 0} respondidos`}
              delta={
                <DeltaTag
                  delta={deltas?.avg_first_response_hours ?? null}
                  lowerIsBetter
                  unit="h"
                />
              }
            />
            <MetricCard
              label="Dentro del SLA"
              value={fmtPct(week?.pct_within_sla)}
              tone={pctTone}
              badge={`${week?.threads_total ?? 0} hilos`}
              sub={`mes: ${fmtPct(month?.pct_within_sla)} · pendientes no cuentan`}
              delta={
                <DeltaTag
                  delta={deltas?.pct_within_sla ?? null}
                  lowerIsBetter={false}
                  unit="pp"
                />
              }
            />
            <MetricCard
              label="Sin respuesta"
              value={String(week?.unanswered ?? 0)}
              tone={unansweredTone}
              badge={`${week?.overdue ?? 0} vencidos · ${week?.at_risk ?? 0} en riesgo`}
              sub={`recibidos esta semana, aún sin reply`}
              delta={
                <DeltaTag
                  delta={deltas?.unanswered ?? null}
                  lowerIsBetter
                  unit=""
                />
              }
            />
            <MetricCard
              label="Resolución · avg"
              value={fmtHours(week?.avg_resolution_hours)}
              tone={resolutionTone}
              badge="hilos cerrados"
              sub={`mes: ${fmtHours(month?.avg_resolution_hours)}`}
              delta={
                <DeltaTag
                  delta={deltas?.avg_resolution_hours ?? null}
                  lowerIsBetter
                  unit="h"
                />
              }
            />

            <PendingList
              threads={threadsData?.threads ?? []}
              total={threadsData?.total ?? 0}
            />

            <WeekdayBars weekdays={weekdayData?.weekdays ?? []} target={target} />
            <StatusDistribution
              distribution={
                kpisData?.week.status_distribution ?? {
                  respondido: 0,
                  pendiente: 0,
                  en_riesgo: 0,
                  vencido: 0,
                }
              }
              total={week?.threads_total ?? 0}
            />
          </>
        )}
      </div>
    </div>
  );
}
