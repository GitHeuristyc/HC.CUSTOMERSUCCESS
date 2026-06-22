import { NextResponse } from "next/server";
import { fetchPrimImplementations } from "@/lib/jira";
import { requireUser } from "@/lib/supabase-server";
import {
  attentionList,
  categorize,
  summarize,
} from "@/lib/implementations";

// Fecha de hoy (YYYY-MM-DD) en la TZ del negocio, para el cálculo de "outdated".
function todayInTz(timeZone: string): string {
  // en-CA da formato YYYY-MM-DD directamente.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const today = todayInTz("America/New_York");

  try {
    const raw = await fetchPrimImplementations();
    const implementations = raw.map((r) => categorize(r, today));
    return NextResponse.json({
      implementations,
      attention: attentionList(implementations),
      summary: summarize(implementations),
      today,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[implementations]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
