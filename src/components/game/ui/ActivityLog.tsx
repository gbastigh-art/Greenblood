"use client";
// Phase 9: Activity Log — persistent feed of recent events.
// Shown as a vertical stack of small chips below the top-left logo/day-arc area.
// Each chip has an icon, message, and relative timestamp ("3s", "1m", "5m").
// Color-coded by kind: info (white), good (green), warn (yellow), danger (red).
// Auto-trims entries older than ~3 minutes via React re-render polling.
import { useEffect, useState } from "react";
import { useGame } from "@/lib/game/store";

interface LogEntry {
  id: number;
  text: string;
  icon: string;
  t: number;
  kind: "info" | "good" | "warn" | "danger";
}

function relTime(t: number, now: number): string {
  const diff = Math.max(0, Math.floor((now - t) / 1000));
  if (diff < 5) return "now";
  if (diff < 60) return `${diff}s`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

const KIND_STYLES: Record<string, string> = {
  info:   "border-white/15 bg-black/55 text-white/85",
  good:   "border-emerald-500/40 bg-emerald-950/60 text-emerald-100",
  warn:   "border-amber-500/40 bg-amber-950/60 text-amber-100",
  danger: "border-rose-500/45 bg-rose-950/65 text-rose-100",
};

const KIND_DOT: Record<string, string> = {
  info:   "bg-white/50",
  good:   "bg-emerald-400",
  warn:   "bg-amber-400",
  danger: "bg-rose-400 animate-pulse",
};

export function ActivityLog() {
  const log = useGame((s) => s.activityLog);
  // Tick to refresh relative timestamps every second
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  // Filter out entries older than 3 minutes for display
  const now = Date.now();
  const visible = log.filter((e) => now - e.t < 180_000).slice(0, 6);
  if (visible.length === 0) return null;
  return (
    <div className="pointer-events-none fixed left-3 z-30 select-none flex flex-col gap-1 max-w-[260px]"
         style={{ top: "168px" }}>
      <style>{`
        @keyframes log-slide-in {
          0%   { transform: translateX(-12px); opacity: 0; }
          100% { transform: translateX(0);     opacity: 1; }
        }
        .log-entry { animation: log-slide-in 0.32s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <div className="flex items-center gap-1 px-1.5 mb-0.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">Activity</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      {visible.map((e: LogEntry) => (
        <div
          key={e.id}
          className={`log-entry flex items-center gap-1.5 px-2 py-1 rounded border ${KIND_STYLES[e.kind]} backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.45)]`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${KIND_DOT[e.kind]}`} />
          <span className="text-sm shrink-0">{e.icon}</span>
          <span className="text-[10px] font-medium truncate flex-1 leading-tight">{e.text}</span>
          <span className="text-[9px] text-white/40 font-mono shrink-0 tabular-nums">{relTime(e.t, now)}</span>
        </div>
      ))}
    </div>
  );
}
