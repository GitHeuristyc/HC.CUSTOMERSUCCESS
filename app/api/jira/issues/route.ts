import { NextResponse } from "next/server";
import { fetchAllJiraIssues } from "@/lib/jira";
import { getSupabaseServerClient } from "@/lib/supabase";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  const supabase = getSupabaseServerClient();

  // Try Supabase cache first
  if (supabase) {
    const { data: cached, error } = await supabase
      .from("jira_issues_cache")
      .select("issue_key, data, synced_at")
      .order("synced_at", { ascending: false })
      .limit(1);

    if (!error && cached && cached.length > 0) {
      const syncedAt = new Date(cached[0].synced_at).getTime();
      if (Date.now() - syncedAt < CACHE_TTL_MS) {
        // Return full cache
        const { data: all } = await supabase
          .from("jira_issues_cache")
          .select("data, synced_at");
        return NextResponse.json({
          issues: (all ?? []).map((r) => r.data),
          synced_at: cached[0].synced_at,
          source: "cache",
        });
      }
    }
  }

  // Fetch fresh from Jira
  try {
    const issues = await fetchAllJiraIssues();
    const now = new Date().toISOString();

    // Persist to cache
    if (supabase && issues.length > 0) {
      // Delete stale entries not in current result set
      const currentKeys = issues.map((i) => i.key);
      await supabase
        .from("jira_issues_cache")
        .delete()
        .not("issue_key", "in", `(${currentKeys.map((k) => `"${k}"`).join(",")})`);

      await supabase.from("jira_issues_cache").upsert(
        issues.map((issue) => ({
          issue_key: issue.key,
          data: issue,
          synced_at: now,
        })),
        { onConflict: "issue_key" }
      );
    }

    return NextResponse.json({ issues, synced_at: now, source: "jira" });
  } catch (err) {
    console.error("[jira/issues]", err);
    return NextResponse.json(
      { error: (err as Error).message, issues: [], synced_at: null, source: "error" },
      { status: 500 }
    );
  }
}
