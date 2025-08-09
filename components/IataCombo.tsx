"use client";

import { useMemo, useState } from "react";
import { Combobox } from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { Airport } from "@/lib/types";
import type { MutableRefObject } from "react";

type Props = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (newIata: string) => void;
  airports: Airport[];
  // Match useRef<HTMLInputElement | null>(null)
  inputRef?: MutableRefObject<HTMLInputElement | null>;
};

export default function IataCombo({
  label,
  placeholder,
  value,
  onChange,
  airports,
  inputRef,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return airports.slice(0, 50);
    const q = query.toLowerCase();
    return airports
      .filter(
        (a) =>
          a.iata.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [airports, query]);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <Combobox value={value} onChange={onChange}>
        <div className="relative">
          <Combobox.Input
            ref={(el) => {
              if (inputRef) inputRef.current = el; // assign, return void
            }}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
            displayValue={(v: string) => v}
            onChange={(e) => {
              setQuery(e.target.value);
              onChange(e.target.value.toUpperCase());
            }}
            placeholder={placeholder}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 opacity-60" />
          </Combobox.Button>

          <Combobox.Options className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl bg-white dark:bg-zinc-800 p-1 shadow-lg ring-1 ring-black/10 dark:ring-white/10">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-500">No matches</div>
            ) : (
              filtered.map((a) => (
                <Combobox.Option
                  key={a.iata}
                  value={a.iata}
                  className="group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ui-active:bg-zinc-100 dark:ui-active:bg-zinc-700"
                >
                  <div>
                    <div className="font-semibold">{a.iata}</div>
                    <div className="text-zinc-500 dark:text-zinc-300">
                      {a.name}
                    </div>
                  </div>
                  <CheckIcon className="h-4 w-4 opacity-0 group-ui-selected:opacity-100" />
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </div>
      </Combobox>
    </div>
  );
}
