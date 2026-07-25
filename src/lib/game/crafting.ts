// Crafting recipes for the survival game.
import { ITEMS } from "./items";

export interface Recipe {
  id: string;
  out: { id: string; qty: number };
  cost: { id: string; qty: number }[];
  station?: "inventory" | "workbench" | "furnace" | "campfire" | "anvil" | "cookingPot";
  category: "weapons" | "tools" | "building" | "furniture" | "clothing" | "food" | "resources";
  name?: string;
  desc?: string;
}

export const RECIPES: Recipe[] = [
  // ---- Weapons ----
  { id: "r_woodSpear", out: { id: "woodSpear", qty: 1 }, cost: [{ id: "wood", qty: 12 }], station: "inventory", category: "weapons" },
  { id: "r_stoneSpear", out: { id: "stoneSpear", qty: 1 }, cost: [{ id: "wood", qty: 12 }, { id: "stone", qty: 10 }], station: "inventory", category: "weapons" },
  { id: "r_woodKnife", out: { id: "woodKnife", qty: 1 }, cost: [{ id: "wood", qty: 8 }], station: "inventory", category: "weapons" },
  { id: "r_stoneKnife", out: { id: "stoneKnife", qty: 1 }, cost: [{ id: "wood", qty: 6 }, { id: "stone", qty: 8 }], station: "inventory", category: "weapons" },
  { id: "r_hatchet", out: { id: "hatchet", qty: 1 }, cost: [{ id: "wood", qty: 10 }, { id: "stone", qty: 12 }], station: "inventory", category: "tools" },
  { id: "r_stonePickaxe", out: { id: "stonePickaxe", qty: 1 }, cost: [{ id: "wood", qty: 10 }, { id: "stone", qty: 14 }], station: "inventory", category: "tools" },

  // ---- Rust-style Building Tools ----
  { id: "r_buildingPlan", out: { id: "buildingPlan", qty: 1 }, cost: [{ id: "wood", qty: 20 }], station: "inventory", category: "tools" },
  { id: "r_hammer", out: { id: "hammer", qty: 1 }, cost: [{ id: "wood", qty: 15 }, { id: "stone", qty: 10 }], station: "inventory", category: "tools" },
  // ---- Deployables (crafted items, not structural frames) ----
  { id: "r_woodenDoor", out: { id: "woodenDoor", qty: 1 }, cost: [{ id: "wood", qty: 30 }, { id: "metalFrag", qty: 2 }], station: "inventory", category: "furniture" },
  { id: "r_storageBox", out: { id: "storageBox", qty: 1 }, cost: [{ id: "wood", qty: 50 }], station: "inventory", category: "furniture" },

  // ---- Furniture ----
  { id: "r_campfire", out: { id: "campfire", qty: 1 }, cost: [{ id: "wood", qty: 8 }, { id: "stone", qty: 5 }], station: "inventory", category: "furniture" },
  { id: "r_bed", out: { id: "bed", qty: 1 }, cost: [{ id: "wood", qty: 16 }, { id: "cloth", qty: 4 }], station: "inventory", category: "furniture" },
  { id: "r_woodChest", out: { id: "woodChest", qty: 1 }, cost: [{ id: "wood", qty: 20 }], station: "inventory", category: "furniture" },
  { id: "r_torch", out: { id: "torch", qty: 1 }, cost: [{ id: "wood", qty: 4 }, { id: "fat", qty: 1 }], station: "inventory", category: "furniture" },
  { id: "r_torchItem", out: { id: "torchItem", qty: 1 }, cost: [{ id: "wood", qty: 3 }, { id: "fat", qty: 1 }], station: "inventory", category: "tools" },
  { id: "r_workbench", out: { id: "workbench", qty: 1 }, cost: [{ id: "wood", qty: 30 }, { id: "stone", qty: 10 }], station: "inventory", category: "furniture" },
  { id: "r_furnace", out: { id: "furnace", qty: 1 }, cost: [{ id: "stone", qty: 40 }, { id: "wood", qty: 10 }], station: "workbench", category: "furniture" },

  // ---- Clothing ----
  { id: "r_hideVest", out: { id: "hideVest", qty: 1 }, cost: [{ id: "hide", qty: 8 }, { id: "rope", qty: 2 }], station: "inventory", category: "clothing" },
  { id: "r_hidePants", out: { id: "hidePants", qty: 1 }, cost: [{ id: "hide", qty: 8 }, { id: "rope", qty: 2 }], station: "inventory", category: "clothing" },
  { id: "r_hideBoots", out: { id: "hideBoots", qty: 1 }, cost: [{ id: "hide", qty: 6 }, { id: "rope", qty: 1 }], station: "inventory", category: "clothing" },
  { id: "r_hideCap", out: { id: "hideCap", qty: 1 }, cost: [{ id: "hide", qty: 4 }, { id: "rope", qty: 1 }], station: "inventory", category: "clothing" },
  { id: "r_clothHood", out: { id: "clothHood", qty: 1 }, cost: [{ id: "cloth", qty: 8 }], station: "inventory", category: "clothing" },
  { id: "r_winterCoat", out: { id: "winterCoat", qty: 1 }, cost: [{ id: "cloth", qty: 16 }, { id: "hide", qty: 6 }, { id: "rope", qty: 2 }], station: "workbench", category: "clothing" },
  { id: "r_metalHelmet", out: { id: "metalHelmet", qty: 1 }, cost: [{ id: "metalFrag", qty: 20 }], station: "furnace", category: "clothing" },
  { id: "r_metalChest", out: { id: "metalChest", qty: 1 }, cost: [{ id: "metalFrag", qty: 40 }], station: "furnace", category: "clothing" },

  // ---- Resources / processing ----
  { id: "r_rope", out: { id: "rope", qty: 1 }, cost: [{ id: "fiber", qty: 6 }], station: "inventory", category: "resources" },
  { id: "r_leather", out: { id: "leather", qty: 1 }, cost: [{ id: "hide", qty: 2 }], station: "inventory", category: "resources" },
  { id: "r_cloth", out: { id: "cloth", qty: 1 }, cost: [{ id: "fiber", qty: 8 }], station: "inventory", category: "resources" },

  // ---- Food ----
  { id: "r_cookedMeat", out: { id: "cookedMeat", qty: 1 }, cost: [{ id: "rawMeat", qty: 1 }], station: "campfire", category: "food" },

  // ---- Late game ----
  { id: "r_pistol", out: { id: "pistol", qty: 1 }, cost: [{ id: "metalFrag", qty: 60 }, { id: "wood", qty: 10 }], station: "workbench", category: "weapons" },
  { id: "r_rifle", out: { id: "rifle", qty: 1 }, cost: [{ id: "metalFrag", qty: 120 }, { id: "wood", qty: 20 }], station: "workbench", category: "weapons" },
  { id: "r_shotgun", out: { id: "shotgun", qty: 1 }, cost: [{ id: "metalFrag", qty: 90 }, { id: "wood", qty: 15 }], station: "workbench", category: "weapons" },
  { id: "r_bow", out: { id: "bow", qty: 1 }, cost: [{ id: "wood", qty: 20 }, { id: "rope", qty: 3 }], station: "inventory", category: "weapons" },
  { id: "r_arrow", out: { id: "arrow", qty: 5 }, cost: [{ id: "wood", qty: 4 }, { id: "stone", qty: 2 }], station: "inventory", category: "resources" },
  { id: "r_pistolAmmo", out: { id: "pistolAmmo", qty: 10 }, cost: [{ id: "metalFrag", qty: 8 }, { id: "coal", qty: 2 }], station: "workbench", category: "resources" },
  { id: "r_rifleAmmo", out: { id: "rifleAmmo", qty: 8 }, cost: [{ id: "metalFrag", qty: 12 }, { id: "coal", qty: 4 }], station: "workbench", category: "resources" },
  { id: "r_shotgunAmmo", out: { id: "shotgunAmmo", qty: 6 }, cost: [{ id: "metalFrag", qty: 12 }, { id: "coal", qty: 4 }], station: "workbench", category: "resources" },

  // ---- Smelting (furnace) ----
  { id: "r_metalFrag", out: { id: "metalFrag", qty: 2 }, cost: [{ id: "ironOre", qty: 1 }, { id: "coal", qty: 1 }], station: "furnace", category: "resources" },
  { id: "r_glass", out: { id: "glass", qty: 1 }, cost: [{ id: "stone", qty: 4 }, { id: "coal", qty: 1 }], station: "furnace", category: "resources" },

  // ---- Anvil forged weapons/tools ----
  { id: "r_metalAxe", out: { id: "metalAxe", qty: 1 }, cost: [{ id: "metalFrag", qty: 30 }, { id: "wood", qty: 8 }], station: "inventory", category: "tools" },
  { id: "r_metalPickaxe", out: { id: "metalPickaxe", qty: 1 }, cost: [{ id: "metalFrag", qty: 35 }, { id: "wood", qty: 8 }], station: "inventory", category: "tools" },
  { id: "r_metalKnife", out: { id: "metalKnife", qty: 1 }, cost: [{ id: "metalFrag", qty: 20 }, { id: "wood", qty: 4 }], station: "inventory", category: "weapons" },
  { id: "r_sword", out: { id: "sword", qty: 1 }, cost: [{ id: "metalFrag", qty: 50 }, { id: "leather", qty: 2 }, { id: "wood", qty: 6 }], station: "inventory", category: "weapons" },
  { id: "r_heavyArmor", out: { id: "heavyArmor", qty: 1 }, cost: [{ id: "metalFrag", qty: 80 }, { id: "leather", qty: 6 }], station: "inventory", category: "clothing" },
  { id: "r_combatHelmet", out: { id: "combatHelmet", qty: 1 }, cost: [{ id: "metalFrag", qty: 50 }, { id: "cloth", qty: 4 }], station: "inventory", category: "clothing" },

  // ---- Legacy building parts removed (Rust system uses Building Plan) ----

  // ---- Phase 4: legacy furniture only (building parts removed) ----

  // ---- New furniture ----
  { id: "r_anvil", out: { id: "anvil", qty: 1 }, cost: [{ id: "metalFrag", qty: 40 }, { id: "stone", qty: 10 }], station: "workbench", category: "furniture" },
  { id: "r_dryingRack", out: { id: "dryingRack", qty: 1 }, cost: [{ id: "wood", qty: 14 }, { id: "rope", qty: 2 }], station: "inventory", category: "furniture" },
  { id: "r_farmingPlot", out: { id: "farmingPlot", qty: 1 }, cost: [{ id: "wood", qty: 8 }, { id: "fiber", qty: 8 }], station: "inventory", category: "furniture" },
  { id: "r_rainBarrel", out: { id: "rainBarrel", qty: 1 }, cost: [{ id: "wood", qty: 12 }, { id: "metalFrag", qty: 4 }], station: "inventory", category: "furniture" },
  { id: "r_signPost", out: { id: "signPost", qty: 1 }, cost: [{ id: "wood", qty: 6 }], station: "inventory", category: "furniture" },
  { id: "r_scarecrow", out: { id: "scarecrow", qty: 1 }, cost: [{ id: "wood", qty: 10 }, { id: "cloth", qty: 4 }, { id: "fiber", qty: 4 }], station: "inventory", category: "furniture" },

  // ---- Phase 4: beekeeping ----
  { id: "r_beehive", out: { id: "beehive", qty: 1 }, cost: [{ id: "wood", qty: 4 }, { id: "fiber", qty: 2 }], station: "workbench", category: "furniture" },

  // ---- New clothing ----
  { id: "r_leatherJacket", out: { id: "leatherJacket", qty: 1 }, cost: [{ id: "leather", qty: 10 }, { id: "rope", qty: 2 }], station: "inventory", category: "clothing" },
  { id: "r_leatherPants", out: { id: "leatherPants", qty: 1 }, cost: [{ id: "leather", qty: 10 }, { id: "rope", qty: 2 }], station: "inventory", category: "clothing" },
  { id: "r_leatherBoots", out: { id: "leatherBoots", qty: 1 }, cost: [{ id: "leather", qty: 8 }, { id: "rope", qty: 1 }], station: "inventory", category: "clothing" },
  { id: "r_balaclava", out: { id: "balaclava", qty: 1 }, cost: [{ id: "cloth", qty: 6 }, { id: "rope", qty: 1 }], station: "inventory", category: "clothing" },
  { id: "r_beanie", out: { id: "beanie", qty: 1 }, cost: [{ id: "cloth", qty: 4 }], station: "inventory", category: "clothing" },
  { id: "r_furHat", out: { id: "furHat", qty: 1 }, cost: [{ id: "hide", qty: 6 }, { id: "leather", qty: 2 }], station: "inventory", category: "clothing" },
  { id: "r_polarCoat", out: { id: "polarCoat", qty: 1 }, cost: [{ id: "hide", qty: 20 }, { id: "cloth", qty: 10 }, { id: "leather", qty: 4 }], station: "workbench", category: "clothing" },
  { id: "r_snowPants", out: { id: "snowPants", qty: 1 }, cost: [{ id: "hide", qty: 14 }, { id: "cloth", qty: 8 }], station: "workbench", category: "clothing" },

  // ---- New tools ----
  { id: "r_woodAxe", out: { id: "woodAxe", qty: 1 }, cost: [{ id: "wood", qty: 8 }, { id: "stone", qty: 6 }], station: "inventory", category: "tools" },
  { id: "r_fishingRod", out: { id: "fishingRod", qty: 1 }, cost: [{ id: "wood", qty: 6 }, { id: "rope", qty: 2 }, { id: "fiber", qty: 4 }], station: "inventory", category: "tools" },
  { id: "r_medkit", out: { id: "medkit", qty: 1 }, cost: [{ id: "cloth", qty: 8 }, { id: "leather", qty: 2 }, { id: "fat", qty: 1 }], station: "workbench", category: "resources" },

  // ---- Food processing ----
  { id: "r_cookedFish", out: { id: "cookedFish", qty: 1 }, cost: [{ id: "rawFish", qty: 1 }], station: "campfire", category: "food" },
  { id: "r_meatJerky", out: { id: "meatJerky", qty: 1 }, cost: [{ id: "rawMeat", qty: 2 }, { id: "fat", qty: 1 }], station: "inventory", category: "food" },
  { id: "r_flour", out: { id: "flour", qty: 2 }, cost: [{ id: "wheat", qty: 4 }], station: "workbench", category: "resources" },
  { id: "r_bread", out: { id: "bread", qty: 1 }, cost: [{ id: "flour", qty: 2 }, { id: "waterBottle", qty: 1 }], station: "campfire", category: "food" },
  { id: "r_cookedPumpkin", out: { id: "cookedPumpkin", qty: 1 }, cost: [{ id: "pumpkin", qty: 1 }], station: "campfire", category: "food" },
  { id: "r_cookedEgg", out: { id: "cookedEgg", qty: 1 }, cost: [{ id: "egg", qty: 1 }], station: "campfire", category: "food" },

  // ---- Phase 4: new cooking recipes ----
  { id: "r_stew", out: { id: "stew", qty: 1 }, cost: [{ id: "cookedMeat", qty: 1 }, { id: "berries", qty: 2 }, { id: "waterBottle", qty: 1 }], station: "campfire", category: "food" },
  { id: "r_sandwich", out: { id: "sandwich", qty: 1 }, cost: [{ id: "bread", qty: 1 }, { id: "cookedMeat", qty: 1 }], station: "inventory", category: "food" },
  { id: "r_salad", out: { id: "salad", qty: 1 }, cost: [{ id: "berries", qty: 3 }, { id: "apple", qty: 1 }], station: "inventory", category: "food" },

  // ---- Phase 5: legacy buildables removed (Rust system) ----
  { id: "r_raft", out: { id: "raft", qty: 1 }, cost: [{ id: "wood", qty: 25 }, { id: "rope", qty: 4 }, { id: "cloth", qty: 2 }], station: "workbench", category: "furniture" },
  { id: "r_questBoard", out: { id: "questBoard", qty: 1 }, cost: [{ id: "wood", qty: 12 }, { id: "cloth", qty: 2 }], station: "workbench", category: "furniture" },

  // ---- Phase 5: cooking pot + barometer + buff meals ----
  { id: "r_cookingPot", out: { id: "cookingPot", qty: 1 }, cost: [{ id: "metalFrag", qty: 8 }, { id: "leather", qty: 1 }], station: "workbench", category: "tools" },
  { id: "r_barometer", out: { id: "barometer", qty: 1 }, cost: [{ id: "metalFrag", qty: 6 }, { id: "glass", qty: 1 }, { id: "leather", qty: 1 }], station: "workbench", category: "resources" },
  { id: "r_strengthStew", out: { id: "strengthStew", qty: 1 }, cost: [{ id: "cookedMeat", qty: 2 }, { id: "fat", qty: 1 }, { id: "salt", qty: 1 }], station: "campfire", category: "food" },
  { id: "r_swiftStew", out: { id: "swiftStew", qty: 1 }, cost: [{ id: "cookedFish", qty: 1 }, { id: "mushroom", qty: 2 }, { id: "berries", qty: 2 }], station: "campfire", category: "food" },
  { id: "r_ironSkinStew", out: { id: "ironSkinStew", qty: 1 }, cost: [{ id: "cookedPumpkin", qty: 1 }, { id: "bone", qty: 3 }, { id: "waterBottle", qty: 1 }], station: "campfire", category: "food" },

  // ---- Phase 5: legendary boss-drop gear ----
  { id: "r_wolfPeltCloak", out: { id: "wolfPeltCloak", qty: 1 }, cost: [{ id: "alphaPelt", qty: 2 }, { id: "leather", qty: 4 }, { id: "rope", qty: 2 }], station: "workbench", category: "clothing" },
  { id: "r_fangSword", out: { id: "fangSword", qty: 1 }, cost: [{ id: "alphaFang", qty: 2 }, { id: "metalFrag", qty: 30 }, { id: "leather", qty: 3 }], station: "anvil", category: "weapons" },

  // ---- Phase 6: electricity + new buff meals ----
  { id: "r_generator", out: { id: "generator", qty: 1 }, cost: [{ id: "ironOre", qty: 8 }, { id: "cloth", qty: 4 }, { id: "rope", qty: 2 }], station: "workbench", category: "furniture" },
  { id: "r_wire", out: { id: "wire", qty: 3 }, cost: [{ id: "ironOre", qty: 2 }, { id: "cloth", qty: 1 }], station: "workbench", category: "building" },
  { id: "r_electricLight", out: { id: "electricLight", qty: 1 }, cost: [{ id: "ironOre", qty: 2 }, { id: "glass", qty: 1 }], station: "workbench", category: "furniture" },
  { id: "r_regenStew", out: { id: "regenStew", qty: 1 }, cost: [{ id: "cookedMeat", qty: 1 }, { id: "berries", qty: 1 }, { id: "honey", qty: 1 }], station: "campfire", category: "food" },
  { id: "r_nightVisionTea", out: { id: "nightVisionTea", qty: 1 }, cost: [{ id: "waterBottle", qty: 1 }, { id: "honey", qty: 1 }, { id: "fiber", qty: 1 }], station: "campfire", category: "food" },

  // ---- Phase 7: Radiation zone items ----
  { id: "r_geigerCounter", out: { id: "geigerCounter", qty: 1 }, cost: [{ id: "metalFrag", qty: 5 }, { id: "ironOre", qty: 3 }, { id: "glass", qty: 2 }], station: "workbench", category: "tools" },
  { id: "r_hazmatSuit", out: { id: "hazmatSuit", qty: 1 }, cost: [{ id: "cloth", qty: 10 }, { id: "metalFrag", qty: 5 }, { id: "glass", qty: 3 }, { id: "fiber", qty: 4 }], station: "workbench", category: "clothing" },
  { id: "r_radXPill", out: { id: "radXPill", qty: 1 }, cost: [{ id: "fiber", qty: 2 }, { id: "mushroom", qty: 1 }, { id: "coal", qty: 1 }], station: "workbench", category: "resources" },

  // ---- Phase 7: Cooking pot multi-ingredient recipes ----
  { id: "r_mushroomStew", out: { id: "mushroomStew", qty: 1 }, cost: [{ id: "mushroom", qty: 2 }, { id: "berries", qty: 1 }, { id: "waterBottle", qty: 1 }], station: "cookingPot", category: "food" },
  { id: "r_predatorStew", out: { id: "predatorStew", qty: 1 }, cost: [{ id: "cookedMeat", qty: 1 }, { id: "mushroom", qty: 1 }, { id: "honey", qty: 1 }], station: "cookingPot", category: "food" },
  { id: "r_oceanBowl", out: { id: "oceanBowl", qty: 1 }, cost: [{ id: "cookedFish", qty: 1 }, { id: "salt", qty: 1 }, { id: "fiber", qty: 1 }], station: "cookingPot", category: "food" },
  { id: "r_berryPie", out: { id: "berryPie", qty: 1 }, cost: [{ id: "berries", qty: 2 }, { id: "wheat", qty: 1 }, { id: "fat", qty: 1 }], station: "cookingPot", category: "food" },
  { id: "r_veggieSoup", out: { id: "veggieSoup", qty: 1 }, cost: [{ id: "mushroom", qty: 1 }, { id: "berries", qty: 1 }, { id: "waterBottle", qty: 1 }, { id: "fiber", qty: 1 }], station: "cookingPot", category: "food" },
];

