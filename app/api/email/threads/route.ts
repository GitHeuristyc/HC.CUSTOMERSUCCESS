import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-server";
import { loadConfig } from "@/lib/config";
import {
  matchesMailbox,
  rowToThread,
  sortByUrgency,
  type EmailThreadRow,
} from "@/lib/email-sla";

const MAX_PAGE_SIZE = 200;

// Hilos sin responder, ordenados por urgencia (vencido → en_riesgo → pendiente,
// y dentro de cada grupo por horas laborales transcurridas desc).
// Query params:
//   - mailbox: filtra por buzón (metadata.mailbox; soporta multi-buzón por coma)
//   - dismissed=true: devuelve los descartados ("no requiere respuesta") en vez
//     de los pendientes
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured", threads: [] },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(searchParams.get("page_size")) || 50)
  );
  const mailbox = searchParams.get("mailbox");
  const showDismissed = searchParams.get("dismissed") === "true";

  const config = await loadConfig(supabase);

  const { data, error } = await supabase
    .from("email_threads")
    .select("*")
    .is("first_response_at", null)
    .is("resolved_at", null)
    .order("received_at", { ascending: true });

  if (error) {
    console.error("[email/threads GET]", error);
    return NextResponse.json({ error: error.message, threads: [] }, { status: 500 });
  }

  const rows = (data ?? []) as EmailThreadRow[];
  const allThreads = rows.map((row) => rowToThread(row, config.email_sla));

  // Opciones de filtro: buzones presentes en todos los pendientes, sin filtrar.
  const mailboxes = [
    ...new Set(
      allThreads.flatMap((t) =>
        (t.mailbox ?? "").split(",").map((m) => m.trim().toLowerCase()).filter(Boolean)
      )
    ),
  ].sort();

  const byMailbox = mailbox
    ? allThreads.filter((t) => matchesMailbox(t, mailbox))
    : allThreads;
  const dismissedCount = byMailbox.filter((t) => t.dismissed_at !== null).length;
  const visible = byMailbox.filter((t) =>
    showDismissed ? t.dismissed_at !== null : t.dismissed_at === null
  );

  const all = sortByUrgency(visible);
  const start = (page - 1) * pageSize;

  return NextResponse.json({
    threads: all.slice(start, start + pageSize),
    total: all.length,
    dismissed_total: dismissedCount,
    mailboxes,
    page,
    page_size: pageSize,
  });
}

// Marcar / desmarcar un hilo como "no requiere respuesta".
// El thread_id va en el body (no en la ruta) porque los conversationId de
// Outlook contienen caracteres hostiles para URLs.
export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

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

  const r = (body ?? {}) as Record<string, unknown>;
  if (typeof r.thread_id !== "string" || r.thread_id.trim().length === 0) {
    return NextResponse.json({ error: "thread_id required" }, { status: 400 });
  }
  if (typeof r.dismissed !== "boolean") {
    return NextResponse.json(
      { error: "dismissed must be a boolean" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("email_threads")
    .update(
      r.dismissed
        ? { dismissed_at: new Date().toISOString(), dismissed_by: auth.user.email }
        : { dismissed_at: null, dismissed_by: null }
    )
    .eq("thread_id", r.thread_id)
    .select("thread_id, dismissed_at, dismissed_by");

  if (error) {
    console.error("[email/threads PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }

  return NextResponse.json({ thread: data[0] });
}
