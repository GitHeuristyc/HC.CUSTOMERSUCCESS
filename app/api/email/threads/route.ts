import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-server";
import { loadConfig } from "@/lib/config";
import {
  rowToThread,
  sortByUrgency,
  type EmailThreadRow,
} from "@/lib/email-sla";

const MAX_PAGE_SIZE = 200;

// Hilos sin responder, ordenados por urgencia (vencido → en_riesgo → pendiente,
// y dentro de cada grupo por horas laborales transcurridas desc).
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

  const all = sortByUrgency(
    ((data ?? []) as EmailThreadRow[]).map((row) =>
      rowToThread(row, config.email_sla)
    )
  );
  const start = (page - 1) * pageSize;

  return NextResponse.json({
    threads: all.slice(start, start + pageSize),
    total: all.length,
    page,
    page_size: pageSize,
  });
}
