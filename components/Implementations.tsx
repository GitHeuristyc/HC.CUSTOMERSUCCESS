"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pill } from "./atoms";

/* ---------- API types (mirror /api/implementations) ---------- */

type Lifecycle = "active" | "post_go_live" | "closed";

type Implementation = {
  key: string;
  summary: string;
  status: string;
  lifecycle: Lifecycle;
  assignee: string | null;
  go_live: string | null;
  missing_go_live: boolean;
  outdated: boolean;
  url: string;
};

type Summary = {
  total: number;
  active: number;
  post_go_live: number;
  closed: number;
  missing_go_live: number;
  outdated: number;
};

type ApiResponse = {
  implementations: Implementation[];
  attention: Implementation[];
  summary: Summary;
  today: string;
  generated_at: string;
};

/* ---------- helpers ---------- */

const LIFECYCLE_META: Record<Lifecycle, { label: string; color: string }> = {
  active: { label: "Activa", color: "var(--ai)" },
  post_go_live: { label: "Post-Go Live", color: "var(--emerald)" },
  closed: { label: "Cerrada", color: "var(--stale)" },
};

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`;

/** "Tuxton :: Super-Flite" → "Tuxton" (primer segmento del summary). */
const clientOf = (summary: string) => summary.split("::")[0].trim() || summary;

/* ---------- indicador superior ---------- */

function IndicatorTile({
  label,
  value,
  color,
  hint,
  attention,
}: {
  label: string;
  value: number;
  color: string;
  hint: string;
  attention?: boolean;
}) {
  return (
    <div
      className="kpi"
      style={{
        minHeight: 96,
        borderColor: attention && value > 0 ? `color-mix(in oklch, ${color} 45%, var(--line))` : undefined,
        background:
          attention && value > 0
            ? `color-mix(in oklch, ${color} 7%, var(--surface))`
            : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="kpi-label">{label}</div>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      </div>
      <div className="kpi-num" style={{ fontSize: 40, color: value > 0 ? color : "var(--ink)" }}>
        {value}
      </div>
      <div className="kpi-sub">{hint}</div>
    </div>
  );
}

/* ---------- calendario ---------- */

function GoLiveCalendar({
  implementations,
  today,
}: {
  implementations: Implementation[];
  today: string;
}) {
  const todayParts = today.split("-").map(Number);
  const [view, setView] = useState<{ y: number; m: number }>({
    y: todayParts[0],
    m: todayParts[1] - 1,
  });

  // go_live (YYYY-MM-DD) → implementaciones de ese día
  const byDay = useMemo(() => {
    const map = new Map<string, Implementation[]>();
    for (const impl of implementations) {
      if (!impl.go_live) continue;
      const arr = map.get(impl.go_live) ?? [];
      arr.push(impl);
      map.set(impl.go_live, arr);
    }
    return map;
  }, [implementations]);

  const withDate = useMemo(
    () => implementations.filter((i) => i.go_live).length,
    [implementations]
  );

  // Grilla del mes, empezando en lunes.
  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });
  };

  return (
    <div className="dash-card" style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div className="dash-card-title" style={{ margin: 0 }}>Calendario de Go Live</div>
          <div className="dash-card-h2" style={{ marginTop: 6 }}>
            {MONTHS_ES[view.m]} {view.y}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => shiftMonth(-1)} style={navBtn}>←</button>
          <button
            onClick={() => setView({ y: todayParts[0], m: todayParts[1] - 1 })}
            style={{ ...navBtn, width: "auto", padding: "0 12px", fontSize: 12 }}
          >
            Hoy
          </button>
          <button onClick={() => shiftMonth(1)} style={navBtn}>→</button>
        </div>
      </div>

      {withDate === 0 && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            background: "color-mix(in oklch, var(--amber) 10%, transparent)",
            border: "1px solid color-mix(in oklch, var(--amber) 25%, transparent)",
            borderRadius: 10,
            fontSize: 12.5,
            color: "var(--ink-2)",
          }}
        >
          Ninguna implementación tiene fecha de Go Live cargada todavía. El calendario se irá poblando a
          medida que se complete el campo en Jira — mientras tanto, revisá el tracker de abajo.
        </div>
      )}

      {/* cabecera de días */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {WEEKDAYS_ES.map((w) => (
          <div key={w} style={{ fontSize: 10.5, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", fontWeight: 600 }}>
            {w}
          </div>
        ))}
      </div>

      {/* grilla */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {cells.map((cell, i) => {
          if (cell.day === null) return <div key={i} />;
          const dateStr = ymd(view.y, view.m, cell.day);
          const items = byDay.get(dateStr) ?? [];
          const isToday = dateStr === today;
          return (
            <div
              key={i}
              style={{
                minHeight: 78,
                border: isToday
                  ? "1px solid color-mix(in oklch, var(--ext) 55%, var(--line))"
                  : "1px solid var(--line-2)",
                borderRadius: 8,
                padding: 6,
                background: isToday ? "color-mix(in oklch, var(--ext) 8%, var(--surface))" : "var(--surface)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ fontSize: 11, color: isToday ? "var(--ext)" : "var(--ink-4)", fontFamily: "var(--font-geist-mono), Geist Mono, monospace", textAlign: "right" }}>
                {cell.day}
              </div>
              {items.map((impl) => {
                const meta = LIFECYCLE_META[impl.lifecycle];
                const color = impl.outdated ? "var(--rose)" : meta.color;
                return (
                  <a
                    key={impl.key}
                    href={impl.url}
                    target="_blank"
                    rel="noreferrer"
                    title={`${impl.key} · ${impl.summary} · ${impl.status}`}
                    style={{
                      display: "block",
                      fontSize: 10.5,
                      padding: "2px 5px",
                      borderRadius: 5,
                      background: `color-mix(in oklch, ${color} 16%, transparent)`,
                      border: `1px solid color-mix(in oklch, ${color} 32%, transparent)`,
                      color,
                      textDecoration: "none",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {clientOf(impl.summary)}
                  </a>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink-2)",
  cursor: "pointer",
  fontSize: 14,
};

/* ---------- tracker ---------- */

function AttentionList({ items }: { items: Implementation[] }) {
  return (
    <div className="dash-card" style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div className="dash-card-title" style={{ margin: 0 }}>Requieren atención · sin Go Live u outdated</div>
          <div className="dash-card-h2" style={{ marginTop: 6 }}>
            {items.length}{" "}
            <span style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--font-geist-sans), Geist, sans-serif" }}>
              implementaciones a revisar
            </span>
          </div>
        </div>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: "22px 4px 8px", fontSize: 12.5, color: "var(--ink-3)" }}>
          Todo en orden — cada implementación activa tiene su fecha de Go Live. ✓
        </div>
      ) : (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
          {items.map((impl) => {
            const meta = LIFECYCLE_META[impl.lifecycle];
            return (
              <div
                key={impl.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr 130px 120px 110px",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 8px",
                  borderTop: "1px solid var(--line-2)",
                  borderLeft: impl.outdated ? "2px solid var(--rose)" : "2px solid transparent",
                  background: impl.outdated ? "color-mix(in oklch, var(--rose) 6%, transparent)" : "transparent",
                }}
              >
                <a
                  href={impl.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mono"
                  style={{ fontSize: 11.5, color: "var(--ext)", textDecoration: "none" }}
                >
                  {impl.key}
                </a>
                <span
                  title={impl.summary}
                  style={{ fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {impl.summary || "(sin asunto)"}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                  {impl.assignee ?? "sin asignar"}
                </span>
                <span style={{ display: "flex", justifyContent: "flex-start" }}>
                  <Pill color={meta.color}>{impl.status}</Pill>
                </span>
                <span style={{ display: "flex", justifyContent: "flex-end" }}>
                  {impl.outdated ? (
                    <Pill color="var(--rose)">Outdated</Pill>
                  ) : (
                    <Pill color="var(--amber)">Sin Go Live</Pill>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- main ---------- */

export function Implementations() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/implementations");
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
        setData(json as ApiResponse);
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

  const s = data?.summary;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderBottom: "1px solid var(--line-2)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit", minWidth: 220 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, var(--ext), var(--ai))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--bg)", fontWeight: 700, fontSize: 13,
              fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
            }}
          >
            H
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span className="serif" style={{ fontSize: 18 }}>Heuristyc Board</span>
            <span style={{ fontSize: 10.5, color: "var(--ink-4)", letterSpacing: "0.04em" }}>
              Implementations · PRIM
            </span>
          </div>
        </Link>

        <nav style={{ display: "flex", gap: 2, padding: 3, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10 }}>
          <Link href="/" style={navLink}>Board</Link>
          <Link href="/dashboard" style={navLink}>Dashboard</Link>
          <Link href="/email-sla" style={navLink}>Email SLA</Link>
          <span style={navLinkActive}>Implementations</span>
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ fontSize: 11, color: "var(--ink-3)", padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 999 }}>
          PRIM · Implementation from Portal
        </div>
      </header>

      <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "baseline", gap: 14 }}>
        <h1 className="serif" style={{ fontSize: 36, margin: 0, letterSpacing: "-0.015em", color: "var(--ink)" }}>
          Implementations
        </h1>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
          calendario de Go Live e implementaciones de PRIM
        </span>
      </div>

      {error && (
        <div style={{ margin: "16px 24px 0", padding: "8px 14px", background: "color-mix(in oklch, var(--rose) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--rose) 25%, transparent)", borderRadius: 10, fontSize: 12, color: "var(--rose)" }}>
          ⚠ No se pudo cargar la página: {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, padding: 24 }}>
        {loading ? (
          <div className="dash-card" style={{ gridColumn: "1 / -1", padding: "40px 20px", textAlign: "center", fontSize: 12.5, color: "var(--ink-3)" }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--ai)", marginRight: 8, animation: "pulse-dot 1s ease-in-out infinite" }} />
            Cargando implementaciones de PRIM…
          </div>
        ) : (
          <>
            {/* Indicadores */}
            <IndicatorTile label="Activas" value={s?.active ?? 0} color="var(--ai)" hint="en vuelo" />
            <IndicatorTile label="Post-Go Live" value={s?.post_go_live ?? 0} color="var(--emerald)" hint="ya salieron en vivo" />
            <IndicatorTile label="Cerradas" value={s?.closed ?? 0} color="var(--stale)" hint="implementaciones finalizadas" />
            <IndicatorTile label="Sin Go Live" value={s?.missing_go_live ?? 0} color="var(--amber)" hint="no cerradas, sin fecha cargada" attention />
            <IndicatorTile label="Outdated" value={s?.outdated ?? 0} color="var(--rose)" hint="Go Live pasó y siguen abiertas" attention />

            <GoLiveCalendar
              implementations={data?.implementations ?? []}
              today={data?.today ?? ""}
            />

            <AttentionList items={data?.attention ?? []} />
          </>
        )}
      </div>
    </div>
  );
}

const navLink: React.CSSProperties = {
  padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500,
  color: "var(--ink-3)", textDecoration: "none",
};
const navLinkActive: React.CSSProperties = {
  padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500,
  background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)",
};
