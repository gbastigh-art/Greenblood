"use client";
// Debug Menu (Task 11/12) — a developer panel that opens when the engine fires
// the `greenblood-open-debug-menu` CustomEvent (currently triggered by
// interacting with the purple debug block in the Test Range).
//
// Offers:
//   • Give Items — searchable grid of every item; click to add to inventory.
//   • Trigger Events — set time/weather, spawn animals/bots, teleport, heal,
//     kill nearby animals, clear inventory.
//
// Engine-side actions are invoked via `(window as any).__engine?.method()`.
// Store-side actions use `useGame.getState()`.
//
// The component self-registers a global listener for the open event and renders
// via a portal to document.body, so the orchestrator only needs to mount
// `<DebugMenu />` once (anywhere in the tree).
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useGame } from "@/lib/game/store";
import { ITEMS, type ItemCategory } from "@/lib/game/items";

const OPEN_EVENT = "greenblood-open-debug-menu";

// Engine bridge — the Engine instance is exposed as window.__engine by Game.tsx.
type EngineBridge = {
  spawnAnimalNear?: (kind: "deer" | "boar" | "bear" | "wolf" | "rabbit") => void;
  spawnBotNear?: () => void;
  teleportToSpawn?: () => void;
  killNearbyAnimals?: (radius?: number) => void;
  setWeatherOverride?: (w: "sunny" | "cloudy" | "rainy" | "foggy" | "blizzard") => void;
  setTimeOfDayOverride?: (t: number) => void;
};
function engine(): EngineBridge {
  return (window as unknown as { __engine?: EngineBridge }).__engine ?? {};
}

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  resource: "Resources",
  food: "Food",
  drink: "Drink",
  weapon: "Weapons",
  tool: "Tools",
  clothing: "Clothing",
  building: "Building",
  furniture: "Furniture",
  ammo: "Ammo",
  misc: "Misc",
};

const QTY_OPTIONS = [1, 10, 100];

