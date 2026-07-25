// Central game state with Zustand.
// Holds inventory, stats, mode, weather, time, etc.
// The actual 3D engine reads/writes from this store via the engine bridge.

import { create } from "zustand";
import { ITEMS, type ItemStack, type ItemDef } from "./items";
import { RECIPES, type Recipe } from "./crafting";
import type { BuildKind, PlacedBuild } from "./buildables";
import type { BuildPieceType, TierType, PlacedBuildV2, DeployableType, PlacedDeployable } from "./building/index";

export type Weather = "sunny" | "cloudy" | "rainy" | "foggy" | "blizzard";
export type GameMode = "play" | "inventory" | "crafting" | "trader" | "quest" | "leaderboard" | "dead" | "menu" | "loading";

// ===== Rebindable key mappings =====
// Each entry maps an action name to a KeyboardEvent.key value (lowercased).
// The engine reads these via `useGame.getState().keybinds` so users can
// rebind any action from the keybinding menu in OPTIONS.
export const DEFAULT_KEYBINDS: Record<string, string> = {
  forward: "w",
  back: "s",
  left: "a",
  right: "d",
  sprint: "shift",
  crouch: "control",
  jump: " ",
  interact: "e",
  inventory: "tab",
  // build mode removed (Rust system: hold Building Plan)
  rotateBuild: "r",
  drop: "q",
  autoEat: "h",
  leaderboard: "l",
  hotbar1: "1",
  hotbar2: "2",
  hotbar3: "3",
  hotbar4: "4",
  hotbar5: "5",
  hotbar6: "6",
};

// Human-readable labels for each bindable action (used by the keybinding menu UI).
export const KEYBIND_LABELS: { action: string; label: string; group: string }[] = [
  { action: "forward", label: "Move Forward", group: "Movement" },
  { action: "back", label: "Move Backward", group: "Movement" },
  { action: "left", label: "Strafe Left", group: "Movement" },
  { action: "right", label: "Strafe Right", group: "Movement" },
  { action: "sprint", label: "Sprint", group: "Movement" },
  { action: "crouch", label: "Crouch / Sneak", group: "Movement" },
  { action: "jump", label: "Jump", group: "Movement" },
  { action: "interact", label: "Interact", group: "Actions" },
  { action: "inventory", label: "Toggle Inventory", group: "Actions" },
  { action: "rotateBuild", label: "Rotate Piece (with Plan/Hammer)", group: "Actions" },
  { action: "drop", label: "Drop Selected", group: "Actions" },
  { action: "autoEat", label: "Auto-Eat", group: "Actions" },
  { action: "leaderboard", label: "Leaderboard", group: "Actions" },
  { action: "hotbar1", label: "Hotbar Slot 1", group: "Hotbar" },
  { action: "hotbar2", label: "Hotbar Slot 2", group: "Hotbar" },
  { action: "hotbar3", label: "Hotbar Slot 3", group: "Hotbar" },
  { action: "hotbar4", label: "Hotbar Slot 4", group: "Hotbar" },
  { action: "hotbar5", label: "Hotbar Slot 5", group: "Hotbar" },
  { action: "hotbar6", label: "Hotbar Slot 6", group: "Hotbar" },
];

// Pretty-print a key string for display in the UI (e.g. " " → "Space", "control" → "Ctrl").
export function formatKey(key: string): string {
  if (key === " ") return "Space";
  if (key === "control") return "Ctrl";
  if (key === "shift") return "Shift";
  if (key === "alt") return "Alt";
  if (key === "tab") return "Tab";
  if (key === "escape") return "Esc";
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export interface PlayerStats {
  health: number;
  food: number;
  water: number;
}

export interface ClothingEquip {
  head: string | null;
  chest: string | null;
  legs: string | null;
  feet: string | null;
}

export interface BuildGhostState {
  kind: BuildKind;
}

export interface ToastMsg {
  id: number;
  text: string;
  kind?: "info" | "warn" | "danger" | "good";
}

export type AchievementTier = "common" | "rare" | "epic" | "legendary";

// ===== XP / Level System =====
export const XP_PER_LEVEL = 100; // Base XP needed per level (scales)
export function xpForLevel(level: number): number {
  return Math.floor(XP_PER_LEVEL * Math.pow(1.15, level - 1));
}
export type XPSource = "chop" | "mine" | "craft" | "kill" | "build" | "fish" | "farm" | "cook" | "explore";
export const XP_REWARDS: Record<XPSource, number> = {
  chop: 5,
  mine: 8,
  craft: 10,
  kill: 15,
  build: 12,
  fish: 8,
  farm: 6,
  cook: 7,
  explore: 3,
};

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tier: AchievementTier;
}

// All trackable achievements in the game.
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_blood", name: "First Blood", desc: "Hunt your first animal", icon: "🏹", tier: "common" },
  { id: "first_tree", name: "Lumberjack", desc: "Chop down your first tree", icon: "🪓", tier: "common" },
  { id: "first_build", name: "Settler", desc: "Place your first structure", icon: "🏠", tier: "common" },
  { id: "first_craft", name: "Tinkerer", desc: "Craft your first item", icon: "🔨", tier: "common" },
  { id: "first_mine", name: "Pick & Shovel", desc: "Mine your first rock", icon: "⛏️", tier: "common" },
  { id: "five_builds", name: "Homesteader", desc: "Build 5 structures", icon: "🏘️", tier: "common" },
  { id: "ten_builds", name: "Architect", desc: "Build 10 structures", icon: "🏰", tier: "rare" },
  { id: "twentyfive_builds", name: "Fortress", desc: "Build 25 structures", icon: "🏯", tier: "epic" },
  { id: "day_3", name: "Survivor", desc: "Survive 3 days", icon: "📅", tier: "common" },
  { id: "day_7", name: "Week One", desc: "Survive 7 days", icon: "🗓️", tier: "rare" },
  { id: "day_14", name: "Two Weeks", desc: "Survive 14 days", icon: "📆", tier: "epic" },
  { id: "level_5", name: "Experienced", desc: "Reach level 5", icon: "⭐", tier: "rare" },
  { id: "level_10", name: "Veteran", desc: "Reach level 10", icon: "🌟", tier: "epic" },
  { id: "level_20", name: "Legend", desc: "Reach level 20", icon: "💫", tier: "legendary" },
  { id: "wolf_slayer", name: "Wolf Slayer", desc: "Kill a wolf", icon: "🐺", tier: "rare" },
  { id: "bear_slayer", name: "Bear Slayer", desc: "Kill a bear", icon: "🐻", tier: "epic" },
  { id: "first_meal", name: "Cook", desc: "Cook your first meal", icon: "🍳", tier: "common" },
  { id: "farmer", name: "Farmer", desc: "Harvest your first crop", icon: "🌾", tier: "common" },
  { id: "first_ore", name: "Prospector", desc: "Smelt your first iron ingot", icon: "🪙", tier: "rare" },
  { id: "trader_meet", name: "Wheel & Deal", desc: "Meet the wandering trader", icon: "🤝", tier: "common" },
  { id: "trader_buy", name: "Customer", desc: "Buy an item from the trader", icon: "💰", tier: "rare" },
  { id: "beekeeper", name: "Beekeeper", desc: "Harvest honey from a beehive", icon: "🍯", tier: "rare" },
  { id: "angler", name: "Angler", desc: "Catch your first fish", icon: "🎣", tier: "common" },
  { id: "full_belly", name: "Well Fed", desc: "Eat 10 meals", icon: "🍽️", tier: "common" },
  { id: "geared_up", name: "Geared Up", desc: "Equip armor in all 4 slots", icon: "🛡️", tier: "rare" },
  { id: "iron_age", name: "Iron Age", desc: "Craft an iron tool or weapon", icon: "⚒️", tier: "rare" },
  { id: "night_owl", name: "Night Owl", desc: "Stay awake through a full night", icon: "🦉", tier: "rare" },
  // Phase 5 achievements
  { id: "alpha_slayer", name: "Alpha Slayer", desc: "Defeat the direwolf alpha", icon: "🐺", tier: "legendary" },
  { id: "mariner", name: "Mariner", desc: "Build and ride a raft", icon: "🛶", tier: "rare" },
  { id: "quest_hero", name: "Quest Hero", desc: "Complete 3 quests from the board", icon: "📋", tier: "epic" },
  { id: "photographer", name: "Photographer", desc: "Take a photo in photo mode", icon: "📷", tier: "common" },
  { id: "chef_master", name: "Master Chef", desc: "Cook all 3 buff meals", icon: "👨‍🍳", tier: "epic" },
  { id: "builder_supreme", name: "Builder Supreme", desc: "Build 50 structures", icon: "🏛️", tier: "legendary" },
  { id: "survivalist", name: "Survivalist", desc: "Survive 21 days", icon: "🏔️", tier: "legendary" },
  // Phase 6 achievements
  { id: "ally", name: "Ally", desc: "Have a companion transfer items to you", icon: "🤝", tier: "common" },
  { id: "electrician", name: "Electrician", desc: "Power an electric light with a generator", icon: "💡", tier: "rare" },
  // Phase 7 achievements
  { id: "rad_survivor", name: "Rad Survivor", desc: "Survive entering a radiation zone", icon: "☢️", tier: "rare" },
  { id: "hazmat", name: "Hazmat", desc: "Craft and equip a hazmat suit", icon: "🟡", tier: "rare" },
  { id: "master_chef", name: "Master Chef", desc: "Cook all 5 cooking pot recipes", icon: "👨‍🍳", tier: "epic" },
  { id: "shutterbug", name: "Shutterbug", desc: "Take 5 screenshots in photo mode", icon: "📸", tier: "common" },
  { id: "commander", name: "Commander", desc: "Issue all 4 companion commands", icon: "🎖️", tier: "rare" },
  // Phase 10 achievements
  { id: "marksman", name: "Marksman", desc: "Kill 10 creatures", icon: "🎯", tier: "rare" },
  { id: "first_aid", name: "First Aid", desc: "Use a bandage to stop bleeding", icon: "🩹", tier: "common" },
  { id: "night_hunter", name: "Night Hunter", desc: "Kill 5 wolves at night", icon: "🌙", tier: "epic" },
  { id: "weather_forecaster", name: "Forecaster", desc: "Use a barometer 5 times", icon: "📉", tier: "rare" },
  { id: "survivor_5", name: "Survivor V", desc: "Survive 5 days in a row", icon: "🏅", tier: "rare" },
  // Phase 11 achievements — exploration & navigation
  { id: "waypointer", name: "Pathfinder", desc: "Place 5 custom waypoints", icon: "📍", tier: "common" },
  { id: "trailblazer", name: "Trailblazer", desc: "Place 10 custom waypoints", icon: "🧭", tier: "rare" },
  { id: "marathon", name: "Marathon", desc: "Walk 1,000 meters", icon: "🏃", tier: "common" },
  { id: "pioneer", name: "Pioneer", desc: "Walk 5,000 meters", icon: "🏔️", tier: "epic" },
  { id: "explorer", name: "Explorer", desc: "Discover 5 cave entrances", icon: "🕳️", tier: "rare" },
];

// Phase 6: Achievement rewards — gold nuggets awarded when an achievement is unlocked
const ACHIEVEMENT_REWARDS: Record<AchievementTier, number> = {
  common: 1,
  rare: 3,
  epic: 5,
  legendary: 10,
};

const MAX_INV = 30; // main inventory grid slots
const HOTBAR_SIZE = 6;

// Phase 5: Quests — pinned on the quest board. Each quest has a title, desc, objective, and rewards.
export interface Quest {
  id: string;
  title: string;
  desc: string;
  icon: string;
  requires?: string; // Phase 6: ID of quest that must be completed first
  objective: {
    kind: "kill_wolves" | "kill_bear" | "chop_trees" | "mine_rocks" | "build" | "fish" | "cook" | "collect_gold";
    target: number;
  };
  rewards: { id: string; qty: number }[];
}

