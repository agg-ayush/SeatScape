"use client";

import { Combobox } from "@headlessui/react";
import React, { useMemo, useState } from "react";

export type ZoneOption = { tz: string; label: string; abbr: string[] };

const ACRONYMS: Record<string, string[]> = {
  UTC: ["UTC", "GMT", "Z"],
  "Europe/London": ["GMT", "BST"],
  "Europe/Paris": ["CET", "CEST"],
  "Europe/Berlin": ["CET", "CEST"],
  "Europe/Madrid": ["CET", "CEST"],
  "Europe/Rome": ["CET", "CEST"],
  "America/New_York": ["EST", "EDT"],
  "America/Chicago": ["CST", "CDT"],
  "America/Denver": ["MST", "MDT"],
  "America/Los_Angeles": ["PST", "PDT"],
  "America/Phoenix": ["MST"],
  "America/Toronto": ["EST", "EDT"],
  "America/Sao_Paulo": ["BRT"],
  "Asia/Dubai": ["GST"],
  "Asia/Kolkata": ["IST"],
  "Asia/Jerusalem": ["IST", "IDT"],
  "Asia/Tokyo": ["JST"],
  "Asia/Singapore": ["SGT"],
  "Australia/Sydney": ["AEST", "AEDT"],
  "Australia/Perth": ["AWST"],
};

function matches(q: string, o: ZoneOption) {
  const t = q.toLowerCase();
  if (o.label.toLowerCase().includes(t)) return true;
  if (o.tz.toLowerCase().includes(t)) return true;
  return o.abbr.some((a) => a.toLowerCase().includes(t));
}

export default function TimezoneSelect({
  options,
  value,
  onChange,
  onClearToEmptyCustom,
}: {
  options: ZoneOption[];
  value: string; // may be ""
  onChange: (tz: string) => void;
  onClearToEmptyCustom: () => void; // switch to custom mode with empty value
}) {
  const [query, setQuery] = useState("");

  const withAbbr = useMemo(
    () =>
      options.map((o) => ({
        ...o,
        abbr: o.abbr.length ? o.abbr : ACRONYMS[o.tz] || [],
      })),
    [options]
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return withAbbr;
    return withAbbr.filter((o) => matches(q, o));
  }, [withAbbr, query]);

  const active = withAbbr.find((o) => o.tz === value) || null;

  return (
    <div className="relative">
      <Combobox
        value={active ? active.tz : null}
        onChange={(v) => onChange(String(v))}
        nullable
      >
        <div className="relative">
          <Combobox.Input
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 pr-10"
            displayValue={() => active?.label || ""}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search timezone (e.g., IST, PST, CET)…"
          />
          <button
            type="button"
            aria-label="Clear timezone"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full grid place-items-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={onClearToEmptyCustom}
            tabIndex={-1}
            title="Clear and switch to Custom"
          >
            ×
          </button>
        </div>
        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 shadow-lg">
          {filtered.map((o) => (
            <Combobox.Option
              key={o.tz}
              value={o.tz}
              className="cursor-pointer rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <div className="flex items-center justify-between">
                <span>{o.label}</span>
                {o.abbr.length > 0 && (
                  <span className="text-xs text-zinc-500">
                    [{o.abbr.join(" / ")}]
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-500">{o.tz}</div>
            </Combobox.Option>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-zinc-500">No matches</div>
          )}
        </Combobox.Options>
      </Combobox>
    </div>
  );
}
