// Item definitions for the survival game.
// Each item has an id, name, category, stack size, and an emoji icon.

export type ItemCategory =
  | "resource"
  | "food"
  | "drink"
  | "weapon"
  | "tool"
  | "clothing"
  | "building"
  | "furniture"
  | "ammo"
  | "misc";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  stack: number; // max stack size
  icon: string; // emoji used as icon
  color: string; // tailwind/hex for slot tinting
  weight?: number;
  desc?: string;
  rarity?: Rarity;
  // food/water restore on consume
  food?: number;
  water?: number;
  health?: number;
  // weapon stats
  damage?: number;
  range?: number;
  attackRate?: number; // seconds between hits
  toolType?: "axe" | "pickaxe" | "knife" | "hammer" | "none";
  toolPower?: number; // how fast it harvests
  weaponKind?: "melee" | "ranged";
  ammoType?: string;
  light?: boolean;
  // clothing slot
  slot?: "head" | "chest" | "legs" | "feet";
  armor?: number;
  warmth?: number;
}

export const ITEMS: Record<string, ItemDef> = {
  // ---- Tools (Rust-style building) ----
  buildingPlan: { id: "buildingPlan", name: "Building Plan", category: "tool", stack: 1, icon: "🗺️", color: "#c4a882", desc: "Hold to place Twig structural frames. RMB opens radial menu.", toolType: "none", rarity: "common" },
  hammer: { id: "hammer", name: "Hammer", category: "tool", stack: 1, icon: "🔨", color: "#8a8a8a", desc: "Upgrade, repair, rotate, or demolish structures. RMB opens radial menu.", toolType: "hammer", toolPower: 0.5, rarity: "common" },
  // ---- Resources ----
  wood: { id: "wood", name: "Wood", category: "resource", stack: 1000, icon: "🪵", color: "#8b5a2b", desc: "Logs harvested from trees." },
  stone: { id: "stone", name: "Stone", category: "resource", stack: 1000, icon: "🪨", color: "#7a7a7a", desc: "Rough chunks of stone." },
  coal: { id: "coal", name: "Coal Ore", category: "resource", stack: 500, icon: "⚫", color: "#2a2a2a", desc: "Black combustible ore." },
  ironOre: { id: "ironOre", name: "Iron Ore", category: "resource", stack: 500, icon: "🟤", color: "#6b4423", desc: "Smeltable iron." },
  cloth: { id: "cloth", name: "Cloth", category: "resource", stack: 500, icon: "🧵", color: "#d4d4d4", desc: "Woven fabric scraps." },
  rope: { id: "rope", name: "Rope", category: "resource", stack: 500, icon: "➰", color: "#c2a878", desc: "Twisted plant fiber." },
  metalFrag: { id: "metalFrag", name: "Metal Fragments", category: "resource", stack: 500, icon: "🔩", color: "#9ca3af", desc: "Rusty metal bits." },
  leather: { id: "leather", name: "Leather", category: "resource", stack: 500, icon: "🟫", color: "#7c4a2a", desc: "Tanned animal hide." },
  hide: { id: "hide", name: "Animal Hide", category: "resource", stack: 500, icon: "🐂", color: "#8b5a3c", desc: "Raw animal skin." },
  fat: { id: "fat", name: "Animal Fat", category: "resource", stack: 200, icon: "🧈", color: "#e8e0c0", desc: "Render for fuel or food." },
  bone: { id: "bone", name: "Bone Fragments", category: "resource", stack: 500, icon: "🦴", color: "#e8e8d8", desc: "Splintered bones." },
  fiber: { id: "fiber", name: "Plant Fiber", category: "resource", stack: 500, icon: "🌾", color: "#b8c97a", desc: "Twistable plant strands." },
  feather: { id: "feather", name: "Feathers", category: "resource", stack: 100, icon: "🪶", color: "#e8e0c8", desc: "For fletching arrows.", rarity: "uncommon" },
  salt: { id: "salt", name: "Salt", category: "resource", stack: 50, icon: "🧂", color: "#f0f0f0", desc: "Preserves meat." },
  wheatSeed: { id: "wheatSeed", name: "Wheat Seeds", category: "resource", stack: 100, icon: "🌱", color: "#a8b85a", desc: "Plant in farming plots.", rarity: "uncommon" },
  pumpkinSeed: { id: "pumpkinSeed", name: "Pumpkin Seeds", category: "resource", stack: 100, icon: "🌱", color: "#c8a04a", desc: "Grow pumpkins.", rarity: "uncommon" },
  goldNugget: { id: "goldNugget", name: "Gold Nugget", category: "resource", stack: 100, icon: "🟡", color: "#d4a017", desc: "Rare precious metal.", rarity: "epic" },
  sulfur: { id: "sulfur", name: "Sulfur", category: "resource", stack: 200, icon: "🟨", color: "#e8d848", desc: "Used in gunpowder.", rarity: "uncommon" },
  gunpowder: { id: "gunpowder", name: "Gunpowder", category: "resource", stack: 100, icon: "⚫", color: "#3a3a3a", desc: "Explosive powder.", rarity: "rare" },
  glass: { id: "glass", name: "Glass Pane", category: "resource", stack: 50, icon: "🪟", color: "#b8d0e8", desc: "Smelted from sand at a furnace.", rarity: "uncommon" },

  // ---- Food ----
  berries: { id: "berries", name: "Berries", category: "food", stack: 50, icon: "🫐", color: "#4a3a7a", food: 8, water: 4, desc: "Wild blue berries." },
  redBerries: { id: "redBerries", name: "Red Berries", category: "food", stack: 50, icon: "🍓", color: "#b22222", food: 12, water: 3, desc: "Sweet red berries." },
  rawMeat: { id: "rawMeat", name: "Raw Meat", category: "food", stack: 20, icon: "🥩", color: "#a02828", food: 5, health: -5, desc: "Risky to eat raw." },
  cookedMeat: { id: "cookedMeat", name: "Cooked Meat", category: "food", stack: 20, icon: "🍖", color: "#7a3a1a", food: 30, health: 5, desc: "Roasted over fire." },
  burntMeat: { id: "burntMeat", name: "Burnt Meat", category: "food", stack: 20, icon: "🍢", color: "#1a1a1a", food: 4, health: -2, desc: "Charred inedible." },
  cannedBeans: { id: "cannedBeans", name: "Canned Beans", category: "food", stack: 10, icon: "🥫", color: "#cc6633", food: 25, water: 5, desc: "Old tin of beans." },
  cannedTuna: { id: "cannedTuna", name: "Canned Tuna", category: "food", stack: 10, icon: "🐟", color: "#9aa8b5", food: 20, water: 3, desc: "Canned fish." },
  granolaBar: { id: "granolaBar", name: "Granola Bar", category: "food", stack: 10, icon: "🍫", color: "#6b4423", food: 18, desc: "Compact snack." },
  mushroom: { id: "mushroom", name: "Mushroom", category: "food", stack: 20, icon: "🍄", color: "#b5524a", food: 6, health: 2, desc: "Forest fungus." },

  // ---- New food (Phase 2) ----
  rawFish: { id: "rawFish", name: "Raw Fish", category: "food", stack: 20, icon: "🐟", color: "#c8d8e8", food: 6, health: -4, desc: "Catch with a fishing rod.", rarity: "uncommon" },
  cookedFish: { id: "cookedFish", name: "Cooked Fish", category: "food", stack: 20, icon: "🐟", color: "#d8a060", food: 25, health: 4, desc: "Grilled fish.", rarity: "uncommon" },
  meatJerky: { id: "meatJerky", name: "Meat Jerky", category: "food", stack: 30, icon: "🥓", color: "#7a2a1a", food: 18, water: -3, desc: "Dried, lasts long.", rarity: "uncommon" },
  wheat: { id: "wheat", name: "Wheat", category: "food", stack: 50, icon: "🌾", color: "#d4b85a", food: 6, desc: "Grain — grind into flour." },
  bread: { id: "bread", name: "Bread", category: "food", stack: 20, icon: "🍞", color: "#d4a060", food: 30, water: -2, desc: "Baked from flour.", rarity: "uncommon" },
  flour: { id: "flour", name: "Flour", category: "resource", stack: 50, icon: "⚪", color: "#e8e0c8", desc: "Milled wheat.", rarity: "uncommon" },
  pumpkin: { id: "pumpkin", name: "Pumpkin", category: "food", stack: 10, icon: "🎃", color: "#d97706", food: 20, health: 4, desc: "Grown in plots.", rarity: "uncommon" },
  cookedPumpkin: { id: "cookedPumpkin", name: "Roasted Pumpkin", category: "food", stack: 10, icon: "🍲", color: "#c86506", food: 32, health: 6, water: 8, desc: "Sweet and warm.", rarity: "uncommon" },
  egg: { id: "egg", name: "Egg", category: "food", stack: 20, icon: "🥚", color: "#f0e8c8", food: 10, desc: "Foraged from bird nests.", rarity: "uncommon" },
  cookedEgg: { id: "cookedEgg", name: "Fried Egg", category: "food", stack: 20, icon: "🍳", color: "#f4d870", food: 18, desc: "Sunny side up.", rarity: "uncommon" },
  apple: { id: "apple", name: "Apple", category: "food", stack: 20, icon: "🍎", color: "#c82828", food: 12, water: 4, desc: "From forest trees." },
  honey: { id: "honey", name: "Honey", category: "food", stack: 10, icon: "🍯", color: "#d4a020", food: 18, water: 4, health: 4, desc: "Rare forest treat.", rarity: "rare" },

  // ---- New food (Phase 4) ----
  stew: { id: "stew", name: "Hearty Stew", category: "food", stack: 5, icon: "🍲", color: "#a0522d", food: 45, water: 25, health: 8, desc: "A warm, filling stew.", rarity: "uncommon" },
  sandwich: { id: "sandwich", name: "Meat Sandwich", category: "food", stack: 5, icon: "🥪", color: "#d4a373", food: 35, health: 4, desc: "A hearty sandwich.", rarity: "common" },
  salad: { id: "salad", name: "Berry Salad", category: "food", stack: 5, icon: "🥗", color: "#90c590", food: 25, water: 15, health: 6, desc: "Fresh and healthy.", rarity: "common" },

  // ---- Drinks ----
  waterBottle: { id: "waterBottle", name: "Water Bottle", category: "drink", stack: 5, icon: "🍶", color: "#5a9bd4", water: 40, desc: "Purified water." },
  dirtyWater: { id: "dirtyWater", name: "Dirty Water", category: "drink", stack: 5, icon: "🥤", color: "#7a6b3a", water: 25, health: -8, desc: "Murky water." },
  cola: { id: "cola", name: "Soda Can", category: "drink", stack: 10, icon: "🥤", color: "#b22222", water: 20, food: 5, desc: "Fizzy sugar water." },
  beer: { id: "beer", name: "Beer", category: "drink", stack: 10, icon: "🍺", color: "#c9a23a", water: 15, food: 8, desc: "Old world brew." },

  // ---- Weapons / tools ----
  rock: {
    id: "rock", name: "Rock", category: "weapon", stack: 1, icon: "🪨", color: "#7a7a7a",
    damage: 8, range: 2.6, attackRate: 0.55, toolType: "pickaxe", toolPower: 0.6,
    weaponKind: "melee", desc: "A blunt stone. The spawn weapon."
  },
  woodSpear: {
    id: "woodSpear", name: "Wooden Spear", category: "weapon", stack: 1, icon: "🔪", color: "#9b6924",
    damage: 18, range: 3.0, attackRate: 0.6, toolType: "knife", toolPower: 0.8,
    weaponKind: "melee", desc: "Sharpened stick."
  },
  stoneSpear: {
    id: "stoneSpear", name: "Stone Spear", category: "weapon", stack: 1, icon: "🗡️", color: "#b0b0b0",
    damage: 32, range: 3.2, attackRate: 0.65, toolType: "knife", toolPower: 1.1,
    weaponKind: "melee", desc: "Stone-tipped thrusting spear."
  },
  woodKnife: {
    id: "woodKnife", name: "Wooden Knife", category: "weapon", stack: 1, icon: "🔪", color: "#a87838",
    damage: 14, range: 2.2, attackRate: 0.4, toolType: "knife", toolPower: 0.7,
    weaponKind: "melee", desc: "Quick carving blade."
  },
  stoneKnife: {
    id: "stoneKnife", name: "Stone Knife", category: "weapon", stack: 1, icon: "🔪", color: "#9a9a9a",
    damage: 24, range: 2.4, attackRate: 0.42, toolType: "knife", toolPower: 1.0,
    weaponKind: "melee", desc: "Flint-shard blade."
  },
  stonePickaxe: {
    id: "stonePickaxe", name: "Stone Pickaxe", category: "tool", stack: 1, icon: "⛏️", color: "#888888",
    damage: 12, range: 2.8, attackRate: 0.7, toolType: "pickaxe", toolPower: 2.0,
    weaponKind: "melee", desc: "Mine stone, coal and ore."
  },
  hatchet: {
    id: "hatchet", name: "Stone Hatchet", category: "tool", stack: 1, icon: "🪓", color: "#888888",
    damage: 16, range: 2.8, attackRate: 0.6, toolType: "axe", toolPower: 1.6,
    weaponKind: "melee", desc: "Faster tree chopping."
  },
  rifle: {
    id: "rifle", name: "Bolt Rifle", category: "weapon", stack: 1, icon: "🔫", color: "#3a2a1a",
    damage: 80, range: 80, attackRate: 1.2, toolType: "none", toolPower: 0,
    weaponKind: "ranged", ammoType: "rifleAmmo", desc: "Powerful long-range firearm."
  },
  pistol: {
    id: "pistol", name: "Pistol", category: "weapon", stack: 1, icon: "🔫", color: "#2a2a2a",
    damage: 35, range: 40, attackRate: 0.35, toolType: "none", toolPower: 0,
    weaponKind: "ranged", ammoType: "pistolAmmo", desc: "Sidearm."
  },

  // ---- Ammo ----
  rifleAmmo: { id: "rifleAmmo", name: "Rifle Ammo", category: "ammo", stack: 60, icon: "🟡", color: "#d4a017" },
  pistolAmmo: { id: "pistolAmmo", name: "Pistol Ammo", category: "ammo", stack: 90, icon: "🟠", color: "#c08020" },

  // ---- Building parts ----
  woodWall: { id: "woodWall", name: "Wood Wall", category: "building", stack: 50, icon: "🟫", color: "#8b5a2b", desc: "Foundation wall." },
  woodFloor: { id: "woodFloor", name: "Wood Floor", category: "building", stack: 50, icon: "🟧", color: "#9b6a3b", desc: "Ceiling / floor." },
  woodRoof: { id: "woodRoof", name: "Wood Roof", category: "building", stack: 50, icon: "🔺", color: "#7b4a1b", desc: "Sloped roof piece." },
  woodDoor: { id: "woodDoor", name: "Wood Door", category: "building", stack: 10, icon: "🚪", color: "#6b4220", desc: "Doorframe + door." },
  woodPillar: { id: "woodPillar", name: "Wood Pillar", category: "building", stack: 50, icon: "🪵", color: "#7b4a1b" },
  stoneWall: { id: "stoneWall", name: "Stone Wall", category: "building", stack: 50, icon: "⬜", color: "#7a7a7a", desc: "Stronger stone wall." },
  stoneFloor: { id: "stoneFloor", name: "Stone Floor", category: "building", stack: 50, icon: "◻️", color: "#888888", desc: "Stone ceiling." },
  stoneRoof: { id: "stoneRoof", name: "Stone Roof", category: "building", stack: 50, icon: "⛰️", color: "#6a6a6a" },
  stoneDoor: { id: "stoneDoor", name: "Stone Door", category: "building", stack: 10, icon: "🚪", color: "#5a5a5a" },

  // ---- New building parts (Phase 2) ----
  woodStairs: { id: "woodStairs", name: "Wood Stairs", category: "building", stack: 20, icon: "🪜", color: "#8b5a2b", desc: "Climb to upper floors.", rarity: "uncommon" },
  woodWindow: { id: "woodWindow", name: "Wood Window", category: "building", stack: 20, icon: "🪟", color: "#9b6a3b", desc: "Wall with a glass pane.", rarity: "uncommon" },
  woodLadder: { id: "woodLadder", name: "Wood Ladder", category: "building", stack: 20, icon: "🪜", color: "#7b4a1b", desc: "Vertical climb.", rarity: "common" },
  stoneStairs: { id: "stoneStairs", name: "Stone Stairs", category: "building", stack: 20, icon: "🪜", color: "#7a7a7a", desc: "Sturdy stone stairs.", rarity: "rare" },
  stoneWindow: { id: "stoneWindow", name: "Stone Window", category: "building", stack: 20, icon: "🪟", color: "#888888", desc: "Stone-framed window.", rarity: "rare" },
  gate: { id: "gate", name: "Wood Gate", category: "building", stack: 5, icon: "🚪", color: "#5a3a1a", desc: "Large 2-cell gateway.", rarity: "uncommon" },

  // ---- New building parts (Phase 4) ----
  triangularRoof: { id: "triangularRoof", name: "Triangular Roof", category: "building", stack: 20, icon: "🔺", color: "#7b4a1b", desc: "Triangular prism roof piece.", rarity: "uncommon" },
  halfWall: { id: "halfWall", name: "Half Wall", category: "building", stack: 20, icon: "🧱", color: "#8b5a2b", desc: "Half-height wall (1.5m).", rarity: "common" },
  fencePost: { id: "fencePost", name: "Fence Post", category: "building", stack: 50, icon: "🪵", color: "#7c4a2a", desc: "Sturdy fence post.", rarity: "common" },
  fenceGate: { id: "fenceGate", name: "Fence Gate", category: "building", stack: 10, icon: "🚧", color: "#6b4220", desc: "Fence gate with rails.", rarity: "common" },

  // ---- Furniture / placeable ----
  campfire: { id: "campfire", name: "Campfire", category: "furniture", stack: 5, icon: "🔥", color: "#d97706", desc: "Cook food & provide warmth/light.", rarity: "common" },
  bed: { id: "bed", name: "Wood Bed", category: "furniture", stack: 2, icon: "🛏️", color: "#8b5a2b", desc: "Sleep to skip night.", rarity: "uncommon" },
  woodChest: { id: "woodChest", name: "Wood Chest", category: "furniture", stack: 3, icon: "🧰", color: "#6b4220", desc: "Store items.", rarity: "common" },
  torch: { id: "torch", name: "Torch", category: "furniture", stack: 10, icon: "🔦", color: "#d97706", desc: "Placeable light source.", rarity: "common" },
  workbench: { id: "workbench", name: "Crafting Bench", category: "furniture", stack: 2, icon: "🔨", color: "#7c4a2a", desc: "Unlocks advanced recipes.", rarity: "uncommon" },
  furnace: { id: "furnace", name: "Furnace", category: "furniture", stack: 2, icon: "🏭", color: "#444444", desc: "Smelt ore into metal.", rarity: "uncommon" },
  anvil: { id: "anvil", name: "Anvil", category: "furniture", stack: 1, icon: "⚒️", color: "#2a2a2a", desc: "Forge weapons & armor.", rarity: "rare" },
  dryingRack: { id: "dryingRack", name: "Drying Rack", category: "furniture", stack: 2, icon: "🍖", color: "#7c4a2a", desc: "Dry meat into jerky.", rarity: "uncommon" },
  farmingPlot: { id: "farmingPlot", name: "Farming Plot", category: "furniture", stack: 5, icon: "🌱", color: "#5a4a2a", desc: "Plant seeds to grow crops.", rarity: "uncommon" },
  rainBarrel: { id: "rainBarrel", name: "Rain Barrel", category: "furniture", stack: 2, icon: "🛢️", color: "#4a5a6a", desc: "Collect water over time.", rarity: "uncommon" },
  signPost: { id: "signPost", name: "Sign Post", category: "furniture", stack: 5, icon: "🪧", color: "#7c4a2a", desc: "Mark your territory.", rarity: "common" },
  scarecrow: { id: "scarecrow", name: "Scarecrow", category: "furniture", stack: 1, icon: "👻", color: "#8b5a2b", desc: "Keeps crows away from crops.", rarity: "uncommon" },
  beehive: { id: "beehive", name: "Beehive", category: "furniture", stack: 2, icon: "🐝", color: "#d4a020", desc: "Produces honey over time.", rarity: "rare" },

  // ---- Clothing ----
  basicShirt: { id: "basicShirt", name: "Basic Shirt", category: "clothing", stack: 1, icon: "👕", color: "#a8a8a8", slot: "chest", armor: 2, warmth: 1 },
  basicTrousers: { id: "basicTrousers", name: "Basic Trousers", category: "clothing", stack: 1, icon: "👖", color: "#6a6a7a", slot: "legs", armor: 2, warmth: 1 },
  hideVest: { id: "hideVest", name: "Hide Vest", category: "clothing", stack: 1, icon: "🦺", color: "#7c4a2a", slot: "chest", armor: 8, warmth: 4 },
  hidePants: { id: "hidePants", name: "Hide Pants", category: "clothing", stack: 1, icon: "👖", color: "#6b3a1a", slot: "legs", armor: 6, warmth: 3 },
  hideBoots: { id: "hideBoots", name: "Hide Boots", category: "clothing", stack: 1, icon: "🥾", color: "#5a2a0a", slot: "feet", armor: 4, warmth: 2 },
  hideCap: { id: "hideCap", name: "Hide Cap", category: "clothing", stack: 1, icon: "🧢", color: "#7c4a2a", slot: "head", armor: 4, warmth: 2 },
  clothHood: { id: "clothHood", name: "Cloth Hood", category: "clothing", stack: 1, icon: "🧥", color: "#9a9a8a", slot: "head", armor: 2, warmth: 3 },
  winterCoat: { id: "winterCoat", name: "Winter Coat", category: "clothing", stack: 1, icon: "🧥", color: "#3a4a5a", slot: "chest", armor: 6, warmth: 10 },
  metalHelmet: { id: "metalHelmet", name: "Metal Helmet", category: "clothing", stack: 1, icon: "⛑️", color: "#6a6a6a", slot: "head", armor: 14, warmth: 1 },
  metalChest: { id: "metalChest", name: "Metal Chestplate", category: "clothing", stack: 1, icon: "🦺", color: "#5a5a5a", slot: "chest", armor: 22, warmth: 1 },

  // ---- New clothing (Phase 2) ----
  leatherJacket: { id: "leatherJacket", name: "Leather Jacket", category: "clothing", stack: 1, icon: "🧥", color: "#5a3a1a", slot: "chest", armor: 10, warmth: 6, rarity: "uncommon" },
  leatherPants: { id: "leatherPants", name: "Leather Pants", category: "clothing", stack: 1, icon: "👖", color: "#4a2a0a", slot: "legs", armor: 8, warmth: 5, rarity: "uncommon" },
  leatherBoots: { id: "leatherBoots", name: "Leather Boots", category: "clothing", stack: 1, icon: "🥾", color: "#3a1a00", slot: "feet", armor: 6, warmth: 4, rarity: "uncommon" },
  balaclava: { id: "balaclava", name: "Balaclava", category: "clothing", stack: 1, icon: "🎭", color: "#1a1a1a", slot: "head", armor: 3, warmth: 6, rarity: "uncommon" },
  beanie: { id: "beanie", name: "Wool Beanie", category: "clothing", stack: 1, icon: "🧢", color: "#3a3a4a", slot: "head", armor: 1, warmth: 5, rarity: "common" },
  tshirt: { id: "tshirt", name: "T-Shirt", category: "clothing", stack: 1, icon: "👕", color: "#5a8a5a", slot: "chest", armor: 1, warmth: 0, rarity: "common" },
  shorts: { id: "shorts", name: "Shorts", category: "clothing", stack: 1, icon: "🩳", color: "#4a5a6a", slot: "legs", armor: 1, warmth: -1, rarity: "common" },
  sandals: { id: "sandals", name: "Sandals", category: "clothing", stack: 1, icon: "🩴", color: "#8b5a3a", slot: "feet", armor: 1, warmth: -1, rarity: "common" },
  heavyArmor: { id: "heavyArmor", name: "Heavy Armor", category: "clothing", stack: 1, icon: "🦺", color: "#2a2a3a", slot: "chest", armor: 30, warmth: 2, rarity: "epic" },
  combatHelmet: { id: "combatHelmet", name: "Combat Helmet", category: "clothing", stack: 1, icon: "⛑️", color: "#2a3a2a", slot: "head", armor: 18, warmth: 2, rarity: "epic" },
  polarCoat: { id: "polarCoat", name: "Polar Expedition Coat", category: "clothing", stack: 1, icon: "🧥", color: "#d8e0e8", slot: "chest", armor: 8, warmth: 18, rarity: "legendary" },
  snowPants: { id: "snowPants", name: "Snow Pants", category: "clothing", stack: 1, icon: "👖", color: "#c8d0d8", slot: "legs", armor: 6, warmth: 12, rarity: "epic" },
  furHat: { id: "furHat", name: "Fur Hat", category: "clothing", stack: 1, icon: "🎩", color: "#3a2a1a", slot: "head", armor: 5, warmth: 10, rarity: "rare" },

  // ---- Misc ----
  torchItem: { id: "torchItem", name: "Torch", category: "misc", stack: 1, icon: "🔦", color: "#d97706", desc: "Handheld light.", light: true },
  bandage: { id: "bandage", name: "Bandage", category: "misc", stack: 10, icon: "🩹", color: "#e8e8e8", health: 25, desc: "Stop bleeding & restore HP." },
  antiRad: { id: "antiRad", name: "Painkillers", category: "misc", stack: 5, icon: "💊", color: "#e8e8e8", health: 15, desc: "Numbs pain." },
  medkit: { id: "medkit", name: "Medkit", category: "misc", stack: 3, icon: "🧰", color: "#e8e8e8", health: 60, desc: "Full medical kit.", rarity: "rare" },
  // ---- New tools ----
  fishingRod: { id: "fishingRod", name: "Fishing Rod", category: "tool", stack: 1, icon: "🎣", color: "#8b5a2b", damage: 4, range: 4, attackRate: 0.6, toolType: "none", toolPower: 0, weaponKind: "melee", desc: "Catch fish in water.", rarity: "uncommon" },
  woodAxe: { id: "woodAxe", name: "Wood Axe", category: "tool", stack: 1, icon: "🪓", color: "#8b5a2b", damage: 12, range: 2.8, attackRate: 0.55, toolType: "axe", toolPower: 1.2, weaponKind: "melee", desc: "Faster tree chopping than rock.", rarity: "common" },
  metalAxe: { id: "metalAxe", name: "Metal Axe", category: "tool", stack: 1, icon: "🪓", color: "#5a5a5a", damage: 22, range: 3.0, attackRate: 0.5, toolType: "axe", toolPower: 2.2, weaponKind: "melee", desc: "Forged axe.", rarity: "rare" },
  metalPickaxe: { id: "metalPickaxe", name: "Metal Pickaxe", category: "tool", stack: 1, icon: "⛏️", color: "#5a5a5a", damage: 18, range: 3.0, attackRate: 0.6, toolType: "pickaxe", toolPower: 3.0, weaponKind: "melee", desc: "Forged pickaxe.", rarity: "rare" },
  metalKnife: { id: "metalKnife", name: "Metal Knife", category: "weapon", stack: 1, icon: "🔪", color: "#aaaaaa", damage: 36, range: 2.5, attackRate: 0.4, toolType: "knife", toolPower: 1.4, weaponKind: "melee", desc: "Forged blade.", rarity: "rare" },
  sword: { id: "sword", name: "Sword", category: "weapon", stack: 1, icon: "⚔️", color: "#cccccc", damage: 55, range: 3.4, attackRate: 0.5, toolType: "knife", toolPower: 1.6, weaponKind: "melee", desc: "Forged longsword.", rarity: "epic" },
  bow: { id: "bow", name: "Hunting Bow", category: "weapon", stack: 1, icon: "🏹", color: "#7c4a2a", damage: 45, range: 50, attackRate: 0.9, toolType: "none", toolPower: 0, weaponKind: "ranged", ammoType: "arrow", desc: "Silent ranged weapon.", rarity: "uncommon" },
  arrow: { id: "arrow", name: "Arrow", category: "ammo", stack: 30, icon: "➹", color: "#8b5a2b" },
  shotgun: { id: "shotgun", name: "Shotgun", category: "weapon", stack: 1, icon: "🔫", color: "#2a1a1a", damage: 60, range: 18, attackRate: 0.9, toolType: "none", toolPower: 0, weaponKind: "ranged", ammoType: "shotgunAmmo", desc: "Close-range devastation.", rarity: "epic" },
  shotgunAmmo: { id: "shotgunAmmo", name: "Shotgun Shells", category: "ammo", stack: 24, icon: "🔴", color: "#c02020" },

  // ---- Phase 5: Boss drops + new tools + buff meals + new buildables ----
  alphaPelt: { id: "alphaPelt", name: "Alpha Pelt", category: "resource", stack: 10, icon: "🟤", color: "#3a2a1a", desc: "Thick fur from a direwolf alpha. Forge the Wolf Pelt Cloak.", rarity: "legendary" },
  alphaFang: { id: "alphaFang", name: "Alpha Fang", category: "resource", stack: 10, icon: "🦷", color: "#f0e8d0", desc: "Massive razor-sharp fang. Used to forge the Fang Sword.", rarity: "legendary" },
  wolfPeltCloak: { id: "wolfPeltCloak", name: "Wolf Pelt Cloak", category: "clothing", stack: 1, icon: "🧥", color: "#2a2a2a", slot: "chest", armor: 16, warmth: 14, rarity: "legendary", desc: "Cloak of the direwolf alpha. Intimidates wolves." },
  fangSword: { id: "fangSword", name: "Fang Sword", category: "weapon", stack: 1, icon: "⚔️", color: "#e8e0c8", damage: 75, range: 3.6, attackRate: 0.45, toolType: "knife", toolPower: 2.0, weaponKind: "melee", rarity: "legendary", desc: "Sword forged from an alpha fang. Bleeds targets." },
  cookingPot: { id: "cookingPot", name: "Cooking Pot", category: "tool", stack: 1, icon: "🍲", color: "#3a3a3a", desc: "Place at a campfire to cook complex buff meals.", rarity: "uncommon" },
  // ---- Deployables (snap to sockets or free-place) ----
  woodenDoor: { id: "woodenDoor", name: "Wooden Door", category: "furniture", stack: 5, icon: "🚪", color: "#6b4220", desc: "Snaps into Doorway frames. Can be locked.", rarity: "common" },
  storageBox: { id: "storageBox", name: "Small Storage Box", category: "furniture", stack: 3, icon: "📦", color: "#7c4a2a", desc: "Stores items. Place on foundations or floors.", rarity: "common" },
  barometer: { id: "barometer", name: "Barometer", category: "misc", stack: 1, icon: "🎛️", color: "#d4a017", desc: "Predicts the next weather change. Hold and check the prompt.", rarity: "rare" },
  // Buff meals — each grants a timed buff when consumed
  strengthStew: { id: "strengthStew", name: "Warrior Stew", category: "food", stack: 5, icon: "🍲", color: "#a02a1a", food: 35, water: 12, health: 8, desc: "Grants +10 damage for 90s. Cook in a pot at a campfire.", rarity: "rare" },
  swiftStew: { id: "swiftStew", name: "Hunter Stew", category: "food", stack: 5, icon: "🍲", color: "#2a8a4a", food: 30, water: 14, health: 6, desc: "Grants +30% move speed for 90s. Cook in a pot at a campfire.", rarity: "rare" },
  ironSkinStew: { id: "ironSkinStew", name: "Iron Skin Stew", category: "food", stack: 5, icon: "🍲", color: "#5a5a8a", food: 32, water: 10, health: 10, desc: "Grants +12 armor for 90s. Cook in a pot at a campfire.", rarity: "rare" },

  // ---- Phase 5: New buildables ----
  ramp: { id: "ramp", name: "Wood Ramp", category: "building", stack: 20, icon: "🛝", color: "#8b5a2b", desc: "Walkable incline for one story.", rarity: "common" },
  balcony: { id: "balcony", name: "Wood Balcony", category: "building", stack: 20, icon: "🪟", color: "#9b6a3b", desc: "Half-floor overhang with railing.", rarity: "uncommon" },
  triangularFloor: { id: "triangularFloor", name: "Triangular Floor", category: "building", stack: 20, icon: "📐", color: "#9b6a3b", desc: "Right-triangle floor tile for corners.", rarity: "uncommon" },
  raft: { id: "raft", name: "Wood Raft", category: "furniture", stack: 1, icon: "🛶", color: "#7c4a2a", desc: "Place on water to float. Stand on it to paddle.", rarity: "uncommon" },
  questBoard: { id: "questBoard", name: "Quest Board", category: "furniture", stack: 1, icon: "📋", color: "#7c4a2a", desc: "Pin up bounty notices. Walk near and press E to view quests.", rarity: "rare" },
  // Phase 6: new items
  generator: { id: "generator", name: "Generator", category: "furniture", stack: 1, icon: "⚡", color: "#5a5a5a", desc: "Powers electric lights within 15m. Requires fuel.", rarity: "rare" },
  wire: { id: "wire", name: "Wire", category: "building", stack: 20, icon: "🔌", color: "#8a8a3a", desc: "Connects generator to lights. Decorative.", rarity: "common" },
  electricLight: { id: "electricLight", name: "Electric Light", category: "furniture", stack: 5, icon: "💡", color: "#fff5d0", desc: "Bright ceiling light. Needs a generator within 15m.", rarity: "uncommon" },
  regenStew: { id: "regenStew", name: "Regenerative Stew", category: "food", stack: 5, icon: "🥣", color: "#2ecc71", desc: "Slowly regenerates health for 90 seconds.", food: 30, water: 15, health: 5, rarity: "uncommon" },
  nightVisionTea: { id: "nightVisionTea", name: "Night Vision Tea", category: "food", stack: 5, icon: "🍵", color: "#1abc9c", desc: "Enhances vision in darkness for 90 seconds.", food: 5, water: 25, rarity: "common" },

  // ---- Phase 7: Radiation zone items + Cooking pot recipes ----
  geigerCounter: { id: "geigerCounter", name: "Geiger Counter", category: "tool", stack: 1, icon: "📡", color: "#4a8a4a", desc: "Detects radiation zones. Hold to see readings.", rarity: "uncommon", toolType: "none", toolPower: 0, damage: 0, range: 0, attackRate: 0, weaponKind: "melee" },
  hazmatSuit: { id: "hazmatSuit", name: "Hazmat Suit", category: "clothing", stack: 1, icon: "🟡", color: "#c8c820", slot: "chest", armor: 5, warmth: -5, desc: "Full-body hazmat protection against radiation.", rarity: "rare" },
  radXPill: { id: "radXPill", name: "Rad-X Pill", category: "misc", stack: 5, icon: "💊", color: "#00cc00", health: -5, desc: "Reduces radiation by 40. Slight nausea." },
  mushroomStew: { id: "mushroomStew", name: "Mushroom Stew", category: "food", stack: 10, icon: "🍄", color: "#b5524a", food: 35, health: 10, water: 15, desc: "Hearty mushroom stew. Cook in a cooking pot.", rarity: "uncommon" },
  predatorStew: { id: "predatorStew", name: "Predator Stew", category: "food", stack: 10, icon: "🍖", color: "#8b1a1a", food: 45, health: 15, desc: "Strength-boosting predator meal. Cook in a cooking pot.", rarity: "rare" },
  oceanBowl: { id: "oceanBowl", name: "Ocean Bowl", category: "food", stack: 10, icon: "🐟", color: "#5a9bd4", food: 20, water: 35, health: 5, desc: "Fresh seafood bowl. Cook in a cooking pot.", rarity: "uncommon" },
  berryPie: { id: "berryPie", name: "Berry Pie", category: "food", stack: 10, icon: "🥧", color: "#7a3a8a", food: 30, water: 5, desc: "Warm berry pie. Cook in a cooking pot.", rarity: "common" },
  veggieSoup: { id: "veggieSoup", name: "Veggie Soup", category: "food", stack: 10, icon: "🥬", color: "#5a8a5a", food: 25, water: 20, health: 5, desc: "Garden vegetable soup. Cook in a cooking pot.", rarity: "common" },
};

