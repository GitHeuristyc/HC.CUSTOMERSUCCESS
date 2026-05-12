import type {
  Reminder,
  ReminderAssignee,
  ReminderDue,
  ReminderSource,
  ReminderStatus,
} from "./types";
import { uuidToAssignee, type getUserMaps } from "./supabase";

const DUE_PREFIX = "due:";
const DUE_VALUES: ReminderDue[] = ["today", "tomorrow", "thisweek", "nextweek"];

function isDue(v: string): v is ReminderDue {
  return (DUE_VALUES as string[]).includes(v);
}

export function extractDue(tags: string[]): { due?: ReminderDue; rest: string[] } {
  let due: ReminderDue | undefined;
  const rest: string[] = [];
  for (const t of tags) {
    if (t.startsWith(DUE_PREFIX)) {
      const v = t.slice(DUE_PREFIX.length);
      if (isDue(v)) {
        due = v;
        continue;
      }
    }
    rest.push(t);
  }
  return { due, rest };
}

export function encodeDueTag(due?: ReminderDue | null): string | null {
  if (!due || !isDue(due)) return null;
  return `${DUE_PREFIX}${due}`;
}

type UserMaps = NonNullable<Awaited<ReturnType<typeof getUserMaps>>>;

export type ReminderRow = {
  id: string;
  source: string;
  title: string;
  body: string | null;
  status: string;
  assigned_to: string | null;
  fathom_link: string | null;
  fathom_meeting_id: string | null;
  linked_jira_key: string | null;
  meeting_date: string | null;
  meeting_title: string | null;
  dedup_key: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

export function rowToReminder(row: ReminderRow, maps: UserMaps): Reminder {
  const { due, rest } = extractDue(row.tags ?? []);
  return {
    id: row.id,
    source: row.source as ReminderSource,
    status: row.status as ReminderStatus,
    assignee: uuidToAssignee(row.assigned_to, maps),
    title: row.title,
    meeting_title: row.meeting_title ?? undefined,
    meeting_date: row.meeting_date ?? undefined,
    fathom_link: row.fathom_link ?? undefined,
    linked_jira_key: row.linked_jira_key,
    tags: rest,
    captured_at: row.created_at,
    due,
  };
}

export const REMINDER_STATUSES: ReminderStatus[] = [
  "new",
  "reviewed",
  "completed",
];
export const REMINDER_SOURCES: ReminderSource[] = ["fathom", "manual"];
export const REMINDER_ASSIGNEES: ReminderAssignee[] = ["jesus", "david", "both"];

export function isStatus(v: unknown): v is ReminderStatus {
  return typeof v === "string" && REMINDER_STATUSES.includes(v as ReminderStatus);
}
export function isSource(v: unknown): v is ReminderSource {
  return typeof v === "string" && REMINDER_SOURCES.includes(v as ReminderSource);
}
export function isAssignee(v: unknown): v is ReminderAssignee {
  return (
    typeof v === "string" && REMINDER_ASSIGNEES.includes(v as ReminderAssignee)
  );
}
