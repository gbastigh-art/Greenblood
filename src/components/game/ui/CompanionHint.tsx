"use client";
// Phase 6: Companion hint — shows when companion is nearby, with carrying info.
import { useGame } from "@/lib/game/store";
import { ITEMS } from "@/lib/game/items";

export function CompanionHint() {
  const companionNearby = useGame((s) => s.companionNearby);
  const companionCarrying = useGame((s) => s.companionCarrying);
  const mode = useGame((s) => s.mode);

  if (!companionNearby || mode !== "play") return null;

  return (
    <div className="pointer-events-none fixed bottom-32 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-emerald-900/85 border border-emerald-400/50 px-4 py-2 rounded-lg backdrop-blur-sm shadow-[0_0_18px_rgba(52,211,153,0.3)] flex items-center gap-3">
        <span className="text-emerald-300 text-lg">🤝</span>
        <div className="flex flex-col gap-0.5">
          <span className="text-emerald-100 text-xs font-semibold">Companion nearby</span>
          {companionCarrying.length > 0 && (
            <span className="text-emerald-300/70 text-[10px]">
              Carrying: {companionCarrying.slice(0, 3).map((c) => `${c.qty}×${ITEMS[c.id]?.name ?? c.id}`).join(", ")}
              {companionCarrying.length > 3 ? ` +${companionCarrying.length - 3} more` : ""}
            </span>
          )}
          {companionCarrying.length === 0 && (
            <span className="text-emerald-300/50 text-[10px] italic">Gathering resources...</span>
          )}
        </div>
      </div>
    </div>
  );
}
