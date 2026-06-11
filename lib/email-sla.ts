import type { EmailSlaConfig } from "./config";
import type {
  EmailSlaKpiDeltas,
  EmailSlaKpis,
  EmailThread,
  EmailThreadStatus,
} from "./types";

export type EmailThreadRow = {
  thread_id: string;
  subject: string;
  sender_email: string;
  sender_domain: string;
  received_at: string;
  first_response_at: string | null;
  last_message_at: string;
  business_hours_elapsed: number;
  business_hours_to_resolution: number | null;
  resolved_at: string | null;
  metadata: Record<string, unknown> | null;
  dismissed_at: string | null;
  dismissed_by: string | null;
  created_at: string;
  updated_at: string;
};

/* ---------- status (derivado, nunca persistido) ---------- */

export function deriveStatus(
  row: Pick<EmailThreadRow, "first_response_at" | "business_hours_elapsed">,
  config: EmailSlaConfig
): EmailThreadStatus {
  if (row.first_response_at) return "respondido";
  if (row.business_hours_elapsed >= config.sla_target_hours) return "vencido";
  if (row.business_hours_elapsed >= config.at_risk_threshold_hours)
    return "en_riesgo";
  return "pendiente";
}

export function rowToThread(
  row: EmailThreadRow,
  config: EmailSlaConfig
): EmailThread {
  return {
    thread_id: row.thread_id,
    subject: row.subject,
    sender_email: row.sender_email,
    sender_domain: row.sender_domain,
    received_at: row.received_at,
    first_response_at: row.first_response_at,
    last_message_at: row.last_message_at,
    status: deriveStatus(row, config),
    business_hours_elapsed: row.business_hours_elapsed,
    business_hours_to_resolution: row.business_hours_to_resolution,
    resolved_at: row.resolved_at,
    mailbox:
      typeof row.metadata?.mailbox === "string" && row.metadata.mailbox.length > 0
        ? row.metadata.mailbox
        : null,
    dismissed_at: row.dismissed_at ?? null,
  };
}

/** metadata.mailbox puede ser un buzón o varios separados por coma. */
export function matchesMailbox(
  thread: Pick<EmailThread, "mailbox">,
  mailbox: string
): boolean {
  if (!thread.mailbox) return false;
  return thread.mailbox
    .split(",")
    .map((m) => m.trim().toLowerCase())
    .includes(mailbox.trim().toLowerCase());
}

const STATUS_URGENCY: Record<EmailThreadStatus, number> = {
  vencido: 0,
  en_riesgo: 1,
  pendiente: 2,
  respondido: 3,
};

export function sortByUrgency(threads: EmailThread[]): EmailThread[] {
  return [...threads].sort((a, b) => {
    const byStatus = STATUS_URGENCY[a.status] - STATUS_URGENCY[b.status];
    if (byStatus !== 0) return byStatus;
    return b.business_hours_elapsed - a.business_hours_elapsed;
  });
}

/* ---------- validación de payload de ingesta ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseIsoOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

// dismissed_at/dismissed_by se setean solo desde el panel — la routine no los
// envía y el upsert del batch no debe pisarlos.
export type IngestRow = Omit<
  EmailThreadRow,
  "created_at" | "updated_at" | "dismissed_at" | "dismissed_by"
>;

export function validateIngestItem(
  item: unknown,
  config: EmailSlaConfig
): { ok: true; row: IngestRow } | { ok: false; error: string } {
  if (!item || typeof item !== "object") {
    return { ok: false, error: "not an object" };
  }
  const r = item as Record<string, unknown>;

  if (typeof r.thread_id !== "string" || r.thread_id.trim().length === 0) {
    return { ok: false, error: "thread_id required" };
  }
  if (typeof r.sender_email !== "string" || !EMAIL_RE.test(r.sender_email)) {
    return { ok: false, error: "sender_email must be a valid email" };
  }
  const senderEmail = r.sender_email.trim().toLowerCase();
  const senderDomain =
    typeof r.sender_domain === "string" && r.sender_domain.trim().length > 0
      ? r.sender_domain.trim().toLowerCase()
      : senderEmail.split("@")[1];

  // Defensa en profundidad: la routine ya filtra, pero el backend rechaza
  // igualmente hilos internos o de remitentes automáticos.
  if (senderDomain === config.internal_domain) {
    return { ok: false, error: `internal sender (${config.internal_domain})` };
  }
  if (config.excluded_senders.some((p) => senderEmail.includes(p))) {
    return { ok: false, error: "excluded sender pattern" };
  }

  const receivedAt = parseIsoOrNull(r.received_at);
  if (!receivedAt) {
    return { ok: false, error: "received_at must be an ISO timestamp" };
  }
  const lastMessageAt = parseIsoOrNull(r.last_message_at) ?? receivedAt;

  const firstResponseAt =
    r.first_response_at == null ? null : parseIsoOrNull(r.first_response_at);
  if (r.first_response_at != null && !firstResponseAt) {
    return { ok: false, error: "first_response_at must be ISO or null" };
  }

  const resolvedAt = r.resolved_at == null ? null : parseIsoOrNull(r.resolved_at);
  if (r.resolved_at != null && !resolvedAt) {
    return { ok: false, error: "resolved_at must be ISO or null" };
  }

  if (
    typeof r.business_hours_elapsed !== "number" ||
    !Number.isFinite(r.business_hours_elapsed) ||
    r.business_hours_elapsed < 0
  ) {
    return { ok: false, error: "business_hours_elapsed must be a number >= 0" };
  }

  let bhResolution: number | null = null;
  if (r.business_hours_to_resolution != null) {
    if (
      typeof r.business_hours_to_resolution !== "number" ||
      !Number.isFinite(r.business_hours_to_resolution) ||
      r.business_hours_to_resolution < 0
    ) {
      return {
        ok: false,
        error: "business_hours_to_resolution must be a number >= 0 or null",
      };
    }
    bhResolution = r.business_hours_to_resolution;
  }

  return {
    ok: true,
    row: {
      thread_id: r.thread_id.trim(),
      subject: typeof r.subject === "string" ? r.subject.slice(0, 500) : "",
      sender_email: senderEmail,
      sender_domain: senderDomain,
      received_at: receivedAt,
      first_response_at: firstResponseAt,
      last_message_at: lastMessageAt,
      business_hours_elapsed: r.business_hours_elapsed,
      business_hours_to_resolution: bhResolution,
      resolved_at: resolvedAt,
      metadata:
        r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
          ? (r.metadata as Record<string, unknown>)
          : {},
    },
  };
}

/* ---------- ventanas de tiempo en la TZ de config ---------- */

