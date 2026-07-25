"use client";
// Inventory + Crafting panel — Rust-style overlay.
// Left: character preview (emoji-based mannequin with clothing slots).
// Center: 30-slot inventory grid + hotbar.
// Right: crafting recipe list filtered by station proximity.
import { useState, useMemo } from "react";
import { useGame, INVENTORY_SLOTS, HOTBAR_SLOTS } from "@/lib/game/store";
import { ITEMS, type ItemStack, type Rarity } from "@/lib/game/items";
import { RECIPES, CRAFT_CATEGORIES, canCraft, recipeStationAvailable, STATION_LABEL, type Recipe } from "@/lib/game/crafting";
import type { ClothingEquip } from "@/lib/game/store";

type SlotRef = { inv: "main" | "hotbar"; i: number };
type DragState = { from: SlotRef } | null;

export const RARITY_COLORS: Record<Rarity, { border: string; glow: string; text: string; label: string; leftBorder: string }> = {
  common: { border: "border-zinc-400/30", glow: "", text: "text-zinc-300", label: "Common", leftBorder: "" },
  uncommon: { border: "border-emerald-400/50", glow: "shadow-[0_0_8px_rgba(52,211,153,0.3)]", text: "text-emerald-300", label: "Uncommon", leftBorder: "border-l-2 border-l-emerald-400" },
  rare: { border: "border-sky-400/60", glow: "shadow-[0_0_10px_rgba(56,189,248,0.4)]", text: "text-sky-300", label: "Rare", leftBorder: "border-l-2 border-l-sky-400" },
  epic: { border: "border-purple-400/70", glow: "shadow-[0_0_12px_rgba(192,132,252,0.5)]", text: "text-purple-300", label: "Epic", leftBorder: "border-l-2 border-l-purple-400" },
  legendary: { border: "border-amber-400/80", glow: "shadow-[0_0_14px_rgba(251,191,36,0.6)]", text: "text-amber-300", label: "Legendary", leftBorder: "border-l-2 border-l-amber-400" },
};

