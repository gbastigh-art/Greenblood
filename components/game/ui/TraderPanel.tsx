"use client";
// Trader shop panel — appears when player is near the wandering trader.
// Player buys items with goldNugget currency. Press E or click button to open.
import { useGame } from "@/lib/game/store";
import { ITEMS } from "@/lib/game/items";
import { useEffect, useState } from "react";

export function TraderPanel() {
  const traderNearby = useGame((s) => s.traderNearby);
  const traderShop = useGame((s) => s.traderShop);
  const buyFromTrader = useGame((s) => s.buyFromTrader);
  const setMode = useGame((s) => s.setMode);
  const mode = useGame((s) => s.mode);
  const goldCount = useGame((st) => {
    let n = 0;
    for (const it of st.inventory) if (it && it.id === "goldNugget") n += it.qty;
    for (const it of st.hotbar) if (it && it.id === "goldNugget") n += it.qty;
    return n;
  });
  const [open, setOpen] = useState(false);

  // Lock input when panel is open
  const isOpen = open || mode === "trader";

  // Listen for E key to toggle the panel when trader is nearby
  useEffect(() => {
    if (!traderNearby) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E") {
        const m = useGame.getState().mode;
        // Only respond if in play mode (not in inventory/crafting/build/dead)
        if (m === "play" || m === "trader") {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => {
            const next = !o;
            if (next) useGame.getState().setMode("trader");
            else useGame.getState().setMode("play");
            return next;
          });
        }
      } else if (e.key === "Escape" && isOpen) {
        setOpen(false);
        useGame.getState().setMode("play");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [traderNearby, isOpen]);

  // Reset open state when trader walks away
  useEffect(() => {
    if (!traderNearby && open) {
      // Defer to avoid synchronous setState in effect (lint guideline).
      const id = requestAnimationFrame(() => {
        setOpen(false);
        if (useGame.getState().mode === "trader") useGame.getState().setMode("play");
      });
      return () => cancelAnimationFrame(id);
    }
  }, [traderNearby, open]);

  // Show the "press E to trade" hint when nearby and not yet open
  if (!traderNearby) {
    return null;
  }

  return (
    <>
      {/* Floating hint button when nearby & closed */}
      {!isOpen && (
        <div className="pointer-events-none fixed bottom-32 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-gradient-to-r from-amber-900/90 to-yellow-800/90 border-2 border-amber-400/60 px-4 py-2 rounded-lg text-amber-100 text-sm font-bold shadow-[0_4px_16px_rgba(251,191,36,0.4)] flex items-center gap-2 animate-pulse">
            <span className="text-lg">🤝</span>
            <span>Trader nearby — press</span>
            <kbd className="bg-black/60 px-1.5 py-0.5 rounded text-xs font-mono border border-amber-400/40">E</kbd>
            <span>to trade</span>
          </div>
        </div>
      )}

      {/* Full shop panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-lg border-2 border-amber-500/50 bg-zinc-900/95 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-900/60 to-yellow-800/60 px-4 py-3 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧑‍🌾</span>
                <div>
                  <div className="text-amber-200 font-bold text-lg tracking-wide">Wandering Trader</div>
                  <div className="text-amber-100/70 text-xs">Rare goods for gold nuggets</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-black/50 px-3 py-1.5 rounded-lg border border-amber-500/40 flex items-center gap-2">
                  <span className="text-lg">🪙</span>
                  <span className="text-amber-200 font-bold font-mono text-sm">{goldCount}</span>
                  <span className="text-amber-100/60 text-[10px] uppercase">gold</span>
                </div>
                <button
                  onClick={() => { setOpen(false); setMode("play"); }}
                  className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white border border-white/15 transition-colors"
                >
                  ✕ Close [Esc]
                </button>
              </div>
            </div>

            {/* Shop items grid */}
            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scroll">
              {traderShop.length === 0 ? (
                <div className="text-white/50 text-center py-8">
                  <div className="text-4xl mb-2">🛒</div>
                  <div>The trader has nothing to sell right now.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {traderShop.map((item, idx) => {
                    const def = ITEMS[item.id];
                    if (!def) return null;
                    const soldOut = item.qty <= 0;
                    const canAfford = goldCount >= item.price;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                          soldOut
                            ? "border-white/5 bg-black/30 opacity-50"
                            : canAfford
                            ? "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/12 shadow-[0_0_8px_rgba(251,191,36,0.1)]"
                            : "border-rose-500/30 bg-rose-500/5"
                        }`}
                      >
                        <div className="w-12 h-12 flex items-center justify-center rounded bg-black/50 border border-white/10 text-2xl shrink-0">
                          {def.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-semibold truncate flex items-center gap-1.5">
                            {def.name}
                            {def.rarity && def.rarity !== "common" && (
                              <span className="text-[8px] px-1 rounded uppercase font-bold bg-black/40 text-amber-300">
                                {def.rarity}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-white/55 truncate">{def.desc}</div>
                          <div className="text-[10px] text-white/45 mt-0.5">
                            Stock: <span className="font-mono text-white/70">{item.qty}</span>
                          </div>
                        </div>
                        <button
                          disabled={soldOut || !canAfford}
                          onClick={() => buyFromTrader(idx)}
                          className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1 ${
                            soldOut
                              ? "bg-white/5 text-white/30 cursor-not-allowed"
                              : canAfford
                              ? "bg-amber-500 text-black hover:bg-amber-400 shadow-[0_2px_6px_rgba(251,191,36,0.4)] active:scale-95"
                              : "bg-white/5 text-rose-400/60 cursor-not-allowed"
                          }`}
                        >
                          {soldOut ? (
                            "Sold out"
                          ) : (
                            <>
                              <span>🪙</span>
                              <span className="font-mono">{item.price}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-black/40 px-4 py-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
              <div className="text-white/55">
                💡 Find gold nuggets by mining rocks with a pickaxe.
              </div>
              <div className="text-white/40">Trader restocks periodically</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
