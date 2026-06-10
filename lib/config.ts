import type { SupabaseClient } from "@supabase/supabase-js";

export type AlertRules = {
  inactivity_days: number;
  highlight_awaiting_approval: boolean;
  highlight_high_priority: boolean;
};

export type EmailSlaConfig = {
  sla_target_hours: number;
  at_risk_threshold_hours: number;
  business_hours: { days: number[]; start: string; end: string };
  timezone: string;
  internal_domain: string;
  excluded_senders: string[];
};

export type AppConfig = {
  excluded_projects: string[];
  alert_rules: AlertRules;
  sync_interval_minutes: number;
  routine_last_sweep: string | null;
  email_sla: EmailSlaConfig;
};

export const DEFAULT_EMAIL_SLA_CONFIG: EmailSlaConfig = {
  sla_target_hours: 24,
  at_risk_threshold_hours: 20,
  business_hours: { days: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" },
  timezone: "America/New_York",
  internal_domain: "heuristyc.com",
  excluded_senders: [
    "no-reply",
    "noreply",
    "notifications@",
    "mailer-daemon",
    "donotreply",
  ],
};

export const DEFAULT_CONFIG: AppConfig = {
  excluded_projects: ["CST", "HP", "HR", "ARQ", "PM"],
  alert_rules: {
    inactivity_days: 7,
    highlight_awaiting_approval: true,
    highlight_high_priority: true,
  },
  sync_interval_minutes: 10,
  routine_last_sweep: null,
  email_sla: DEFAULT_EMAIL_SLA_CONFIG,
};

const CONFIG_KEYS = [
  "excluded_projects",
  "alert_rules",
  "sync_interval_minutes",
  "routine_last_sweep",
  "email_sla",
] as const;

export async function loadConfig(client: SupabaseClient): Promise<AppConfig> {
  const { data, error } = await client.from("config").select("key, value");
  if (error || !data) return DEFAULT_CONFIG;

  const map = new Map(data.map((r) => [r.key as string, r.value]));
  return {
    excluded_projects:
      (map.get("excluded_projects") as string[] | undefined) ??
      DEFAULT_CONFIG.excluded_projects,
    alert_rules:
      (map.get("alert_rules") as AlertRules | undefined) ??
      DEFAULT_CONFIG.alert_rules,
    sync_interval_minutes:
      (map.get("sync_interval_minutes") as number | undefined) ??
      DEFAULT_CONFIG.sync_interval_minutes,
    routine_last_sweep:
      (map.get("routine_last_sweep") as string | undefined) ?? null,
    email_sla:
      validateEmailSlaConfig(map.get("email_sla")) ?? DEFAULT_EMAIL_SLA_CONFIG,
  };
}

export function isConfigKey(k: string): k is (typeof CONFIG_KEYS)[number] {
  return (CONFIG_KEYS as readonly string[]).includes(k);
}

export function validateAlertRules(v: unknown): AlertRules | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (
    typeof r.inactivity_days !== "number" ||
    typeof r.highlight_awaiting_approval !== "boolean" ||
    typeof r.highlight_high_priority !== "boolean"
  ) {
    return null;
  }
  return {
    inactivity_days: Math.max(1, Math.floor(r.inactivity_days)),
    highlight_awaiting_approval: r.highlight_awaiting_approval,
    highlight_high_priority: r.highlight_high_priority,
  };
}

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateEmailSlaConfig(v: unknown): EmailSlaConfig | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const bh = r.business_hours as Record<string, unknown> | undefined;
  if (
    typeof r.sla_target_hours !== "number" ||
    r.sla_target_hours <= 0 ||
    typeof r.at_risk_threshold_hours !== "number" ||
    r.at_risk_threshold_hours <= 0 ||
    r.at_risk_threshold_hours > r.sla_target_hours ||
    typeof r.timezone !== "string" ||
    r.timezone.length === 0 ||
    typeof r.internal_domain !== "string" ||
    r.internal_domain.length === 0 ||
    !Array.isArray(r.excluded_senders) ||
    !r.excluded_senders.every((s) => typeof s === "string") ||
    !bh ||
    typeof bh !== "object" ||
    !Array.isArray(bh.days) ||
    !bh.days.every((d) => typeof d === "number" && d >= 1 && d <= 7) ||
    typeof bh.start !== "string" ||
    !HHMM_RE.test(bh.start) ||
    typeof bh.end !== "string" ||
    !HHMM_RE.test(bh.end)
  ) {
    return null;
  }
  // Reject invalid IANA timezones early — they would crash Intl at read time.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: r.timezone });
  } catch {
    return null;
  }
  return {
    sla_target_hours: r.sla_target_hours,
    at_risk_threshold_hours: r.at_risk_threshold_hours,
    business_hours: {
      days: bh.days as number[],
      start: bh.start as string,
      end: bh.end as string,
    },
    timezone: r.timezone,
    internal_domain: r.internal_domain.toLowerCase(),
    excluded_senders: (r.excluded_senders as string[]).map((s) =>
      s.trim().toLowerCase()
    ),
  };
}

export function validateExcludedProjects(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  if (!v.every((x) => typeof x === "string")) return null;
  return v.map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0);
}
