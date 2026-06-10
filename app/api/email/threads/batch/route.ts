import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { loadConfig } from "@/lib/config";
import { validateIngestItem, type IngestRow } from "@/lib/email-sla";

// Ingesta de la routine de email (mismo mecanismo que /api/reminders/batch):
// auth por header `x-api-key` = ROUTINE_API_KEY, upsert idempotente por thread_id.
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const list =
    body && typeof body === "object" && Array.isArray((body as { threads?: unknown }).threads)
      ? (body as { threads: unknown[] }).threads
      : null;

  if (!list) {
    return NextResponse.json(
      { error: "Body must be { threads: [...] }" },
      { status: 400 }
    );
  }

  const config = await loadConfig(supabase);
  const rows: IngestRow[] = [];
  const errors: Array<{ index: number; thread_id?: string; error: string }> = [];

  list.forEach((item, idx) => {
    const result = validateIngestItem(item, config.email_sla);
    if (result.ok) {
      rows.push(result.row);
    } else {
      const tid =
        item && typeof item === "object" && typeof (item as Record<string, unknown>).thread_id === "string"
          ? ((item as Record<string, unknown>).thread_id as string)
          : undefined;
      errors.push({ index: idx, thread_id: tid, error: result.error });
    }
  });

  if (rows.length === 0) {
    return NextResponse.json({ inserted: [], updated: [], errors }, { status: 400 });
  }

  // Distinguir insert vs update para reportarlo a la routine.
  const ids = rows.map((r) => r.thread_id);
  const { data: existing } = await supabase
    .from("email_threads")
    .select("thread_id")
    .in("thread_id", ids);
  const existingIds = new Set((existing ?? []).map((r) => r.thread_id as string));

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("email_threads")
    .upsert(
      rows.map((r) => ({ ...r, updated_at: now })),
      { onConflict: "thread_id", ignoreDuplicates: false }
    );

  if (error) {
    console.error("[email/threads/batch]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    inserted: ids.filter((id) => !existingIds.has(id)),
    updated: ids.filter((id) => existingIds.has(id)),
    errors,
  });
}
