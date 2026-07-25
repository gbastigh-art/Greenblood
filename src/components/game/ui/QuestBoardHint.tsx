"use client";
// Quest board hint — floating "press E" hint shown when the player is near the
// quest board AND in play mode. Clicking the hint (or pressing E in the engine)
// opens the QuestPanel by setting mode to "quest". Shows an accepted/completed
// count badge on the right (e.g. "2/7 accepted").
import { useGame } from "@/lib/game/store";
import { QUESTS } from "@/lib/game/store";

export function QuestBoardHint() {
  const nearby = useGame((s) => s.questBoardNearby);
  const mode = useGame((s) => s.mode);
  const accepted = useGame((s) => s.questsAccepted);
  const completed = useGame((s) => s.questsCompleted);
  const setMode = useGame((s) => s.setMode);

  if (!nearby || mode !== "play") return null;

  const acceptedCount = accepted.length;
  const completedCount = completed.length;
  const total = QUESTS.length;

  return (
    <div className="pointer-events-none fixed bottom-32 left-1/2 -translate-x-1/2 z-40">
      <button
        onClick={() => setMode("quest")}
        className="pointer-events-auto group bg-gradient-to-r from-amber-900/90 to-yellow-800/90 border-2 border-amber-400/60 px-4 py-2 rounded-lg text-amber-100 text-sm font-bold shadow-[0_4px_16px_rgba(251,191,36,0.4)] flex items-center gap-2 animate-pulse hover:from-amber-800/95 hover:to-yellow-700/95 hover:border-amber-300/80 transition-colors"
      >
        <span className="text-lg">📋</span>
        <span>Quest Board nearby — press</span>
        <kbd className="bg-black/60 px-1.5 py-0.5 rounded text-xs font-mono border border-amber-400/40 group-hover:border-amber-300/60">
          E
        </kbd>
        <span>to view quests</span>
        {/* Progress badge */}
        <span className="ml-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 border border-amber-400/40 text-[11px]">
          <span className="text-amber-200/90 font-mono tabular-nums">
            {acceptedCount}/{total}
          </span>
          <span className="text-amber-100/60">accepted</span>
          {completedCount > 0 && (
            <span className="text-emerald-300 font-mono tabular-nums">· {completedCount}✓</span>
          )}
        </span>
      </button>
    </div>
  );
}
