import { NextResponse, type NextRequest } from "next/server";
import {
  assigneeToUuid,
  getSupabaseServerClient,
  getUserMaps,
} from "@/lib/supabase";
import {
  encodeDueTag,
  isAssignee,
  isStatus,
  rowToReminder,
  type ReminderRow,
} from "@/lib/reminders";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured", reminders: [] },
      { status: 500 }
    );
  }

  const maps = await getUserMaps(supabase);
  if (!maps) {
    return NextResponse.json(
      { error: "User mapping unavailable", reminders: [] },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const assigneeParam = searchParams.get("assignee");
  const statusParam = searchParams.get("status");

  let query = supabase
    .from("reminders")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusParam && isStatus(statusParam)) {
    query = query.eq("status", statusParam);
  }
  if (assigneeParam && isAssignee(assigneeParam)) {
    const uuid = assigneeToUuid(assigneeParam, maps);
    query = uuid === null ? query.is("assigned_to", null) : query.eq("assigned_to", uuid);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[reminders GET]", error);
    return NextResponse.json(
      { error: error.message, reminders: [] },
      { status: 500 }
    );
  }

  const reminders = (data as ReminderRow[]).map((row) => rowToReminder(row, maps));
  return NextResponse.json({ reminders });
}

export async function POST(req: NextRequest) {
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
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body required" }, { status: 400 });
  }

  const {
    title,
    assignee,
    linked_jira_key,
    tags,
    meeting_title,
    meeting_date,
    due,
  } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  if (!isAssignee(assignee)) {
    return NextResponse.json(
      { error: "assignee must be 'jesus' | 'david' | 'both'" },
      { status: 400 }
    );
  }

  const baseTags = Array.isArray(tags)
    ? tags.filter((t): t is string => typeof t === "string")
    : [];
  const dueTag = typeof due === "string" ? encodeDueTag(due as never) : null;
  const allTags = dueTag ? [...baseTags, dueTag] : baseTags;

  const insert = {
    source: "manual" as const,
    title: title.trim(),
    status: "new" as const,
    assigned_to: assigneeToUuid(assignee, maps),
    linked_jira_key:
      typeof linked_jira_key === "string" && linked_jira_key.trim().length > 0
        ? linked_jira_key.trim().toUpperCase()
        : null,
    meeting_title: typeof meeting_title === "string" ? meeting_title : null,
    meeting_date: typeof meeting_date === "string" ? meeting_date : null,
    tags: allTags,
  };

  const { data, error } = await supabase
    .from("reminders")
    .insert(insert)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[reminders POST]", error);
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { reminder: rowToReminder(data as ReminderRow, maps) },
    { status: 201 }
  );
}
