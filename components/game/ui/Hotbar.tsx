"use client";
// Bottom-center hotbar — 6 slots matching Rust style, with rarity borders.
import { useGame, HOTBAR_SLOTS } from "@/lib/game/store";
import { ITEMS, type Rarity } from "@/lib/game/items";

const RARITY_BORDER: Record<Rarity, string> = {
  common: "border-white/15",
  uncommon: "border-emerald-500/40",
  rare: "border-sky-500/50",
  epic: "border-purple-500/60",
  legendary: "border-amber-500/70",
};
const RARITY_GLOW: Record<Rarity, string> = {
  common: "",
  uncommon: "shadow-[0_0_8px_rgba(52,211,153,0.2)]",
  rare: "shadow-[0_0_10px_rgba(56,189,248,0.3)]",
  epic: "shadow-[0_0_12px_rgba(192,132,252,0.4)]",
  legendary: "shadow-[0_0_14px_rgba(251,191,36,0.5)]",
};

export function Hotbar() {
  const hotbar = useGame((s) => s.hotbar);
  const idx = useGame((s) => s.equipHotbarIndex);
  const activeSlot = hotbar[idx];
  const activeDef = activeSlot ? ITEMS[activeSlot.id] : null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5">
      <style>{`
        @keyframes hotbar-bounce-in {
          0%   { transform: scale(0.4) translateY(-6px); opacity: 0; }
          60%  { transform: scale(1.18) translateY(0); opacity: 1; }
          80%  { transform: scale(0.94); }
          100% { transform: scale(1); }
        }
      `}</style>
      {/* Active item name display */}
      {activeDef && (
        <div className="px-3 py-0.5 bg-black/65 backdrop-blur-sm rounded border border-white/10 text-[11px] font-semibold text-white/85">
          {activeDef.icon} {activeDef.name}
          {activeDef.damage ? <span className="text-rose-400 ml-1.5">⚔ {activeDef.damage}</span> : null}
          {activeDef.armor ? <span className="text-sky-400 ml-1.5">🛡 {activeDef.armor}</span> : null}
        </div>
      )}
      <div className="flex gap-1.5">
        {Array.from({ length: HOTBAR_SLOTS }).map((_, i) => {
          const slot = hotbar[i];
          const def = slot ? ITEMS[slot.id] : null;
          const active = i === idx;
          const rarity = def?.rarity ?? "common";
          return (
            <div
              key={i}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded border-2 ${
                active
                  ? "border-amber-400 bg-amber-400/15 ring-2 ring-amber-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] shadow-[0_0_14px_rgba(251,191,36,0.5)]"
                  : def
                  ? `${RARITY_BORDER[rarity]} bg-black/55 ${RARITY_GLOW[rarity]}`
                  : "border-dashed border-white/15 bg-black/40"
              } backdrop-blur-sm flex items-center justify-center transition-all duration-150 ${active ? "scale-110" : ""}`}
            >
              <span className="absolute top-0.5 left-1 text-[8px] text-white font-bold bg-black/60 px-1 rounded leading-tight">{i + 1}</span>
              {def && (
                <>
                  <span
                    key={slot!.id}
                    className="text-2xl sm:text-3xl"
                    style={{
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))",
                      animation: "hotbar-bounce-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  >
                    {def.icon}
                  </span>
                  {slot!.qty > 1 && (
                    <span className="absolute bottom-0.5 right-1 text-[11px] text-white font-bold bg-black/70 px-1 rounded">
                      {slot!.qty}
                    </span>
                  )}
                  {def.rarity && def.rarity !== "common" && (
                    <span
                      className={`absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full ${
                        rarity === "uncommon" ? "bg-emerald-400" :
                        rarity === "rare" ? "bg-sky-400" :
                        rarity === "epic" ? "bg-purple-400" :
                        "bg-amber-400"
                      }`}
                    />
                  )}
                </>
              )}
              {active && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
