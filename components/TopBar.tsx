"use client";

import Link from "next/link";
import { USERS } from "@/lib/mock-data";
import { formatSyncedAt } from "@/lib/utils";
import type { PriorityFilter, UserFilter } from "@/lib/types";
import { Avatar, IconBtn } from "./atoms";

type Props = {
  userFilter: UserFilter;
  setUserFilter: (v: UserFilter) => void;
  counts: { jesus: number; david: number };
  search: string;
  setSearch: (v: string) => void;
  priorityFilter: PriorityFilter;
  setPriorityFilter: (v: PriorityFilter) => void;
  showReminders: boolean;
  setShowReminders: (v: boolean) => void;
  showTweaks: boolean;
  setShowTweaks: (v: boolean) => void;
  syncedAt: string | null;
  isSyncing: boolean;
  onForceSync: () => void;
  onNewReminder: () => void;
  remindersActiveCount: number;
  remindersNewFathomCount: number;
};

export function TopBar({
  userFilter,
  setUserFilter,
  counts,
  search,
  setSearch,
  priorityFilter,
  setPriorityFilter,
  showReminders,
  setShowReminders,
  showTweaks,
  setShowTweaks,
  syncedAt,
  isSyncing,
  onForceSync,
  onNewReminder,
  remindersActiveCount,
  remindersNewFathomCount,
}: Props) {
  const options: { id: UserFilter; count: number }[] = [
    { id: "jesus", count: counts.jesus },
    { id: "david", count: counts.david },
    { id: "both", count: counts.jesus + counts.david },
  ];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderBottom: "1px solid var(--line-2)",
        background: "var(--bg)",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "linear-gradient(135deg, var(--ext), var(--ai))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--bg)",
            fontWeight: 700,
            fontSize: 13,
            fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
          }}
        >
          H
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span className="serif" style={{ fontSize: 18, color: "var(--ink)" }}>
            Heuristyc Board
          </span>
          <span
            style={{
              fontSize: 10.5,
              color: "var(--ink-4)",
              letterSpacing: "0.04em",
            }}
          >
            Jira · Fathom · 2h routine
          </span>
        </div>
      </div>

      {/* Board / Dashboard nav */}
      <nav
        style={{
          display: "flex",
          gap: 2,
          padding: 3,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
        }}
      >
        <span
          style={{
            padding: "5px 12px",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 500,
            background: "var(--surface-2)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
          }}
        >
          Board
        </span>
        <Link
          href="/dashboard"
          style={{
            padding: "5px 12px",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 500,
            color: "var(--ink-3)",
            textDecoration: "none",
          }}
        >
          Dashboard
        </Link>
        <Link
          href="/email-sla"
          style={{
            padding: "5px 12px",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 500,
            color: "var(--ink-3)",
            textDecoration: "none",
          }}
        >
          Email SLA
        </Link>
      </nav>

      {/* User segmented control */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: 3,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
        }}
      >
        {options.map((opt) => {
          const active = userFilter === opt.id;
          const u = opt.id === "both" ? null : USERS[opt.id];
          return (
            <button
              key={opt.id}
              onClick={() => setUserFilter(opt.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 10px",
                borderRadius: 7,
                background: active ? "var(--surface-2)" : "transparent",
                color: active ? "var(--ink)" : "var(--ink-3)",
                fontSize: 12,
                fontWeight: 500,
                border: active ? "1px solid var(--line)" : "1px solid transparent",
              }}
            >
              {u ? (
                <Avatar userId={u.id} size={18} />
              ) : (
                <span
                  style={{
                    fontSize: 10.5,
                    color: active ? "var(--ink)" : "var(--ink-3)",
                  }}
                >
                  Both
                </span>
              )}
              {u && <span>{u.name.split(" ")[0]}</span>}
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                }}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 420, position: "relative" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search issues, keys, or text…"
          style={{
            width: "100%",
            padding: "8px 12px 8px 32px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            fontSize: 13,
            color: "var(--ink)",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 11,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-4)",
            fontSize: 13,
          }}
        >
          ⌕
        </span>
      </div>

      {/* Priority */}
      <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
        style={{
          fontSize: 12,
          padding: "7px 10px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          color: "var(--ink-2)",
        }}
      >
        <option value="all">All priorities</option>
        <option value="High">High only</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>

      {/* Sync status — click to force sync */}
      <button
        onClick={onForceSync}
        disabled={isSyncing}
        title="Click to force sync"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: "var(--ink-3)",
          padding: "6px 10px",
          border: "1px solid var(--line)",
          borderRadius: 999,
          cursor: isSyncing ? "default" : "pointer",
          opacity: isSyncing ? 0.7 : 1,
          transition: "opacity .15s",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: isSyncing ? "var(--amber)" : "var(--emerald)",
            animation: "pulse-dot 2s ease-in-out infinite",
          }}
        />
        <span>
          {isSyncing
            ? "Syncing…"
            : syncedAt
              ? <>Jira synced <b style={{ color: "var(--ink-2)" }}>{formatSyncedAt(syncedAt)}</b></>
              : "Jira sync pending"}
        </span>
      </button>

      {/* Right icons */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={onNewReminder}
          title="New reminder (⌘K)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 11px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            color: "var(--bg)",
            background: "var(--ext)",
            border: "1px solid var(--ext)",
            cursor: "pointer",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New
          <span
            className="mono"
            style={{
              fontSize: 10,
              padding: "1px 4px",
              background: "color-mix(in oklch, black 20%, transparent)",
              borderRadius: 3,
              marginLeft: 2,
            }}
          >
            ⌘K
          </span>
        </button>
        <button
          onClick={() => setShowReminders(!showReminders)}
          aria-pressed={showReminders}
          title={showReminders ? "Hide reminders rail" : "Show reminders rail"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 9px 5px 8px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            color: showReminders ? "var(--ink)" : "var(--ink-2)",
            background: showReminders
              ? "color-mix(in oklch, var(--ext) 14%, var(--surface))"
              : "var(--surface)",
            border: showReminders
              ? "1px solid color-mix(in oklch, var(--ext) 40%, var(--line))"
              : "1px solid var(--line)",
            transition: "background .12s, border-color .12s, color .12s",
          }}
        >
          <span style={{ position: "relative", display: "inline-flex", lineHeight: 0 }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10 21a2 2 0 0 0 4 0" />
            </svg>
            {!showReminders && remindersNewFathomCount > 0 && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: "var(--ext)",
                  border: "1.5px solid var(--bg)",
                  animation: "pulse-dot 2s ease-in-out infinite",
                }}
              />
            )}
          </span>
          <span>Reminders</span>
          {remindersActiveCount > 0 && (
            <span
              style={{
                fontFamily: "var(--font-geist-mono), Geist Mono, monospace",
                fontSize: 10.5,
                padding: "1px 6px",
                borderRadius: 999,
                background: showReminders
                  ? "color-mix(in oklch, var(--ext) 22%, transparent)"
                  : "var(--surface-2)",
                color: showReminders ? "var(--ext)" : "var(--ink-2)",
                border: showReminders
                  ? "1px solid color-mix(in oklch, var(--ext) 35%, transparent)"
                  : "1px solid var(--line)",
                lineHeight: 1.4,
              }}
            >
              {remindersActiveCount}
            </span>
          )}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: showReminders ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform .18s",
              color: "var(--ink-3)",
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <form action="/auth/signout" method="post" style={{ display: "inline-flex" }}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--ink-3)",
              cursor: "pointer",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </form>
        <IconBtn
          label="Settings"
          active={showTweaks}
          onClick={() => setShowTweaks(!showTweaks)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </IconBtn>
      </div>
    </header>
  );
}
