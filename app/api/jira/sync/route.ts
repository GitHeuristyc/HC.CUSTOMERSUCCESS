import { NextResponse } from "next/server";
import { fetchAllJiraIssues } from "@/lib/jira";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function POST() {
  const supabase = getSupabaseServerClient();

  try {
    const issues = await fetchAllJiraIssues();
    const now = new Date().toISOString();

    if (supabase && issues.length > 0) {
      // Clear stale cache entries not in current result
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

    return NextResponse.json({ synced: issues.length, synced_at: now });
  } catch (err) {
    console.error("[jira/sync]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
