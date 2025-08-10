import React, { useId } from "react";

type Props = {
  value: string;              // "yyyy-MM-ddTHH:mm" (local wall time) or partial while editing
  onChange: (next: string) => void;
  className?: string;
};

function clamp2(n: number, max: number) {
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, max);
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function parseHHmm(v: string) {
  const m = (v || "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = clamp2(parseInt(m[1], 10), 23);
  const mm = clamp2(parseInt(m[2], 10), 59);
  return { hh, mm };
}
function caretSegment(input: HTMLInputElement) {
  const pos = input.selectionStart ?? 0;
  // positions: 0 1 2(:) 3 4
  return pos <= 2 ? "h" : "m";
}

export default function DateTime24({ value, onChange, className = "" }: Props) {
  const id = useId();
  const [datePart, timePart] = (value || "").split("T").concat("").slice(0, 2);

  function emit(nextDate: string, nextTime: string) {
    const joined = (nextDate || "") + "T" + (nextTime || "");
    onChange(joined.replace(/^T$/, ""));
  }

  return (
    <div className={`grid grid-cols-[1fr_auto] gap-2 ${className}`}>
      {/* Date */}
      <input
        id={`${id}-date`}
        type="date"
        value={datePart || ""}
        onChange={(e) => emit(e.currentTarget.value, timePart || "")}
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2"
      />
      {/* Time HH:mm (24h). Arrow keys increment/decrement. */}
      <input
        id={`${id}-time`}
        type="text"
        inputMode="numeric"
        placeholder="HH:mm"
        title="Enter time in 24h format HH:mm"
        value={timePart || ""}
        onChange={(e) => {
          let v = e.currentTarget.value.replace(/[^0-9:]/g, "").slice(0, 5);
          if (/^[0-9]{3,4}$/.test(v) && !v.includes(":")) {
            const raw = v.padStart(4, "0");
            v = `${raw.slice(0,2)}:${raw.slice(2,4)}`;
          }
          emit(datePart || "", v);
        }}
        onKeyDown={(e) => {
          const key = e.key;
          if (key !== "ArrowUp" && key !== "ArrowDown" && key !== "PageUp" && key !== "PageDown") return;
          const input = e.currentTarget;
          const parsed = parseHHmm(input.value || "");
          // If invalid, initialize to 00:00 for friendliness
          let hh = parsed ? parsed.hh : 0;
          let mm = parsed ? parsed.mm : 0;
          const seg = caretSegment(input);
          const step = e.shiftKey ? 10 : 1;
          const dir = (key === "ArrowUp" || key === "PageUp") ? 1 : -1;
          e.preventDefault();
          if (seg === "h") {
            hh = (hh + dir * step + 24) % 24;
          } else {
            mm = (mm + dir * step + 60) % 60;
          }
          const next = `${pad2(hh)}:${pad2(mm)}`;
          emit(datePart || "", next);
          // restore caret within the edited segment
          requestAnimationFrame(() => {
            const pos = seg === "h" ? 2 : 5;
            input.setSelectionRange(pos, pos);
          });
        }}
        onBlur={(e) => {
          const m = (e.currentTarget.value || "").match(/^(\d{1,2}):(\d{1,2})$/);
          if (!m) return;
          const hh = clamp2(parseInt(m[1], 10), 23);
          const mm = clamp2(parseInt(m[2], 10), 59);
          emit(datePart || "", `${pad2(hh)}:${pad2(mm)}`);
        }}
        className="w-28 text-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 font-mono"
        aria-label="Time (24h)"
      />
    </div>
  );
}
