import type { ColumnDef, Issue, Project, ProjectKey, Reminder, User, UserId } from "./types";

export const USERS: Record<UserId, User> = {
  jesus: {
    id: "jesus",
    name: "Jesus Rincon",
    initials: "JR",
    email: "jrincon@heuristyc.com",
    color: "var(--ext)",
  },
  david: {
    id: "david",
    name: "David Corredor",
    initials: "DC",
    email: "david@heuristyc.com",
    color: "var(--pk)",
  },
};

export const PROJECTS: Record<ProjectKey, Project> = {
  PK:   { key: "PK",   name: "Product Kit",     color: "var(--pk)",   owner: "jesus" },
  AI:   { key: "AI",   name: "AI Initiatives",  color: "var(--ai)",   owner: "jesus" },
  EDU:  { key: "EDU",  name: "Education",       color: "var(--edu)",  owner: "jesus" },
  EXT:  { key: "EXT",  name: "Extensions",      color: "var(--ext)",  owner: "david" },
  PRD:  { key: "PRD",  name: "Product Dev",     color: "var(--prd)",  owner: "david" },
  IMP:  { key: "IMP",  name: "Implementation",  color: "var(--imp)",  owner: "david" },
  PRIM: { key: "PRIM", name: "Primary",         color: "var(--prim)", owner: "david" },
  PM:   { key: "PM",   name: "Project Mgmt",    color: "var(--pm)",   owner: "david" },
};

export const COLUMNS: ColumnDef[] = [
  { id: "Backlog",     label: "Backlog" },
  { id: "To Do",       label: "To Do" },
  { id: "Discovery",   label: "Discovery" },
  { id: "In Progress", label: "In Progress" },
  { id: "Open",        label: "Open" },
  { id: "Revision",    label: "Revision" },
];

export const ISSUES: Issue[] = [
  // ── Jesus (PK / AI / EDU) ────────────────────────────────────────
  { key: "AI-150", project: "AI", title: "AI Repo Project Summary", type: "Story",
    assignee: "jesus", status: "In Progress", priority: "High",
    updated: "2d", created: "12d", labels: ["q2-priority"] },

  { key: "AI-142", project: "AI", title: "Prompt library eval harness", type: "Task",
    assignee: "jesus", status: "Discovery", priority: "Medium",
    updated: "4h", created: "6d" },

  { key: "PK-1394", project: "PK", title: "Lookbook export to PDF with brand cover", type: "Story",
    assignee: "jesus", status: "In Progress", priority: "Medium",
    updated: "1d", created: "9d", labels: ["lookbook"] },

  { key: "PK-1388", project: "PK", title: "Price list reconcile — Q2 refresh", type: "Task",
    assignee: "jesus", status: "To Do", priority: "Medium",
    updated: "3d", created: "8d" },

  { key: "PK-1372", project: "PK", title: "Duplicate SKU detection rule", type: "Bug",
    assignee: "jesus", status: "Open", priority: "Low",
    updated: "9d", created: "15d", stale: true },

  { key: "EDU-58", project: "EDU", title: "Designer onboarding — module 3 revamp", type: "Story",
    assignee: "jesus", status: "Discovery", priority: "Medium",
    updated: "5h", created: "3d" },

  { key: "EDU-61", project: "EDU", title: "Record walkthrough: Configurator basics", type: "Task",
    assignee: "jesus", status: "Backlog", priority: "Low",
    updated: "1d", created: "1d" },

  { key: "AI-151", project: "AI", title: "Fathom ↔ Jira linker prompt", type: "Task",
    assignee: "jesus", status: "Backlog", priority: "Medium",
    updated: "6h", created: "6h" },

  // ── David (EXT / PRD / IMP / PRIM / PM) ───────────────────────────
  { key: "EXT-2919", project: "EXT", title: "Square Foot Costing", type: "Story",
    assignee: "david", status: "In Progress", priority: "High",
    updated: "1h", created: "4d", labels: ["q2-priority"] },

  { key: "PRD-182", project: "PRD", title: "Quote for modification", type: "Story",
    assignee: "david", status: "In Progress", priority: "High",
    updated: "3h", created: "7d", labels: ["q2-priority"] },

  { key: "EXT-2774", project: "EXT", title: "Cabinet box CNC tolerances update", type: "Task",
    assignee: "david", status: "Revision", priority: "Medium", awaitingApproval: true,
    updated: "2d", created: "14d" },

  { key: "EXT-2680", project: "EXT", title: "Drawer slide supplier swap — qty logic", type: "Task",
    assignee: "david", status: "Revision", priority: "Medium", awaitingApproval: true,
    updated: "3d", created: "18d" },

  { key: "EXT-2484", project: "EXT", title: "Hardware catalog v4 pricing import", type: "Task",
    assignee: "david", status: "Revision", priority: "Medium", awaitingApproval: true,
    updated: "5d", created: "22d" },

  { key: "EXT-2846", project: "EXT", title: "Toekick height per-manufacturer override", type: "Bug",
    assignee: "david", status: "Revision", priority: "Medium", awaitingApproval: true,
    updated: "2d", created: "9d" },

  { key: "EXT-2156", project: "EXT", title: "Custom millwork markup by region", type: "Story",
    assignee: "david", status: "Revision", priority: "Low", awaitingApproval: true,
    updated: "8d", created: "30d", stale: true },

  { key: "EXT-2589", project: "EXT", title: "Legacy job re-export rounding fix", type: "Bug",
    assignee: "david", status: "Revision", priority: "Low", awaitingApproval: true,
    updated: "4d", created: "12d" },

  { key: "PRD-179", project: "PRD", title: "Discovery: multi-tenant config flags", type: "Story",
    assignee: "david", status: "Discovery", priority: "Medium",
    updated: "1d", created: "5d" },

  { key: "PRD-184", project: "PRD", title: "Config picker component polish", type: "Task",
    assignee: "david", status: "To Do", priority: "Medium",
    updated: "2d", created: "2d" },

  { key: "IMP-401", project: "IMP", title: "Acme Cabinets — data migration dry run", type: "Task",
    assignee: "david", status: "In Progress", priority: "Medium",
    updated: "6h", created: "4d" },

  { key: "IMP-407", project: "IMP", title: "Northstar Kitchens — SSO kickoff", type: "Task",
    assignee: "david", status: "Open", priority: "Medium",
    updated: "3d", created: "7d" },

  { key: "PRIM-55", project: "PRIM", title: "Primary client QBR deck template", type: "Task",
    assignee: "david", status: "Backlog", priority: "Low",
    updated: "2d", created: "2d" },

  { key: "PM-77", project: "PM", title: "Sprint 24 retro notes — owners", type: "Task",
    assignee: "david", status: "Open", priority: "Low",
    updated: "10d", created: "14d", stale: true },

  { key: "PM-79", project: "PM", title: "Roadmap sync with Gabriel", type: "Task",
    assignee: "david", status: "To Do", priority: "Medium",
    updated: "4h", created: "1d" },

  { key: "EXT-2935", project: "EXT", title: "Countertop overhang validation rule", type: "Story",
    assignee: "david", status: "Backlog", priority: "Medium",
    updated: "1d", created: "1d" },
];