export const QUESTS: Quest[] = [
  {
    id: "q_wolf_hunt",
    title: "Wolf Pack Cull",
    desc: "Wolves have been prowling the woods. Kill 5 wolves to thin their numbers.",
    icon: "🐺",
    objective: { kind: "kill_wolves", target: 5 },
    rewards: [
      { id: "goldNugget", qty: 3 },
      { id: "medkit", qty: 1 },
    ],
  },
  {
    id: "q_bear_trophy",
    title: "Bear Trophy",
    desc: "Bring down the mighty forest bear. A true test of strength.",
    icon: "🐻",
    requires: "q_wolf_hunt",
    objective: { kind: "kill_bear", target: 1 },
    rewards: [
      { id: "goldNugget", qty: 5 },
      { id: "hide", qty: 8 },
      { id: "fat", qty: 4 },
    ],
  },
  {
    id: "q_timber",
    title: "Timber!",
    desc: "The trader needs lumber. Chop down 15 trees.",
    icon: "🪓",
    objective: { kind: "chop_trees", target: 15 },
    rewards: [
      { id: "goldNugget", qty: 2 },
      { id: "rope", qty: 4 },
      { id: "cloth", qty: 6 },
    ],
  },
  {
    id: "q_miner",
    title: "Prospector's Run",
    desc: "Mine 12 rocks for ore. The forge demands raw materials.",
    icon: "⛏️",
    objective: { kind: "mine_rocks", target: 12 },
    rewards: [
      { id: "goldNugget", qty: 4 },
      { id: "ironOre", qty: 6 },
      { id: "coal", qty: 8 },
    ],
  },
  {
    id: "q_builder",
    title: "Homestead",
    desc: "Build 8 structures to establish a foothold in the wilderness.",
    icon: "🏠",
    objective: { kind: "build", target: 8 },
    rewards: [
      { id: "goldNugget", qty: 3 },
      { id: "wood", qty: 30 },
      { id: "stone", qty: 20 },
    ],
  },
  {
    id: "q_angler",
    title: "Master Angler",
    desc: "Catch 6 fish to feed the trader's caravan.",
    icon: "🎣",
    objective: { kind: "fish", target: 6 },
    rewards: [
      { id: "goldNugget", qty: 4 },
      { id: "cookedFish", qty: 4 },
      { id: "salt", qty: 3 },
    ],
  },
  {
    id: "q_gold_rush",
    title: "Gold Rush",
    desc: "Find 8 gold nuggets from mining. Fortune favors the bold.",
    icon: "🪙",
    requires: "q_miner",
    objective: { kind: "collect_gold", target: 8 },
    rewards: [
      { id: "goldNugget", qty: 5 },
      { id: "polarCoat", qty: 1 },
    ],
  },
  // Phase 6: Chain quests
  {
    id: "q_alpha_hunt",
    title: "Alpha Hunt",
    desc: "The direwolf alpha terrorizes the night. Prove yourself by culling 10 wolves first.",
    icon: "🐺",
    requires: "q_bear_trophy",
    objective: { kind: "kill_wolves", target: 10 },
    rewards: [
      { id: "alphaPelt", qty: 2 },
      { id: "goldNugget", qty: 8 },
    ],
  },
  {
    id: "q_master_builder",
    title: "Master Builder",
    desc: "Build 25 structures to establish a permanent settlement.",
    icon: "🏗️",
    requires: "q_builder",
    objective: { kind: "build", target: 25 },
    rewards: [
      { id: "goldNugget", qty: 10 },
      { id: "ironOre", qty: 15 },
    ],
  },
];

// Phase 5: Quest progress tracking — keyed by objective kind
export interface QuestProgress {
  kill_wolves: number;
  kill_bear: number;
  chop_trees: number;
  mine_rocks: number;
  build: number;
  fish: number;
  cook: number;
  collect_gold: number;
}

let toastId = 1;
let activityLogId = 1;

export interface GameState {
  mode: GameMode;
  // 0..1 day fraction
  timeOfDay: number;
  weather: Weather;
  fps: number;

  // Stats
  stats: PlayerStats;
  // dehydration effect — true when water <= 25 (slows movement + slow health drain)
  dehydrated: boolean;
  // bleeding / status effects
  bleeding: number; // hp/sec
  poisoning: number; // remaining seconds of poison damage
  wellRested: number; // remaining seconds of health-regen buff
  hydrated: number; // remaining seconds of water-drain buff
  radiation: number; // 0..100 — accumulated radiation sickness

  // Crops: tracked per farmingPlot placed build (gx,gz key)
  crops: Record<string, { kind: "wheat" | "pumpkin"; growth: number; plantedAt: number }>;
  // Drying rack contents: by buildId
  dryingRackContents: Record<number, { startedAt: number; ready: boolean }>;
  // Rain barrel water collected per buildId
  rainBarrelWater: Record<number, number>;

  // Day count (incremented at midnight wrap)
  dayCount: number;

  // ---- Phase 4 additions ----
  // Sleep state — when player uses bed, fades to black and advances time
  isSleeping: boolean;
  // Achievement tracking — unlocked achievement IDs + most recent for toast
  unlockedAchievements: string[];
  recentAchievement: Achievement | null;
  // Trader — wandering NPC; traderNearby=true when within 5m, shop inventory random
  traderNearby: boolean;
  traderShop: { id: string; qty: number; price: number }[]; // each item: id, qty available, goldNugget price
  traderPos: { x: number; z: number } | null;
  // Beehive — honey accumulation by buildId
  hiveContents: Record<number, { startedAt: number; honey: number }>;
  // Eat counter for full_belly achievement
  mealsEaten: number;
  // Track if player stayed awake through a full night (true when player is in "play" mode during deep night 0.85-0.95)
  nightOwlProgress: number; // 0..1
  nightOwlAwarded: boolean;

  // ---- Phase 5 additions ----
  // Boss creature (Direwolf Alpha) — spawns rarely at night, big HP pool, drops legendary loot
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossPos: { x: number; z: number } | null;
  bossKillDay: number; // Phase 6: day number when boss was last killed (0 = never)
  // Raft riding state — set when player is on a raft
  ridingRaft: boolean;
  raftId: number | null;
  // Quest system — accepted quest IDs, completed quest IDs (claimed rewards)
  questsAccepted: string[];
  questsCompleted: string[]; // reward claimed
  questBoardNearby: boolean;
  questBoardId: number | null;
  // Phase 6: companion NPC
  companionNearby: boolean;
  companionCarrying: { id: string; qty: number }[];
  // Phase 7: Companion commands
  companionCommand: "follow" | "wait" | "gather" | "attack";
  companionCommandMenuOpen: boolean;
  // Toggle the AI companion NPC on/off (settings-driven, persists across sessions)
  companionEnabled: boolean;
  // Phase 7: Settings
  dayNightSpeed: number;
  settingsOpen: boolean;
  // In-game pause menu (Esc). When true, the styled PauseMenu overlay is shown
  // (same look as the main menu) and the world stops updating.
  paused: boolean;
  showCrosshair: boolean;
  showMinimap: boolean;
  // Toggleable HUD widgets — compass bar (top-center) + sun-horizon arc (top-left).
  showCompass: boolean;
  showSunHorizon: boolean;
  fov: number;
  musicVolume: number;
  // Performance: render distance (meters) for distance-based visibility culling,
  // and overall graphics quality preset (controls AA, pixel ratio, shadows).
  renderDistance: number;
  graphicsQuality: "low" | "medium" | "high";
  // Rebindable key mappings — action name → KeyboardEvent.key.toLowerCase().
  // Users can reassign any action via the keybinding menu in OPTIONS.
  keybinds: Record<string, string>;
  // Server the player joined — used by the engine to pick the right world layout
  // (normal procedural world vs. flat test range).
  serverId: string;
  // Number of AI player bots to spawn for the current server (from ServerInfo).
  // The first server (0/1) sets this to 0 so no bots ever spawn there.
  serverBots: number;
  // Phase 7: Radiation zone
  radiationZoneActive: boolean;
  radZoneSurvived: boolean; // achievement tracker
  cookingPotRecipesCooked: string[]; // for master_chef achievement
  companionCommandsUsed: string[]; // for commander achievement
  // Phase 7: Screenshot gallery
  screenshots: { id: string; dataUrl: string; timestamp: number; dayCount: number; location: { x: number; z: number } }[];
  galleryOpen: boolean;
  screenshotFlash: number;
  screenshotCount: number; // for shutterbug achievement
  // Phase 6: Buff timers for new buff meals
  buffRegen: number; // seconds remaining
  buffNightVision: number; // seconds remaining
  // Phase 6: Floating damage numbers
  damageNumbers: { id: number; value: number; x: number; z: number; t: number }[];
  // Photo mode — hides HUD, free camera rotation
  photoMode: boolean;
  // Buff timers (seconds remaining) for the three buff meals
  buffStrength: number; // +10 damage
  buffSwift: number; // +30% move speed
  buffIronSkin: number; // +12 armor
  // Chef achievement tracking — which buff meals have been cooked
  buffMealsCooked: string[];
  // Barometer reading — predicted next weather, set when player uses barometer
  barometerReading: { current: Weather; next: Weather; secondsUntilChange: number } | null;
  // Leaderboard — top 5 survival runs (loaded from localStorage, separate key)
  leaderboard: { day: number; kills: number; builds: number; date: number }[];
  // Kill counter (for leaderboard scoring)
  killCount: number;
  // Phase 9: Activity log — persistent feed of recent events with icon + timestamp
  activityLog: { id: number; text: string; icon: string; t: number; kind: "info" | "good" | "warn" | "danger" }[];
  // Phase 9: Targeted enemy — info about the hostile/enemy the player is currently aiming at
  targetedEnemy: { kind: string; hp: number; maxHp: number; distance: number; name: string; icon: string } | null;
  // Phase 10: Threat direction indicators — nearby hostiles with screen-space angle
  threats: { x: number; z: number; kind: string; distance: number; hostile: boolean }[];
  // Phase 10: Damage direction indicators — brief red arcs showing where damage came from
  damageDirections: { id: number; angle: number; t: number; value: number }[];
  // Phase 10: Weapon swing animation trigger — {t: timestamp, kind: weapon kind}
  weaponSwing: { t: number; kind: string } | null;
  // Phase 10: Player stats panel (P key)
  playerStatsPanelOpen: boolean;
  // Phase 10: Day/night transition notification
  dayNightNotify: { text: string; icon: string; t: number } | null;
  lastDayPhase: string;
  // Phase 10: Tracker counters for new achievements
  bandagesUsed: number;
  wolvesKilledAtNight: number;
  barometerUses: number;
  // Phase 5: Quest progress tracking — counts each objective kind
  questProgress: QuestProgress;
  // Phase 11: Custom waypoint markers — player drops these with M key
  waypoints: { id: number; x: number; z: number; label: string; color: string; t: number }[];
  // Phase 11: Total distance walked (meters) — for marathon achievement + stats
  totalDistanceWalked: number;
  // Phase 11: Critical health warning intensity — 0..1, drives red vignette + heartbeat
  lowHealthIntensity: number;
  // Phase 11: Heartbeat audio timer — accumulated seconds since last beat
  heartbeatTimer: number;

  // Inventory
  inventory: (ItemStack | null)[]; // 30-slot main
  hotbar: (ItemStack | null)[]; // 6-slot hotbar
  equipHotbarIndex: number; // currently selected hotbar slot
  clothing: ClothingEquip;

  // Selected buildable kind in build mode (legacy, kept for compat)
  buildKind: BuildKind | null;
  buildRotation: number; // 0..3
  placed: PlacedBuild[];

  // ---- Rust-style Building System ----
  // V2 placed builds (new system)
  placedV2: PlacedBuildV2[];
  // Deployables (doors, storage, etc.)
  placedDeployables: PlacedDeployable[];
  // Radial menu state
  radialMenuOpen: boolean;
  radialMenuType: "build" | "hammer" | "upgrade" | null;
  radialMenuMouseX: number; // -1..1 from center
  radialMenuMouseY: number; // -1..1 from center
  radialMenuHoveredIndex: number; // -1 = cancel
  // Selected piece from Building Plan radial menu
  selectedBuildPiece: BuildPieceType | null;
  buildPieceRotation: number; // 0..3
  // Hammer target
  hammerTargetId: number | null;
  // Hologram state
  hologramValid: boolean;
  // Pending hammer/upgrade actions (set by radial menu, consumed by engine)
  pendingHammerAction: string | null;
  pendingUpgradeTier: string | null;

  // Interaction prompts
  prompt: string | null;

  // Toasts (transient notifications)
  toasts: ToastMsg[];

  // World info
  worldSeed: number;

  // Loot container view (when opening a container)
  openContainer: { id: number; kind: "shelf" | "wardrobe" | "crate" | "chest"; loot: (ItemStack | null)[] } | null;

