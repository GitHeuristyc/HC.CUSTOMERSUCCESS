import type { SupabaseClient } from "@supabase/supabase-js";

export type AlertRules = {
  inactivity_days: number;
  highlight_awaiting_approval: boolean;
  highlight_high_priority: boolean;
};

export type AppConfig = {
  excluded_projects: string[];
  alert_rules: AlertRules;
  sync_interval_minutes: number;
  routine_last_sweep: string | null;
};

export const DEFAULT_CONFIG: AppConfig = {
  excluded_projects: ["CST", "HP", "HR", "ARQ", "EOSCOMP"],
  alert_rules: {
    inactivity_days: 7,
    highlight_awaiting_approval: true,
    highlight_high_priority: true,
  },
  sync_interval_minutes: 10,
  routine_last_sweep: null,
};

const CONFIG_KEYS = [
  "excluded_projects",
  "alert_rules",
  "sync_interval_minutes",
  "routine_last_sweep",
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

export function validateExcludedProjects(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  if (!v.every((x) => typeof x === "string")) return null;
  return v.map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0);
}
