import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-server";
import { loadConfig } from "@/lib/config";
import {
  computeWeekdayAverages,
  matchesMailbox,
  rowToThread,
  type EmailThreadRow,
} from "@/lib/email-sla";

const WINDOW_DAYS = 28;

// Promedio de horas laborales de primera respuesta por día de la semana
// (según received_at en la TZ de config), últimas 4 semanas. ?mailbox= filtra.
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const config = await loadConfig(supabase);
  const from = new Date(Date.now() - WINDOW_DAYS * 24 * 3600 * 1000);

  const { data, error } = await supabase
    .from("email_threads")
    .select("*")
    .gte("received_at", from.toISOString())
    .not("first_response_at", "is", null);

  if (error) {
    console.error("[email/weekday-avg]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mailbox = new URL(req.url).searchParams.get("mailbox");
  const threads = ((data ?? []) as EmailThreadRow[])
    .map((row) => rowToThread(row, config.email_sla))
    .filter((t) => t.dismissed_at === null)
    .filter((t) => (mailbox ? matchesMailbox(t, mailbox) : true));

  return NextResponse.json({
    weekdays: computeWeekdayAverages(threads, config.email_sla),
    window_days: WINDOW_DAYS,
    from: from.toISOString(),
  });
}
