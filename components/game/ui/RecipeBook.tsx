"use client";
// Phase 6: Recipe Book — searchable crafting recipe browser accessible from anywhere.
import { useState, useMemo } from "react";
import { useGame } from "@/lib/game/store";
import { RECIPES, CRAFT_CATEGORIES, recipeStationAvailable, STATION_LABEL } from "@/lib/game/crafting";
import { ITEMS } from "@/lib/game/items";

export function RecipeBook() {
  const mode = useGame((s) => s.mode);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const inventory = useGame((s) => s.inventory);
  const hotbar = useGame((s) => s.hotbar);
  const nearStations = useGame((s) => s.nearStations);

  // Flatten inventory for count lookup
  const allItems = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of [...inventory, ...hotbar]) {
      if (s) counts[s.id] = (counts[s.id] ?? 0) + s.qty;
    }
    return counts;
  }, [inventory, hotbar]);

  const filteredRecipes = useMemo(() => {
    let recipes = RECIPES;
    if (filterCat !== "all") recipes = recipes.filter((r) => r.category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      recipes = recipes.filter((r) => {
        const outName = ITEMS[r.out.id]?.name?.toLowerCase() ?? r.out.id;
        const outId = r.out.id.toLowerCase();
        return outName.includes(q) || outId.includes(q);
      });
    }
    return recipes;
  }, [search, filterCat]);

  if (mode !== "play") {
    if (!open) return null;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 right-[280px] z-30 px-2 py-1 text-xs font-bold bg-black/55 hover:bg-black/75 border border-white/15 rounded text-white/80 backdrop-blur-sm transition-colors flex items-center gap-1"
        title="Recipe Book (J)"
      >
        <span>📖</span>
        <span className="text-[10px]">Recipes</span>
      </button>
    );
  }

  return (
    <>
      {/* Background overlay */}
      <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-[56] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-3xl max-h-[85vh] bg-zinc-900/95 border-2 border-amber-500/40 rounded-lg shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-900/50 to-yellow-800/50 px-4 py-3 border-b border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📖</span>
              <div>
                <div className="text-amber-200 font-bold text-lg tracking-wide">Recipe Book</div>
                <div className="text-amber-100/70 text-xs font-mono">{RECIPES.length} recipes</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white border border-white/15 transition-colors"
            >
              ✕ Close
            </button>
          </div>

          {/* Search + filter */}
          <div className="px-4 py-2 border-b border-white/10 flex gap-2 items-center flex-wrap">
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[140px] bg-black/40 border border-white/15 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400/50"
            />
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setFilterCat("all")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${filterCat === "all" ? "bg-amber-500/30 text-amber-200 border border-amber-400/50" : "bg-black/40 text-white/60 border border-white/10 hover:text-white/80"}`}
              >
                All
              </button>
              {CRAFT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCat(cat.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${filterCat === cat.id ? "bg-amber-500/30 text-amber-200 border border-amber-400/50" : "bg-black/40 text-white/60 border border-white/10 hover:text-white/80"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipe list */}
          <div className="overflow-y-auto custom-scroll p-3 space-y-1.5 flex-1">
            {filteredRecipes.length === 0 && (
              <div className="text-center text-white/40 py-8 text-sm">No recipes found</div>
            )}
            {filteredRecipes.map((recipe) => {
              const outDef = ITEMS[recipe.out.id];
              const stationOk = recipeStationAvailable(recipe.station, { ...nearStations, inventory: true });
              const canCraft = recipe.cost.every((c) => (allItems[c.id] ?? 0) >= c.qty) && stationOk;

              return (
                <div
                  key={recipe.id}
                  className={`flex items-center gap-3 p-2.5 rounded border transition-colors ${
                    canCraft
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-white/5 bg-black/30"
                  }`}
                >
                  {/* Output icon + name */}
                  <div className="flex items-center gap-2 w-36 shrink-0">
                    <span className="text-xl">{outDef?.icon ?? "📦"}</span>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${canCraft ? "text-white" : "text-white/60"}`}>
                        {outDef?.name ?? recipe.out.id}
                      </div>
                      {recipe.out.qty > 1 && (
                        <div className="text-[10px] text-amber-300/70">×{recipe.out.qty}</div>
                      )}
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {recipe.cost.map((c, ci) => {
                      const have = allItems[c.id] ?? 0;
                      const enough = have >= c.qty;
                      const cDef = ITEMS[c.id];
                      return (
                        <span
                          key={ci}
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                            enough
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                          }`}
                        >
                          {cDef?.icon ?? ""} {have}/{c.qty}
                        </span>
                      );
                    })}
                  </div>

                  {/* Station */}
                  {recipe.station && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${
                      stationOk
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-black/30 text-white/40"
                    }`}>
                      {STATION_LABEL[recipe.station]}
                    </span>
                  )}

                  {/* Category tag */}
                  <span className="text-[9px] uppercase tracking-wider text-white/30 shrink-0">
                    {recipe.category}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="bg-black/40 px-4 py-2 border-t border-white/10 text-[10px] text-white/55 text-center">
            Press J to toggle • Shows all recipes with ingredient availability
          </div>
        </div>
      </div>
    </>
  );
}
