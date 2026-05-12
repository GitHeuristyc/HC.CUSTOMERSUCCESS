import { NextResponse, type NextRequest } from "next/server";
import {
  assigneeToUuid,
  getSupabaseServerClient,
  getUserMaps,
} from "@/lib/supabase";
import {
  isAssignee,
  isStatus,
  rowToReminder,
  type ReminderRow,
} from "@/lib/reminders";

type RouteCtx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
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

  const input = body as Record<string, unknown>;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if ("status" in input) {
    if (!isStatus(input.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = input.status;
  }
  if ("assignee" in input) {
    if (!isAssignee(input.assignee)) {
      return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    }
    update.assigned_to = assigneeToUuid(input.assignee, maps);
  }
  if ("title" in input && typeof input.title === "string") {
    update.title = input.title.trim();
  }
  if ("linked_jira_key" in input) {
    update.linked_jira_key =
      typeof input.linked_jira_key === "string" ? input.linked_jira_key : null;
  }
  if ("tags" in input && Array.isArray(input.tags)) {
    update.tags = input.tags.filter((t) => typeof t === "string");
  }

  const { data, error } = await supabase
    .from("reminders")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[reminders PATCH]", error);
    const status = error?.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status }
    );
  }

  return NextResponse.json({
    reminder: rowToReminder(data as ReminderRow, maps),
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { error } = await supabase.from("reminders").delete().eq("id", params.id);
  if (error) {
    console.error("[reminders DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: params.id });
}