function tzOffsetMs(utc: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(utc)) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - utc.getTime();
}

function zonedYmdWeekday(
  utc: Date,
  timeZone: string
): { y: number; m: number; d: number; weekdayMon0: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(utc)) parts[p.type] = p.value;
  const WD: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    weekdayMon0: WD[parts.weekday] ?? 0,
  };
}

/** Instante UTC de la medianoche local de (y, m, d) en `timeZone`. */
function localMidnightUtc(y: number, m: number, d: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(y, m - 1, d));
  return new Date(guess.getTime() - tzOffsetMs(guess, timeZone));
}

export function startOfWeekUtc(now: Date, timeZone: string): Date {
  const { y, m, d, weekdayMon0 } = zonedYmdWeekday(now, timeZone);
  // Date.UTC normaliza días fuera de rango (d - weekdayMon0 puede ser <= 0).
  const target = new Date(Date.UTC(y, m - 1, d - weekdayMon0));
  return localMidnightUtc(
    target.getUTCFullYear(),
    target.getUTCMonth() + 1,
    target.getUTCDate(),
    timeZone
  );
}

export function startOfMonthUtc(now: Date, timeZone: string): Date {
  const { y, m } = zonedYmdWeekday(now, timeZone);
  return localMidnightUtc(y, m, 1, timeZone);
}

/** Día de la semana (0 = lunes … 6 = domingo) de un timestamp en la TZ de config. */
export function weekdayMon0(iso: string, timeZone: string): number {
  return zonedYmdWeekday(new Date(iso), timeZone).weekdayMon0;
}

/* ---------- KPIs ---------- */

function avg(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function computeKpis(
  threads: EmailThread[],
  config: EmailSlaConfig
): EmailSlaKpis {
  const responded = threads.filter((t) => t.first_response_at !== null);
  const respondedWithinSla = responded.filter(
    (t) => t.business_hours_elapsed <= config.sla_target_hours
  );
  const overdue = threads.filter((t) => t.status === "vencido");
  const atRisk = threads.filter((t) => t.status === "en_riesgo");
  const pending = threads.filter((t) => t.status === "pendiente");
  const resolved = threads.filter(
    (t) => t.resolved_at !== null && t.business_hours_to_resolution !== null
  );

  // % dentro del SLA: los pendientes que todavía no agotaron el target no
  // cuentan ni a favor ni en contra (solo respondidos + vencidos).
  const slaDenominator = responded.length + overdue.length;

  return {
    threads_total: threads.length,
    responded: responded.length,
    avg_first_response_hours: avg(
      responded.map((t) => t.business_hours_elapsed)
    ),
    pct_within_sla:
      slaDenominator > 0
        ? (respondedWithinSla.length / slaDenominator) * 100
        : null,
    unanswered: overdue.length + atRisk.length + pending.length,
    at_risk: atRisk.length,
    overdue: overdue.length,
    avg_resolution_hours: avg(
      resolved.map((t) => t.business_hours_to_resolution as number)
    ),
  };
}

export function computeDeltas(
  current: EmailSlaKpis,
  previous: EmailSlaKpis
): EmailSlaKpiDeltas {
  const diff = (a: number | null, b: number | null): number | null =>
    a === null || b === null ? null : a - b;
  return {
    avg_first_response_hours: diff(
      current.avg_first_response_hours,
      previous.avg_first_response_hours
    ),
    pct_within_sla: diff(current.pct_within_sla, previous.pct_within_sla),
    unanswered:
      previous.threads_total > 0 || current.threads_total > 0
        ? current.unanswered - previous.unanswered
        : null,
    avg_resolution_hours: diff(
      current.avg_resolution_hours,
      previous.avg_resolution_hours
    ),
  };
}

export type WeekdayAvg = {
  weekday: number; // 0 = lunes … 6 = domingo
  label: string;
  avg_hours: number | null;
  count: number;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function computeWeekdayAverages(
  threads: EmailThread[],
  config: EmailSlaConfig
): WeekdayAvg[] {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const t of threads) {
    if (t.first_response_at === null) continue;
    buckets[weekdayMon0(t.received_at, config.timezone)].push(
      t.business_hours_elapsed
    );
  }
  return buckets.map((xs, i) => ({
    weekday: i,
    label: WEEKDAY_LABELS[i],
    avg_hours: avg(xs),
    count: xs.length,
  }));
}
