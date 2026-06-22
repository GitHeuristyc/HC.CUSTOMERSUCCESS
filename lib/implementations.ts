import type { PrimImplementationRaw } from "./jira";

// Ciclo de vida (excluyente, por status):
//  - closed:        status Closed (statusCategory Done)
//  - post_go_live:  status "Post-Go Live" (ya salió en vivo)
//  - active:        cualquier otro (Open, Configuration, Discovery, UAT…)
export type ImplLifecycle = "active" | "post_go_live" | "closed";

export type PrimImplementation = {
  key: string;
  summary: string;
  status: string;
  lifecycle: ImplLifecycle;
  assignee: string | null;
  go_live: string | null; // YYYY-MM-DD o null
  missing_go_live: boolean;
  outdated: boolean;
  url: string;
};

export type ImplementationsSummary = {
  total: number;
  active: number;
  post_go_live: number;
  closed: number;
  missing_go_live: number; // sin fecha, entre las no cerradas
  outdated: number; // Go Live ya pasó y sigue activa
};

function lifecycleOf(raw: PrimImplementationRaw): ImplLifecycle {
  if (raw.statusCategory === "done" || raw.status === "Closed") return "closed";
  if (raw.status === "Post-Go Live") return "post_go_live";
  return "active";
}

/** Normaliza el valor del campo Go Live a YYYY-MM-DD, o null si no es parseable. */
function normalizeGoLive(value: string | null): string | null {
  if (!value) return null;
  // El campo es de tipo date; Jira puede devolver "2026-08-01" o ISO completo.
  const ymd = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

/**
 * Categoriza una implementación. `todayYmd` se pasa explícito (no se lee el reloj
 * acá) para que el cálculo de "outdated" sea testeable y consistente por request.
 */
export function categorize(
  raw: PrimImplementationRaw,
  todayYmd: string
): PrimImplementation {
  const lifecycle = lifecycleOf(raw);
  const goLive = normalizeGoLive(raw.goLive);
  return {
    key: raw.key,
    summary: raw.summary,
    status: raw.status,
    lifecycle,
    assignee: raw.assignee,
    go_live: goLive,
    missing_go_live: lifecycle !== "closed" && goLive === null,
    // "Go Live ya pasó y sigue abierta": fecha en el pasado + ciclo activo.
    outdated: lifecycle === "active" && goLive !== null && goLive < todayYmd,
    url: raw.url,
  };
}

export function summarize(impls: PrimImplementation[]): ImplementationsSummary {
  return {
    total: impls.length,
    active: impls.filter((i) => i.lifecycle === "active").length,
    post_go_live: impls.filter((i) => i.lifecycle === "post_go_live").length,
    closed: impls.filter((i) => i.lifecycle === "closed").length,
    missing_go_live: impls.filter((i) => i.missing_go_live).length,
    outdated: impls.filter((i) => i.outdated).length,
  };
}

const LIFECYCLE_ORDER: Record<ImplLifecycle, number> = {
  active: 0,
  post_go_live: 1,
  closed: 2,
};

/** Tracker: implementaciones que requieren atención (sin Go Live u outdated). */
export function attentionList(impls: PrimImplementation[]): PrimImplementation[] {
  return impls
    .filter((i) => i.missing_go_live || i.outdated)
    .sort((a, b) => {
      // outdated primero, luego por ciclo de vida, luego por key.
      if (a.outdated !== b.outdated) return a.outdated ? -1 : 1;
      const byLife = LIFECYCLE_ORDER[a.lifecycle] - LIFECYCLE_ORDER[b.lifecycle];
      if (byLife !== 0) return byLife;
      return a.key.localeCompare(b.key);
    });
}
