"use client";
// Player Status Panel — opened with [K]. Comprehensive character screen
// inspired by Rust's player status and the Fallout Pip-Boy.
// Shows: overview/level/XP, vital signs + afflictions + buffs, survival stats,
// equipped clothing, and achievement progress (with tier breakdown).
import { useEffect, type ReactNode } from "react";
import { useGame, ACHIEVEMENTS, type AchievementTier } from "@/lib/game/store";
import { ITEMS } from "@/lib/game/items";

type TierStyle = { border: string; bg: string; text: string; label: string };
const TIER_STYLES: Record<AchievementTier, TierStyle> = {
  common: { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-300", label: "Common" },
  rare: { border: "border-sky-500/40", bg: "bg-sky-500/10", text: "text-sky-300", label: "Rare" },
  epic: { border: "border-purple-500/40", bg: "bg-purple-500/10", text: "text-purple-300", label: "Epic" },
  legendary: { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-300", label: "Legendary" },
};

const TIER_ORDER: AchievementTier[] = ["common", "rare", "epic", "legendary"];

const WEATHER_META: Record<string, { icon: string; label: string }> = {
  sunny: { icon: "☀️", label: "Clear" },
  cloudy: { icon: "⛅", label: "Cloudy" },
  rainy: { icon: "🌧️", label: "Rainy" },
  foggy: { icon: "🌫️", label: "Foggy" },
  blizzard: { icon: "❄️", label: "Blizzard" },
};

function timeOfDayPhase(t: number): { icon: string; label: string } {
  // t in [0,1): 0 = midnight, 0.5 = noon (typical convention).
  if (t < 0.22 || t >= 0.78) return { icon: "🌙", label: "Night" };
  if (t < 0.3) return { icon: "🌅", label: "Dawn" };
  if (t < 0.7) return { icon: "☀️", label: "Day" };
  return { icon: "🌇", label: "Dusk" };
}

export function PlayerStatusPanel() {
  const open = useGame((s) => s.playerStatsPanelOpen);
  const mode = useGame((s) => s.mode);
  const setOpen = useGame((s) => s.setPlayerStatsPanelOpen);

  // Overview
  const level = useGame((s) => s.level);
  const xp = useGame((s) => s.xp);
  const xpToNext = useGame((s) => s.xpToNext);
  const totalXp = useGame((s) => s.totalXp);
  const dayCount = useGame((s) => s.dayCount);
  const worldSeed = useGame((s) => s.worldSeed);
  const timeOfDay = useGame((s) => s.timeOfDay);
  const weather = useGame((s) => s.weather);

  // Survival stats
  const killCount = useGame((s) => s.killCount);
  const mealsEaten = useGame((s) => s.mealsEaten);
  const bandagesUsed = useGame((s) => s.bandagesUsed);
  const wolvesKilledAtNight = useGame((s) => s.wolvesKilledAtNight);
  const barometerUses = useGame((s) => s.barometerUses);
  const placed = useGame((s) => s.placed);
  // Phase 11: new exploration stats
  const waypoints = useGame((s) => s.waypoints);
  const totalDistanceWalked = useGame((s) => s.totalDistanceWalked);

  // Vitals & afflictions
  const stats = useGame((s) => s.stats);
  const bleeding = useGame((s) => s.bleeding);
  const poisoning = useGame((s) => s.poisoning);
  const hypothermia = useGame((s) => s.hypothermia);
  const radiation = useGame((s) => s.radiation);

  // Buffs
  const buffStrength = useGame((s) => s.buffStrength);
  const buffSwift = useGame((s) => s.buffSwift);
  const buffIronSkin = useGame((s) => s.buffIronSkin);
  const buffRegen = useGame((s) => s.buffRegen);
  const buffNightVision = useGame((s) => s.buffNightVision);
  const wellRested = useGame((s) => s.wellRested);
  const hydrated = useGame((s) => s.hydrated);

  // Equipment + achievements
  const clothing = useGame((s) => s.clothing);
  const unlockedAchievements = useGame((s) => s.unlockedAchievements);

  // Close on K or Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "k" || k === "escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  if (!open || mode === "dead" || mode === "loading" || mode === "menu") return null;

  const xpPct = xpToNext > 0 ? Math.min(100, (xp / xpToNext) * 100) : 0;
  const structuresBuilt = placed?.length ?? 0;

  const unlockedSet = new Set(unlockedAchievements);
  const recentUnlocks = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id))
    .slice(-8)
    .reverse();

  const tierCounts: Record<AchievementTier, { unlocked: number; total: number }> = {
    common: { unlocked: 0, total: 0 },
    rare: { unlocked: 0, total: 0 },
    epic: { unlocked: 0, total: 0 },
    legendary: { unlocked: 0, total: 0 },
  };
  for (const a of ACHIEVEMENTS) {
    tierCounts[a.tier].total++;
    if (unlockedSet.has(a.id)) tierCounts[a.tier].unlocked++;
  }
  const achievementPct =
    ACHIEVEMENTS.length > 0 ? (unlockedAchievements.length / ACHIEVEMENTS.length) * 100 : 0;

  const vitals = [
    { label: "Health", icon: "❤️", value: stats.health, ring: "from-rose-400 to-red-500" },
    { label: "Food", icon: "🍖", value: stats.food, ring: "from-orange-400 to-amber-500" },
    { label: "Water", icon: "💧", value: stats.water, ring: "from-sky-400 to-blue-500" },
    { label: "Stamina", icon: "⚡", value: stats.stamina, ring: "from-yellow-300 to-lime-500" },
    { label: "Warmth", icon: "🔥", value: stats.warmth, ring: "from-amber-400 to-orange-500" },
  ];

  const afflictions = [
    { label: "Bleeding", value: bleeding, icon: "🩸" },
    { label: "Poisoning", value: poisoning, icon: "☠️" },
    { label: "Hypothermia", value: hypothermia, icon: "🥶" },
    { label: "Radiation", value: radiation, icon: "☢️" },
  ].filter((s) => s.value > 0);

  const activeBuffs = [
    { label: "Strength", value: buffStrength, icon: "💪" },
    { label: "Swift", value: buffSwift, icon: "🏃" },
    { label: "Iron Skin", value: buffIronSkin, icon: "🛡️" },
    { label: "Regen", value: buffRegen, icon: "✨" },
    { label: "Night Vision", value: buffNightVision, icon: "👁️" },
    { label: "Well Rested", value: wellRested, icon: "🛌" },
    { label: "Hydrated", value: hydrated, icon: "💦" },
  ].filter((b) => b.value > 0);

  const clothingSlots: { slot: "head" | "chest" | "legs" | "feet"; label: string; icon: string }[] = [
    { slot: "head", label: "Head", icon: "🪖" },
    { slot: "chest", label: "Chest", icon: "🦺" },
    { slot: "legs", label: "Legs", icon: "👖" },
    { slot: "feet", label: "Feet", icon: "🥾" },
  ];

  const survivalStats = [
    { label: "Structures Built", value: structuresBuilt, icon: "🏗️" },
    { label: "Creatures Killed", value: killCount, icon: "💀" },
    { label: "Meals Eaten", value: mealsEaten, icon: "🍽️" },
    { label: "Bandages Used", value: bandagesUsed, icon: "🩹" },
    { label: "Wolves Killed (Night)", value: wolvesKilledAtNight, icon: "🐺" },
    { label: "Barometer Uses", value: barometerUses, icon: "🌡️" },
    { label: "Waypoints Placed", value: waypoints.length, icon: "📍" },
    { label: "Distance Walked", value: `${Math.round(totalDistanceWalked)}m`, icon: "👣" },
  ];

  const phase = timeOfDayPhase(timeOfDay);
  const wx = WEATHER_META[weather] ?? { icon: "🌤️", label: weather };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pointer-events-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] rounded-lg border-2 border-amber-500/40 bg-zinc-900/95 shadow-2xl shadow-amber-900/20 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/50 to-yellow-800/50 px-4 py-3 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <span className="text-amber-200 font-bold text-lg tracking-wider">CHARACTER STATUS</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="px-2.5 py-1 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white border border-white/15 transition-colors"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3">
          {/* ===== A. Character Overview ===== */}
          <section>
            <SectionLabel>OVERVIEW</SectionLabel>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col sm:flex-row gap-4 items-center hover:bg-white/[0.07] transition-colors">
              {/* Level badge */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-amber-300/50">
                  <span className="text-2xl font-black text-zinc-900 leading-none">{level}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-amber-300/70 font-semibold">Level</span>
                  <span className="text-xs text-white/50">
                    {xp} / {xpToNext} XP
                  </span>
                </div>
              </div>

              {/* XP bar + info grid */}
              <div className="flex-1 w-full min-w-0">
                <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
                  <span className="uppercase tracking-wider">XP Progress</span>
                  <span>{Math.floor(xpPct)}%</span>
                </div>
                <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                  <InfoRow label="Level" value={level} />
                  <InfoRow label="Total XP" value={totalXp} />
                  <InfoRow label="Days Survived" value={dayCount} />
                  <InfoRow label="World Seed" value={worldSeed} />
                </div>

                {/* Environment strip */}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-white/40">
                  <span className="inline-flex items-center gap-1">
                    <span>{phase.icon}</span>
                    <span className="uppercase tracking-wider">{phase.label}</span>
                  </span>
                  <span className="text-white/15">•</span>
                  <span className="inline-flex items-center gap-1">
                    <span>{wx.icon}</span>
                    <span className="uppercase tracking-wider">{wx.label}</span>
                  </span>
                  <span className="text-white/15">•</span>
                  <span className="inline-flex items-center gap-1">
                    <span>📅</span>
                    <span className="uppercase tracking-wider">Day {dayCount}</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ===== B. Vital Signs ===== */}
          <section className="border-t border-white/5 pt-3 mt-3">
            <SectionLabel>VITAL SIGNS</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {vitals.map((v) => (
                <VitalCard key={v.label} icon={v.icon} label={v.label} value={v.value} ring={v.ring} />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {/* Afflictions */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 hover:bg-white/[0.07] transition-colors">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-semibold">
                  Afflictions
                </div>
                {afflictions.length === 0 ? (
                  <div className="text-xs text-white/30 italic">No afflictions</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {afflictions.map((s) => (
                      <span
                        key={s.label}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold"
                      >
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                        <span className="text-red-200/70 font-normal">{Math.round(s.value)}s</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Buffs */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 hover:bg-white/[0.07] transition-colors">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-semibold">
                  Active Buffs
                </div>
                {activeBuffs.length === 0 ? (
                  <div className="text-xs text-white/30 italic">No active buffs</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {activeBuffs.map((b) => (
                      <span
                        key={b.label}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold"
                      >
                        <span>{b.icon}</span>
                        <span>{b.label}</span>
                        <span className="text-emerald-200/70 font-normal">{Math.round(b.value)}s</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ===== C. Survival Stats ===== */}
          <section className="border-t border-white/5 pt-3 mt-3">
            <SectionLabel>SURVIVAL STATS</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {survivalStats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-white/10 bg-white/5 p-2.5 flex items-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <span className="text-xl shrink-0">{s.icon}</span>
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-base font-bold text-amber-200">{s.value}</span>
                    <span className="text-[10px] uppercase tracking-wider text-white/50 truncate">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ===== D. Equipment ===== */}
          <section className="border-t border-white/5 pt-3 mt-3">
            <SectionLabel>EQUIPMENT</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {clothingSlots.map(({ slot, label, icon }) => {
                const itemId = clothing[slot];
                const def = itemId ? ITEMS[itemId] : undefined;
                return (
                  <div
                    key={slot}
                    className="rounded-lg border border-white/10 bg-white/5 p-2.5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm opacity-70">{icon}</span>
                      <span className="text-[10px] uppercase tracking-wider text-white/50">{label}</span>
                    </div>
                    {def ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{def.icon}</span>
                        <span className="text-xs font-semibold text-amber-200 truncate">{def.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-white/30">
                        <span className="text-xl">—</span>
                        <span className="text-xs italic">Empty</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===== E. Achievements Progress ===== */}
          <section className="border-t border-white/5 pt-3 mt-3">
            <SectionLabel>ACHIEVEMENTS</SectionLabel>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
              {/* Count + progress */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <span className="text-sm text-amber-200 font-bold">
                    {unlockedAchievements.length} / {ACHIEVEMENTS.length}
                  </span>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Unlocked</span>
                </div>
                <span className="text-xs text-white/50 font-semibold">{Math.floor(achievementPct)}%</span>
              </div>
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all"
                  style={{ width: `${achievementPct}%` }}
                />
              </div>

              {/* Tier sub-counts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIER_ORDER.map((tier) => {
                  const t = TIER_STYLES[tier];
                  const c = tierCounts[tier];
                  return (
                    <div
                      key={tier}
                      className={`rounded border ${t.border} ${t.bg} px-2 py-1.5 flex items-center justify-between`}
                    >
                      <span className={`text-[10px] uppercase tracking-wider ${t.text} font-semibold`}>
                        {t.label}
                      </span>
                      <span className={`text-xs font-bold ${t.text}`}>
                        {c.unlocked}/{c.total}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Recent unlocks */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-semibold">
                  Recent Unlocks
                </div>
                {recentUnlocks.length === 0 ? (
                  <div className="text-xs text-white/30 italic">No achievements unlocked yet — get out there, survivor.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {recentUnlocks.map((a) => {
                      const t = TIER_STYLES[a.tier];
                      return (
                        <div
                          key={a.id}
                          className={`rounded border ${t.border} ${t.bg} p-2 flex items-center gap-2 hover:bg-white/10 transition-colors min-w-0`}
                          title={a.desc}
                        >
                          <span className="text-lg shrink-0">{a.icon}</span>
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="text-xs font-semibold text-white truncate">{a.name}</span>
                            <span className={`text-[9px] uppercase tracking-wider ${t.text}`}>{t.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between shrink-0 bg-black/20">
          <span className="text-[10px] text-white/40 uppercase tracking-wider flex items-center gap-1">
            Press
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60 border border-white/15 font-mono">K</kbd>
            or
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60 border border-white/15 font-mono">Esc</kbd>
            to close
          </span>
          <span className="text-[10px] text-amber-300/60 uppercase tracking-wider font-semibold">Close [K]</span>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-widest text-amber-300/70 font-semibold mb-1.5">
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      <span className="text-xs font-semibold text-amber-200">{value}</span>
    </div>
  );
}

function VitalCard({
  icon,
  label,
  value,
  ring,
}: {
  icon: string;
  label: string;
  value: number;
  ring: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-white/50">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-bold text-amber-200">{Math.floor(value)}</span>
        <span className="text-[10px] text-white/30">/ 100</span>
      </div>
      <div className="h-1 mt-1 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${ring} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
