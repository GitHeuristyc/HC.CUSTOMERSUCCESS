import type { ColumnId, Issue, Priority, ProjectKey, UserId } from "./types";
import { timeAgo } from "./utils";
import { loadConfig, DEFAULT_CONFIG } from "./config";
import { getSupabaseServerClient } from "./supabase";

const JIRA_BASE_URL = process.env.JIRA_BASE_URL!;
const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN!;

const VALID_PROJECTS = new Set<string>(["PK", "AI", "EDU", "EXT", "PRD", "IMP", "PRIM", "PM", "EOSCOMP"]);

const ACCOUNT_TO_USER: Record<string, UserId> = {
  "712020:440220cd-0562-489b-bf5d-2903f49d6e4c": "jesus",
  "633cccebfedc6169aed95b48": "david",
};

const STATUS_TO_COLUMN: Record<string, ColumnId> = {
  Backlog: "To Do",
  "To Do": "To Do",
  Discovery: "Discovery",
  "In Progress": "In Progress",
  Configuration: "In Progress",
  Open: "Open",
  Revision: "Revision",
  "Manual Testing": "Revision",
  "Awaiting approval": "Revision",
};

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformIssue(raw: any): Issue | null {
  const { fields } = raw;
  const statusName: string = fields.status?.name ?? "";
  const categoryKey: string = fields.status?.statusCategory?.key ?? "";
  const column =
    STATUS_TO_COLUMN[statusName] ??
    (categoryKey === "new" ? "To Do" : "In Progress");

  const accountId: string = fields.assignee?.accountId ?? "";
  const assignee = ACCOUNT_TO_USER[accountId];
  if (!assignee) return null;

  const projectKey: string = fields.project?.key ?? "";
  if (!VALID_PROJECTS.has(projectKey)) return null;

  const updatedIso: string = fields.updated ?? fields.created;
  const stale = Date.now() - new Date(updatedIso).getTime() > STALE_MS;

  const priorityName: string = fields.priority?.name ?? "Medium";
  const priority: Priority =
    priorityName === "Highest" || priorityName === "High"
      ? "High"
      : priorityName === "Low" || priorityName === "Lowest"
        ? "Low"
        : "Medium";

  return {
    key: raw.key,
    project: projectKey as ProjectKey,
    title: fields.summary,
    type: fields.issuetype?.name ?? "Task",
    assignee,
    status: column,
    priority,
    updated: timeAgo(fields.updated),
    created: timeAgo(fields.created),
    labels: fields.labels ?? [],
    awaitingApproval: statusName === "Awaiting approval" || undefined,
    stale: stale || undefined,
  };
}

async function searchJira(jql: string): Promise<Issue[]> {
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
  };
  const fields = "summary,status,priority,project,issuetype,created,updated,labels,assignee";
  const results: Issue[] = [];
  let nextPageToken: string | undefined;

  while (true) {
    const url = new URL(`${JIRA_BASE_URL}/rest/api/3/search/jql`);
    url.searchParams.set("jql", jql);
    url.searchParams.set("fields", fields);
    url.searchParams.set("maxResults", "100");
    if (nextPageToken) url.searchParams.set("nextPageToken", nextPageToken);

    const res = await fetch(url.toString(), { headers, next: { revalidate: 0 } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Jira API ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const issues: Issue[] = (data.issues ?? [])
      .map(transformIssue)
      .filter((i: Issue | null): i is Issue => i !== null);

    results.push(...issues);

    if (data.isLast || !data.nextPageToken || (data.issues?.length ?? 0) === 0) break;
    nextPageToken = data.nextPageToken;
  }

  return results;
}

async function getExcludedList(): Promise<string> {
  const supabase = getSupabaseServerClient();
  const excluded = supabase
    ? (await loadConfig(supabase)).excluded_projects
    : DEFAULT_CONFIG.excluded_projects;
  return excluded.length > 0 ? excluded.join(",") : "__NONE__";
}

export async function fetchAllJiraIssues(): Promise<Issue[]> {
  const excluded = await getExcludedList();
  const [jesusIssues, davidIssues] = await Promise.all([
    searchJira(
      `assignee = "712020:440220cd-0562-489b-bf5d-2903f49d6e4c" AND statusCategory != Done AND project NOT IN (${excluded}) ORDER BY updated DESC`
    ),
    searchJira(
      `assignee = "633cccebfedc6169aed95b48" AND statusCategory != Done AND project NOT IN (${excluded}) ORDER BY updated DESC`
    ),
  ]);

  const seen = new Set<string>();
  const merged: Issue[] = [];
  for (const issue of [...jesusIssues, ...davidIssues]) {
    if (!seen.has(issue.key)) {
      seen.add(issue.key);
      merged.push(issue);
    }
  }
  return merged;
}
