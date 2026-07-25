"use client";
// Build mode menu — bottom strip showing available build kinds.
import { Fragment } from "react";
import { useGame } from "@/lib/game/store";
import { BUILDS, type BuildKind } from "@/lib/game/buildables";
import { ITEMS } from "@/lib/game/items";

const ORDER: BuildKind[] = [
  "woodWall", "woodFloor", "woodRoof", "woodDoor", "woodPillar",
  "woodStairs", "woodWindow", "woodLadder", "gate",
  // Phase 4: new structure pieces
  "triangularRoof", "halfWall", "fencePost", "fenceGate",
  // Phase 5: new structure pieces
  "ramp", "balcony", "triangularFloor",
  "stoneWall", "stoneFloor", "stoneRoof", "stoneDoor",
  "stoneStairs", "stoneWindow",
  "campfire", "bed", "woodChest", "torch", "workbench", "furnace",
  "anvil", "dryingRack", "farmingPlot", "rainBarrel", "signPost", "scarecrow",
  // Phase 4: beekeeping (furniture)
  "beehive",
  // Phase 5: raft + quest board
  "raft", "questBoard",
  // Phase 6: electricity
  "generator", "wire", "electricLight",
  // Phase 7: cooking pot
  "cookingPot",
];

export function BuildMenu() {
  const mode = useGame((s) => s.mode);
  const buildKind = useGame((s) => s.buildKind);
  const buildRotation = useGame((s) => s.buildRotation);
  const setBuildKind = useGame((s) => s.setBuildKind);
  const rotateBuild = useGame((s) => s.rotateBuild);
  const countItem = useGame((s) => s.countItem);

  return null; // Legacy build menu disabled (V2 system in use)
  return (
    <>
      {/* Bottom build selector */}
      <div className="pointer-events-auto fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
        <div className="flex flex-col items-center gap-2">
          <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold bg-black/70 px-3 py-1 rounded border border-amber-500/30">
            🏗️ Build Mode — [LMB] place • [R] rotate ({buildRotation * 90}°) • [Esc] exit
          </div>
          <div className="relative">
            {/* Subtle top gradient fade above the bar for visual separation */}
            <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            <div className="flex gap-1 bg-black/75 p-1.5 rounded-lg border border-white/10 max-w-[92vw] overflow-x-auto custom-scroll-x">
              {ORDER.map((k, idx) => {
                const def = BUILDS[k];
                const itemDef = ITEMS[def.itemId];
                const owned = countItem(def.itemId);
                const active = buildKind === k;
                const isStruct = def.category === "structure";
                const prevCat = idx > 0 ? BUILDS[ORDER[idx - 1]].category : null;
                const showLabel = prevCat !== def.category;
                return (
                  <Fragment key={k}>
                    {showLabel && (
                      <div className="flex flex-col items-center justify-center px-1.5 self-stretch shrink-0">
                        <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold whitespace-nowrap [writing-mode:horizontal-tb]">
                          {isStruct ? "STRUCTURE" : "FURNITURE"}
                        </span>
                        <div className={`w-px flex-1 mt-1 ${isStruct ? "bg-amber-500/30" : "bg-sky-500/30"}`} />
                      </div>
                    )}
                    <button
                      onClick={() => setBuildKind(active ? null : k)}
                      className={`relative w-14 h-14 shrink-0 rounded border-2 border-t-4 flex flex-col items-center justify-center transition-all ${
                        isStruct ? "border-t-amber-500" : "border-t-sky-500"
                      } ${
                        active
                          ? "border-amber-400 bg-amber-400/20 scale-105 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                          : "border-white/15 bg-black/50 hover:border-white/40 hover:scale-105 hover:bg-black/70 hover:shadow-lg"
                      } ${owned === 0 ? "opacity-40" : ""}`}
                      title={`${itemDef.name} — owned: ${owned}`}
                    >
                      <span className="text-xl drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}>{itemDef.icon}</span>
                      <span className="absolute top-0.5 right-1 text-[10px] text-white font-bold bg-black/70 px-1 rounded">
                        {owned}
                      </span>
                      {active && (
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[7px] font-black text-black bg-amber-400 px-1 py-0.5 rounded whitespace-nowrap shadow-[0_0_6px_rgba(251,191,36,0.8)]">
                          ✓ SELECTED
                        </span>
                      )}
                    </button>
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Rotation hint */}
      <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={() => rotateBuild()}
          className="pointer-events-auto px-3 py-1 text-xs font-bold bg-black/70 hover:bg-black/85 border border-white/20 rounded text-white"
        >
          ⟳ Rotate [R]
        </button>
      </div>
    </>
  );
}
