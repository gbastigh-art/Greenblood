"use client";
// F1 help overlay — shows all controls + tips.
import { useEffect, useState } from "react";

const SECTIONS = [
  {
    title: "Movement",
    icon: "🏃",
    rows: [
      { k: "WASD", v: "Move" },
      { k: "Shift", v: "Sprint (drains stamina)" },
      { k: "Space", v: "Jump (costs 12 stamina)" },
      { k: "C", v: "Crouch" },
      { k: "Ctrl", v: "Walk (slow, quiet)" },
    ],
  },
  {
    title: "Combat / Tools",
    icon: "⚔️",
    rows: [
      { k: "LMB", v: "Attack / Harvest / Fish" },
      { k: "RMB", v: "Aim (ranged weapons)" },
      { k: "1-6", v: "Select hotbar slot" },
      { k: "Mouse wheel", v: "Cycle hotbar" },
    ],
  },
  {
    title: "Interaction",
    icon: "👐",
    rows: [
      { k: "E", v: "Interact (loot, doors, sleep, plant, drink)" },
      { k: "B", v: "Toggle build mode" },
      { k: "R", v: "Rotate build ghost" },
      { k: "F", v: "Command companion (near companion) / toggle torch" },
      { k: "Q", v: "Drop selected stack" },
    ],
  },
  {
    title: "Quick Actions",
    icon: "⚡",
    rows: [
      { k: "H", v: "Auto-eat best food" },
      { k: "J", v: "Auto-drink best drink" },
      { k: "K", v: "Open character status panel" },
      { k: "M", v: "Drop waypoint marker at your position" },
      { k: "Shift+M", v: "Clear all waypoints" },
      { k: "N", v: "Remove nearest waypoint (within 8m)" },
      { k: "U", v: "Open fullscreen world map" },
    ],
  },
  {
    title: "Menu / System",
    icon: "📋",
    rows: [
      { k: "Tab", v: "Toggle inventory / crafting" },
      { k: "Esc", v: "Close menu / release cursor" },
      { k: "F1", v: "Toggle this help" },
      { k: "P", v: "Photo mode (hide HUD)" },
      { k: "S", v: "Screenshot (in photo mode)" },
      { k: "Ctrl+S", v: "Save game" },
    ],
  },
];

const TIPS = [
  "Sleep in a bed to skip night and restore HP.",
  "Stand near crafting stations to unlock recipes (Inv, Bench, Furnace, Fire, Anvil, Pot, Rack, Barrel, Plot).",
  "Build a farming plot, equip wheat or pumpkin seeds, and press E to plant.",
  "Place a drying rack, then press E with raw meat to start drying (60s → jerky).",
  "Rain barrels passively collect water when it rains. Press E to drink.",
  "Wolves are hostile at night — sleep or build walls to survive.",
  "Cooked food gives a 'Well-Rested' buff (+50% regen).",
  "Bottled water and cola give 'Hydrated' buff (slower water drain).",
  "Raw meat and dirty water risk food poisoning. Use painkillers to cure.",
  "Cold weather drops warmth fast — wear warm clothing and stay near fire.",
  "Hypothermia triggers below 15% warmth. Warm up by fire or in shelter.",
  "Medkits cure bleeding, poison, and hypothermia instantly.",
  "Use Continue on the start menu to resume your last save.",
  // Phase 7 tips
  "Radiation zones are green-tinted areas far from spawn. Equip a hazmat suit or use Rad-X pills to survive.",
  "Hold a Geiger Counter to detect radiation levels. LOW → MEDIUM → HIGH → LETHAL.",
  "Craft a Cooking Pot at a workbench, place it near a campfire for advanced recipes.",
  "Press F near your companion to command them: Follow, Wait, Gather, or Attack.",
  "Press P for photo mode, then S to take screenshots. View them in the gallery (📸 button).",
  "Open Settings (⚙️ button) to adjust day/night speed, FOV, music volume, and more.",
  // Phase 11 tips
  "Press M to drop a colored waypoint marker — they appear on your minimap and full map.",
  "Walk near a cave entrance to discover it — find all 5 to unlock the Explorer achievement.",
  "When HP drops below 25%, your screen pulses red and a heartbeat plays — find cover or heal!",
  "Jumping costs 12 stamina — don't waste jumps while being chased.",
  "Press N near a waypoint (within 8m) to remove it. Use Shift+M to clear all waypoints.",
  "Track your total distance walked in the Player Status Panel (K key).",
];

export function HelpOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-4xl w-full max-h-[92vh] overflow-y-auto rounded-lg border border-amber-400/30 bg-zinc-900/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h2 className="text-lg font-bold text-amber-300 tracking-wider">SURVIVAL GUIDE</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white"
          >
            ✕ Close [F1 / Esc]
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-lg border border-white/10 bg-black/40 p-3">
              <div className="text-xs uppercase tracking-wider text-amber-300/90 font-bold mb-2 flex items-center gap-2">
                <span className="text-base">{s.icon}</span>
                {s.title}
              </div>
              <div className="space-y-1">
                {s.rows.map((r) => (
                  <div key={r.k} className="flex justify-between items-center text-xs">
                    <span className="text-white/80 font-mono bg-white/10 px-2 py-0.5 rounded">{r.k}</span>
                    <span className="text-white/65 text-right">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-900/15 p-3">
            <div className="text-xs uppercase tracking-wider text-emerald-300/90 font-bold mb-2 flex items-center gap-2">
              <span className="text-base">💡</span>
              Pro Tips
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-white/75">
              {TIPS.map((t, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-emerald-400 shrink-0">▸</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-2 text-center text-[10px] text-white/40">
          Press F1 anytime to toggle this guide • The wilderness awaits
        </div>
      </div>
    </div>
  );
}
