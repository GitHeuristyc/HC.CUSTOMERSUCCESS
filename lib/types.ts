export type UserId = "jesus" | "david";

export type User = {
  id: UserId;
  name: string;
  initials: string;
  email: string;
  color: string;
};

export type ProjectKey = "PK" | "AI" | "EDU" | "EXT" | "PRD" | "IMP" | "PRIM" | "PM" | "EOSCOMP";

export type Project = {
  key: ProjectKey;
  name: string;
  color: string;
  owner: UserId;
};

export type ColumnId =
  | "To Do"
  | "Discovery"
  | "In Progress"
  | "Open"
  | "Revision";

export type ColumnDef = { id: ColumnId; label: string };

export type Priority = "High" | "Medium" | "Low";

export type Issue = {
  key: string;
  project: ProjectKey;
  title: string;
  type: string;
  assignee: UserId;
  status: ColumnId;
  priority: Priority;
  updated: string;
  created: string;
  labels?: string[];
  awaitingApproval?: boolean;
  stale?: boolean;
};

export type ReminderStatus = "new" | "reviewed" | "completed";
export type ReminderSource = "fathom" | "manual";
export type ReminderAssignee = UserId | "both";
export type ReminderDue = "today" | "tomorrow" | "thisweek" | "nextweek";

export type Reminder = {
  id: string;
  source: ReminderSource;
  status: ReminderStatus;
  assignee: ReminderAssignee;
  title: string;
  meeting_title?: string;
  meeting_date?: string;
  fathom_link?: string;
  linked_jira_key?: string | null;
  tags: string[];
  captured_at: string;
  due?: ReminderDue;
};

export type EmailThreadStatus =
  | "respondido"
  | "pendiente"
  | "en_riesgo"
  | "vencido";

export type EmailThread = {
  thread_id: string;
  subject: string;
  sender_email: string;
  sender_domain: string;
  received_at: string;
  first_response_at: string | null;
  last_message_at: string;
  status: EmailThreadStatus;
  business_hours_elapsed: number;
  business_hours_to_resolution: number | null;
  resolved_at: string | null;
};

export type EmailSlaKpis = {
  threads_total: number;
  responded: number;
  avg_first_response_hours: number | null;
  pct_within_sla: number | null;
  unanswered: number;
  at_risk: number;
  overdue: number;
  avg_resolution_hours: number | null;
};

export type EmailSlaKpiDeltas = {
  avg_first_response_hours: number | null;
  pct_within_sla: number | null;
  unanswered: number | null;
  avg_resolution_hours: number | null;
};

export type Tweaks = {
  theme: "dark" | "light";
  density: "compact" | "cozy" | "roomy";
  showReminders: boolean;
  colorfulCards: boolean;
  userFilter: UserId | "both";
};

export type UserFilter = UserId | "both";
export type PriorityFilter = "all" | Priority;
