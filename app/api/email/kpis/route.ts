import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-server";
import { loadConfig } from "@/lib/config";
import {
  computeDeltas,
  computeKpis,
  rowToThread,
  startOfMonthUtc,
  startOfWeekUtc,
  type EmailThreadRow,
} from "@/lib/email-sla";
import type { EmailThread, EmailThreadStatus } from "@/lib/types";

// KPIs agregados: semana actual (lun–dom en la TZ de config, bucketing por
// received_at) + acumulado del mes + delta vs semana anterior.
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const config = await loadConfig(supabase);
  const tz = config.email_sla.timezone;
  const now = new Date();

  const weekStart = startOfWeekUtc(now, tz);
  const prevWeekStart = new Date(weekStart.getTime() - 7 * 24 * 3600 * 1000);
  const monthStart = startOfMonthUtc(now, tz);
  const earliest = new Date(
    Math.min(prevWeekStart.getTime(), monthStart.getTime())
  );

  const { data, error } = await supabase
    .from("email_threads")
    .select("*")
    .gte("received_at", earliest.toISOString());

  if (error) {
    console.error("[email/kpis]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const threads = ((data ?? []) as EmailThreadRow[]).map((row) =>
    rowToThread(row, config.email_sla)
  );

  const inWindow = (t: EmailThread, from: Date, to?: Date) => {
    const r = Date.parse(t.received_at);
    return r >= from.getTime() && (to === undefined || r < to.getTime());
  };

  const weekThreads = threads.filter((t) => inWindow(t, weekStart));
  const prevWeekThreads = threads.filter((t) =>
    inWindow(t, prevWeekStart, weekStart)
  );
  const monthThreads = threads.filter((t) => inWindow(t, monthStart));

  const weekKpis = computeKpis(weekThreads, config.email_sla);
  const prevWeekKpis = computeKpis(prevWeekThreads, config.email_sla);

  const statusDistribution: Record<EmailThreadStatus, number> = {
    respondido: 0,
    pendiente: 0,
    en_riesgo: 0,
    vencido: 0,
  };
  for (const t of weekThreads) statusDistribution[t.status]++;

  return NextResponse.json({
    week: {
      from: weekStart.toISOString(),
      to: now.toISOString(),
      kpis: weekKpis,
      status_distribution: statusDistribution,
    },
    prev_week: {
      from: prevWeekStart.toISOString(),
      to: weekStart.toISOString(),
      kpis: prevWeekKpis,
    },
    month: {
      from: monthStart.toISOString(),
      kpis: computeKpis(monthThreads, config.email_sla),
    },
    deltas: computeDeltas(weekKpis, prevWeekKpis),
    config: {
      sla_target_hours: config.email_sla.sla_target_hours,
      at_risk_threshold_hours: config.email_sla.at_risk_threshold_hours,
      timezone: tz,
    },
    generated_at: now.toISOString(),
  });
}
