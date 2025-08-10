import React from "react";
import { SunIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

type Props = {
  value: "see" | "avoid";
  onChange: (v: "see" | "avoid") => void;
  className?: string;
};

export default function PreferenceToggle({ value, onChange, className = "" }: Props) {
  return (
    <div
      className={`inline-flex rounded-full border border-zinc-300 dark:border-zinc-700 overflow-hidden ${className}`}
      role="tablist"
      aria-label="Sun preference"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "see"}
        onClick={() => onChange("see")}
        className={`px-3 py-1.5 text-sm whitespace-nowrap inline-flex items-center gap-1.5 ${
          value === "see"
            ? "bg-white dark:bg-zinc-100 text-zinc-900"
            : "bg-transparent text-zinc-300"
        }`}
      >
        <SunIcon className="w-4 h-4" />
        See the sun
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "avoid"}
        onClick={() => onChange("avoid")}
        className={`px-3 py-1.5 text-sm whitespace-nowrap inline-flex items-center gap-1.5 ${
          value === "avoid"
            ? "bg-white dark:bg-zinc-100 text-zinc-900"
            : "bg-transparent text-zinc-300"
        }`}
      >
        <EyeSlashIcon className="w-4 h-4" />
        Avoid glare
      </button>
    </div>
  );
}
