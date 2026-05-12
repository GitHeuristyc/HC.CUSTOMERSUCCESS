import { NextResponse, type NextRequest } from "next/server";
import {
  assigneeToUuid,
  getSupabaseServerClient,
  getUserMaps,
} from "@/lib/supabase";
import {
  isAssignee,
  isSource,
  rowToReminder,
  type ReminderRow,
} from "@/lib/reminders";

export async function POST(req: NextRequest) {
  const providedKey = req.headers.get("x-api-key");
  const expectedKey = process.env.ROUTINE_API_KEY;
  if (!expectedKey) {
    return NextResponse.json(
      { error: "ROUTINE_API_KEY not configured on server" },
      { status: 500 }
    );
  }
  if (providedKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const maps = await getUserMaps(supabase);
  if (!maps) {
    return NextResponse.json({ error: "User mapping unavailable" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reminders =
    body && typeof body === "object" && Array.isArray((body as { reminders?: unknown }).reminders)
      ? ((body as { reminders: unknown[] }).reminders)
      : null;
  if (!reminders) {
    return NextResponse.json(
      { error: "Body must be { reminders: [...] }" },
      { status: 400 }
    );
  }

  const rows: Array<Record<string, unknown>> = [];
  const errors: Array<{ index: number; error: string }> = [];

  reminders.forEach((item, idx) => {
    if (!item || typeof item !== "object") {
      errors.push({ index: idx, error: "not an object" });
      return;
    }
    const r = item as Record<string, unknown>;
    if (typeof r.dedup_key !== "string" || r.dedup_key.length === 0) {
      errors.push({ index: idx, error: "dedup_key required" });
      return;
    }
    if (typeof r.title !== "string" || r.title.length === 0) {
      errors.push({ index: idx, error: "title required" });
      return;
    }
    const source = isSource(r.source) ? r.source : "fathom";
    const assignee = isAssignee(r.assignee) ? r.assignee : "both";

    rows.push({
      source,
      title: r.title,
      body: typeof r.body === "string" ? r.body : null,
      status: "new",
      assigned_to: assigneeToUuid(assignee, maps),
      fathom_link: typeof r.fathom_link === "string" ? r.fathom_link : null,
      fathom_meeting_id:
        typeof r.fathom_meeting_id === "string" ? r.fathom_meeting_id : null,
      linked_jira_key:
        typeof r.linked_jira_key === "string" ? r.linked_jira_key : null,
      meeting_date: typeof r.meeting_date === "string" ? r.meeting_date : null,
      meeting_title:
        typeof r.meeting_title === "string" ? r.meeting_title : null,
      dedup_key: r.dedup_key,
      tags: Array.isArray(r.tags)
        ? (r.tags as unknown[]).filter((t) => typeof t === "string")
        : [],
    });
  });

  if (rows.length === 0) {
    return NextResponse.json({ inserted: 0, errors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reminders")
    .upsert(rows, { onConflict: "dedup_key", ignoreDuplicates: false })
    .select("*");

  if (error) {
    console.error("[reminders/batch]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    inserted: data?.length ?? 0,
    errors,
    reminders: (data as ReminderRow[] | null ?? []).map((row) =>
      rowToReminder(row, maps)
    ),
  });
}