export function canCraft(recipe: Recipe, inv: { id: string; qty: number }[]): boolean {
  return recipe.cost.every((c) => {
    const have = inv.find((i) => i.id === c.id)?.qty ?? 0;
    return have >= c.qty;
  });
}

export function craft(recipe: Recipe, inv: { id: string; qty: number }[]): { id: string; qty: number }[] {
  if (!canCraft(recipe, inv)) return inv;
  const newInv = inv.map((i) => ({ ...i }));
  for (const c of recipe.cost) {
    const stack = newInv.find((i) => i.id === c.id);
    if (stack) {
      stack.qty -= c.qty;
      if (stack.qty <= 0) {
        const idx = newInv.indexOf(stack);
        newInv.splice(idx, 1);
      }
    }
  }
  const existing = newInv.find((i) => i.id === recipe.out.id);
  if (existing) existing.qty += recipe.out.qty;
  else newInv.push({ id: recipe.out.id, qty: recipe.out.qty });
  return newInv;
}

export const CRAFT_CATEGORIES: { id: Recipe["category"]; label: string }[] = [
  { id: "weapons", label: "Weapons" },
  { id: "tools", label: "Tools" },
  { id: "clothing", label: "Clothing" },
  { id: "building", label: "Building" },
  { id: "furniture", label: "Furniture" },
  { id: "food", label: "Food" },
  { id: "resources", label: "Resources" },
];

export function recipeStationAvailable(
  station: Recipe["station"] | undefined,
  near: { inventory: boolean; workbench: boolean; furnace: boolean; campfire: boolean; anvil?: boolean; cookingPot?: boolean }
): boolean {
  if (!station) return true;
  if (station === "anvil") return !!near.anvil;
  if (station === "cookingPot") return !!near.cookingPot;
  return near[station as keyof typeof near] as boolean;
}

export const STATION_LABEL: Record<NonNullable<Recipe["station"]>, string> = {
  inventory: "Inv",
  workbench: "Bench",
  furnace: "Furnace",
  campfire: "Fire",
  anvil: "Anvil",
  cookingPot: "Pot",
};

export function itemKnown(id: string): boolean {
  return id in ITEMS;
}
