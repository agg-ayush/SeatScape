"use client";

import React, { useMemo, useRef, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { XMarkIcon, MagnifyingGlassIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";

type TZItem = { tz: string; label: string; acronyms: string[] };

const COMMON: TZItem[] = [
  { tz: "UTC", label: "UTC — Coordinated Universal Time", acronyms: ["UTC","Z"] },
  { tz: "Europe/London", label: "UK — Europe/London", acronyms: ["GMT","BST","UK"] },
  { tz: "Europe/Paris", label: "France — Europe/Paris", acronyms: ["CET","CEST"] },
  { tz: "Europe/Berlin", label: "Germany — Europe/Berlin", acronyms: ["CET","CEST","DE"] },
  { tz: "Asia/Kolkata", label: "India — Asia/Kolkata", acronyms: ["IST"] },
  { tz: "Asia/Dubai", label: "UAE — Asia/Dubai", acronyms: ["GST"] },
  { tz: "Asia/Singapore", label: "Singapore — Asia/Singapore", acronyms: ["SGT"] },
  { tz: "Asia/Tokyo", label: "Japan — Asia/Tokyo", acronyms: ["JST"] },
  { tz: "Australia/Sydney", label: "Australia — Australia/Sydney", acronyms: ["AEST","AEDT"] },
  { tz: "America/Los_Angeles", label: "US Pacific — America/Los_Angeles", acronyms: ["PT","PST","PDT"] },
  { tz: "America/Denver", label: "US Mountain — America/Denver", acronyms: ["MT","MST","MDT"] },
  { tz: "America/Chicago", label: "US Central — America/Chicago", acronyms: ["CT","CST","CDT"] },
  { tz: "America/New_York", label: "US Eastern — America/New_York", acronyms: ["ET","EST","EDT"] },
];

export default function TimezoneSelect({
  value,
  onChange,
  onClearToCustom,
  placeholder = "Search timezone (e.g., IST, PST, UTC)",
  fullWidth = true,
}: {
  value?: string | null;
  onChange: (tz: string) => void;
  onClearToCustom: () => void;
  placeholder?: string;
  fullWidth?: boolean;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMON;
    return COMMON.filter((it) =>
      it.tz.toLowerCase().includes(q) ||
      it.label.toLowerCase().includes(q) ||
      it.acronyms.some((a) => a.toLowerCase().includes(q))
    );
  }, [query]);

  const handleSelect = (tz: string) => {
    onChange(tz);
    setQuery("");
    // blur so the list closes
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onClearToCustom();
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <Combobox value={value ?? ""} onChange={handleSelect}>
      {({ open }) => (
        <div className={`relative ${fullWidth ? "w-full" : "w-80"}`}>
          <div className="relative w-full">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
            <Combobox.Input
              ref={inputRef}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-7 pr-16 py-2"
              displayValue={() => value ?? ""}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setQuery((q) => q)}      // open on focus
              onClick={() => setQuery((q) => q)}      // open on click/tap
              placeholder={placeholder}
              inputMode="text"
            />
            {/* Clear button */}
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-8 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Clear timezone"
              aria-label="Clear timezone"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
            {/* Dropdown chevron */}
            <Combobox.Button
              className="absolute right-1.5 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Toggle timezone list"
            >
              <ChevronUpDownIcon className="h-4 w-4" />
            </Combobox.Button>
          </div>

          <Transition
            show={open}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Combobox.Options className="absolute z-[1000] mt-2 max-h-60 w-full overflow-auto rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
              {items.map((it) => (
                <Combobox.Option
                  key={it.tz}
                  value={it.tz}
                  className="px-3 py-2 text-sm ui-active:bg-zinc-100 dark:ui-active:bg-zinc-800 cursor-pointer"
                >
                  <div className="font-medium">{it.label}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {it.tz} • {it.acronyms.join(", ")}
                  </div>
                </Combobox.Option>
              ))}
              {items.length === 0 && (
                <div className="px-3 py-2 text-sm text-zinc-500">No matches</div>
              )}
            </Combobox.Options>
          </Transition>
        </div>
      )}
    </Combobox>
  );
}
