import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  loadConfig,
  validateAlertRules,
  validateExcludedProjects,
  type AppConfig,
} from "@/lib/config";

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const config = await loadConfig(supabase);
  return NextResponse.json({ config });
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body required" }, { status: 400 });
  }

  const input = body as Partial<AppConfig>;
  const updates: Array<{ key: string; value: unknown }> = [];
  let excludedProjectsChanged = false;

  if ("excluded_projects" in input) {
    const v = validateExcludedProjects(input.excluded_projects);
    if (!v)
      return NextResponse.json(
        { error: "excluded_projects must be string[]" },
        { status: 400 }
      );
    updates.push({ key: "excluded_projects", value: v });
    excludedProjectsChanged = true;
  }
  if ("alert_rules" in input) {
    const v = validateAlertRules(input.alert_rules);
    if (!v)
      return NextResponse.json({ error: "invalid alert_rules shape" }, { status: 400 });
    updates.push({ key: "alert_rules", value: v });
  }
  if ("sync_interval_minutes" in input) {
    const n = input.sync_interval_minutes;
    if (typeof n !== "number" || n < 1)
      return NextResponse.json(
        { error: "sync_interval_minutes must be number >= 1" },
        { status: 400 }
      );
    updates.push({ key: "sync_interval_minutes", value: Math.floor(n) });
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No updatable fields in body" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("config").upsert(
    updates.map((u) => ({ ...u, updated_at: now })),
    { onConflict: "key" }
  );
  if (error) {
    console.error("[config PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalidate Jira cache if exclusions changed — force re-fetch on next GET.
  if (excludedProjectsChanged) {
    await supabase.from("jira_issues_cache").delete().neq("issue_key", "");
  }

  const config = await loadConfig(supabase);
  return NextResponse.json({ config, invalidated_jira_cache: excludedProjectsChanged });
}