  // ---- Phase 2 additions ----
  // Proximity-based crafting stations (updated by engine each frame)
  nearStations: { workbench: boolean; furnace: boolean; campfire: boolean; anvil: boolean; dryingRack: boolean; rainBarrel: boolean; farmingPlot: boolean; cookingPot: boolean };
  // Minimap data (updated by engine ~5fps)
  minimap: {
    playerX: number;
    playerZ: number;
    playerYaw: number;
    trees: { x: number; z: number; cull: boolean }[];
    bots: { x: number; z: number }[];
    animals: { x: number; z: number; kind: string }[];
    placed: { x: number; z: number; kind: BuildKind }[];
    loot: { x: number; z: number }[];
    caveEntrances: { x: number; z: number }[];
    worldSize: number;
  };
  // Audio cue triggers — engine increments counters; AudioEngine subscribes
  audioCue: { event: string; t: number };

  // ----- actions -----
  setMode: (m: GameMode) => void;
  setStats: (s: Partial<PlayerStats>) => void;
  tickStats: (dt: number) => void;
  setBleeding: (n: number) => void;
  setPoisoning: (n: number) => void;
  setWellRested: (n: number) => void;
  setHydrated: (n: number) => void;
  setRadiation: (n: number) => void;
  damage: (n: number) => void;
  heal: (n: number) => void;
  setWeather: (w: Weather) => void;
  setTimeOfDay: (t: number) => void;
  setFps: (f: number) => void;
  setPrompt: (p: string | null) => void;

  // Inventory ops
  addItem: (id: string, qty: number) => number; // returns leftover
  removeItem: (id: string, qty: number) => boolean;
  countItem: (id: string) => number;
  swapSlots: (a: { inv: "main" | "hotbar"; i: number }, b: { inv: "main" | "hotbar"; i: number }) => void;
  moveStack: (from: { inv: "main" | "hotbar"; i: number }, to: { inv: "main" | "hotbar"; i: number }) => void;
  dropFromSlot: (inv: "main" | "hotbar", i: number) => void;
  selectHotbar: (i: number) => void;
  consume: (inv: "main" | "hotbar", i: number) => void;
  equipClothing: (inv: "main" | "hotbar", i: number) => void;
  unequipClothing: (slot: keyof ClothingEquip) => void;

  // Crafting
  doCraft: (recipe: Recipe) => boolean;

  // Build mode (legacy)
  setBuildKind: (k: BuildKind | null) => void;
  rotateBuild: () => void;
  addPlaced: (b: PlacedBuild) => void;
  removePlaced: (id: number) => void;

  // ---- Rust-style Building System actions ----
  addPlacedV2: (b: PlacedBuildV2) => void;
  removePlacedV2: (id: number) => void;
  upgradePlacedV2: (id: number, tier: TierType) => void;
  // Radial menu
  openRadialMenu: (type: "build" | "hammer" | "upgrade") => void;
  closeRadialMenu: () => void;
  setRadialMousePos: (x: number, y: number) => void;
  setRadialHoveredIndex: (idx: number) => void;
  confirmRadialSelection: (data: string | null) => void;
  // Build piece
  setSelectedBuildPiece: (piece: BuildPieceType | null) => void;
  rotateBuildPiece: () => void;
  setHammerTargetId: (id: number | null) => void;
  setHologramValid: (v: boolean) => void;
  clearPendingHammerAction: () => void;
  clearPendingUpgradeTier: () => void;

  // Toast
  toast: (text: string, kind?: ToastMsg["kind"]) => void;
  dismissToast: (id: number) => void;

  // Container
  openLootContainer: (id: number, kind: "shelf" | "wardrobe" | "crate" | "chest", loot: (ItemStack | null)[]) => void;
  closeContainer: () => void;
  transferFromContainer: (idx: number) => void;

  // Phase 2 setters
  setNearStations: (s: Partial<GameState["nearStations"]>) => void;
  setMinimap: (m: Partial<GameState["minimap"]>) => void;
  emitAudio: (event: string) => void;

  // Crops & racks
  plantCrop: (gx: number, gz: number, kind: "wheat" | "pumpkin") => void;
  harvestCrop: (gx: number, gz: number) => void;
  tickCrops: (dt: number) => void;
  startDrying: (buildId: number) => boolean; // returns true if started (consumes rawMeat)
  collectJerky: (buildId: number) => void;
  tickDrying: (dt: number) => void;
  collectRainWater: (buildId: number) => boolean; // returns true if drank
  tickRainBarrels: (dt: number, isRaining: boolean) => void;

  // ---- Phase 4 actions ----
  // Sleep: triggers fade-to-black, advances time to morning, restores stats
  startSleep: () => void;
  finishSleep: () => void;
  // Achievements: unlock(id) checks if already unlocked; dismissAchievement clears the recent toast
  unlockAchievement: (id: string) => void;
  dismissAchievement: () => void;
  // Trader: rolls a new shop inventory when trader spawns
  rollTraderShop: () => void;
  setTraderNearby: (near: boolean, pos: { x: number; z: number } | null) => void;
  buyFromTrader: (idx: number) => boolean; // returns true if purchase succeeded
  // Beehive: placeHive initializes the entry; collectHoney drains; tickHives accumulates
  placeHive: (buildId: number) => void;
  collectHoney: (buildId: number) => boolean;
  tickHives: (dt: number) => void;
  // Tracking helpers for achievements
  incrementMealsEaten: () => void;
  tickNightOwl: (dt: number, timeOfDay: number) => void;

  // ---- Phase 5 actions ----
  // Boss: spawn / damage / kill
  setBossActive: (active: boolean, hp?: number, maxHp?: number, pos?: { x: number; z: number } | null) => void;
  damageBoss: (n: number) => void;
  killBoss: () => void;
  setBossKillDay: (day: number) => void;
  // Raft
  setRidingRaft: (riding: boolean, raftId?: number | null) => void;
  // Quests
  setQuestBoardNearby: (near: boolean, id?: number | null) => void;
  acceptQuest: (id: string) => void;
  completeQuest: (id: string) => void;
  claimQuestReward: (id: string) => void;
  // Phase 6: companion
  setCompanionNearby: (near: boolean) => void;
  updateCompanionCarrying: (carrying: { id: string; qty: number }[]) => void;
  setCompanionEnabled: (enabled: boolean) => void;
  // Phase 7: Companion commands
  setCompanionCommand: (cmd: "follow" | "wait" | "gather" | "attack") => void;
  toggleCompanionCommandMenu: () => void;
  // Phase 7: Settings
  setDayNightSpeed: (speed: number) => void;
  setSettingsOpen: (open: boolean) => void;
  setPaused: (paused: boolean) => void;
  setShowCrosshair: (show: boolean) => void;
  setShowMinimap: (show: boolean) => void;
  setShowCompass: (show: boolean) => void;
  setShowSunHorizon: (show: boolean) => void;
  setFov: (fov: number) => void;
  setMusicVolume: (vol: number) => void;
  // Performance settings
  setRenderDistance: (m: number) => void;
  setGraphicsQuality: (q: "low" | "medium" | "high") => void;
  setServerId: (id: string) => void;
  setServerBots: (n: number) => void;
  // Rebind a key for a given action (action → new key). Persists to localStorage.
  setKeybind: (action: string, key: string) => void;
  resetKeybinds: () => void;
  // Phase 7: Radiation zone
  setRadiationZoneActive: (active: boolean) => void;
  // Phase 7: Screenshot gallery
  takeScreenshot: (dataUrl: string) => void;
  deleteScreenshot: (id: string) => void;
  setGalleryOpen: (open: boolean) => void;
  setScreenshotFlash: (v: number) => void;
  tickScreenshotFlash: (dt: number) => void;
  // Phase 6: new buff meals
  consumeBuffMeal2: (id: "regenStew" | "nightVisionTea") => void;
  // Phase 6: damage numbers
  addDamageNumber: (value: number, x: number, z: number) => void;
  tickDamageNumbers: () => void;
  // Photo mode
  togglePhotoMode: () => void;
  // Buffs
  consumeBuffMeal: (id: "strengthStew" | "swiftStew" | "ironSkinStew") => void;
  tickBuffs: (dt: number) => void;
  // Barometer
  setBarometerReading: (r: { current: Weather; next: Weather; secondsUntilChange: number } | null) => void;
  // Leaderboard
  loadLeaderboard: () => void;
  saveLeaderboardEntry: () => void;
  // Kill counter
  incrementKills: () => void;
  incrementNightWolfKill: () => void;
  // Quest progress — increment an objective counter; auto-completes any matching accepted quest
  incrementQuestProgress: (kind: keyof QuestProgress, n?: number) => void;
  // Phase 9: Activity log
  pushActivity: (text: string, icon: string, kind?: "info" | "good" | "warn" | "danger") => void;
  clearActivity: () => void;
  // Phase 9: Targeted enemy
  setTargetedEnemy: (e: { kind: string; hp: number; maxHp: number; distance: number; name: string; icon: string } | null) => void;
  // Phase 10: Threat / damage / swing / notify actions
  setThreats: (t: { x: number; z: number; kind: string; distance: number; hostile: boolean }[]) => void;
  addDamageDirection: (angle: number, value: number) => void;
  tickDamageDirections: () => void;
  setWeaponSwing: (kind: string) => void;
  clearWeaponSwing: () => void;
  setPlayerStatsPanelOpen: (open: boolean) => void;
  setDayNightNotify: (text: string, icon: string) => void;
  tickDayNightNotify: (dt: number) => void;
  // Phase 10: Auto-consume helpers (smart eat/drink)
  autoConsumeFood: () => boolean;
  autoConsumeDrink: () => boolean;

  // Phase 11: Waypoint markers — drop / remove / clear
  addWaypoint: (x: number, z: number, label?: string, color?: string) => void;
  removeWaypoint: (id: number) => void;
  clearWaypoints: () => void;
  // Phase 11: Distance tracker
  addDistanceWalked: (meters: number) => void;
  // Phase 11: Critical health warning (vignette + heartbeat)
  setLowHealthIntensity: (intensity: number) => void;
  tickHeartbeat: (dt: number) => boolean; // returns true if a heartbeat should fire this tick

  // ===== XP / Level System (REMOVED — kept as no-op stubs for backward compat) =====
  xp: number;
  level: number;
  xpToNext: number;
  totalXp: number;
  levelUpFlash: number;
  grantXp: (source: XPSource, multiplier?: number) => void;
  tickLevelUpFlash: (dt: number) => void;

  // Save / Load
  saveGame: () => void;
  loadGame: () => boolean;
  hasSave: () => boolean;
  // Settings persistence — saves user preferences (FOV, volume, render
  // distance, graphics quality, crosshair/minimap toggles, day/night speed,
  // companion toggle) to a separate localStorage key so they survive a
  // browser close even if the user never saves their game.
  saveSettings: () => void;
  loadSettings: () => void;
  clearSave: () => void;