export const REMINDERS: Reminder[] = [
  {
    id: "r1",
    source: "fathom",
    status: "new",
    assignee: "david",
    title: "Share updated pricing sheet with Gabriel by EOD Tuesday",
    meeting_title: "Heuristyc × Acme weekly",
    meeting_date: "2026-04-20",
    fathom_link: "#",
    linked_jira_key: null,
    tags: ["fathom", "auto"],
    captured_at: "2h ago",
  },
  {
    id: "r2",
    source: "fathom",
    status: "new",
    assignee: "david",
    title: "Revisar EXT-2774 — Cabinet tolerances, ping Gabriel para approval",
    meeting_title: "Extensions triage",
    meeting_date: "2026-04-19",
    fathom_link: "#",
    linked_jira_key: "EXT-2774",
    tags: ["fathom", "auto"],
    captured_at: "1d ago",
  },
  {
    id: "r3",
    source: "fathom",
    status: "reviewed",
    assignee: "jesus",
    title: "Write PRD draft for AI repo summary (AI-150) — 1 pager",
    meeting_title: "AI product sync",
    meeting_date: "2026-04-19",
    fathom_link: "#",
    linked_jira_key: "AI-150",
    tags: ["fathom", "auto"],
    captured_at: "1d ago",
  },
  {
    id: "r4",
    source: "manual",
    status: "new",
    assignee: "jesus",
    title: "Email Laura: next cohort onboarding dates",
    tags: ["manual"],
    captured_at: "5h ago",
  },
  {
    id: "r5",
    source: "fathom",
    status: "new",
    assignee: "both",
    title: "Align Jesus + David on quote-for-modification flow before Friday demo",
    meeting_title: "PRD-182 kickoff",
    meeting_date: "2026-04-18",
    fathom_link: "#",
    linked_jira_key: "PRD-182",
    tags: ["fathom", "auto"],
    captured_at: "2d ago",
  },
  {
    id: "r6",
    source: "manual",
    status: "completed",
    assignee: "david",
    title: "Push IMP-401 migration dry-run results to shared folder",
    tags: ["manual"],
    captured_at: "yesterday",
  },
];