export function DebugMenu() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState<string | null>(null);

  // Listen for the engine's open event. Pause the game so the player can
  // interact with the menu without the simulation running underneath.
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      // Pause the game so pointer lock is released and the sim freezes.
      useGame.getState().setPaused(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Esc closes the menu (the engine's Esc handler also resumes the game).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        // Resume the game (re-locks pointer).
        useGame.getState().setPaused(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  function close() {
    setOpen(false);
    // Resume the game (re-locks pointer).
    useGame.getState().setPaused(false);
  }

  function flashToast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1500);
  }

  function giveItem(id: string) {
    const left = useGame.getState().addItem(id, qty);
    const name = ITEMS[id]?.name ?? id;
    if (left > 0) {
      flashToast(`⚠ Inventory full — ${left} ${name} not added`);
    } else {
      flashToast(`✓ Added ${qty}× ${name}`);
    }
  }

  // Filtered + grouped item list (memoized for perf with ~100+ items).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = Object.values(ITEMS).filter((it) => {
      if (!q) return true;
      return it.name.toLowerCase().includes(q) || it.id.toLowerCase().includes(q) || it.category.includes(q);
    });
    const groups: Record<string, typeof items> = {};
    for (const it of items) {
      const cat = CATEGORY_LABELS[it.category] ?? it.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    }
    return groups;
  }, [search]);

  // Event action helpers
  function setTime(t: number) {
    engine().setTimeOfDayOverride?.(t);
    flashToast(`Time set to ${Math.floor(t * 24).toString().padStart(2, "0")}:00`);
  }
  function setWeather(w: "sunny" | "cloudy" | "rainy" | "foggy" | "blizzard") {
    engine().setWeatherOverride?.(w);
    flashToast(`Weather: ${w}`);
  }
  function spawnAnimal(kind: "deer" | "boar" | "bear" | "wolf" | "rabbit") {
    engine().spawnAnimalNear?.(kind);
    flashToast(`Spawned ${kind}`);
  }
  function healFully() {
    const g = useGame.getState();
    g.setStats({ health: 100, food: 100, water: 100 });
    g.setBleeding(0);
    flashToast("✓ Healed fully");
  }
  function clearInventory() {
    useGame.setState({
      inventory: new Array(30).fill(null),
      hotbar: new Array(6).fill(null),
    });
    flashToast("✓ Inventory cleared");
  }
  function killNearby() {
    engine().killNearbyAnimals?.(30);
    flashToast("Killed nearby animals");
  }
  function spawnBot() {
    engine().spawnBotNear?.();
    flashToast("Spawned bot");
  }
  function teleport() {
    engine().teleportToSpawn?.();
    flashToast("Teleported to spawn");
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] rounded-lg border-2 border-amber-500/40 bg-zinc-900/95 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/50 to-yellow-800/50 px-4 py-3 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛠️</span>
            <span className="text-amber-200 font-bold text-lg tracking-wide">Debug Menu</span>
            <span className="text-[10px] text-amber-400/60 uppercase tracking-widest font-bold ml-1">Test Range</span>
          </div>
          <button
            onClick={close}
            className="px-2.5 py-1 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white border border-white/15 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Flash toast */}
        {flash && (
          <div className="mx-4 mt-3 px-3 py-2 rounded border border-amber-500/50 bg-amber-950/60 text-amber-200 text-xs font-bold">
            {flash}
          </div>
        )}

        {/* Body — scrollable */}
        <div className="p-4 space-y-5 overflow-y-auto custom-scroll flex-1">
          {/* ===== Trigger Events ===== */}
          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-amber-400/70 font-bold mb-2 pb-1 border-b border-white/10">
              Trigger Events
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* Time */}
              <button onClick={() => setTime(0.25)} className="dbg-btn">🌅 Dawn</button>
              <button onClick={() => setTime(0.5)} className="dbg-btn">☀️ Day</button>
              <button onClick={() => setTime(0.75)} className="dbg-btn">🌆 Dusk</button>
              <button onClick={() => setTime(0.0)} className="dbg-btn">🌙 Night</button>
              {/* Weather */}
              <button onClick={() => setWeather("sunny")} className="dbg-btn">☀️ Sunny</button>
              <button onClick={() => setWeather("rainy")} className="dbg-btn">🌧️ Rainy</button>
              <button onClick={() => setWeather("foggy")} className="dbg-btn">🌫️ Foggy</button>
              <button onClick={() => setWeather("blizzard")} className="dbg-btn">❄️ Blizzard</button>
              {/* Spawn animals */}
              <button onClick={() => spawnAnimal("deer")} className="dbg-btn">🦌 Spawn Deer</button>
              <button onClick={() => spawnAnimal("boar")} className="dbg-btn">🐗 Spawn Boar</button>
              <button onClick={() => spawnAnimal("bear")} className="dbg-btn">🐻 Spawn Bear</button>
              <button onClick={() => spawnAnimal("wolf")} className="dbg-btn">🐺 Spawn Wolf</button>
              <button onClick={() => spawnAnimal("rabbit")} className="dbg-btn">🐰 Spawn Rabbit</button>
              <button onClick={spawnBot} className="dbg-btn">🤖 Spawn Bot</button>
              {/* Player actions */}
              <button onClick={healFully} className="dbg-btn">❤️ Heal Fully</button>
              <button onClick={killNearby} className="dbg-btn">⚔️ Kill Nearby</button>
              <button onClick={teleport} className="dbg-btn">📍 Teleport to Spawn</button>
              <button
                onClick={() => { if (confirm("Clear entire inventory + hotbar?")) clearInventory(); }}
                className="dbg-btn-danger"
              >
                🗑️ Clear Inventory
              </button>
            </div>
          </section>

          {/* ===== Give Items ===== */}
          <section>
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/10">
              <h2 className="text-[10px] uppercase tracking-widest text-amber-400/70 font-bold">
                Give Items
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wide">Qty</span>
                <div className="flex rounded border border-white/10 overflow-hidden">
                  {QTY_OPTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQty(q)}
                      className={`px-2 py-0.5 text-[11px] font-bold transition-colors ${
                        qty === q
                          ? "bg-amber-600 text-white"
                          : "bg-zinc-800 text-white/60 hover:bg-zinc-700"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items by name, id, or category…"
              className="w-full px-3 py-2 mb-3 rounded bg-zinc-800 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
            />
            <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scroll pr-1">
              {Object.entries(filtered).map(([cat, items]) => (
                <div key={cat}>
                  <div className="text-[10px] uppercase tracking-widest text-amber-400/60 font-bold mb-1.5">
                    {cat} <span className="text-white/30">({items.length})</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {items.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => giveItem(it.id)}
                        title={it.desc ?? it.name}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/5 hover:bg-amber-600/30 border border-white/5 hover:border-amber-500/40 transition-colors text-left"
                      >
                        <span className="text-base leading-none">{it.icon}</span>
                        <span className="text-[11px] text-white/80 font-medium truncate">{it.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(filtered).length === 0 && (
                <div className="text-center text-white/30 text-sm py-6">No items match &quot;{search}&quot;</div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-black/40 px-4 py-3 border-t border-white/10 flex items-center justify-between gap-2">
          <span className="text-[10px] text-white/40 font-medium">
            Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/70 text-[10px]">Esc</kbd> or click outside to close
          </span>
          <button
            onClick={close}
            className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 rounded text-white transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>

      {/* Inline styles for button classes (avoids repeating long Tailwind strings) */}
      <style>{`
        .dbg-btn {
          padding: 0.4rem 0.5rem;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          text-align: left;
          transition: background 0.15s, border-color 0.15s;
          cursor: pointer;
        }
        .dbg-btn:hover {
          background: rgba(245,158,11,0.18);
          border-color: rgba(245,158,11,0.4);
        }
        .dbg-btn-danger {
          padding: 0.4rem 0.5rem;
          font-size: 11px;
          font-weight: 700;
          color: rgba(254,205,211,0.95);
          background: rgba(136,19,55,0.25);
          border: 1px solid rgba(244,63,94,0.3);
          border-radius: 4px;
          text-align: left;
          transition: background 0.15s, border-color 0.15s;
          cursor: pointer;
        }
        .dbg-btn-danger:hover {
          background: rgba(136,19,55,0.5);
          border-color: rgba(244,63,94,0.6);
        }
      `}</style>
    </div>,
    document.body
  );
}

// ===== Auto-mount =====
// When this module is imported on the client, immediately mount the DebugMenu
// to a dedicated container in document.body. This makes the menu available
// globally without the orchestrator needing to place <DebugMenu /> in the
// React tree. A window-level guard ensures the auto-mount only runs once
// (HMR, lazy imports, etc.). If the orchestrator also mounts <DebugMenu />,
// both instances will respond to the open event — the portal renders to
// document.body so the second modal just stacks on top (harmless).
if (typeof window !== "undefined") {
  const w = window as unknown as { __greenbloodDebugMenuMounted?: boolean };
  if (!w.__greenbloodDebugMenuMounted) {
    w.__greenbloodDebugMenuMounted = true;
    // Defer to next tick so React DOM is ready and we don't block module init.
    setTimeout(() => {
      import("react-dom/client").then(({ createRoot }) => {
        const container = document.createElement("div");
        container.id = "greenblood-debug-menu-root";
        document.body.appendChild(container);
        createRoot(container).render(<DebugMenu />);
      }).catch(() => {
        // React DOM client not available (SSR or older React) — the
        // orchestrator can still mount <DebugMenu /> manually.
      });
    }, 0);
  }
}
