"use client";
// Toast stack — bottom-left transient messages with animated entrance.
import { useGame } from "@/lib/game/store";
import { useEffect, useState } from "react";

const COLORS: Record<string, string> = {
  info: "border-white/30 border-l-4 border-l-sky-400 bg-black/75 text-white",
  warn: "border-amber-500/60 border-l-4 border-l-amber-400 bg-amber-900/80 text-amber-100",
  danger: "border-rose-500/70 border-l-4 border-l-rose-400 bg-rose-900/85 text-rose-100",
  good: "border-emerald-500/60 border-l-4 border-l-emerald-400 bg-emerald-900/80 text-emerald-100",
};

const ICONS: Record<string, string> = {
  info: "ℹ️",
  warn: "⚠️",
  danger: "❌",
  good: "✅",
};

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-40 flex flex-col gap-0.5 max-w-xs">
      {toasts.map((t, i) => (
        <ToastItem key={t.id} id={t.id} text={t.text} kind={t.kind ?? "info"} isNewest={i === toasts.length - 1} />
      ))}
    </div>
  );
}

function ToastItem({ id, text, kind, isNewest }: { id: number; text: string; kind: "info" | "warn" | "danger" | "good"; isNewest: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // animate in
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium shadow-lg drop-shadow-lg backdrop-blur-md ${COLORS[kind]} transition-all duration-300 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      } ${isNewest ? "" : "scale-95 opacity-80"}`}
      style={{
        animation: visible ? `toastSlide 0.35s cubic-bezier(0.16, 1, 0.3, 1)` : undefined,
      }}
    >
      <span className="text-base shrink-0">{ICONS[kind]}</span>
      <span className="leading-tight">{text}</span>
      <style>{`
        @keyframes toastSlide {
          0% { transform: translateX(24px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
