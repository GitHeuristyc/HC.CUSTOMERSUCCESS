"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { COLUMNS, ISSUES as MOCK_ISSUES, PROJECTS, REMINDERS as MOCK_REMINDERS } from "@/lib/mock-data";
import type {
  ColumnId,
  Issue,
  PriorityFilter,
  ProjectKey,
  Reminder,
  ReminderStatus,
  Tweaks,
  UserFilter,
} from "@/lib/types";
import { Column } from "./Column";
import { DetailPanel } from "./DetailPanel";
import { ProjectLegend } from "./ProjectLegend";
import { RemindersRail } from "./RemindersRail";
import { GlobalComposer, type ComposerDraft } from "./ReminderComposer";
import { TopBar } from "./TopBar";
import { TweaksPanel } from "./TweaksPanel";

const DEFAULT_TWEAKS: Tweaks = {
  theme: "dark",
  density: "cozy",
  showReminders: true,
  colorfulCards: true,
  userFilter: "both",
};

export function Board() {
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULT_TWEAKS);
  const [userFilter, setUserFilter] = useState<UserFilter>("both");
  const [projectFilter, setProjectFilter] = useState<Set<ProjectKey>>(
    () => new Set(Object.keys(PROJECTS) as ProjectKey[])
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [search, setSearch] = useState("");
  const [openIssue, setOpenIssue] = useState<Issue | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showTweaks, setShowTweaks] = useState(false);
  const [showReminders, setShowReminders] = useState(tweaks.showReminders);
  const [showGlobalComposer, setShowGlobalComposer] = useState(false);

  // Live Jira data
  const [jiraIssues, setJiraIssues] = useState<Issue[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [useMockFallback, setUseMockFallback] = useState(false);

  const fetchIssues = useCallback(async (force = false) => {
    setIsSyncing(true);
    setJiraError(null);
    try {
      const url = force ? "/api/jira/sync" : "/api/jira/issues";
      const res = await fetch(url, { method: force ? "POST" : "GET" });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      if (json.issues && json.issues.length > 0) {
        setJiraIssues(json.issues);
        setUseMockFallback(false);
      } else {
        // No issues returned — fall back to mock for preview
        setUseMockFallback(true);
      }
      if (json.synced_at) setSyncedAt(json.synced_at);
    } catch (err) {
      console.error("[Board] Jira fetch failed:", err);
      setJiraError((err as Error).message);
      setUseMockFallback(true);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues(false);
  }, [fetchIssues]);

  // Fetch reminders from API; fall back to mock if API unreachable/unconfigured
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reminders");
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(json.reminders) && json.reminders.length > 0) {
          setReminders(json.reminders);
        } else {
          setReminders(MOCK_REMINDERS);
        }
      } catch {
        if (!cancelled) setReminders(MOCK_REMINDERS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply tweaks to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.setAttribute("data-density", tweaks.density);
    setShowReminders(tweaks.showReminders);
  }, [tweaks]);

  const issues = useMockFallback ? MOCK_ISSUES : jiraIssues;

  const filtered = useMemo(() => {
    return issues.filter((is) => {
      if (userFilter !== "both" && is.assignee !== userFilter) return false;
      if (!projectFilter.has(is.project)) return false;
      if (priorityFilter !== "all" && is.priority !== priorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!is.title.toLowerCase().includes(q) && !is.key.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [issues, userFilter, projectFilter, priorityFilter, search]);

  const byColumn = useMemo(() => {
    const map: Record<ColumnId, Issue[]> = {
      "To Do": [],
      Discovery: [],
      "In Progress": [],
      Open: [],
      Revision: [],
    };
    filtered.forEach((is) => {
      if (map[is.status]) map[is.status].push(is);
    });
    return map;
  }, [filtered]);

  // ⌘K / Ctrl+K → open global composer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowGlobalComposer(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const createReminder = useCallback(
    async (draft: ComposerDraft) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: Reminder = {
        id: tempId,
        source: "manual",
        status: "new",
        assignee: draft.assignee,
        title: draft.title,
        linked_jira_key: draft.linked_jira_key,
        tags: [],
        captured_at: new Date().toISOString(),
        due: draft.due,
      };
      setReminders((rs) => [optimistic, ...rs]);
      if (!showReminders) setShowReminders(true);

      try {
        const res = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            assignee: draft.assignee,
            linked_jira_key: draft.linked_jira_key,
            due: draft.due,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.reminder) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        setReminders((rs) =>
          rs.map((r) => (r.id === tempId ? (json.reminder as Reminder) : r))
        );
      } catch (err) {
        console.error("[Board] createReminder failed:", err);
        setReminders((rs) => rs.filter((r) => r.id !== tempId));
      }
    },
    [showReminders]
  );

  const updateReminder = useCallback(async (id: string, status: ReminderStatus) => {
    let previous: Reminder | undefined;
    setReminders((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        previous = r;
        return { ...r, status };
      })
    );
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("[Board] reminder update failed:", err);
      if (previous) {
        const rollback = previous;
        setReminders((rs) => rs.map((r) => (r.id === id ? rollback : r)));
      }
    }
  }, []);

  const counts = useMemo(() => ({
    jesus: issues.filter((i) => i.assignee === "jesus").length,
    david: issues.filter((i) => i.assignee === "david").length,
  }), [issues]);

  const remindersActiveCount = useMemo(
    () => reminders.filter((r) => r.status !== "completed").length,
    [reminders]
  );
  const remindersNewFathomCount = useMemo(
    () =>
      reminders.filter((r) => r.source === "fathom" && r.status === "new").length,
    [reminders]
  );

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <TopBar
        userFilter={userFilter}
        setUserFilter={setUserFilter}
        counts={counts}
        search={search}
        setSearch={setSearch}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        showReminders={showReminders}
        setShowReminders={setShowReminders}
        showTweaks={showTweaks}
        setShowTweaks={setShowTweaks}
        syncedAt={syncedAt}
        isSyncing={isSyncing}
        onForceSync={() => fetchIssues(true)}
        onNewReminder={() => setShowGlobalComposer(true)}
        remindersActiveCount={remindersActiveCount}
        remindersNewFathomCount={remindersNewFathomCount}
      />

      {/* Error banner */}
      {jiraError && (
        <div
          style={{
            padding: "8px 18px",
            background: "color-mix(in oklch, var(--rose) 12%, transparent)",
            borderBottom: "1px solid color-mix(in oklch, var(--rose) 25%, transparent)",
            fontSize: 12,
            color: "var(--rose)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>⚠ Jira sync error: {jiraError}</span>
          {useMockFallback && (
            <span style={{ color: "var(--ink-3)" }}>— showing mock data</span>
          )}
        </div>
      )}

      {/* Loading shimmer row */}
      {isSyncing && jiraIssues.length === 0 && (
        <div
          style={{
            padding: "6px 18px",
            background: "color-mix(in oklch, var(--ai) 8%, transparent)",
            borderBottom: "1px solid color-mix(in oklch, var(--ai) 15%, transparent)",
            fontSize: 11,
            color: "var(--ink-3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--ai)",
              animation: "pulse-dot 1s ease-in-out infinite",
            }}
          />
          Fetching issues from Jira…
        </div>
      )}

      {/* Main body */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Board */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <ProjectLegend
            projectFilter={projectFilter}
            setProjectFilter={setProjectFilter}
            userFilter={userFilter}
          />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowX: "auto",
              overflowY: "hidden",
              padding: "4px 18px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "var(--col-gap)",
                height: "100%",
                minWidth: "fit-content",
              }}
            >
              {COLUMNS.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  issues={byColumn[col.id]}
                  onOpen={setOpenIssue}
                />
              ))}
            </div>
          </div>
        </main>

        {/* Reminders rail */}
        {showReminders && (
          <RemindersRail
            reminders={reminders}
            onStatus={updateReminder}
            onClose={() => setShowReminders(false)}
            onCreate={createReminder}
          />
        )}
      </div>

      {/* Global composer (⌘K / New button) */}
      <GlobalComposer
        open={showGlobalComposer}
        onClose={() => setShowGlobalComposer(false)}
        onCreate={createReminder}
      />

      {/* Detail slide-over */}
      {openIssue && <DetailPanel issue={openIssue} onClose={() => setOpenIssue(null)} />}

      {/* Tweaks */}
      {showTweaks && (
        <TweaksPanel
          tweaks={tweaks}
          setTweaks={setTweaks}
          onClose={() => setShowTweaks(false)}
        />
      )}
    </div>
  );
}
