
"use client";

import React, { useEffect, useRef } from "react";
import "./slider.css";

export interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;                    // external committed value
  onChange: (v: number) => void;    // fires while dragging (local mirrors only)
  onCommit?: (v: number) => void;   // fires on release / Enter / arrows
  ariaLabel?: string;
  className?: string;
}

export default function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  onCommit,
  ariaLabel,
  className = "",
}: SliderProps) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vStr = String(value);
    if (el.value !== vStr) el.value = vStr;
  }, [value]);

  const commitNow = (v: number) => {
    if (onCommit) onCommit(v);
  };

  return (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      step={step}
      defaultValue={Number.isFinite(value) ? value : 0}
      onInput={(e: React.FormEvent<HTMLInputElement>) => {
        const v = Number(e.currentTarget.value);
        onChange(v);
      }}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.currentTarget.value);
        onChange(v);
      }}
      onPointerUp={(e) => commitNow(Number((e.currentTarget as HTMLInputElement).value))}
      onMouseUp={(e) => commitNow(Number((e.currentTarget as HTMLInputElement).value))}
      onTouchEnd={(e) => commitNow(Number((e.currentTarget as HTMLInputElement).value))}
      onKeyUp={(e) => {
        if (
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "Home" ||
          e.key === "End" ||
          e.key === "Enter"
        ) {
          commitNow(Number((e.currentTarget as HTMLInputElement).value));
        }
      }}
      aria-label={ariaLabel}
      className={`ss-range ${className}`}
    />
  );
}
