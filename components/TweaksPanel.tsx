"use client";

import Link from "next/link";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Tweaks } from "@/lib/types";

type SegOption<T extends string> = { id: T; label: string };

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
}) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--bg-2)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: 2,
      }}
    >
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            fontSize: 11,
            padding: "4px 9px",
            borderRadius: 6,
            background: value === o.id ? "var(--surface-2)" : "transparent",
            color: value === o.id ? "var(--ink)" : "var(--ink-3)",
            fontWeight: 500,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 34,
        height: 20,
        borderRadius: 999,
        padding: 2,
        background: checked ? "var(--ext)" : "var(--line)",
        border: "none",
        display: "flex",
        alignItems: "center",
        transition: "background .15s",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          background: "var(--bg)",
          transform: `translateX(${checked ? 14 : 0}px)`,
          transition: "transform .18s ease",
        }}
      />
    </button>
  );
}

function TweakRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 0",
        borderTop: "1px solid var(--line-2)",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{label}</span>
      <div>{children}</div>
    </div>
  );
}

type Props = {
  tweaks: Tweaks;
  setTweaks: Dispatch<SetStateAction<Tweaks>>;
  onClose: () => void;
};

export function TweaksPanel({ tweaks, setTweaks, onClose }: Props) {
  const set = <K extends keyof Tweaks>(k: K, v: Tweaks[K]) => {
    setTweaks((t) => ({ ...t, [k]: v }));
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 300,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 14,
        zIndex: 80,
        boxShadow: "0 10px 40px -10px rgba(0,0,0,.5)",
        animation: "rowin .2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-2)",
          }}
        >
          Tweaks
        </div>
        <button onClick={onClose} style={{ color: "var(--ink-3)" }}>
          ×
        </button>
      </div>

      <TweakRow label="Theme">
        <Seg
          value={tweaks.theme}
          onChange={(v) => set("theme", v)}
          options={[
            { id: "dark", label: "Dark" },
            { id: "light", label: "Light" },
          ]}
        />
      </TweakRow>
      <TweakRow label="Density">
        <Seg
          value={tweaks.density}
          onChange={(v) => set("density", v)}
          options={[
            { id: "compact", label: "Compact" },
            { id: "cozy", label: "Cozy" },
            { id: "roomy", label: "Roomy" },
          ]}
        />
      </TweakRow>
      <TweakRow label="Colorful cards">
        <Toggle checked={tweaks.colorfulCards} onChange={(v) => set("colorfulCards", v)} />
      </TweakRow>
      <TweakRow label="Show reminders rail">
        <Toggle checked={tweaks.showReminders} onChange={(v) => set("showReminders", v)} />
      </TweakRow>

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid var(--line-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
          Server configuration
        </span>
        <Link
          href="/settings"
          style={{
            fontSize: 11,
            color: "var(--ai)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Settings →
        </Link>
      </div>
    </div>
  );
}