  // Reset
  init: () => void;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Default starting loadout
function defaultInventory(): (ItemStack | null)[] {
  const arr: (ItemStack | null)[] = new Array(MAX_INV).fill(null);
  arr[0] = { id: "rock", qty: 1 };
  arr[1] = { id: "wood", qty: 5 };
  arr[2] = { id: "berries", qty: 6 };
  return arr;
}

function defaultHotbar(): (ItemStack | null)[] {
  const arr: (ItemStack | null)[] = new Array(HOTBAR_SIZE).fill(null);
  arr[0] = { id: "rock", qty: 1 };
  return arr;
}

export const useGame = create<GameState>((set, get) => ({
  mode: "loading",
  timeOfDay: 0.32, // morning
  weather: "sunny",
  fps: 60,

  stats: { health: 100, food: 80, water: 80 },
  dehydrated: false,
  bleeding: 0,
  poisoning: 0,
  wellRested: 0,
  hydrated: 0,
  radiation: 0,

  crops: {},
  dryingRackContents: {},
  rainBarrelWater: {},
  dayCount: 1,

  // Phase 4
  isSleeping: false,
  unlockedAchievements: [],
  recentAchievement: null,
  traderNearby: false,
  traderShop: [],
  traderPos: null,
  hiveContents: {},
  mealsEaten: 0,
  nightOwlProgress: 0,
  nightOwlAwarded: false,

  // Phase 5
  bossActive: false,
  bossHp: 0,
  bossMaxHp: 500,
  bossPos: null,
  bossKilled: false,
  bossKillDay: 0,
  ridingRaft: false,
  raftId: null,
  questsAccepted: [],
  questsCompleted: [],
  questBoardNearby: false,
  questBoardId: null,
  photoMode: false,
  companionNearby: false,
  companionCarrying: [],
  companionCommand: "follow" as const,
  companionCommandMenuOpen: false,
  companionEnabled: true,
  dayNightSpeed: 1.0,
  settingsOpen: false,
  paused: false,
  showCrosshair: true,
  showMinimap: true,
  showCompass: true,
  showSunHorizon: true,
  fov: 75,
  musicVolume: 50,
  renderDistance: 180,
  graphicsQuality: "medium" as const,
  keybinds: { ...DEFAULT_KEYBINDS },
  serverId: "coast",
  serverBots: 3,
  radiationZoneActive: false,
  radZoneSurvived: false,
  cookingPotRecipesCooked: [],
  companionCommandsUsed: [],
  screenshots: [],
  galleryOpen: false,
  screenshotFlash: 0,
  screenshotCount: 0,
  buffRegen: 0,
  buffNightVision: 0,
  damageNumbers: [],
  buffStrength: 0,
  buffSwift: 0,
  buffIronSkin: 0,
  buffMealsCooked: [],
  barometerReading: null,
  leaderboard: [],
  killCount: 0,
  activityLog: [],
  targetedEnemy: null,
  // Phase 10: new state defaults
  threats: [],
  damageDirections: [],
  weaponSwing: null,
  playerStatsPanelOpen: false,
  dayNightNotify: null,
  lastDayPhase: "day",
  bandagesUsed: 0,
  wolvesKilledAtNight: 0,
  barometerUses: 0,
  // Phase 11: waypoint markers + exploration tracking
  waypoints: [],
  totalDistanceWalked: 0,
  lowHealthIntensity: 0,
  heartbeatTimer: 0,
  // XP / Level System
  xp: 0,
  level: 1,
  xpToNext: xpForLevel(1),
  totalXp: 0,
  levelUpFlash: 0,
  questProgress: {
    kill_wolves: 0,
    kill_bear: 0,
    chop_trees: 0,
    mine_rocks: 0,
    build: 0,
    fish: 0,
    cook: 0,
    collect_gold: 0,
  },

  inventory: defaultInventory(),
  hotbar: defaultHotbar(),
  equipHotbarIndex: 0,
  clothing: { head: null, chest: "basicShirt", legs: "basicTrousers", feet: null },

  buildKind: null,
  buildRotation: 0,
  placed: [],

  // ---- Rust-style Building System defaults ----
  placedV2: [],
  placedDeployables: [],
  radialMenuOpen: false,
  radialMenuType: null,
  radialMenuMouseX: 0,
  radialMenuMouseY: 0,
  radialMenuHoveredIndex: -1,
  selectedBuildPiece: null,
  buildPieceRotation: 0,
  hammerTargetId: null,
  hologramValid: false,
  pendingHammerAction: null,
  pendingUpgradeTier: null,

  prompt: null,
  toasts: [],
  worldSeed: Math.floor(Math.random() * 1000000),
  openContainer: null,

  // Phase 2
  nearStations: { workbench: false, furnace: false, campfire: false, anvil: false, dryingRack: false, rainBarrel: false, farmingPlot: false, cookingPot: false },
  minimap: {
    playerX: 0,
    playerZ: 0,
    playerYaw: 0,
    trees: [],
    bots: [],
    animals: [],
    placed: [],
    loot: [],
    caveEntrances: [],
    worldSize: 600,
  },
  audioCue: { event: "", t: 0 },

  setMode: (m) => set({ mode: m }),
  setStats: (s) => set((st) => ({ stats: { ...st.stats, ...s } })),
  tickStats: (dt) => {
    const s = get().stats;

    // Food/water drain — slowed down considerably (was 0.35 / 0.55 per second).
    // The hydrated buff still reduces water drain by 40%.
    const hydratedBuff = get().hydrated > 0 ? 0.6 : 1.0;
    let food = s.food - 0.12 * dt;
    let water = s.water - 0.18 * dt * hydratedBuff;

    // Dehydration effect — kicks in when water drops to 25 or below.
    // The player is slowed (engine reads `dehydrated`) and slowly loses health.
    // Food never causes health loss; only water does, and only past this threshold.
    let dehydrated = water <= 25;
    let health = s.health;
    let bleeding = get().bleeding;
    let poisoning = get().poisoning;
    if (bleeding > 0) {
      health -= bleeding * dt;
      bleeding = Math.max(0, bleeding - 0.05 * dt);
    }
    if (poisoning > 0) {
      health -= 2 * dt;
      poisoning = Math.max(0, poisoning - dt);
    }
    if (dehydrated) {
      // Slow health drain from dehydration — scales worse as water approaches 0.
      const severity = (25 - water) / 25; // 0..1
      health -= (0.4 + severity * 0.8) * dt;
    }

    // Phase 7: Radiation zone damage
    let radiation = get().radiation;
    if (get().radiationZoneActive) {
      const hasHazmat = get().clothing.chest === "hazmatSuit";
      const radAccumulation = hasHazmat ? 0.3 : 3.0;
      radiation = clamp(radiation + radAccumulation * dt, 0, 100);
      if (radiation > 90) health -= 8 * dt;
      else if (radiation > 60) health -= 3 * dt;
      else if (radiation > 30) health -= 1 * dt;
    } else {
      radiation = Math.max(0, radiation - 0.5 * dt);
    }

    // Passive regen if fed + watered (no warmth gate anymore).
    const wellRestedBuff = get().wellRested > 0 ? 1.5 : 1.0;
    if (food > 50 && water > 50 && health < 100 && bleeding === 0 && poisoning === 0) {
      health = clamp(health + 1.5 * dt * wellRestedBuff, 0, 100);
    }

    // wellRested/hydrated timers
    let wellRested = Math.max(0, get().wellRested - dt);
    let hydrated = Math.max(0, get().hydrated - dt);

    set({
      stats: {
        health: clamp(health, 0, 100),
        food: clamp(food, 0, 100),
        water: clamp(water, 0, 100),
      },
      dehydrated,
      bleeding,
      poisoning,
      wellRested,
      hydrated,
      radiation,
    });

    if (health <= 0 && get().mode !== "dead") {
      set({ mode: "dead" });
    }
  },
  setBleeding: (n) => set({ bleeding: n }),
  setPoisoning: (n) => set({ poisoning: n }),
  setWellRested: (n) => set({ wellRested: n }),
  setHydrated: (n) => set({ hydrated: n }),
  setRadiation: (n) => set({ radiation: n }),
  damage: (n) => {
    if (n <= 0) return;
    const s = get().stats;
    // Phase 5: apply armor reduction — sum armor values from equipped clothing + ironSkin buff
    let armor = 0;
    const clothing = get().clothing;
    for (const slot of ["head", "chest", "legs", "feet"] as const) {
      const id = clothing[slot];
      if (id && ITEMS[id]?.armor) armor += ITEMS[id].armor!;
    }
    if (get().buffIronSkin > 0) armor += 12;
    // Armor reduces damage by up to 60% (armor / (armor + 30))
    const reduction = armor / (armor + 30);
    const effective = n * (1 - reduction);
    const hp = clamp(s.health - effective, 0, 100);
    set({ stats: { ...s, health: hp } });
    if (n > 0) get().emitAudio("hurt");
    if (hp <= 0 && get().mode !== "dead") {
      set({ mode: "dead" });
      get().emitAudio("death");
      // Phase 5: save leaderboard entry on death
      get().saveLeaderboardEntry();
    }
  },
  heal: (n) => {
    const s = get().stats;
    set({ stats: { ...s, health: clamp(s.health + n, 0, 100) } });
  },
  setWeather: (w) => set({ weather: w }),
  setTimeOfDay: (t) => set({ timeOfDay: t }),
  setFps: (f) => set({ fps: f }),
  setPrompt: (p) => {
    if (get().prompt !== p) set({ prompt: p });
  },

  addItem: (id, qty) => {
    if (qty <= 0) return 0;
    const def = ITEMS[id];
    if (!def) return qty;
    let remaining = qty;
    const main = [...get().inventory];
    const hot = [...get().hotbar];
    // First fill existing stacks in hotbar then main
    const fillInto = (arr: (ItemStack | null)[], stackMax: number) => {
      for (let i = 0; i < arr.length && remaining > 0; i++) {
        const s = arr[i];
        if (s && s.id === id && s.qty < stackMax) {
          const add = Math.min(stackMax - s.qty, remaining);
          arr[i] = { ...s, qty: s.qty + add };
          remaining -= add;
        }
      }
    };
    fillInto(hot, def.stack);
    fillInto(main, def.stack);
    // Then put into empty slot, hotbar first only if it's tool/weapon/food, else main
    const placeEmpty = (arr: (ItemStack | null)[]) => {
      for (let i = 0; i < arr.length && remaining > 0; i++) {
        if (!arr[i]) {
          const add = Math.min(def.stack, remaining);
          arr[i] = { id, qty: add };
          remaining -= add;
        }
      }
    };
    // Place to main first if stackable resource, hotbar first if equipment
    if (def.category === "weapon" || def.category === "tool" || def.category === "food" || def.category === "drink" || def.category === "misc") {
      placeEmpty(hot);
    }
    placeEmpty(main);
    set({ inventory: main, hotbar: hot });
    return remaining;
  },
  removeItem: (id, qty) => {
    const main = [...get().inventory];
    const hot = [...get().hotbar];
    let need = qty;
    const take = (arr: (ItemStack | null)[]) => {
      for (let i = 0; i < arr.length && need > 0; i++) {
        const s = arr[i];
        if (s && s.id === id) {
          const t = Math.min(s.qty, need);
          s.qty -= t;
          need -= t;
          if (s.qty <= 0) arr[i] = null;
          else arr[i] = { ...s };
        }
      }
    };
    take(hot);
    take(main);
    if (need > 0) return false;
    set({ inventory: main, hotbar: hot });
    return true;
  },
  countItem: (id) => {
    const main = get().inventory;
    const hot = get().hotbar;
    let c = 0;
    for (const s of main) if (s && s.id === id) c += s.qty;
    for (const s of hot) if (s && s.id === id) c += s.qty;
    return c;
  },
  swapSlots: (a, b) => {
    const main = [...get().inventory];
    const hot = [...get().hotbar];
    const getArr = (which: "main" | "hotbar") => (which === "main" ? main : hot);
    const A = getArr(a.inv);
    const B = getArr(b.inv);
    const tmp = A[a.i];
    A[a.i] = B[b.i];
    B[b.i] = tmp;
    set({ inventory: main, hotbar: hot });
  },
  moveStack: (from, to) => {
    // No-op if dropping onto the same slot — previously this corrupted the
    // stack (the src===dst branch would set the slot then immediately null it).
    if (from.inv === to.inv && from.i === to.i) return;
    const main = [...get().inventory];
    const hot = [...get().hotbar];
    const getArr = (which: "main" | "hotbar") => (which === "main" ? main : hot);
    const A = getArr(from.inv);
    const B = getArr(to.inv);
    const src = A[from.i];
    const dst = B[to.i];
    if (!src) return;
    if (!dst) {
      B[to.i] = src;
      A[from.i] = null;
    } else if (dst.id === src.id) {
      const def = ITEMS[src.id];
      const add = Math.min(def.stack - dst.qty, src.qty);
      if (add <= 0) return;
      B[to.i] = { ...dst, qty: dst.qty + add };
      if (src.qty - add <= 0) A[from.i] = null;
      else A[from.i] = { ...src, qty: src.qty - add };
    } else {
      // swap
      B[to.i] = src;
      A[from.i] = dst;
    }
    set({ inventory: main, hotbar: hot });
  },
  dropFromSlot: (inv, i) => {
    // Drop the item stack from the given slot onto the ground at the player's
    // feet. Spawns a loot pickup via the engine bridge so the item is actually
    // recoverable (previously the slot was just nulled and the item vanished).
    const main = [...get().inventory];
    const hot = [...get().hotbar];
    const arr = inv === "main" ? main : hot;
    const stack = arr[i];
    if (!stack) return;
    const def = ITEMS[stack.id];
    if (!def) {
      // Unknown item — just remove it to avoid a stuck slot.
      arr[i] = null;
      set({ inventory: main, hotbar: hot });
      return;
    }
    // Hand off to the engine to spawn a ground pickup at the player position.
    // The engine reads `window.__engine` (set in Game.tsx).
    try {
      const eng = (window as unknown as { __engine?: { dropItem?: (inv: "main" | "hotbar", i: number) => void } }).__engine;
      if (eng && typeof eng.dropItem === "function") {
        eng.dropItem(inv, i);
        // The engine is responsible for nulling the slot once the pickup is
        // spawned, but we null it defensively here too so the UI updates
        // immediately even if the engine call is deferred.
        arr[i] = null;
        set({ inventory: main, hotbar: hot });
        return;
      }
    } catch {
      // fall through to plain removal
    }
    // Fallback (no engine): just remove the item.
    arr[i] = null;
    set({ inventory: main, hotbar: hot });
  },
  selectHotbar: (i) => set({ equipHotbarIndex: i }),
  consume: (inv, i) => {
    const main = [...get().inventory];
    const hot = [...get().hotbar];
    const arr = inv === "main" ? main : hot;
    const s = arr[i];
    if (!s) return;
    const def = ITEMS[s.id];
    if (!def || (def.category !== "food" && def.category !== "drink" && def.category !== "misc")) return;
    const st = get().stats;
    const newStats = { ...st };
    if (def.food) newStats.food = clamp(st.food + def.food, 0, 100);
    if (def.water) newStats.water = clamp(st.water + def.water, 0, 100);
    if (def.health) newStats.health = clamp(st.health + def.health, 0, 100);
    // status-effect triggers
    const patch: Partial<GameState> = { stats: newStats };
    if (s.id === "rawMeat" || s.id === "rawFish") {
      // Raw food risk: 25% chance to poison
      if (Math.random() < 0.25) {
        patch.poisoning = Math.max(get().poisoning, 25);
        get().toast("☠️ Food poisoning from raw meat!", "danger");
      }
    }
    if (s.id === "dirtyWater") {
      if (Math.random() < 0.4) {
        patch.poisoning = Math.max(get().poisoning, 18);
        get().toast("☠️ Dirty water made you sick!", "danger");
      }
    }
    if (s.id === "waterBottle" || s.id === "cola") {
      patch.hydrated = Math.max(get().hydrated, 90);
    }
    if (s.id === "cookedMeat" || s.id === "bread" || s.id === "cookedFish" || s.id === "cookedPumpkin" || s.id === "cookedEgg") {
      patch.wellRested = Math.max(get().wellRested, 120);
    }
    if (s.id === "bandage") {
      patch.bleeding = 0;
      get().toast("Bleeding stopped", "good");
      // Phase 10: first_aid achievement + bandage tracking
      patch.bandagesUsed = get().bandagesUsed + 1;
      get().unlockAchievement("first_aid");
    }
    if (s.id === "medkit") {
      patch.bleeding = 0;
      patch.poisoning = 0;
      get().toast("Fully healed!", "good");
    }
    if (s.id === "antiRad") {
      patch.poisoning = Math.max(0, get().poisoning - 30);
      patch.radiation = Math.max(0, get().radiation - 30);
      get().toast("Painkillers taken", "good");
    }
    if (s.id === "radXPill") {
      patch.radiation = Math.max(0, get().radiation - 40);
      get().toast("Rad-X taken — radiation reduced", "good");
    }
    if (s.id === "honey") {
      patch.poisoning = Math.max(0, get().poisoning - 20);
    }
    // Phase 5: buff meals — trigger timed buffs on consume
    if (s.id === "strengthStew" || s.id === "swiftStew" || s.id === "ironSkinStew") {
      get().consumeBuffMeal(s.id);
    }
    // Phase 6: new buff meals
    if (s.id === "regenStew" || s.id === "nightVisionTea") {
      get().consumeBuffMeal2(s.id);
    }
    set(patch);
    if (s.qty > 1) arr[i] = { ...s, qty: s.qty - 1 };
    else arr[i] = null;
    set({ inventory: main, hotbar: hot });
    get().toast(`Consumed ${def.name}`, "good");
    get().emitAudio(def.category === "drink" ? "drink" : "eat");
    // Phase 4: track meals eaten for full_belly achievement
    if (def.category === "food" || def.category === "drink") {
      get().incrementMealsEaten();
    }
  },
  equipClothing: (inv, i) => {
    const main = [...get().inventory];
    const hot = [...get().hotbar];
    const arr = inv === "main" ? main : hot;
    const s = arr[i];
    if (!s) return;
    const def = ITEMS[s.id];
    if (!def || def.category !== "clothing" || !def.slot) return;
    const cl = { ...get().clothing };
    const cur = cl[def.slot] ?? null;
    cl[def.slot] = s.id;
    arr[i] = cur ? { id: cur, qty: 1 } : null;
    set({ inventory: main, hotbar: hot, clothing: cl });
    // Phase 7: hazmat suit achievement
    if (s.id === "hazmatSuit") get().unlockAchievement("hazmat");
  },
  unequipClothing: (slot) => {
    const cl = { ...get().clothing };
    const cur = cl[slot];
    if (!cur) return;
    if (get().addItem(cur, 1) === 0) {
      cl[slot] = null;
      set({ clothing: cl });
    } else {
      get().toast("Inventory full!", "warn");
    }
  },
  doCraft: (recipe) => {
    const inv = [
      ...get().inventory.filter(Boolean) as ItemStack[],
      ...get().hotbar.filter(Boolean) as ItemStack[],
    ].map((s) => ({ id: s.id, qty: s.qty }));
    let canAfford = true;
    for (const c of recipe.cost) {
      const have = inv.filter((i) => i.id === c.id).reduce((a, b) => a + b.qty, 0);
      if (have < c.qty) { canAfford = false; break; }
    }
    if (!canAfford) {
      get().toast("Not enough resources", "warn");
      return false;
    }
    for (const c of recipe.cost) {
      get().removeItem(c.id, c.qty);
    }
    get().addItem(recipe.out.id, recipe.out.qty);
    get().toast(`Crafted ${ITEMS[recipe.out.id]?.name ?? recipe.out.id} ×${recipe.out.qty}`, "good");
    get().emitAudio("craft");
    // Phase 9: Activity log
    get().pushActivity(`Crafted ${ITEMS[recipe.out.id]?.name ?? recipe.out.id} ×${recipe.out.qty}`, ITEMS[recipe.out.id]?.icon ?? "🔨", "good");
    // Phase 4 achievement triggers
    get().unlockAchievement("first_craft");
    // XP reward for crafting
    get().grantXp("craft");
    const outId = recipe.out.id;
    if (["cookedMeat", "cookedFish", "bread", "cookedPumpkin", "cookedEgg", "meatJerky"].includes(outId)) {
      get().unlockAchievement("first_meal");
    }
    if (["metalAxe", "metalPickaxe", "metalKnife", "sword", "pistol", "shotgun", "metalHelmet", "metalChest", "heavyArmor", "combatHelmet"].includes(outId)) {
      get().unlockAchievement("iron_age");
    }
    // Phase 5: track quest progress for cooking
    if (recipe.category === "food") {
      get().incrementQuestProgress("cook", 1);
      get().grantXp("cook");
    }
    // Phase 5: track fangSword + wolfPeltCloak crafted (already handled by iron_age for fangSword, but also chef_master via buff meal cook)
    if (outId === "strengthStew" || outId === "swiftStew" || outId === "ironSkinStew") {
      if (!get().buffMealsCooked.includes(outId)) {
        const cooked = [...get().buffMealsCooked, outId];
        set({ buffMealsCooked: cooked });
        if (cooked.length >= 3) get().unlockAchievement("chef_master");
      }
    }
    // Phase 7: cooking pot recipe tracking for master_chef achievement
    const cookingPotRecipes = ["mushroomStew", "predatorStew", "oceanBowl", "berryPie", "veggieSoup"];
    if (cookingPotRecipes.includes(outId)) {
      if (!get().cookingPotRecipesCooked.includes(outId)) {
        const potCooked = [...get().cookingPotRecipesCooked, outId];
        set({ cookingPotRecipesCooked: potCooked });
        if (potCooked.length >= 5) get().unlockAchievement("master_chef");
      }
    }
    return true;
  },

  setBuildKind: (k) => {
    set({ buildKind: k });
  },
  rotateBuild: () => set((s) => ({ buildRotation: (s.buildRotation + 1) % 4 })),
  addPlaced: (b) => {
    set((s) => ({ placed: [...s.placed, b] }));
    // Phase 5: quest + achievement tracking
    get().incrementQuestProgress("build", 1);
    // XP reward for building
    get().grantXp("build");
    const n = get().placed.length;
    if (n >= 50) get().unlockAchievement("builder_supreme");
  },
  removePlaced: (id) => set((s) => ({ placed: s.placed.filter((p) => p.id !== id) })),

  // ---- Rust-style Building System actions ----
  addPlacedV2: (b) => {
    set((s) => ({ placedV2: [...s.placedV2, b] }));
    get().incrementQuestProgress("build", 1);
    get().grantXp("build");
    const n = get().placedV2.length;
    if (n >= 1) get().unlockAchievement("first_build");
    if (n >= 5) get().unlockAchievement("five_builds");
    if (n >= 10) get().unlockAchievement("ten_builds");
    if (n >= 25) get().unlockAchievement("twentyfive_builds");
    if (n >= 50) get().unlockAchievement("builder_supreme");
  },
  removePlacedV2: (id) => set((s) => ({ placedV2: s.placedV2.filter((p) => p.id !== id) })),
  upgradePlacedV2: (id, tier) => {
    set((s) => ({
      placedV2: s.placedV2.map((p) => (p.id === id ? { ...p, tier } : p)),
    }));
  },
  addDeployable: (d) => set((s) => ({ placedDeployables: [...s.placedDeployables, d] })),
  removeDeployable: (id) => set((s) => ({ placedDeployables: s.placedDeployables.filter((p) => p.id !== id) })),
  openRadialMenu: (type) => set({ radialMenuOpen: true, radialMenuType: type, radialMenuMouseX: 0, radialMenuMouseY: 0, radialMenuHoveredIndex: -1 }),
  closeRadialMenu: () => set({ radialMenuOpen: false, radialMenuType: null, radialMenuHoveredIndex: -1 }),
  setRadialMousePos: (x, y) => set({ radialMenuMouseX: x, radialMenuMouseY: y }),
  setRadialHoveredIndex: (idx) => set({ radialMenuHoveredIndex: idx }),
  confirmRadialSelection: (data) => {
    if (data === null) {
      set({ radialMenuOpen: false, radialMenuType: null });
      return;
    }
    const menuType = get().radialMenuType;
    if (menuType === "build") {
      // Player selected a build piece from Building Plan radial
      set({ selectedBuildPiece: data as BuildPieceType, radialMenuOpen: false, radialMenuType: null });
    } else if (menuType === "hammer") {
      // Player selected a hammer action — queue it for engine to consume
      set({ pendingHammerAction: data, radialMenuOpen: false, radialMenuType: null });
    } else if (menuType === "upgrade") {
      // Player selected a tier to upgrade to — queue it for engine to consume
      set({ pendingUpgradeTier: data, radialMenuOpen: false, radialMenuType: null });
    }
  },
  setSelectedBuildPiece: (piece) => set({ selectedBuildPiece: piece }),
  rotateBuildPiece: () => set((s) => ({ buildPieceRotation: (s.buildPieceRotation + 1) % 4 })),
  setHammerTargetId: (id) => set({ hammerTargetId: id }),
  setHologramValid: (v) => set({ hologramValid: v }),
  clearPendingHammerAction: () => set({ pendingHammerAction: null }),
  clearPendingUpgradeTier: () => set({ pendingUpgradeTier: null }),

  toast: (text, kind = "info") => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    setTimeout(() => get().dismissToast(id), 3500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  openLootContainer: (id, kind, loot) => set({ openContainer: { id, kind, loot }, mode: "inventory" }),
  closeContainer: () => set({ openContainer: null, mode: "play" }),
  transferFromContainer: (idx) => {
    const c = get().openContainer;
    if (!c) return;
    const loot = [...c.loot];
    const s = loot[idx];
    if (!s) return;
    const left = get().addItem(s.id, s.qty);
    if (left === 0) {
      loot[idx] = null;
      set({ openContainer: { ...c, loot } });
    } else {
      loot[idx] = { ...s, qty: left };
      set({ openContainer: { ...c, loot } });
    }
  },

  setNearStations: (s) => set((st) => ({ nearStations: { ...st.nearStations, ...s } })),
  setMinimap: (m) => set((st) => ({ minimap: { ...st.minimap, ...m } })),
  emitAudio: (event) => set({ audioCue: { event, t: Date.now() } }),

  // ---- Crops ----
  plantCrop: (gx, gz, kind) => {
    const seedId = kind === "wheat" ? "wheatSeed" : "pumpkinSeed";
    if (!get().removeItem(seedId, 1)) {
      get().toast(`No ${kind === "wheat" ? "wheat" : "pumpkin"} seeds!`, "warn");
      return;
    }
    const key = `${gx},${gz}`;
    set((st) => ({ crops: { ...st.crops, [key]: { kind, growth: 0, plantedAt: Date.now() } } }));
    get().toast(`Planted ${kind} seed`, "good");
  },
  harvestCrop: (gx, gz) => {
    const key = `${gx},${gz}`;
    const crop = get().crops[key];
    if (!crop) return;
    if (crop.growth < 1) {
      get().toast("Crop not ready yet", "warn");
      return;
    }
    const outId = crop.kind === "wheat" ? "wheat" : "pumpkin";
    const seedId = crop.kind === "wheat" ? "wheatSeed" : "pumpkinSeed";
    get().addItem(outId, crop.kind === "wheat" ? 2 : 1);
    if (Math.random() < 0.5) get().addItem(seedId, 1); // seed return
    const crops = { ...get().crops };
    delete crops[key];
    set({ crops });
    get().toast(`Harvested ${outId}!`, "good");
    // XP reward for farming
    get().grantXp("farm");
    get().unlockAchievement("farmer");
  },
  tickCrops: (dt) => {
    const crops = get().crops;
    let changed = false;
    const next = { ...crops };
    for (const key of Object.keys(crops)) {
      const c = crops[key];
      // Wheat: 90s, Pumpkin: 180s
      const growthTime = c.kind === "wheat" ? 90 : 180;
      const g = Math.min(1, c.growth + dt / growthTime);
      if (g !== c.growth) {
        next[key] = { ...c, growth: g };
        changed = true;
      }
    }
    if (changed) set({ crops: next });
  },

  // ---- Drying rack ----
  startDrying: (buildId) => {
    if (get().dryingRackContents[buildId]) {
      get().toast("Rack already in use", "warn");
      return false;
    }
    if (!get().removeItem("rawMeat", 1)) {
      get().toast("Need raw meat to dry", "warn");
      return false;
    }
    set((st) => ({ dryingRackContents: { ...st.dryingRackContents, [buildId]: { startedAt: Date.now(), ready: false } } }));
    get().toast("Meat drying on rack (60s)", "good");
    return true;
  },
  collectJerky: (buildId) => {
    const c = get().dryingRackContents[buildId];
    if (!c || !c.ready) return;
    get().addItem("meatJerky", 1);
    const next = { ...get().dryingRackContents };
    delete next[buildId];
    set({ dryingRackContents: next });
    get().toast("Collected meat jerky", "good");
  },
  tickDrying: (dt) => {
    const contents = get().dryingRackContents;
    let changed = false;
    const next = { ...contents };
    const now = Date.now();
    for (const id of Object.keys(contents)) {
      const c = contents[+id];
      if (!c.ready && (now - c.startedAt) / 1000 > 60) {
        next[+id] = { ...c, ready: true };
        changed = true;
      }
    }
    if (changed) set({ dryingRackContents: next });
  },

  // ---- Rain barrel ----
  collectRainWater: (buildId) => {
    const w = get().rainBarrelWater[buildId] ?? 0;
    if (w < 15) {
      get().toast("Barrel is empty — wait for rain", "warn");
      return false;
    }
    // Drink 1 portion = 15 units = +25 water
    const next = { ...get().rainBarrelWater, [buildId]: w - 15 };
    set({ rainBarrelWater: next });
    const st = get().stats;
    set({ stats: { ...st, water: clamp(st.water + 25, 0, 100) } });
    set({ hydrated: Math.max(get().hydrated, 60) });
    get().toast("Drank clean rainwater", "good");
    get().emitAudio("drink");
    return true;
  },
  tickRainBarrels: (dt, isRaining) => {
    if (!isRaining) return;
    const barrels = get().rainBarrelWater;
    let changed = false;
    const next = { ...barrels };
    // Find all placed rain barrels (they get buildId from placed list)
    const placed = get().placed.filter((p) => p.kind === "rainBarrel");
    for (const p of placed) {
      const cur = next[p.id] ?? 0;
      if (cur < 100) {
        next[p.id] = Math.min(100, cur + 2 * dt); // +2/s when raining
        changed = true;
      }
    }
    if (changed) set({ rainBarrelWater: next });
  },

  // ---- Phase 4 actions ----
  startSleep: () => {
    if (get().isSleeping) return;
    set({ isSleeping: true });
  },
  finishSleep: () => {
    // Advance time to next morning (0.28), restore 40 HP, 60 food/water, set well-rested buff
    const s = get().stats;
    set({
      isSleeping: false,
      timeOfDay: 0.28,
      stats: {
        ...s,
        health: clamp(s.health + 40, 0, 100),
        food: clamp(s.food + 30, 0, 100),
        water: clamp(s.water + 30, 0, 100),
      },
      wellRested: Math.max(get().wellRested, 240), // 4 min buff
      bleeding: 0, // sleep stops bleeding
    });
    get().toast("😴 You slept well — HP restored, Well-Rested buff", "good");
  },
  unlockAchievement: (id) => {
    if (get().unlockedAchievements.includes(id)) return;
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (!ach) return;
    // Phase 6: award gold nuggets based on achievement tier
    const reward = ACHIEVEMENT_REWARDS[ach.tier] ?? 1;
    get().addItem("goldNugget", reward);
    set({
      unlockedAchievements: [...get().unlockedAchievements, id],
      recentAchievement: ach,
    });
    get().emitAudio("craft"); // reuse craft cue as achievement chime
    get().toast(`🏆 ${ach.name}! +${reward} gold`, "good");
  },
  dismissAchievement: () => set({ recentAchievement: null }),
  rollTraderShop: () => {
    // Pick 4-6 random items from a curated pool, each with a goldNugget price
    const pool: { id: string; price: number }[] = [
      { id: "medkit", price: 4 },
      { id: "bandage", price: 1 },
      { id: "pistol", price: 8 },
      { id: "pistolAmmo", price: 2 },
      { id: "rifleAmmo", price: 3 },
      { id: "metalAxe", price: 5 },
      { id: "metalPickaxe", price: 5 },
      { id: "metalKnife", price: 4 },
      { id: "sword", price: 10 },
      { id: "shotgun", price: 12 },
      { id: "shotgunAmmo", price: 3 },
      { id: "heavyArmor", price: 9 },
      { id: "combatHelmet", price: 7 },
      { id: "polarCoat", price: 6 },
      { id: "snowPants", price: 5 },
      { id: "honey", price: 2 },
      { id: "bread", price: 2 },
      { id: "cookedMeat", price: 2 },
      { id: "antiRad", price: 3 },
      { id: "wheatSeed", price: 1 },
      { id: "pumpkinSeed", price: 1 },
      { id: "fishingRod", price: 3 },
      { id: "bow", price: 4 },
      { id: "arrow", price: 1 },
    ];
    // shuffle pool, take 4-6
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const n = 4 + Math.floor(Math.random() * 3); // 4-6
    const shop = shuffled.slice(0, n).map((p) => ({
      id: p.id,
      qty: 1 + Math.floor(Math.random() * 3), // 1-3 of each
      price: p.price,
    }));
    set({ traderShop: shop });
  },
  setTraderNearby: (near, pos) => set({ traderNearby: near, traderPos: pos }),
  buyFromTrader: (idx) => {
    const shop = [...get().traderShop];
    const item = shop[idx];
    if (!item || item.qty <= 0) return false;
    if (!get().removeItem("goldNugget", item.price)) {
      get().toast("Not enough gold nuggets", "warn");
      return false;
    }
    get().addItem(item.id, 1);
    item.qty -= 1;
    shop[idx] = item;
    set({ traderShop: shop });
    get().toast(`Bought ${ITEMS[item.id]?.name ?? item.id} for ${item.price} gold`, "good");
    get().unlockAchievement("trader_buy");
    return true;
  },
  placeHive: (buildId) => {
    if (get().hiveContents[buildId]) return;
    set((st) => ({ hiveContents: { ...st.hiveContents, [buildId]: { startedAt: Date.now(), honey: 0 } } }));
  },
  collectHoney: (buildId) => {
    const h = get().hiveContents[buildId];
    if (!h || h.honey < 1) return false;
    const yield_ = Math.floor(h.honey);
    get().addItem("honey", yield_);
    set((st) => ({ hiveContents: { ...st.hiveContents, [buildId]: { ...h, honey: h.honey - yield_ } } }));
    get().toast(`Harvested ${yield_} honey`, "good");
    get().unlockAchievement("beekeeper");
    return true;
  },
  tickHives: (dt) => {
    // Honey accumulates 1 per 90s; faster in daytime and near flowers (we approximate as daytime bonus)
    const timeOfDay = get().timeOfDay;
    const dayBonus = (timeOfDay > 0.25 && timeOfDay < 0.75) ? 1.5 : 0.6; // day faster, night slower
    const hives = get().hiveContents;
    let changed = false;
    const next = { ...hives };
    for (const id of Object.keys(hives)) {
      const h = hives[+id];
      const newHoney = Math.min(5, h.honey + (dt / 90) * dayBonus); // cap at 5 honey per hive
      if (newHoney !== h.honey) {
        next[+id] = { ...h, honey: newHoney };
        changed = true;
      }
    }
    if (changed) set({ hiveContents: next });
  },
  incrementMealsEaten: () => {
    const n = get().mealsEaten + 1;
    set({ mealsEaten: n });
    if (n >= 10) get().unlockAchievement("full_belly");
  },
  tickNightOwl: (dt, timeOfDay) => {
    if (get().nightOwlAwarded) return;
    // Progress through deep night (0.85 to 0.95 -> wraps 0 to 0.05)
    let inNight = timeOfDay > 0.85 || timeOfDay < 0.05;
    let progress = get().nightOwlProgress;
    if (inNight) {
      progress = Math.min(1, progress + dt / 60); // 60s of deep night = complete
      set({ nightOwlProgress: progress });
      if (progress >= 1) {
        set({ nightOwlAwarded: true });
        get().unlockAchievement("night_owl");
      }
    } else if (timeOfDay > 0.1 && timeOfDay < 0.7) {
      // Reset progress during day if they sleep through night
      if (progress > 0 && progress < 1) set({ nightOwlProgress: 0 });
    }
  },

  // ---- Phase 5 actions ----
  setBossActive: (active, hp, maxHp, pos) => {
    if (active) {
      set({
        bossActive: true,
        bossHp: hp ?? 500,
        bossMaxHp: maxHp ?? 500,
        bossPos: pos ?? null,
      });
      get().toast("🐺 A direwolf alpha has appeared!", "danger");
    } else {
      set({ bossActive: false, bossHp: 0, bossPos: null });
    }
  },
  damageBoss: (n) => {
    const hp = Math.max(0, get().bossHp - n);
    set({ bossHp: hp });
    if (hp <= 0 && get().bossActive) {
      get().killBoss();
    }
  },
  killBoss: () => {
    set({ bossActive: false, bossHp: 0, bossPos: null, bossKilled: true, bossKillDay: get().dayCount });
    get().unlockAchievement("alpha_slayer");
    get().toast("🏆 Direwolf Alpha defeated! Loot dropped.", "good");
    // Drop legendary loot at boss position (handled by engine)
  },
  setBossKillDay: (day) => set({ bossKillDay: day }),
  setRidingRaft: (riding, raftId) => {
    set({ ridingRaft: riding, raftId: raftId ?? null });
    if (riding) get().unlockAchievement("mariner");
  },
  setQuestBoardNearby: (near, id) => set({ questBoardNearby: near, questBoardId: id ?? null }),
  acceptQuest: (id) => {
    if (get().questsAccepted.includes(id)) return;
    if (get().questsCompleted.includes(id)) return;
    const q = QUESTS.find((qq) => qq.id === id);
    if (q?.requires && !get().questsCompleted.includes(q.requires)) {
      const req = QUESTS.find((qq) => qq.id === q.requires);
      get().toast(`Complete "${req?.title ?? q.requires}" first`, "warn");
      return;
    }
    set({ questsAccepted: [...get().questsAccepted, id] });
    get().toast(`Quest accepted: ${q?.title ?? id}`, "good");
  },
  completeQuest: (id) => {
    // Mark quest complete (objective reached). Player still needs to claim reward at the board.
    if (get().questsCompleted.includes(id)) return;
    set({ questsCompleted: [...get().questsCompleted, id] });
    get().toast(`Quest objective complete — claim your reward at the board!`, "good");
    // Auto-claim for convenience: rewards granted immediately
    const q = QUESTS.find((qq) => qq.id === id);
    if (q) {
      // Grant rewards
      for (const r of q.rewards) {
        if (r.id === "goldNugget") {
          get().addItem("goldNugget", r.qty);
        } else if (r.id === "xp" || r.id === "achievement") {
          // skip — handled via quest_hero achievement
        } else {
          get().addItem(r.id, r.qty);
        }
      }
      get().toast(`Reward: ${q.rewards.map((r) => `${r.qty}× ${ITEMS[r.id]?.name ?? r.id}`).join(", ")}`, "good");
      // Check quest_hero achievement
      if (get().questsCompleted.length >= 3) get().unlockAchievement("quest_hero");
    }
  },
  claimQuestReward: (id) => {
    // Rewards are auto-granted in completeQuest. This is a no-op kept for API symmetry.
    void id;
  },
  togglePhotoMode: () => {
    // Photo mode has been removed. No-op so legacy callers don't crash.
  },
  consumeBuffMeal: (id) => {
    const map = {
      strengthStew: "buffStrength",
      swiftStew: "buffSwift",
      ironSkinStew: "buffIronSkin",
    } as const;
    const dur = 90; // 90 seconds
    set({ [map[id]]: Math.max(get()[map[id]] as number, dur) } as Partial<GameState>);
    // Track chef achievement
    if (!get().buffMealsCooked.includes(id)) {
      const cooked = [...get().buffMealsCooked, id];
      set({ buffMealsCooked: cooked });
      if (cooked.length >= 3) get().unlockAchievement("chef_master");
    }
  },
  tickBuffs: (dt) => {
    const s = get().buffStrength;
    const w = get().buffSwift;
    const i = get().buffIronSkin;
    const r = get().buffRegen;
    const nv = get().buffNightVision;
    if (s <= 0 && w <= 0 && i <= 0 && r <= 0 && nv <= 0) return;
    set({
      buffStrength: Math.max(0, s - dt),
      buffSwift: Math.max(0, w - dt),
      buffIronSkin: Math.max(0, i - dt),
      buffRegen: Math.max(0, r - dt),
      buffNightVision: Math.max(0, nv - dt),
    });
  },
  setBarometerReading: (r) => {
    const uses = get().barometerUses + 1;
    set({ barometerReading: r, barometerUses: uses });
    if (uses >= 5) get().unlockAchievement("weather_forecaster");
  },
  // Phase 6: companion NPC
  setCompanionNearby: (near) => set({ companionNearby: near }),
  updateCompanionCarrying: (carrying) => set({ companionCarrying: carrying }),
  // Phase 7: Companion commands
  setCompanionCommand: (cmd) => {
    const labels: Record<string, string> = { follow: "Following", wait: "Waiting", gather: "Gathering", attack: "Attacking" };
    set({ companionCommand: cmd, companionCommandMenuOpen: false });
    get().toast(`Companion: ${labels[cmd]}`, "info");
    // Track commander achievement
    const used = get().companionCommandsUsed;
    if (!used.includes(cmd)) {
      const newUsed = [...used, cmd];
      set({ companionCommandsUsed: newUsed });
      if (newUsed.length >= 4) get().unlockAchievement("commander");
    }
  },
  toggleCompanionCommandMenu: () => set((s) => ({ companionCommandMenuOpen: !s.companionCommandMenuOpen })),
  setCompanionEnabled: (enabled) => {
    set({ companionEnabled: enabled });
    get().saveSettings();
  },
  // Phase 7: Settings
  setDayNightSpeed: (speed) => { set({ dayNightSpeed: speed }); get().saveSettings(); },
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setPaused: (paused) => set({ paused }),
  setShowCrosshair: (show) => { set({ showCrosshair: show }); get().saveSettings(); },
  setShowMinimap: (show) => { set({ showMinimap: show }); get().saveSettings(); },
  setShowCompass: (show) => { set({ showCompass: show }); get().saveSettings(); },
  setShowSunHorizon: (show) => { set({ showSunHorizon: show }); get().saveSettings(); },
  setFov: (fov) => { set({ fov }); get().saveSettings(); },
  setMusicVolume: (vol) => { set({ musicVolume: vol }); get().saveSettings(); },
  setRenderDistance: (m) => { set({ renderDistance: Math.max(40, Math.min(500, Math.round(m))) }); get().saveSettings(); },
  setGraphicsQuality: (q) => { set({ graphicsQuality: q }); get().saveSettings(); },
  setServerId: (id) => set({ serverId: id }),
  setServerBots: (n) => set({ serverBots: Math.max(0, Math.floor(n)) }),
  setKeybind: (action, key) => {
    const next = { ...get().keybinds, [action]: key };
    set({ keybinds: next });
    get().saveSettings();
  },
  resetKeybinds: () => {
    set({ keybinds: { ...DEFAULT_KEYBINDS } });
    get().saveSettings();
  },
  // Phase 7: Radiation zone
  setRadiationZoneActive: (active) => {
    const prev = get().radiationZoneActive;
    set({ radiationZoneActive: active });
    // Achievement: survive entering a radiation zone (enter then leave alive)
    if (prev && !active && !get().radZoneSurvived) {
      set({ radZoneSurvived: true });
      get().unlockAchievement("rad_survivor");
    }
  },
  // Phase 7: Screenshot gallery
  takeScreenshot: (dataUrl) => {
    const st = get();
    const newScreenshot = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      dataUrl,
      timestamp: Date.now(),
      dayCount: st.dayCount,
      location: { x: Math.round(st.minimap.playerX), z: Math.round(st.minimap.playerZ) },
    };
    // Keep max 12 screenshots, remove oldest
    const screenshots = [...st.screenshots, newScreenshot].slice(-12);
    const screenshotCount = st.screenshotCount + 1;
    set({ screenshots, screenshotFlash: 1, screenshotCount });
    // Shutterbug achievement: 5 screenshots
    if (screenshotCount >= 5) get().unlockAchievement("shutterbug");
  },
  deleteScreenshot: (id) => set((s) => ({ screenshots: s.screenshots.filter((ss) => ss.id !== id) })),
  setGalleryOpen: (open) => set({ galleryOpen: open }),
  setScreenshotFlash: (v) => set({ screenshotFlash: v }),
  tickScreenshotFlash: (dt) => {
    const f = get().screenshotFlash;
    if (f > 0) set({ screenshotFlash: Math.max(0, f - dt / 0.3) });
  },
  // Phase 6: new buff meals
  consumeBuffMeal2: (id) => {
    const map = {
      regenStew: "buffRegen",
      nightVisionTea: "buffNightVision",
    } as const;
    const dur = 90;
    set({ [map[id]]: Math.max(get()[map[id]] as number, dur) } as Partial<GameState>);
    // Track chef achievement
    if (!get().buffMealsCooked.includes(id)) {
      const cooked = [...get().buffMealsCooked, id];
      set({ buffMealsCooked: cooked });
      if (cooked.length >= 5) get().unlockAchievement("chef_master");
    }
  },
  // Phase 6: damage numbers
  addDamageNumber: (value, x, z) => {
    const id = Date.now() + Math.random();
    const existing = get().damageNumbers;
    set({ damageNumbers: [...existing.slice(-8), { id, value, x, z, t: Date.now() }] });
  },
  tickDamageNumbers: () => {
    const now = Date.now();
    const nums = get().damageNumbers.filter((d) => now - d.t < 1500);
    if (nums.length !== get().damageNumbers.length) set({ damageNumbers: nums });
  },
  loadLeaderboard: () => {
    try {
      const raw = localStorage.getItem("wilderness-leaderboard");
      if (!raw) {
        set({ leaderboard: [] });
        return;
      }
      const data = JSON.parse(raw);
      set({ leaderboard: Array.isArray(data) ? data : [] });
    } catch {
      set({ leaderboard: [] });
    }
  },
  saveLeaderboardEntry: () => {
    const st = get();
    const entry = {
      day: st.dayCount,
      kills: st.killCount,
      builds: st.placed.length,
      date: Date.now(),
    };
    const board = [...st.leaderboard, entry]
      .sort((a, b) => b.day - a.day || b.kills - a.kills || b.builds - a.builds)
      .slice(0, 5);
    set({ leaderboard: board });
    try {
      localStorage.setItem("wilderness-leaderboard", JSON.stringify(board));
    } catch {}
  },
  incrementKills: () => {
    const newKillCount = get().killCount + 1;
    set({ killCount: newKillCount });
    get().grantXp("kill");
    // Phase 10: Marksman achievement (10 kills)
    if (newKillCount >= 10) get().unlockAchievement("marksman");
  },
  // Phase 10: Track wolves killed at night (called by engine when a wolf is killed at night)
  incrementNightWolfKill: () => {
    const n = get().wolvesKilledAtNight + 1;
    set({ wolvesKilledAtNight: n });
    if (n >= 5) get().unlockAchievement("night_hunter");
  },
  // Phase 9: Activity log — push a new event (cap at 8 entries, ~60s retention)
  pushActivity: (text, icon, kind = "info") => {
    const id = activityLogId++;
    const entry = { id, text, icon, t: Date.now(), kind };
    const log = [entry, ...get().activityLog].slice(0, 8);
    set({ activityLog: log });
  },
  clearActivity: () => set({ activityLog: [] }),
  // Phase 9: Targeted enemy
  setTargetedEnemy: (e) => set({ targetedEnemy: e }),
  // Phase 10: Threat direction indicators — engine sets this each frame with nearby hostiles
  setThreats: (t) => {
    // Only update if changed (avoid thrashing renders)
    const cur = get().threats;
    if (cur.length !== t.length) {
      set({ threats: t });
      return;
    }
    for (let i = 0; i < t.length; i++) {
      if (cur[i].kind !== t[i].kind || Math.abs(cur[i].x - t[i].x) > 0.5 || Math.abs(cur[i].z - t[i].z) > 0.5) {
        set({ threats: t });
        return;
      }
    }
  },
  // Phase 10: Damage direction — add a brief red arc showing where damage came from (angle in radians, 0 = north)
  addDamageDirection: (angle, value) => {
    const id = Date.now() + Math.random();
    const existing = get().damageDirections;
    set({ damageDirections: [...existing.slice(-6), { id, angle, t: Date.now(), value: Math.round(value) }] });
  },
  tickDamageDirections: () => {
    const now = Date.now();
    const arr = get().damageDirections.filter((d) => now - d.t < 1500);
    if (arr.length !== get().damageDirections.length) set({ damageDirections: arr });
  },
  // Phase 10: Weapon swing animation trigger
  setWeaponSwing: (kind) => set({ weaponSwing: { t: Date.now(), kind } }),
  clearWeaponSwing: () => set({ weaponSwing: null }),
  // Phase 10: Player stats panel
  setPlayerStatsPanelOpen: (open) => set({ playerStatsPanelOpen: open }),
  // Phase 10: Day/night transition notification
  setDayNightNotify: (text, icon) => set({ dayNightNotify: { text, icon, t: Date.now() } }),
  tickDayNightNotify: (dt) => {
    const n = get().dayNightNotify;
    if (n && Date.now() - n.t > 3500) set({ dayNightNotify: null });
  },
  // Phase 10: Auto-consume helpers — find best food/drink in hotbar+inventory and consume it
  autoConsumeFood: () => {
    const g = get();
    // Priority: cooked food > berries > raw food (only as last resort)
    const foodPriority = ["cookedMeat", "cookedFish", "bread", "cookedPumpkin", "cookedEgg", "sandwich", "salad", "stew", "berries", "apple", "honey", "rawMeat", "rawFish"];
    for (const id of foodPriority) {
      // Search hotbar first
      for (let i = 0; i < g.hotbar.length; i++) {
        const s = g.hotbar[i];
        if (s && s.id === id) {
          g.consume("hotbar", i);
          return true;
        }
      }
      // Then inventory
      for (let i = 0; i < g.inventory.length; i++) {
        const s = g.inventory[i];
        if (s && s.id === id) {
          g.consume("main", i);
          return true;
        }
      }
    }
    g.toast("No food available!", "warn");
    return false;
  },
  autoConsumeDrink: () => {
    const g = get();
    const drinkPriority = ["waterBottle", "cola", "dirtyWater"];
    for (const id of drinkPriority) {
      for (let i = 0; i < g.hotbar.length; i++) {
        const s = g.hotbar[i];
        if (s && s.id === id) {
          g.consume("hotbar", i);
          return true;
        }
      }
      for (let i = 0; i < g.inventory.length; i++) {
        const s = g.inventory[i];
        if (s && s.id === id) {
          g.consume("main", i);
          return true;
        }
      }
    }
    g.toast("No drinks available!", "warn");
    return false;
  },

  // ===== Phase 11: Waypoint Markers =====
  addWaypoint: (x, z, label, color) => {
    const g = get();
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const palette = ["#fbbf24", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#84cc16"];
    const c = color ?? palette[g.waypoints.length % palette.length];
    const idx = g.waypoints.length + 1;
    const lbl = label ?? `Waypoint ${idx}`;
    const newWp = { id, x, z, label: lbl, color: c, t: Date.now() };
    set({ waypoints: [...g.waypoints, newWp] });
    g.toast(`📍 ${lbl} placed`, "good");
    g.pushActivity(`Placed ${lbl} at (${Math.round(x)}, ${Math.round(z)})`, "📍", "info");
    // Phase 11 achievement: place 5 / 10 waypoints
    if (g.waypoints.length + 1 >= 5) g.unlockAchievement("waypointer");
    if (g.waypoints.length + 1 >= 10) g.unlockAchievement("trailblazer");
  },
  removeWaypoint: (id) => {
    const g = get();
    set({ waypoints: g.waypoints.filter((w) => w.id !== id) });
    g.toast("Waypoint removed", "info");
  },
  clearWaypoints: () => {
    const g = get();
    if (g.waypoints.length === 0) {
      g.toast("No waypoints to clear", "info");
      return;
    }
    const count = g.waypoints.length;
    set({ waypoints: [] });
    g.toast(`Cleared ${count} waypoint${count === 1 ? "" : "s"}`, "info");
  },
  addDistanceWalked: (meters) => {
    const g = get();
    const newTotal = g.totalDistanceWalked + meters;
    set({ totalDistanceWalked: newTotal });
    // Phase 11: marathon achievement at 1000m
    if (newTotal >= 1000) g.unlockAchievement("marathon");
    if (newTotal >= 5000) g.unlockAchievement("pioneer");
  },
  setLowHealthIntensity: (intensity) => {
    const clamped = Math.max(0, Math.min(1, intensity));
    const cur = get().lowHealthIntensity;
    // Only update if delta > 0.02 to avoid spurious renders
    if (Math.abs(clamped - cur) > 0.02) {
      set({ lowHealthIntensity: clamped });
    }
  },
  tickHeartbeat: (dt) => {
    const g = get();
    const intensity = g.lowHealthIntensity;
    if (intensity < 0.05) {
      if (g.heartbeatTimer !== 0) set({ heartbeatTimer: 0 });
      return false;
    }
    // Heartbeat interval: 1.4s at low intensity → 0.55s at high intensity
    const interval = 1.4 - intensity * 0.85;
    const newTimer = g.heartbeatTimer + dt;
    if (newTimer >= interval) {
      set({ heartbeatTimer: 0 });
      return true;
    }
    set({ heartbeatTimer: newTimer });
    return false;
  },

  incrementQuestProgress: (kind, n = 1) => {
    const cur = get().questProgress[kind] ?? 0;
    const next = { ...get().questProgress, [kind]: cur + n };
    set({ questProgress: next });
    // Auto-complete any accepted quest matching this objective kind
    const accepted = get().questsAccepted;
    const completed = get().questsCompleted;
    for (const q of QUESTS) {
      if (q.objective.kind !== kind) continue;
      if (!accepted.includes(q.id)) continue;
      if (completed.includes(q.id)) continue;
      if (next[kind] >= q.objective.target) {
        get().completeQuest(q.id);
      }
    }
  },

  // ===== XP / Level System (REMOVED — grantXp is now a no-op) =====
  grantXp: () => {
    // Leveling system removed. Intentionally a no-op so any legacy callers are harmless.
  },
  tickLevelUpFlash: () => {
    // No-op — leveling system removed.
  },

  // ---- Save / Load ----
  // NOTE: Game-progress saving has been DISABLED per user request — only user
  // settings persist (via saveSettings/loadSettings to the `wilderness-settings`
  // key). saveGame/loadGame/clearSave/hasSave are kept as no-op stubs so legacy
  // callers (engine hotkeys, death screen) don't crash, but they no longer read
  // or write any game state.
  saveGame: () => {
    // No-op: game progress is not persisted. Settings persist separately.
  },
  loadGame: () => {
    // No-op: there is no save to load. Returns false so callers fall through to a fresh start.
    return false;
  },
  hasSave: () => {
    // Game-progress saves are disabled — always returns false.
    return false;
  },
  clearSave: () => {
    // No-op: game progress is not persisted, so there is nothing to clear.
    // (Settings persist in `wilderness-settings` and are intentionally kept.)
  },

  // ===== Settings persistence (separate from save game) =====
  // Writes the user's preference settings to a dedicated localStorage key so
  // they persist across browser sessions even if the user never saves their
  // game or starts a new game. Called automatically by every settings setter.
  saveSettings: () => {
    try {
      const s = get();
      const data = {
        dayNightSpeed: s.dayNightSpeed,
        musicVolume: s.musicVolume,
        fov: s.fov,
        showCrosshair: s.showCrosshair,
        showMinimap: s.showMinimap,
        showCompass: s.showCompass,
        showSunHorizon: s.showSunHorizon,
        renderDistance: s.renderDistance,
        graphicsQuality: s.graphicsQuality,
        companionEnabled: s.companionEnabled,
        keybinds: s.keybinds,
        savedAt: Date.now(),
      };
      localStorage.setItem("wilderness-settings", JSON.stringify(data));
    } catch {
      // localStorage may be unavailable (private mode, quota) — settings just
      // won't persist; the in-memory values still work for this session.
    }
  },

  // Reads saved settings from localStorage and applies them. Called once at
  // module load (see bottom of file) so settings are restored before the game
  // UI renders. Also called after loadGame() so a save's settings don't
  // overwrite the user's standalone preferences.
  loadSettings: () => {
    try {
      const raw = localStorage.getItem("wilderness-settings");
      if (!raw) return;
      const data = JSON.parse(raw);
      set({
        dayNightSpeed: typeof data.dayNightSpeed === "number" ? data.dayNightSpeed : get().dayNightSpeed,
        musicVolume: typeof data.musicVolume === "number" ? data.musicVolume : get().musicVolume,
        fov: typeof data.fov === "number" ? data.fov : get().fov,
        showCrosshair: typeof data.showCrosshair === "boolean" ? data.showCrosshair : get().showCrosshair,
        showMinimap: typeof data.showMinimap === "boolean" ? data.showMinimap : get().showMinimap,
        showCompass: typeof data.showCompass === "boolean" ? data.showCompass : get().showCompass,
        showSunHorizon: typeof data.showSunHorizon === "boolean" ? data.showSunHorizon : get().showSunHorizon,
        renderDistance: typeof data.renderDistance === "number" ? data.renderDistance : get().renderDistance,
        graphicsQuality: ["low", "medium", "high"].includes(data.graphicsQuality) ? data.graphicsQuality : get().graphicsQuality,
        keybinds: (data.keybinds && typeof data.keybinds === "object") ? { ...DEFAULT_KEYBINDS, ...data.keybinds } : get().keybinds,
        companionEnabled: typeof data.companionEnabled === "boolean" ? data.companionEnabled : get().companionEnabled,
      });
    } catch {
      // Corrupt or missing settings — silently fall back to defaults.
    }
  },

  init: () => {
    set({
      mode: "menu",
      stats: { health: 100, food: 80, water: 80 },
      inventory: defaultInventory(),
      hotbar: defaultHotbar(),
      equipHotbarIndex: 0,
      clothing: { head: null, chest: "basicShirt", legs: "basicTrousers", feet: null },
      placed: [],
      toasts: [],
      prompt: null,
      openContainer: null,
      worldSeed: Math.floor(Math.random() * 1000000),
      timeOfDay: 0.32,
      weather: "sunny",
      dayCount: 1,
      bleeding: 0,
      poisoning: 0,
      wellRested: 0,
      hydrated: 0,
      radiation: 0,
      dehydrated: false,
      crops: {},
      dryingRackContents: {},
      rainBarrelWater: {},
      // Phase 4
      isSleeping: false,
      unlockedAchievements: [],
      recentAchievement: null,
      traderNearby: false,
      traderShop: [],
      traderPos: null,
      hiveContents: {},
      mealsEaten: 0,
      nightOwlProgress: 0,
      nightOwlAwarded: false,
      // Phase 5
      bossActive: false,
      bossHp: 0,
      bossMaxHp: 500,
      bossPos: null,
      bossKilled: false,
      bossKillDay: 0,
      ridingRaft: false,
      raftId: null,
      questsAccepted: [],
      questsCompleted: [],
      questBoardNearby: false,
      questBoardId: null,
      photoMode: false,
      companionNearby: false,
      companionCarrying: [],
      companionCommand: "follow" as const,
      companionCommandMenuOpen: false,
      dayNightSpeed: 1.0,
      settingsOpen: false,
      paused: false,
      showCrosshair: true,
      showMinimap: true,
      showCompass: true,
      showSunHorizon: true,
      fov: 75,
      musicVolume: 50,
      renderDistance: 180,
      graphicsQuality: "medium" as const,
      keybinds: { ...DEFAULT_KEYBINDS },
      serverId: "coast",
      serverBots: 3,
      radiationZoneActive: false,
      radZoneSurvived: false,
      cookingPotRecipesCooked: [],
      companionCommandsUsed: [],
      screenshots: [],
      galleryOpen: false,
      screenshotFlash: 0,
      screenshotCount: 0,
      buffRegen: 0,
      buffNightVision: 0,
      damageNumbers: [],
      buffStrength: 0,
      buffSwift: 0,
      buffIronSkin: 0,
      buffMealsCooked: [],
      barometerReading: null,
      killCount: 0,
      xp: 0,
      level: 1,
      xpToNext: xpForLevel(1),
      totalXp: 0,
      levelUpFlash: 0,
      activityLog: [],
      targetedEnemy: null,
      // Phase 10: reset new state fields
      threats: [],
      damageDirections: [],
      weaponSwing: null,
      playerStatsPanelOpen: false,
      dayNightNotify: null,
      lastDayPhase: "day",
      bandagesUsed: 0,
      wolvesKilledAtNight: 0,
      barometerUses: 0,
      // Phase 11: new state defaults
      waypoints: [],
      totalDistanceWalked: 0,
      lowHealthIntensity: 0,
      heartbeatTimer: 0,
      questProgress: {
        kill_wolves: 0, kill_bear: 0, chop_trees: 0, mine_rocks: 0,
        build: 0, fish: 0, cook: 0, collect_gold: 0,
      },
      nearStations: { workbench: false, furnace: false, campfire: false, anvil: false, dryingRack: false, rainBarrel: false, farmingPlot: false, cookingPot: false },
      minimap: {
        playerX: 0,
        playerZ: 0,
        playerYaw: 0,
        trees: [],
        bots: [],
        animals: [],
        placed: [],
        loot: [],
        caveEntrances: [],
        worldSize: 600,
      },
      audioCue: { event: "", t: 0 },
    });
    // `init` resets settings to defaults — restore the user's saved
    // preferences so starting a new game doesn't wipe their graphics/FOV/etc.
    get().loadSettings();
  },
}));

// ===== Restore saved settings on module load =====
// This runs once when the store is first imported (before the React app
// renders) so the UI shows the user's previously-chosen graphics quality,
// render distance, FOV, etc. immediately. Settings persist independently of
// save games (separate localStorage key) so they survive a browser close even
// if the user never saved their game.
try {
  useGame.getState().loadSettings();
} catch {
  // localStorage unavailable — defaults stay in place.
}

export const INVENTORY_SLOTS = MAX_INV;
export const HOTBAR_SLOTS = HOTBAR_SIZE;