export type ItemId = keyof typeof ITEMS;

export interface ItemStack {
  id: string;
  qty: number;
  durability?: number;
}

export function itemDef(id: string): ItemDef | undefined {
  return ITEMS[id];
}

// Items that can spawn in random world loot containers
export const LOOT_TABLES: Record<string, { id: string; chance: number; min: number; max: number }[]> = {
  shelf: [
    { id: "cannedBeans", chance: 0.35, min: 1, max: 2 },
    { id: "cannedTuna", chance: 0.25, min: 1, max: 2 },
    { id: "granolaBar", chance: 0.4, min: 1, max: 3 },
    { id: "cola", chance: 0.3, min: 1, max: 2 },
    { id: "waterBottle", chance: 0.25, min: 1, max: 1 },
    { id: "bandage", chance: 0.2, min: 1, max: 2 },
    { id: "cloth", chance: 0.3, min: 2, max: 8 },
    { id: "metalFrag", chance: 0.25, min: 3, max: 10 },
    { id: "rope", chance: 0.15, min: 1, max: 3 },
    { id: "pistolAmmo", chance: 0.1, min: 4, max: 12 },
    { id: "apple", chance: 0.18, min: 1, max: 3 },
    { id: "mushroom", chance: 0.2, min: 1, max: 3 },
    { id: "egg", chance: 0.1, min: 1, max: 2 },
    { id: "medkit", chance: 0.05, min: 1, max: 1 },
    { id: "antiRad", chance: 0.1, min: 1, max: 2 },
    { id: "radXPill", chance: 0.06, min: 1, max: 2 },
  ],
  wardrobe: [
    { id: "clothHood", chance: 0.15, min: 1, max: 1 },
    { id: "basicShirt", chance: 0.18, min: 1, max: 1 },
    { id: "basicTrousers", chance: 0.18, min: 1, max: 1 },
    { id: "hideVest", chance: 0.08, min: 1, max: 1 },
    { id: "hideBoots", chance: 0.08, min: 1, max: 1 },
    { id: "winterCoat", chance: 0.05, min: 1, max: 1 },
    { id: "beanie", chance: 0.1, min: 1, max: 1 },
    { id: "tshirt", chance: 0.12, min: 1, max: 1 },
    { id: "shorts", chance: 0.08, min: 1, max: 1 },
    { id: "leatherJacket", chance: 0.05, min: 1, max: 1 },
    { id: "balaclava", chance: 0.06, min: 1, max: 1 },
    { id: "hazmatSuit", chance: 0.02, min: 1, max: 1 },
    { id: "rope", chance: 0.2, min: 1, max: 3 },
    { id: "cloth", chance: 0.4, min: 3, max: 10 },
    { id: "bandage", chance: 0.15, min: 1, max: 2 },
  ],
  crate: [
    { id: "wood", chance: 0.5, min: 10, max: 40 },
    { id: "stone", chance: 0.4, min: 8, max: 25 },
    { id: "metalFrag", chance: 0.3, min: 5, max: 15 },
    { id: "rifleAmmo", chance: 0.08, min: 3, max: 8 },
    { id: "pistol", chance: 0.04, min: 1, max: 1 },
    { id: "rifle", chance: 0.02, min: 1, max: 1 },
    { id: "shotgun", chance: 0.015, min: 1, max: 1 },
    { id: "shotgunAmmo", chance: 0.06, min: 3, max: 8 },
    { id: "stonePickaxe", chance: 0.1, min: 1, max: 1 },
    { id: "hatchet", chance: 0.1, min: 1, max: 1 },
    { id: "fishingRod", chance: 0.08, min: 1, max: 1 },
    { id: "bow", chance: 0.05, min: 1, max: 1 },
    { id: "arrow", chance: 0.12, min: 3, max: 10 },
    { id: "coal", chance: 0.25, min: 3, max: 10 },
    { id: "sulfur", chance: 0.12, min: 2, max: 6 },
    { id: "wheatSeed", chance: 0.15, min: 2, max: 6 },
    { id: "pumpkinSeed", chance: 0.1, min: 1, max: 4 },
    { id: "goldNugget", chance: 0.04, min: 1, max: 2 },
    { id: "geigerCounter", chance: 0.03, min: 1, max: 1 },
  ],
};

// Random clothing set for spawn
export const SPAWN_CLOTHING_POOL = {
  head: ["", "", "", "clothHood", "hideCap", "beanie"],
  chest: ["basicShirt", "basicShirt", "basicShirt", "tshirt", "hideVest", "winterCoat"],
  legs: ["basicTrousers", "basicTrousers", "basicTrousers", "hidePants", "shorts"],
  feet: ["", "", "hideBoots", "sandals"],
};

export function randomSpawnClothing(rng: () => number): { head: string; chest: string; legs: string; feet: string } {
  const pick = (arr: string[]) => arr[Math.floor(rng() * arr.length)];
  return {
    head: pick(SPAWN_CLOTHING_POOL.head),
    chest: pick(SPAWN_CLOTHING_POOL.chest),
    legs: pick(SPAWN_CLOTHING_POOL.legs),
    feet: pick(SPAWN_CLOTHING_POOL.feet),
  };
}