export function InventoryPanel() {
  const mode = useGame((s) => s.mode);
  const inventory = useGame((s) => s.inventory);
  const hotbar = useGame((s) => s.hotbar);
  const clothing = useGame((s) => s.clothing);
  const openContainer = useGame((s) => s.openContainer);
  const nearStations = useGame((s) => s.nearStations);
  const moveStack = useGame((s) => s.moveStack);
  const consume = useGame((s) => s.consume);
  const equipClothing = useGame((s) => s.equipClothing);
  const unequipClothing = useGame((s) => s.unequipClothing);
  const closeContainer = useGame((s) => s.closeContainer);
  const transferFromContainer = useGame((s) => s.transferFromContainer);
  const setMode = useGame((s) => s.setMode);
  const doCraft = useGame((s) => s.doCraft);
  const dropFromSlot = useGame((s) => s.dropFromSlot);

  const [drag, setDrag] = useState<DragState>(null);
  const [tab, setTab] = useState<"inventory" | "crafting">("inventory");
  const [craftCat, setCraftCat] = useState<Recipe["category"]>("weapons");

  // Determine available stations — proximity-based (Phase 2)
  const stations = useMemo(() => {
    return {
      inventory: true,
      workbench: nearStations.workbench,
      furnace: nearStations.furnace,
      campfire: nearStations.campfire,
      anvil: nearStations.anvil,
      cookingPot: nearStations.cookingPot,
    };
  }, [nearStations]);

  // Combined inventory for recipe canCraft checks
  const combinedInv = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of inventory) if (s) m.set(s.id, (m.get(s.id) ?? 0) + s.qty);
    for (const s of hotbar) if (s) m.set(s.id, (m.get(s.id) ?? 0) + s.qty);
    return Array.from(m.entries()).map(([id, qty]) => ({ id, qty }));
  }, [inventory, hotbar]);

  if (mode !== "inventory" && mode !== "crafting") return null;

  const shownRecipes = RECIPES.filter((r) => r.category === craftCat);

  function onSlotClick(ref: SlotRef, e: React.MouseEvent) {
    const arr = ref.inv === "main" ? inventory : hotbar;
    const s = arr[ref.i];
    if (!s) return;
    if (e.shiftKey) {
      dropFromSlot(ref.inv, ref.i);
      return;
    }
    const def = ITEMS[s.id];
    if (!def) return;
    if (def.category === "food" || def.category === "drink" || def.category === "misc") {
      consume(ref.inv, ref.i);
    } else if (def.category === "clothing" && def.slot) {
      equipClothing(ref.inv, ref.i);
    }
  }

  function onSlotDragStart(ref: SlotRef, e: React.DragEvent) {
    setDrag({ from: ref });
    e.dataTransfer.setData("text/plain", JSON.stringify(ref));
  }
  function onSlotDrop(to: SlotRef, e: React.DragEvent) {
    e.preventDefault();
    const fromStr = e.dataTransfer.getData("text/plain");
    if (!fromStr) return;
    try {
      const from = JSON.parse(fromStr) as SlotRef;
      moveStack(from, to);
    } catch {}
    setDrag(null);
  }

  function renderItemSlot(s: ItemStack | null, ref: SlotRef, key: string) {
    const def = s ? ITEMS[s.id] : null;
    const rarity = def?.rarity;
    const rarityStyle = rarity ? RARITY_COLORS[rarity] : null;
    // Equipped highlight — show when this item id is currently equipped in any clothing slot.
    const equipped = !!(def && (clothing.head === s!.id || clothing.chest === s!.id || clothing.legs === s!.id || clothing.feet === s!.id));
    return (
      <div
        key={key}
        draggable={!!s}
        onDragStart={(e) => onSlotDragStart(ref, e)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onSlotDrop(ref, e)}
        onClick={(e) => onSlotClick(ref, e)}
        className={`relative w-full aspect-square rounded-sm border ${
          def
            ? rarityStyle
              ? `${rarityStyle.border} ${rarityStyle.leftBorder} bg-black/45 ${rarityStyle.glow}`
              : "border-white/25 bg-black/45"
            : "border-white/10 bg-black/30 hover:ring-1 hover:ring-amber-400/30"
        } ${def ? "hover:border-amber-400/80 hover:bg-black/55 hover:scale-105" : "hover:scale-105"} cursor-pointer flex items-center justify-center transition-all duration-150 ${equipped ? "ring-2 ring-amber-400" : ""}`}
        style={def ? { boxShadow: `inset 0 0 0 1px ${def.color}22` } : undefined}
        title={def ? `${def.name}${def.desc ? " — " + def.desc : ""}${rarity ? ` [${rarityStyle!.label}]` : ""}` : ""}
      >
        {def && (
          <>
            <span className="text-xl sm:text-2xl pointer-events-none select-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}>
              {def.icon}
            </span>
            {s!.qty > 1 && (
              <span className="absolute bottom-0.5 right-1 text-[11px] text-white font-bold bg-black/75 px-1 rounded-sm">
                {s!.qty}
              </span>
            )}
            {def.category === "clothing" && def.slot && (
              <span className="absolute top-0.5 left-1 text-[8px] text-amber-300/80 uppercase font-bold">
                {def.slot[0]}
              </span>
            )}
            {rarity && rarity !== "common" && (
              <span className={`absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full ${rarityStyle!.text.replace("text-", "bg-")}`} />
            )}
            {equipped && (
              <span className="absolute top-0.5 right-0.5 text-[8px] font-black text-black bg-amber-400 rounded-sm w-2.5 h-2.5 flex items-center justify-center leading-none shadow-[0_0_6px_rgba(251,191,36,0.8)]" title="Equipped">E</span>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col rounded-lg border border-white/15 bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 shadow-2xl">
        {/* Top tabs */}
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <div className="flex gap-1">
            <button
              onClick={() => setTab("inventory")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded ${
                tab === "inventory" ? "bg-amber-500 text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              📦 Inventory
            </button>
            <button
              onClick={() => setTab("crafting")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded ${
                tab === "crafting" ? "bg-amber-500 text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              🔨 Crafting
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono flex items-center gap-1">
              <span className="text-white/45">Near:</span>
              <StationChip on={stations.inventory} label="Inv" />
              <StationChip on={nearStations.workbench} label="Bench" />
              <StationChip on={nearStations.furnace} label="Furnace" />
              <StationChip on={nearStations.campfire} label="Fire" />
              <StationChip on={nearStations.anvil} label="Anvil" />
              <StationChip on={nearStations.dryingRack} label="Rack" />
              <StationChip on={nearStations.rainBarrel} label="Barrel" />
              <StationChip on={nearStations.farmingPlot} label="Plot" />
              <StationChip on={nearStations.cookingPot} label="Pot" />
            </span>
            <button
              onClick={() => { closeContainer(); setMode("play"); }}
              className="px-3 py-1 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white"
            >
              ✕ Close [Tab]
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr_260px] gap-3 p-3 overflow-y-auto">
          {/* LEFT: Character preview + clothing slots */}
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-white/10 bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/65 font-bold mb-2 pb-1.5 border-b border-white/10 flex items-center gap-1.5"><span>🧍</span><span>Character</span></div>
              <CharacterMannequin clothing={clothing} />
              {/* Clothing slots */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ClothingSlot label="Head" item={clothing.head} onUnequip={() => unequipClothing("head")} />
                <ClothingSlot label="Chest" item={clothing.chest} onUnequip={() => unequipClothing("chest")} />
                <ClothingSlot label="Legs" item={clothing.legs} onUnequip={() => unequipClothing("legs")} />
                <ClothingSlot label="Feet" item={clothing.feet} onUnequip={() => unequipClothing("feet")} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] text-white/55">
                <Stat label="Armor" value={armorTotal(clothing)} />
                <Stat label="Slots" value={`${INVENTORY_SLOTS}`} />
              </div>
            </div>
            {/* Hotbar in left panel */}
            <div className="rounded-lg border border-white/10 bg-black/40 p-2">
              <div className="text-[11px] uppercase tracking-wider text-white/65 font-bold mb-2 pb-1.5 px-1 border-b border-white/10 flex items-center gap-1.5"><span>🎒</span><span>Hotbar</span></div>
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: HOTBAR_SLOTS }).map((_, i) => (
                  <div key={i} className="relative">
                    {renderItemSlot(hotbar[i], { inv: "hotbar", i }, `hb-${i}`)}
                    <span className="absolute top-0.5 left-1 text-[8px] text-white/55 font-bold">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Open container loot (if any) */}
            {openContainer && (
              <div className="rounded-lg border border-amber-500/30 bg-black/50 p-2">
                <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold mb-1.5 px-1 flex justify-between">
                  <span>{openContainer.kind} (loot)</span>
                  <button onClick={() => closeContainer()} className="text-white/55 hover:text-white">✕</button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {openContainer.loot.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => transferFromContainer(i)}
                      className={`relative aspect-square rounded-sm border ${
                        s ? "border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/25 cursor-pointer" : "border-white/10 bg-black/30"
                      } flex items-center justify-center`}
                      title={s ? `Take ${ITEMS[s.id].name} ×${s.qty}` : ""}
                    >
                      {s && (
                        <>
                          <span className="text-xl">{ITEMS[s.id].icon}</span>
                          <span className="absolute bottom-0.5 right-1 text-[10px] text-white font-bold bg-black/70 px-1 rounded">{s.qty}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 text-[10px] text-white/45 text-center">Click items to transfer</div>
              </div>
            )}
          </div>

          {/* CENTER: Inventory grid OR crafting list */}
          {tab === "inventory" ? (
            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/65 font-bold mb-2 pb-1.5 border-b border-white/10 flex items-center gap-1.5"><span>📦</span><span>Inventory</span></div>
              <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5">
                {Array.from({ length: INVENTORY_SLOTS }).map((_, i) => (
                  <div key={`inv-${i}`} className="relative">
                    {renderItemSlot(inventory[i], { inv: "main", i }, `inv-${i}`)}
                    <span className="absolute top-0.5 left-1 text-[8px] text-white/35 font-mono">{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-white/45 leading-relaxed text-center">
                Stand near crafting stations to unlock more recipes.
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/65 font-bold mb-2 pb-1.5 border-b border-white/10 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span>🔨</span><span>Crafting</span></span>
                <span className="text-[10px] text-white/40 font-normal normal-case tracking-normal">{shownRecipes.length} recipes</span>
              </div>
              {/* Category tabs */}
              <div className="flex flex-wrap gap-1 mb-2.5 pb-2 border-b border-white/10">
                {CRAFT_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCraftCat(c.id)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-all ${
                      craftCat === c.id
                        ? "bg-amber-500 text-black shadow-[0_2px_8px_rgba(251,191,36,0.4)]"
                        : "bg-white/5 text-white/65 hover:bg-white/15 hover:text-white border border-white/5"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="max-h-[58vh] overflow-y-auto pr-1 custom-scroll">
                {shownRecipes.map((r) => {
                  const out = ITEMS[r.out.id];
                  const ok = canCraft(r, combinedInv) && recipeStationAvailable(r.station, stations);
                  const stAvail = recipeStationAvailable(r.station, stations);
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center gap-3 p-2 mb-1.5 rounded border transition-all hover:translate-x-0.5 ${
                        ok
                          ? "border-emerald-500/50 bg-emerald-500/8 hover:bg-emerald-500/15 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                          : "border-white/10 bg-white/5 hover:bg-white/8"
                      }`}
                    >
                      <div className="w-10 h-10 flex items-center justify-center rounded bg-black/55 border border-white/15 text-xl shrink-0">
                        {out?.icon ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-semibold truncate flex items-center gap-1.5">
                          {out?.name ?? r.out.id}
                          {out?.rarity && out.rarity !== "common" && (
                            <span className={`text-[9px] px-1 rounded uppercase font-bold ${RARITY_COLORS[out.rarity].text} bg-black/40`}>
                              {RARITY_COLORS[out.rarity].label}
                            </span>
                          )}
                          <span className="text-white/45 text-xs">×{r.out.qty}</span>
                        </div>
                        <div className="text-[10px] text-white/60 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                          {r.cost.map((c) => {
                            const have = combinedInv.find((x) => x.id === c.id)?.qty ?? 0;
                            return (
                              <span key={c.id} className={`font-mono ${have >= c.qty ? "text-emerald-400" : "text-rose-400"}`}>
                                {ITEMS[c.id]?.icon} {ITEMS[c.id]?.name} {have}/{c.qty}
                              </span>
                            );
                          })}
                          {r.station && r.station !== "inventory" && (
                            <span className={`ml-auto font-bold ${stAvail ? "text-sky-400" : "text-rose-400"}`}>
                              ⚙ {STATION_LABEL[r.station]}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        disabled={!ok}
                        onClick={() => doCraft(r)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded transition-all ${
                          ok
                            ? "bg-amber-500 text-black hover:bg-amber-400 shadow-[0_2px_8px_rgba(251,191,36,0.4)] active:scale-95"
                            : "bg-white/5 text-white/30 cursor-not-allowed"
                        }`}
                      >
                        Craft
                      </button>
                    </div>
                  );
                })}
                {shownRecipes.length === 0 && (
                  <div className="text-white/45 text-sm text-center py-6">No recipes in this category</div>
                )}
              </div>
            </div>
          )}

          {/* RIGHT: quick info */}
          <div className="flex flex-col gap-2">
            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/65 font-bold mb-2 pb-1.5 border-b border-white/10 flex items-center gap-1.5"><span>📊</span><span>Quick Stats</span></div>
              <QuickStatList />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CharacterMannequin({ clothing }: { clothing: ClothingEquip }) {
  // CSS-drawn humanoid silhouette with clothing overlays
  const head = clothing.head ? ITEMS[clothing.head] : null;
  const chest = clothing.chest ? ITEMS[clothing.chest] : null;
  const legs = clothing.legs ? ITEMS[clothing.legs] : null;
  const feet = clothing.feet ? ITEMS[clothing.feet] : null;
  return (
    <div className="relative w-full h-56 rounded bg-gradient-to-b from-zinc-700/30 to-zinc-900/30 flex items-end justify-center overflow-hidden">
      {/* glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl" />
      {/* body svg */}
      <svg viewBox="0 0 100 200" className="h-full w-auto" preserveAspectRatio="xMidYMax meet">
        {/* legs */}
        <rect x="40" y="120" width="9" height="55" fill={legs ? legs.color : "#3a3a45"} stroke="#000" strokeWidth="0.5" />
        <rect x="51" y="120" width="9" height="55" fill={legs ? legs.color : "#3a3a45"} stroke="#000" strokeWidth="0.5" />
        {/* feet */}
        <rect x="38" y="172" width="13" height="8" fill={feet ? feet.color : "#222"} stroke="#000" strokeWidth="0.5" />
        <rect x="49" y="172" width="13" height="8" fill={feet ? feet.color : "#222"} stroke="#000" strokeWidth="0.5" />
        {/* hips */}
        <rect x="38" y="110" width="24" height="14" fill={legs ? legs.color : "#3a3a45"} stroke="#000" strokeWidth="0.5" />
        {/* torso */}
        <rect x="35" y="60" width="30" height="55" rx="3" fill={chest ? chest.color : "#8a8a90"} stroke="#000" strokeWidth="0.5" />
        {/* arms */}
        <rect x="28" y="62" width="8" height="42" rx="3" fill={chest ? chest.color : "#8a8a90"} stroke="#000" strokeWidth="0.5" />
        <rect x="64" y="62" width="8" height="42" rx="3" fill={chest ? chest.color : "#8a8a90"} stroke="#000" strokeWidth="0.5" />
        {/* hands */}
        <circle cx="32" cy="108" r="4" fill="#c28960" />
        <circle cx="68" cy="108" r="4" fill="#c28960" />
        {/* neck */}
        <rect x="46" y="50" width="8" height="12" fill="#c28960" />
        {/* head */}
        <ellipse cx="50" cy="38" rx="13" ry="16" fill="#c28960" stroke="#000" strokeWidth="0.5" />
        {/* hair */}
        <path d="M 37 30 Q 50 12 63 30 L 63 22 Q 50 8 37 22 Z" fill="#2a1a10" />
        {/* eyes */}
        <circle cx="45" cy="38" r="1.2" fill="#1a1a1a" />
        <circle cx="55" cy="38" r="1.2" fill="#1a1a1a" />
        {/* headgear overlay */}
        {head && (
          <path d="M 36 30 Q 50 8 64 30 L 64 22 Q 50 4 36 22 Z" fill={head.color} stroke="#000" strokeWidth="0.5" />
        )}
      </svg>
      {/* clothing labels */}
      <div className="absolute top-1 left-1 text-[9px] text-white/45 font-mono space-y-0.5">
        <div>🧢 {head ? head.name : "—"}</div>
        <div>👕 {chest ? chest.name : "—"}</div>
        <div>👖 {legs ? legs.name : "—"}</div>
        <div>🥾 {feet ? feet.name : "—"}</div>
      </div>
    </div>
  );
}

function ClothingSlot({ label, item, onUnequip }: { label: string; item: string | null; onUnequip: () => void }) {
  const def = item ? ITEMS[item] : null;
  return (
    <button
      onClick={() => def && onUnequip()}
      disabled={!def}
      className={`relative flex items-center justify-center h-12 rounded border ${
        def ? "border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/15 ring-2 ring-amber-400/70" : "border-white/10 bg-black/40"
      } transition-all`}
      title={def ? `Unequip ${def.name}` : `Empty ${label} slot`}
    >
      <span className="absolute top-0.5 left-1 text-[9px] text-white/45 uppercase font-bold">{label}</span>
      {def && <span className="text-xl drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}>{def.icon}</span>}
      {def && (
        <span className="absolute top-0.5 right-0.5 text-[8px] font-black text-black bg-amber-400 rounded-sm w-2.5 h-2.5 flex items-center justify-center leading-none shadow-[0_0_6px_rgba(251,191,36,0.8)]" title="Equipped">E</span>
      )}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-black/40 rounded px-1.5 py-1 text-center">
      <div className="text-white/40 text-[8px] uppercase">{label}</div>
      <div className="text-white font-bold text-xs">{value}</div>
    </div>
  );
}

function StationChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
        on
          ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/60 shadow-[0_0_6px_rgba(52,211,153,0.3)]"
          : "bg-white/5 text-white/30 border border-white/10"
      }`}
      title={on ? `${label} nearby` : `${label} not nearby`}
    >
      {on ? "✓ " : ""}{label}
    </span>
  );
}

function QuickStatList() {
  const s = useGame((st) => st.stats);
  const weather = useGame((st) => st.weather);
  const placedCount = useGame((st) => st.placed.length);
  const dayCount = useGame((st) => st.dayCount);
  const timeOfDay = useGame((st) => st.timeOfDay);
  const bleeding = useGame((st) => st.bleeding);
  const poisoning = useGame((st) => st.poisoning);
  const wellRested = useGame((st) => st.wellRested);
  const hydrated = useGame((st) => st.hydrated);
  const dehydrated = useGame((st) => st.dehydrated);
  const hours = Math.floor(timeOfDay * 24);
  const mins = Math.floor((timeOfDay * 24 - hours) * 60);
  const timeStr = `${hours.toString().padStart(2,"0")}:${mins.toString().padStart(2,"0")}`;
  const weatherIcon = weather === "sunny" ? "☀️" : weather === "cloudy" ? "☁️" : weather === "rainy" ? "🌧️" : weather === "foggy" ? "🌫️" : "❄️";
  return (
    <div className="space-y-2.5">
      <div>
        <div className="text-[9px] uppercase tracking-wider text-white/40 font-bold mb-1 px-1">World</div>
        <div className="space-y-1">
          <Row label="Day" v={dayCount} c="text-amber-300 font-bold" />
          <Row label="Time" v={timeStr} c="text-white font-mono" />
          <Row label="Weather" v={`${weatherIcon} ${weather}`} c="text-white/85 capitalize" />
          <Row label="Buildings" v={placedCount} c="text-white/80" />
        </div>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-wider text-white/40 font-bold mb-1 px-1">Vitals</div>
        <div className="space-y-1">
          <Row label="❤️ Health" v={Math.round(s.health)} c="text-emerald-400 font-bold" />
          <Row label="🍖 Food" v={Math.round(s.food)} c="text-orange-400 font-bold" />
          <Row label="💧 Water" v={Math.round(s.water)} c="text-sky-400 font-bold" />
        </div>
      </div>
      {(bleeding > 0 || poisoning > 0 || wellRested > 0 || hydrated > 0 || dehydrated) && (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/40 font-bold mb-1 px-1">Status</div>
          <div className="space-y-1">
            {dehydrated && <Row label="🏜️ Dehydrated" v="slow" c="text-sky-400 font-bold animate-pulse" />}
            {bleeding > 0 && <Row label="🩸 Bleeding" v={`${Math.round(bleeding*10)/10}/s`} c="text-rose-400 font-bold animate-pulse" />}
            {poisoning > 0 && <Row label="☠️ Poison" v={`${Math.ceil(poisoning)}s`} c="text-emerald-400 font-bold animate-pulse" />}
            {wellRested > 0 && <Row label="💪 Well-Rested" v={`${Math.ceil(wellRested)}s`} c="text-amber-400 font-bold" />}
            {hydrated > 0 && <Row label="💦 Hydrated" v={`${Math.ceil(hydrated)}s`} c="text-sky-300 font-bold" />}
          </div>
        </div>
      )}
    </div>
  );
}
function Row({ label, v, c }: { label: string; v: string | number; c: string }) {
  return (
    <div className="flex justify-between items-center bg-white/5 px-2 py-1 rounded border border-white/5">
      <span className="text-white/70 text-[11px]">{label}</span>
      <span className={`text-[12px] font-mono ${c}`}>{v}</span>
    </div>
  );
}

function KeyRow({ k, v }: { k: string; v: string }) {
  // Kept for backwards-compat — no longer rendered in the inventory panel
  // (the in-game F1 help overlay is the canonical controls reference).
  void k; void v;
  return null;
}


function armorTotal(c: ClothingEquip): number {
  let a = 0;
  if (c.head && ITEMS[c.head].armor) a += ITEMS[c.head].armor!;
  if (c.chest && ITEMS[c.chest].armor) a += ITEMS[c.chest].armor!;
  if (c.legs && ITEMS[c.legs].armor) a += ITEMS[c.legs].armor!;
  if (c.feet && ITEMS[c.feet].armor) a += ITEMS[c.feet].armor!;
  return a;
}
