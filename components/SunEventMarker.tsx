import React from "react";

interface Props {
  type: "sunrise" | "sunset";
  time: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SunEventMarker({ type, time, className = "", style }: Props) {
  const icon = type === "sunrise" ? "🌅" : "🌇";
  return (
    <div className={`absolute flex flex-col items-center text-[10px] ${className}`} style={style}>
      <span>{icon}</span>
      <span>{time}</span>
    </div>
  );
}
