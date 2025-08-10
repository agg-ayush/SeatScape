"use client";
import React, { useEffect, useRef, useState } from "react";
export default function TimeField({ value, onChange, className="" }: { value: string; onChange: (v: string) => void; className?: string; }) {
  const [hh,setHh]=useState<string>(""); const [mm,setMm]=useState<string>(""); const minRef=useRef<HTMLInputElement|null>(null);
  useEffect(()=>{ const [H="00",M="00"]=(value||"").split(":"); setHh(String(H).padStart(2,"0")); setMm(String(M).padStart(2,"0"));},[value]);
  function commit(H:string,M:string){ const h=Math.min(23,Math.max(0,parseInt(H||"0",10))); const m=Math.min(59,Math.max(0,parseInt(M||"0",10))); onChange(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`); }
  return (<div className={`inline-flex items-center gap-1 ${className}`}>
    <input type="text" inputMode="numeric" value={hh}
      onChange={(e)=>{ const v=e.target.value.replace(/[^\d]/g,"").slice(0,2); setHh(v); if(v.length===2) minRef.current?.focus(); }}
      onBlur={()=>commit(hh,mm)}
      onKeyDown={(e)=>{ if(e.key==="ArrowUp"||e.key==="ArrowRight"){ const v=(parseInt(hh||"0",10)+1)%24; setHh(String(v).padStart(2,"0")); e.preventDefault(); }
                        else if(e.key==="ArrowDown"||e.key==="ArrowLeft"){ const v=(parseInt(hh||"0",10)+23)%24; setHh(String(v).padStart(2,"0")); e.preventDefault(); }}}
      className="w-14 text-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-2" aria-label="Hours" autoComplete="off"/>
    <span className="px-0.5">:</span>
    <input ref={minRef} type="text" inputMode="numeric" value={mm}
      onChange={(e)=>{ const v=e.target.value.replace(/[^\d]/g,"").slice(0,2); setMm(v); }}
      onBlur={()=>commit(hh,mm)}
      onKeyDown={(e)=>{ if(e.key==="ArrowUp"||e.key==="ArrowRight"){ const v=(parseInt(mm||"0",10)+1)%60; setMm(String(v).padStart(2,"0")); e.preventDefault(); }
                        else if(e.key==="ArrowDown"||e.key==="ArrowLeft"){ const v=(parseInt(mm||"0",10)+59)%60; setMm(String(v).padStart(2,"0")); e.preventDefault(); }}}
      className="w-14 text-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-2" aria-label="Minutes" autoComplete="off"/>
  </div>);
}