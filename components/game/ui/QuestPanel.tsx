"use client";
// Quest panel — full-screen modal listing all QUESTS from the store.
// Open when `mode === "quest"`. Esc closes (returns to play mode).
// Each quest shows objective progress (from questProgress), accept status,
// and reward chips. Rewards are auto-granted by completeQuest() in the store.
import { useEffect } from "react";
import { useGame, QUESTS, type QuestProgress } from "@/lib/game/store";
import { ITEMS } from "@/lib/game/items";

// Rarity-style gradient borders for the quest icon tile, keyed loosely by quest
// difficulty (last quest is "legendary"). We cycle amber→sky→purple→amber.
function iconTileClass(idx: number): string {
  if (idx === QUESTS.length - 1) {
    // "legendary" feel: amber gradient border
    return "border-amber-400/80 bg-gradient-to-br from-amber-500/15 to-yellow-700/10 shadow-[0_0_12px_rgba(251,191,36,0.3)]";
  }
  if (idx % 3 === 0) return "border-sky-400/60 bg-sky-500/10";
  if (idx % 3 === 1) return "border-purple-400/60 bg-purple-500/10";
  return "border-amber-400/60 bg-amber-500/10";
}

export function QuestPanel() {
  const mode = useGame((s) => s.mode);
  const setMode = useGame((s) => s.setMode);
  const dayCount = useGame((s) => s.dayCount);
  const questsAccepted = useGame((s) => s.questsAccepted);
  const questsCompleted = useGame((s) => s.questsCompleted);
  const questProgress = useGame((s) => s.questProgress);
  const acceptQuest = useGame((s) => s.acceptQuest);

  const open = mode === "quest";

  // Esc closes (also handled globally, but explicit here for clarity)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setMode("play");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setMode]);

  if (!open) return null;

  const completedCount = questsCompleted.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-3xl max-h-[85vh] rounded-xl border-2 border-amber-500/50 bg-zinc-900/95 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/60 to-yellow-800/40 px-4 py-3 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">📋</span>
            <div className="min-w-0">
              <div className="text-amber-200 font-bold text-lg tracking-wide truncate">
                Quest Board
              </div>
              <div className="text-amber-100/60 text-xs">
                Day {dayCount} · Accept quests to earn rewards. Progress auto-tracks as you play.
              </div>
            </div>
          </div>
          <button
            onClick={() => setMode("play")}
            className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white border border-white/15 transition-colors shrink-0"
          >
            ✕ Close [Esc]
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2.5">
          {QUESTS.map((q, idx) => {
            const accepted = questsAccepted.includes(q.id);
            const completed = questsCompleted.includes(q.id);
            const current = Math.max(
              0,
              Math.min(q.objective.target, (questProgress as QuestProgress)[q.objective.kind] ?? 0)
            );
            const target = q.objective.target;
            const pct = Math.round((current / target) * 100);
            const isDone = pct >= 100;
            const showPct = completed ? 100 : pct;

            return (
              <div
                key={q.id}
                className={`rounded-lg border p-3 transition-all ${
                  completed
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : accepted
                    ? "border-amber-400/50 bg-amber-500/5 animate-quest-accepted"
                    : q.requires && !questsCompleted.includes(q.requires)
                    ? "border-white/5 bg-black/40 opacity-60" // locked quest chain
                    : "border-white/10 bg-black/30 hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon tile */}
                  <div
                    className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 text-2xl shrink-0 ${iconTileClass(
                      idx
                    )}`}
                  >
                    {q.icon}
                  </div>

                  {/* Center content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-white font-bold text-sm">{q.title}</span>
                      {completed && (
                        <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <div className="text-white/60 text-xs mt-0.5 leading-snug">{q.desc}</div>

                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-white/55 uppercase tracking-wider font-semibold">
                          Objective
                        </span>
                        <span
                          className={`font-mono tabular-nums font-bold ${
                            isDone ? "text-emerald-300" : "text-amber-200"
                          }`}
                        >
                          {current} / {target} · {showPct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-[width] duration-300 ${
                            isDone
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : "bg-gradient-to-r from-amber-600 to-amber-400"
                          }`}
                          style={{ width: `${showPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Rewards */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.rewards.map((r, ri) => {
                        const def = ITEMS[r.id];
                        return (
                          <span
                            key={ri}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-[10px] text-white/85"
                            title={def?.name ?? r.id}
                          >
                            <span className="text-sm leading-none">{def?.icon ?? "❓"}</span>
                            <span className="font-mono tabular-nums">×{r.qty}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right column: status / accept button */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {completed ? (
                      <span className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/50">
                        ✓ Done
                      </span>
                    ) : accepted ? (
                      <span className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-200 border border-amber-400/50 animate-pulse">
                        ▸ Accepted
                      </span>
                    ) : (
                      <button
                        onClick={() => acceptQuest(q.id)}
                        className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded border transition-colors ${
                          q.requires && !questsCompleted.includes(q.requires)
                            ? "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                            : "bg-white/10 hover:bg-white text-white hover:text-black border-white/20"
                        }`}
                        disabled={!!q.requires && !questsCompleted.includes(q.requires)}
                      >
                        {q.requires && !questsCompleted.includes(q.requires) ? `🔒 ${QUESTS.find(qq => qq.id === q.requires)?.title ?? "Prerequisite"}` : "+ Accept"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-black/40 px-4 py-2.5 border-t border-white/10 flex items-center justify-between text-[11px] shrink-0">
          <div className="text-white/60">
            Completed:{" "}
            <span className="font-mono tabular-nums text-amber-200 font-bold">
              {completedCount}
            </span>{" "}
            / {QUESTS.length}
          </div>
          <div className="text-white/45">Tip: walk near the quest board and press E anytime</div>
        </div>
      </div>

      <style>{`
        @keyframes questAcceptedGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(251,191,36,0); }
          50%      { box-shadow: 0 0 12px rgba(251,191,36,0.25); }
        }
        .animate-quest-accepted { animation: questAcceptedGlow 2.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
