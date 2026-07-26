// Rust-like building system: socket-based snapping, merged geometries,
// upgrade tiers, radial menu definitions.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ===== Constants =====
export const GRID = 3;
export const WALL_H = 3;
const WALL_THICKNESS = 0.25; // wall thickness in meters

// ===== Types =====
export type BuildPieceType =
  | "squareFoundation"
  | "triangleFoundation"
  | "wall"
  | "halfWall"
  | "lowWall"
  | "doorway"
  | "windowFrame"
  | "wallFrame"
  | "squareFloor"
  | "triangleFloor"
  | "floorFrame"
  | "uStairs"
  | "lStairs"
  | "straightStairs"
  | "roof";

export type TierType = "twig" | "wood" | "stone" | "metal" | "armored";
export type PieceCategory = "foundation" | "wall" | "floor" | "stairs" | "roof";

// ===== Deployable Types =====
export type DeployableType = "woodenDoor" | "storageBox" | "campfire" | "furnace" | "workbench";

export interface DeployableDef {
  type: DeployableType;
  category: "door" | "storage" | "utility";
  w: number; // width in meters
  h: number; // height in meters
  d: number; // depth in meters
  snapToSocket: boolean; // true for doors (snap to doorway), false for free-place
}

export const DEPLOYABLE_DEFS: Record<DeployableType, DeployableDef> = {
  woodenDoor: { type: "woodenDoor", category: "door", w: 1.8, h: 2.2, d: 0.08, snapToSocket: true },
  storageBox: { type: "storageBox", category: "storage", w: 1.2, h: 0.9, d: 0.7, snapToSocket: false },
  campfire: { type: "campfire", category: "utility", w: 1.2, h: 0.4, d: 1.2, snapToSocket: false },
  furnace: { type: "furnace", category: "utility", w: 1.0, h: 1.2, d: 1.0, snapToSocket: false },
  workbench: { type: "workbench", category: "utility", w: 2.2, h: 1.0, d: 1.0, snapToSocket: false },
};

export interface PlacedDeployable {
  id: number;
  type: DeployableType;
  worldX: number;
  worldY: number;
  worldZ: number;
  rotation: number; // 0,1,2,3
  attachedToBuildId: number | null; // null for free-placed, build id for doors
}

export interface PlacedBuildV2 {
  id: number;
  pieceType: BuildPieceType;
  tier: TierType;
  hp: number;
  worldX: number;
  worldY: number;
  worldZ: number;
  rotation: number; // 0,1,2,3 quarter turns
}

// ===== Piece Definitions =====
export interface BuildPieceDef {
  type: BuildPieceType;
  category: PieceCategory;
  gridW: number; // width in grid units
  gridD: number; // depth in grid units
  height: number; // height in meters
  woodCost: number; // wood to place as twig
  displayName: string; // human-readable name
  description: string; // short description for radial menu
  resourceType: string; // primary resource item id (e.g. "wood")
  upgradeCosts: { wood: number; stone: number; metalFrag: number; armored: number };
}

export const BUILD_PIECE_DEFS: Record<BuildPieceType, BuildPieceDef> = {
  squareFoundation: { type: "squareFoundation", category: "foundation", gridW: 1, gridD: 1, height: 0.3, woodCost: 50, displayName: "Square Foundation", description: "Create a stable foundation for your structure", resourceType: "wood", upgradeCosts: { wood: 0, stone: 300, metalFrag: 400, armored: 500 } },
  triangleFoundation: { type: "triangleFoundation", category: "foundation", gridW: 1, gridD: 1, height: 0.3, woodCost: 25, displayName: "Triangle Foundation", description: "A triangular foundation to create angled base designs", resourceType: "wood", upgradeCosts: { wood: 0, stone: 225, metalFrag: 300, armored: 375 } },
  wall: { type: "wall", category: "wall", gridW: 1, gridD: 1, height: WALL_H, woodCost: 50, displayName: "Wall", description: "Secure your base by enclosing it in walls", resourceType: "wood", upgradeCosts: { wood: 0, stone: 200, metalFrag: 300, armored: 400 } },
  halfWall: { type: "halfWall", category: "wall", gridW: 1, gridD: 1, height: WALL_H * 0.5, woodCost: 25, displayName: "Half-Wall", description: "A half-height wall for varied vertical building", resourceType: "wood", upgradeCosts: { wood: 0, stone: 150, metalFrag: 200, armored: 275 } },
  lowWall: { type: "lowWall", category: "wall", gridW: 1, gridD: 1, height: WALL_H * 0.33, woodCost: 15, displayName: "Low Wall", description: "A low wall for cover or fencing", resourceType: "wood", upgradeCosts: { wood: 0, stone: 100, metalFrag: 150, armored: 200 } },
  doorway: { type: "doorway", category: "wall", gridW: 1, gridD: 1, height: WALL_H, woodCost: 50, displayName: "Doorway", description: "A wall with an opening for a door", resourceType: "wood", upgradeCosts: { wood: 0, stone: 200, metalFrag: 300, armored: 400 } },
  windowFrame: { type: "windowFrame", category: "wall", gridW: 1, gridD: 1, height: WALL_H, woodCost: 50, displayName: "Window Frame", description: "A wall with an opening for a window", resourceType: "wood", upgradeCosts: { wood: 0, stone: 200, metalFrag: 300, armored: 400 } },
  wallFrame: { type: "wallFrame", category: "wall", gridW: 1, gridD: 1, height: WALL_H, woodCost: 50, displayName: "Wall Frame", description: "A frame for double doors or garage doors", resourceType: "wood", upgradeCosts: { wood: 0, stone: 200, metalFrag: 300, armored: 400 } },
  squareFloor: { type: "squareFloor", category: "floor", gridW: 1, gridD: 1, height: 0.2, woodCost: 50, displayName: "Square Floor", description: "Create a floor or ceiling for your base", resourceType: "wood", upgradeCosts: { wood: 0, stone: 200, metalFrag: 300, armored: 400 } },
  triangleFloor: { type: "triangleFloor", category: "floor", gridW: 1, gridD: 1, height: 0.2, woodCost: 25, displayName: "Triangle Floor", description: "A triangular floor or ceiling piece", resourceType: "wood", upgradeCosts: { wood: 0, stone: 150, metalFrag: 200, armored: 275 } },
  floorFrame: { type: "floorFrame", category: "floor", gridW: 1, gridD: 1, height: 0.2, woodCost: 50, displayName: "Floor Frame", description: "A floor frame for ladder hatches", resourceType: "wood", upgradeCosts: { wood: 0, stone: 200, metalFrag: 300, armored: 400 } },
  uStairs: { type: "uStairs", category: "stairs", gridW: 1, gridD: 1, height: WALL_H, woodCost: 50, displayName: "U-Shaped Stairs", description: "A U-shaped staircase for vertical access", resourceType: "wood", upgradeCosts: { wood: 0, stone: 300, metalFrag: 400, armored: 500 } },
  lStairs: { type: "lStairs", category: "stairs", gridW: 1, gridD: 1, height: WALL_H, woodCost: 50, displayName: "L-Shaped Stairs", description: "An L-shaped staircase for vertical access", resourceType: "wood", upgradeCosts: { wood: 0, stone: 300, metalFrag: 400, armored: 500 } },
  straightStairs: { type: "straightStairs", category: "stairs", gridW: 1, gridD: 1, height: WALL_H, woodCost: 50, displayName: "Straight Stairs", description: "A straight staircase for vertical access", resourceType: "wood", upgradeCosts: { wood: 0, stone: 300, metalFrag: 400, armored: 500 } },
  roof: { type: "roof", category: "roof", gridW: 1, gridD: 1, height: 1.8, woodCost: 50, displayName: "Roof", description: "A pitched roof to protect your base from above", resourceType: "wood", upgradeCosts: { wood: 0, stone: 200, metalFrag: 300, armored: 400 } },
};

// ===== Tier Visuals =====
export interface TierVisual {
  color: number;
  roughness: number;
  metalness: number;
  opacity: number;
  flatShading: boolean;
}

export const TIER_VISUALS: Record<TierType, TierVisual> = {
  twig:  { color: 0x8b6a3b, roughness: 1.0, metalness: 0.0, opacity: 1.0, flatShading: false },
  wood:  { color: 0x6b4a2b, roughness: 0.9, metalness: 0.0, opacity: 1.0, flatShading: false },
  stone: { color: 0x888888, roughness: 1.0, metalness: 0.0, opacity: 1.0, flatShading: true },
  metal: { color: 0x8a8a8a, roughness: 0.5, metalness: 0.6, opacity: 1.0, flatShading: false },
  armored: { color: 0x3a3a3a, roughness: 0.3, metalness: 0.8, opacity: 1.0, flatShading: false },
};

// Tier thickness multipliers
const TIER_SCALE: Record<TierType, number> = {
  twig: 0.85,
  wood: 1.0,
  stone: 1.08,
  metal: 1.0,
  armored: 1.12,
};

// HP per tier
export const TIER_HP: Record<TierType, number> = {
  twig: 100,
  wood: 250,
  stone: 500,
  metal: 750,
  armored: 1000,
};

// ===== Upgrade costs (from current tier to next) =====
export const UPGRADE_COSTS: Record<TierType, { id: string; qty: number } | null> = {
  twig: null,
  wood: { id: "wood", qty: 200 },
  stone: { id: "stone", qty: 300 },
  metal: { id: "metalFrag", qty: 400 },
  armored: { id: "metalFrag", qty: 500 },
};

// ===== Radial Menu Items =====
export interface RadialMenuItem {
  id: string;
  label: string;
  icon: string;
  data: string;
  description?: string; // optional description for center display
  resourceCost?: { id: string; qty: number; label: string }; // optional resource cost for center display
}

const SVG = {
  sqFoundation: "M2,22 L2,2 L22,2 L22,22 Z",
  triFoundation: "M12,2 L22,22 L2,22 Z",
  wall: "M4,2 L20,2 L20,22 L4,22 Z",
  halfWall: "M4,10 L20,10 L20,22 L4,22 Z",
  lowWall: "M4,15 L20,15 L20,22 L4,22 Z",
  doorway: "M4,2 L20,2 L20,22 L4,22 Z M7,2 L7,14 L17,14 L17,2",
  windowFrame: "M4,2 L20,2 L20,22 L4,22 Z M7,4 L17,4 L17,12 L7,12 Z",
  wallFrame: "M4,2 L20,2 L20,22 L4,22 Z M6,4 L18,4 L18,20 L6,20 Z",
  sqFloor: "M2,12 L2,2 L22,2 L22,22 L2,22 Z",
  triFloor: "M12,2 L22,22 L2,22 Z",
  floorFrame: "M2,2 L22,2 L22,22 L2,22 Z M6,6 L18,6 L18,18 L6,18 Z",
  uStairs: "M5,20 L5,6 L10,6 L10,14 L15,14 L15,6 L20,6 L20,20 Z",
  lStairs: "M5,20 L5,6 L10,6 L10,10 L20,10 L20,14 L15,14 L15,20 Z",
  straightStairs: "M3,20 L3,16 L7,12 L11,8 L15,4 L19,4 L19,8 L15,12 L11,16 L7,20 Z",
  roof: "M2,18 L12,2 L22,18 Z",
  upgrade: "M12,4 L12,20 M6,10 L12,4 L18,10",
  repair: "M8,18 L4,18 L4,14 M16,18 L20,18 L20,14 M8,10 L8,6 L12,2 L16,6 L16,10",
  rotate: "M18,8 A8,8 0 1,0 16,4",
  demolish: "M6,6 L18,18 M18,6 L6,18",
  wood: "M12,20 L12,8 M8,8 L12,4 L16,8 M6,12 L18,12",
  stone: "M8,20 L12,4 L16,20 Z",
  metal: "M4,8 L10,8 L10,16 L4,16 Z M14,8 L20,8 L20,16 L14,16 Z",
  armored: "M12,3 L20,8 L20,16 L12,21 L4,16 L4,8 Z",
};

export const BUILD_RADIAL_ITEMS: RadialMenuItem[] = [
  { id: "sq_fdn", label: "Sq. Foundation", icon: SVG.sqFoundation, data: "squareFoundation" },
  { id: "tri_fdn", label: "Tri. Foundation", icon: SVG.triFoundation, data: "triangleFoundation" },
  { id: "wall", label: "Wall", icon: SVG.wall, data: "wall" },
  { id: "half_wall", label: "Half Wall", icon: SVG.halfWall, data: "halfWall" },
  { id: "low_wall", label: "Low Wall", icon: SVG.lowWall, data: "lowWall" },
  { id: "doorway", label: "Doorway", icon: SVG.doorway, data: "doorway" },
  { id: "window", label: "Window", icon: SVG.windowFrame, data: "windowFrame" },
  { id: "wframe", label: "Wall Frame", icon: SVG.wallFrame, data: "wallFrame" },
  { id: "sq_flr", label: "Sq. Floor", icon: SVG.sqFloor, data: "squareFloor" },
  { id: "tri_flr", label: "Tri. Floor", icon: SVG.triFloor, data: "triangleFloor" },
  { id: "flr_frame", label: "Floor Frame", icon: SVG.floorFrame, data: "floorFrame" },
  { id: "u_stairs", label: "U-Stairs", icon: SVG.uStairs, data: "uStairs" },
  { id: "l_stairs", label: "L-Stairs", icon: SVG.lStairs, data: "lStairs" },
  { id: "st_stairs", label: "Straight Stairs", icon: SVG.straightStairs, data: "straightStairs" },
  { id: "roof", label: "Roof", icon: SVG.roof, data: "roof" },
];

export const HAMMER_RADIAL_ITEMS: RadialMenuItem[] = [
  { id: "upgrade", label: "Upgrade", icon: SVG.upgrade, data: "upgrade", description: "Upgrade a building to the next tier" },
  { id: "repair", label: "Repair", icon: SVG.repair, data: "repair", description: "Repair a damaged building" },
  { id: "rotate", label: "Rotate", icon: SVG.rotate, data: "rotate", description: "Rotate a building 90 degrees" },
  { id: "demolish", label: "Demolish", icon: SVG.demolish, data: "demolish", description: "Demolish a building for partial refund" },
];

// Upgrade resource costs for center display
const UPGRADE_COST_INFO: Record<string, { id: string; qty: number; label: string }> = {
  wood: { id: "wood", qty: 200, label: "Wood" },
  stone: { id: "stone", qty: 300, label: "Stones" },
  metal: { id: "metalFrag", qty: 200, label: "Metal Fragments" },
  armored: { id: "metalFrag", qty: 500, label: "Metal Fragments" },
};

export const UPGRADE_RADIAL_ITEMS: RadialMenuItem[] = [
  { id: "t_wood", label: "Wood Tier", icon: SVG.wood, data: "wood", description: "Upgrade to Wood tier", resourceCost: UPGRADE_COST_INFO.wood },
  { id: "t_stone", label: "Stone Tier", icon: SVG.stone, data: "stone", description: "Upgrade to Stone tier", resourceCost: UPGRADE_COST_INFO.stone },
  { id: "t_metal", label: "Metal Tier", icon: SVG.metal, data: "metal", description: "Upgrade to Metal tier", resourceCost: UPGRADE_COST_INFO.metal },
  { id: "t_armored", label: "Armored Tier", icon: SVG.armored, data: "armored", description: "Upgrade to Armored tier", resourceCost: UPGRADE_COST_INFO.armored },
];

// ===== Geometry Generation =====
const geoCache: Map<string, THREE.BufferGeometry> = new Map();

function cacheKey(piece: BuildPieceType, tier: TierType, legExt?: number): string {
  const legStr = legExt !== undefined && legExt > 0 ? `_leg${legExt.toFixed(1)}` : "";
  return `${piece}_${tier}${legStr}`;
}

// Helper: create a box geometry translated to a position
function boxAt(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

// Helper: create a cylinder geometry translated to a position
function cylAt(rTop: number, rBot: number, h: number, x: number, y: number, z: number, segments = 6): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, segments);
  g.translate(x, y, z);
  return g;
}

// Helper: ensure all geometries are non-indexed for safe merging
// ExtrudeGeometry and BoxGeometry have index; CylinderGeometry may differ.
// Calling toNonIndexed() on all ensures mergeGeometries never fails.
function prepareForMerge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry[] {
  return geos.map(g => g.index ? g.toNonIndexed() : g);
}

// ===== Foundation with terrain-adaptive legs =====
function makeSquareFoundationGeo(tier: TierType, legExtension: number): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];

  // Main platform slab
  const slabH = 0.3;
  geos.push(new THREE.BoxGeometry(GRID * s, slabH, GRID * s));
  geos[geos.length - 1].translate(0, slabH / 2, 0);

  // Outer frame lip around the foundation top (raised edge)
  const lipH = 0.08;
  const lipW = 0.06 * s;
  // North edge
  geos.push(boxAt(GRID * s + lipW * 2, lipH, lipW, 0, slabH + lipH / 2, -GRID / 2 * s - lipW / 2));
  // South edge
  geos.push(boxAt(GRID * s + lipW * 2, lipH, lipW, 0, slabH + lipH / 2, GRID / 2 * s + lipW / 2));
  // East edge
  geos.push(boxAt(lipW, lipH, GRID * s, GRID / 2 * s + lipW / 2, slabH + lipH / 2, 0));
  // West edge
  geos.push(boxAt(lipW, lipH, GRID * s, -GRID / 2 * s - lipW / 2, slabH + lipH / 2, 0));

  // 4 corner legs (extend below foundation based on terrain)
  // Smaller/lower legs
  const baseLegH = 0.6; // minimum leg height (reduced from 0.8)
  const legH = baseLegH + legExtension;
  const legR = 0.10 * s; // thinner legs
  const legOff = GRID / 2 * s - legR * 2.5;
  for (const [lx, lz] of [[-legOff, -legOff], [legOff, -legOff], [-legOff, legOff], [legOff, legOff]]) {
    geos.push(cylAt(legR * 0.8, legR, legH, lx, -legH / 2, lz, 6));
  }

  return mergeGeometries(prepareForMerge(geos))!;
}

function makeTriangleFoundationGeo(tier: TierType, legExtension: number): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];

  // Triangle platform using box-based construction (avoids ExtrudeGeometry merge issues)
  const halfG = GRID / 2 * s;
  const slabH = 0.3;

  // Build triangle from 3 rotated boxes forming a triangular prism
  // Use a simple approach: create the triangle as a flat extrusion then rotate
  const shape = new THREE.Shape();
  shape.moveTo(-halfG, -halfG);
  shape.lineTo(halfG, -halfG);
  shape.lineTo(-halfG, halfG);
  shape.lineTo(-halfG, -halfG);
  const platGeo = new THREE.ExtrudeGeometry(shape, { depth: slabH, bevelEnabled: false });
  platGeo.rotateX(-Math.PI / 2);
  platGeo.translate(0, slabH / 2, 0);
  geos.push(platGeo);

  // 3 corner legs — same height as square foundation
  const baseLegH = 0.6 + legExtension; // match square foundation base
  const legR = 0.10 * s; // thinner legs (match square)
  // Proper corner positions under the triangle vertices, connected to the base
  const legInset = legR * 2.5;
  const corners: [number, number][] = [
    [-halfG + legInset, -halfG + legInset], // left vertex
    [halfG - legInset, -halfG + legInset],  // right vertex
    [-halfG + legInset, halfG - legInset],   // back vertex (was the mispositioned one)
  ];
  for (const [lx, lz] of corners) {
    // Legs connect to the base: start at slab bottom (y=0) and extend down
    geos.push(cylAt(legR * 0.8, legR, baseLegH, lx, -baseLegH / 2, lz, 6));
  }

  return mergeGeometries(prepareForMerge(geos))!;
}

// ===== Wall geometry — clean, no decorative poles =====
function makeWallGeo(tier: TierType, height: number): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const thickness = WALL_THICKNESS * s;
  const geos: THREE.BufferGeometry[] = [];

  // Main wall panel
  const wallGeo = new THREE.BoxGeometry(GRID * s, height, thickness);
  wallGeo.translate(0, height / 2, 0);
  geos.push(wallGeo);

  // Horizontal plank lines for wood/stone tiers (subtle depth)
  if (tier === "wood" || tier === "stone") {
    const lineH = 0.02 * s;
    const lineD = thickness + 0.005;
    const plankCount = Math.floor(height / 0.4);
    for (let i = 1; i <= plankCount; i++) {
      const y = (height / (plankCount + 1)) * i;
      geos.push(boxAt(GRID * s + 0.01, lineH, lineD, 0, y, 0));
    }
  }

  // NO twig cross-beams, NO metal rivets — clean geometry only
  return mergeGeometries(prepareForMerge(geos))!;
}

// ===== Doorway geometry =====
function makeDoorwayGeo(tier: TierType): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];
  const thickness = WALL_THICKNESS * s;
  const doorW = 0.9 * s;
  const doorH = 2.2;

  // Left panel
  const panelW = (GRID / 2 - doorW) * s;
  const leftX = -(doorW + panelW / 2);
  geos.push(boxAt(panelW, WALL_H, thickness, leftX, WALL_H / 2, 0));
  // Right panel
  const rightX = doorW + panelW / 2;
  geos.push(boxAt(panelW, WALL_H, thickness, rightX, WALL_H / 2, 0));
  // Top lintel
  geos.push(boxAt(GRID * s, WALL_H - doorH, thickness, 0, doorH + (WALL_H - doorH) / 2, 0));

  return mergeGeometries(prepareForMerge(geos))!;
}

// ===== Window frame geometry =====
function makeWindowFrameGeo(tier: TierType): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];
  const thickness = WALL_THICKNESS * s;
  const winW = 0.5 * s;
  const winH = 0.8;
  const winY = 1.2;

  // Bottom section (below window)
  geos.push(boxAt(GRID * s, winY, thickness, 0, winY / 2, 0));
  // Top section (above window)
  const topH = WALL_H - winY - winH;
  geos.push(boxAt(GRID * s, topH, thickness, 0, winY + winH + topH / 2, 0));
  // Left side (beside window)
  const sideW = (GRID / 2 - winW) * s;
  const leftX = -(winW + sideW / 2);
  geos.push(boxAt(sideW, winH, thickness, leftX, winY + winH / 2, 0));
  // Right side
  const rightX = winW + sideW / 2;
  geos.push(boxAt(sideW, winH, thickness, rightX, winY + winH / 2, 0));

  return mergeGeometries(prepareForMerge(geos))!;
}

// ===== Wall frame geometry (large opening) =====
function makeWallFrameGeo(tier: TierType): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];
  const thickness = WALL_THICKNESS * s;
  const openW = 1.1 * s;
  const openH = 2.2;

  // Left panel
  const panelW = (GRID / 2 - openW) * s;
  const leftX = -(openW + panelW / 2);
  geos.push(boxAt(panelW, WALL_H, thickness, leftX, WALL_H / 2, 0));
  // Right panel
  const rightX = openW + panelW / 2;
  geos.push(boxAt(panelW, WALL_H, thickness, rightX, WALL_H / 2, 0));
  // Top lintel
  geos.push(boxAt(GRID * s, WALL_H - openH, thickness, 0, openH + (WALL_H - openH) / 2, 0));

  return mergeGeometries(prepareForMerge(geos))!;
}

// ===== Floor geometry =====
function makeSquareFloorGeo(tier: TierType): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];
  const thickness = 0.2;

  // Main slab
  geos.push(new THREE.BoxGeometry(GRID * s, thickness, GRID * s));
  geos[geos.length - 1].translate(0, thickness / 2, 0);

  return mergeGeometries(prepareForMerge(geos))!;
}

// ===== Triangle floor geometry =====
function makeTriangleFloorGeo(tier: TierType): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];
  const halfG = GRID / 2 * s;
  const thickness = 0.2;

  const shape = new THREE.Shape();
  shape.moveTo(-halfG, -halfG);
  shape.lineTo(halfG, -halfG);
  shape.lineTo(-halfG, halfG);
  shape.lineTo(-halfG, -halfG);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, thickness / 2, 0);
  geos.push(geo);

  return mergeGeometries(prepareForMerge(geos))!;
}

// ===== Floor frame geometry (with hatch hole) =====
function makeFloorFrameGeo(tier: TierType): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];
  const thickness = 0.2;

  // Outer frame
  const frameW = 0.2 * s;
  // Top beam
  geos.push(boxAt(GRID * s, thickness, frameW, 0, thickness / 2, -GRID / 2 * s + frameW / 2));
  // Bottom beam
  geos.push(boxAt(GRID * s, thickness, frameW, 0, thickness / 2, GRID / 2 * s - frameW / 2));
  // Left beam
  geos.push(boxAt(frameW, thickness, GRID * s, -GRID / 2 * s + frameW / 2, thickness / 2, 0));
  // Right beam
  geos.push(boxAt(frameW, thickness, GRID * s, GRID / 2 * s - frameW / 2, thickness / 2, 0));

  return mergeGeometries(prepareForMerge(geos))!;
}

// ===== Stairs geometry — clean, no rails =====
function makeStraightStairsGeo(tier: TierType): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];
  const stepCount = 12;
  const stepH = WALL_H / stepCount;
  const stepD = GRID / stepCount;
  const stepW = 1.2 * s;

  // Steps only
  for (let i = 0; i < stepCount; i++) {
    const step = boxAt(stepW, stepH, stepD, 0, stepH * i + stepH / 2, -GRID / 2 + stepD * i + stepD / 2);
    geos.push(step);
  }

  return mergeGeometries(prepareForMerge(geos))!;
}

function makeUStairsGeo(tier: TierType): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];
  const halfSteps = 6;
  const stepH = WALL_H / (halfSteps * 2);
  const stepD = (GRID / 2) / halfSteps;
  const stepW = 1.0 * s;

  // Left ascending run
  for (let i = 0; i < halfSteps; i++) {
    geos.push(boxAt(stepW, stepH, stepD, -GRID / 4, stepH * i + stepH / 2, -GRID / 2 + stepD * i + stepD / 2));
  }
  // Top landing platform
  geos.push(boxAt(stepW * 2, stepH, GRID / 2, 0, WALL_H / 2, 0));
  // Right descending run
  for (let i = 0; i < halfSteps; i++) {
    geos.push(boxAt(stepW, stepH, stepD, GRID / 4, WALL_H - stepH * i - stepH / 2, GRID / 2 - stepD * i - stepD / 2));
  }

  return mergeGeometries(prepareForMerge(geos))!;
}

function makeLStairsGeo(tier: TierType): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];
  const halfSteps = 6;
  const stepH = WALL_H / (halfSteps * 2);
  const stepD = (GRID / 2) / halfSteps;
  const stepW = 1.0 * s;

  // First half: ascending in Z direction
  for (let i = 0; i < halfSteps; i++) {
    geos.push(boxAt(stepW, stepH, stepD, -GRID / 4, stepH * i + stepH / 2, -GRID / 2 + stepD * i + stepD / 2));
  }
  // Landing
  geos.push(boxAt(GRID / 2, stepH, stepW * 2, 0, WALL_H / 2, GRID / 4));
  // Second half: ascending in X direction
  for (let i = 0; i < halfSteps; i++) {
    geos.push(boxAt(stepD, stepH, stepW, -GRID / 4 + stepD * i + stepD / 2, WALL_H / 2 + stepH * i + stepH / 2, GRID / 4));
  }

  return mergeGeometries(prepareForMerge(geos))!;
}

// ===== Roof geometry — clean, no under-beams =====
function makeRoofGeo(tier: TierType): THREE.BufferGeometry {
  const s = TIER_SCALE[tier];
  const geos: THREE.BufferGeometry[] = [];
  const halfW = GRID / 2 * s;
  const thickness = 0.15 * s;

  // Two sloped planes meeting at a ridge
  const leftShape = new THREE.Shape();
  leftShape.moveTo(-halfW, 0);
  leftShape.lineTo(0, 1.5);
  leftShape.lineTo(0, 1.5 - thickness);
  leftShape.lineTo(-halfW, -thickness);
  leftShape.lineTo(-halfW, 0);
  const leftGeo = new THREE.ExtrudeGeometry(leftShape, { depth: GRID * s, bevelEnabled: false });
  leftGeo.translate(0, 0, -GRID / 2 * s);
  geos.push(leftGeo);

  const rightShape = new THREE.Shape();
  rightShape.moveTo(0, 1.5);
  rightShape.lineTo(halfW, 0);
  rightShape.lineTo(halfW, -thickness);
  rightShape.lineTo(0, 1.5 - thickness);
  rightShape.lineTo(0, 1.5);
  const rightGeo = new THREE.ExtrudeGeometry(rightShape, { depth: GRID * s, bevelEnabled: false });
  rightGeo.translate(0, 0, -GRID / 2 * s);
  geos.push(rightGeo);

  // Ridge beam
  geos.push(boxAt(thickness, thickness * 2, GRID * s, 0, 1.5 - thickness, 0));

  return mergeGeometries(prepareForMerge(geos))!;
}

// ===== Main geometry generation function =====
export function generateBuildGeometry(
  pieceType: BuildPieceType,
  tier: TierType,
  legExtension: number = 0,
): THREE.BufferGeometry {
  const key = cacheKey(pieceType, tier, legExtension);
  const cached = geoCache.get(key);
  if (cached) return cached.clone();

  let geo: THREE.BufferGeometry | null = null;

  switch (pieceType) {
    case "squareFoundation":
      geo = makeSquareFoundationGeo(tier, legExtension);
      break;
    case "triangleFoundation":
      geo = makeTriangleFoundationGeo(tier, legExtension);
      break;
    case "wall":
      geo = makeWallGeo(tier, WALL_H);
      break;
    case "halfWall":
      geo = makeWallGeo(tier, WALL_H * 0.5);
      break;
    case "lowWall":
      geo = makeWallGeo(tier, WALL_H * 0.33);
      break;
    case "doorway":
      geo = makeDoorwayGeo(tier);
      break;
    case "windowFrame":
      geo = makeWindowFrameGeo(tier);
      break;
    case "wallFrame":
      geo = makeWallFrameGeo(tier);
      break;
    case "squareFloor":
      geo = makeSquareFloorGeo(tier);
      break;
    case "triangleFloor":
      geo = makeTriangleFloorGeo(tier);
      break;
    case "floorFrame":
      geo = makeFloorFrameGeo(tier);
      break;
    case "straightStairs":
      geo = makeStraightStairsGeo(tier);
      break;
    case "uStairs":
      geo = makeUStairsGeo(tier);
      break;
    case "lStairs":
      geo = makeLStairsGeo(tier);
      break;
    case "roof":
      geo = makeRoofGeo(tier);
      break;
    default:
      geo = new THREE.BoxGeometry(GRID, 0.2, GRID);
  }

  if (!geo) {
    geo = new THREE.BoxGeometry(GRID, 0.2, GRID);
  }

  geoCache.set(key, geo);
  return geo.clone();
}

// Calculate how much foundation legs need to extend based on terrain height under the foundation.
// Returns { worldY, legExtension } where worldY is the Y position to place the foundation
// so legs touch the lowest terrain point.
export const BASE_LEG_HEIGHT = 0.6;

export function calculateFoundationPlacement(
  worldX: number,
  worldZ: number,
  terrainGetHeight: (x: number, z: number) => number,
): { worldY: number; legExtension: number } {
  const halfG = GRID / 2;
  // Sample terrain at the 4 corners
  const corners = [
    terrainGetHeight(worldX - halfG, worldZ - halfG),
    terrainGetHeight(worldX + halfG, worldZ - halfG),
    terrainGetHeight(worldX - halfG, worldZ + halfG),
    terrainGetHeight(worldX + halfG, worldZ + halfG),
  ];
  const minTerrain = Math.min(...corners);
  const maxTerrain = Math.max(...corners);
  // Foundation sits with legs touching lowest terrain point
  // Legs go from local Y = -(baseLegH + legExtension) to Y = 0
  // Slab is at local Y = 0 to Y = slabH
  // So leg bottom in world = worldY - (baseLegH + legExtension)
  // We want: worldY - (baseLegH + legExtension) = minTerrain
  // And worldY should be high enough that slab is above max terrain
  // Simple approach: worldY = minTerrain + baseLegH + slopeExtension
  // slopeExtension = how much extra needed for the highest corner to still reach
  const slopeDiff = maxTerrain - minTerrain;
  const legExtension = Math.min(slopeDiff, 4.0); // clamp extension
  const worldY = minTerrain + BASE_LEG_HEIGHT + legExtension / 2; // average it out

  return { worldY: Math.max(worldY, maxTerrain), legExtension };
}

// Backward-compatible wrapper for ghost creation
export function calculateFoundationLegExtension(
  worldX: number,
  worldZ: number,
  terrainGetHeight: (x: number, z: number) => number,
): number {
  return calculateFoundationPlacement(worldX, worldZ, terrainGetHeight).legExtension;
}

// ===== Socket-based Snapping System =====
interface Socket {
  type: PieceCategory;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  orientation: number;
  parentPiece: BuildPieceType;
}

function getSocketsForPiece(pieceType: BuildPieceType, worldPos: THREE.Vector3, rotation: number): Socket[] {
  const sockets: Socket[] = [];
  const def = BUILD_PIECE_DEFS[pieceType];
  const rotRad = (rotation * Math.PI) / 2;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  const g = GRID;
  const h = def.height;

  function rotatePoint(lx: number, lz: number): THREE.Vector3 {
    return new THREE.Vector3(
      worldPos.x + lx * cos - lz * sin,
      worldPos.y,
      worldPos.z + lx * sin + lz * cos,
    );
  }

  function rotateNormal(nx: number, nz: number): THREE.Vector3 {
    return new THREE.Vector3(nx * cos - nz * sin, 0, nx * sin + nz * cos).normalize();
  }

  switch (def.category) {
    case "foundation": {
      // Top surface sockets — walls can snap to each edge
      const topY = worldPos.y + h;
      const edgeSockets = [
        { lx: 0, lz: -g / 2, nx: 0, nz: -1, rotOff: 0 }, // North edge
        { lx: 0, lz: g / 2, nx: 0, nz: 1, rotOff: 2 },   // South edge
        { lx: -g / 2, lz: 0, nx: -1, nz: 0, rotOff: 3 }, // West edge
        { lx: g / 2, lz: 0, nx: 1, nz: 0, rotOff: 1 },   // East edge
      ];
      for (let i = 0; i < 4; i++) {
        const es = edgeSockets[i];
        const pos = rotatePoint(es.lx, es.lz);
        pos.y = topY;
        const normal = rotateNormal(es.nx, es.nz);
        // Wall orientation: wall's flat face should face outward from the edge
        // Rotation 0 = wall spans along X axis, flat face normal = +Z or -Z
        // For north edge (normal -Z), wall rotation should be 0 (wall faces -Z)
        // For south edge (normal +Z), wall rotation should be 2
        // For west edge (normal -X), wall rotation should be 3
        // For east edge (normal +X), wall rotation should be 1
        const wallRot = ((es.rotOff + rotation) % 4 + 4) % 4;
        sockets.push({
          type: "wall",
          position: pos,
          normal,
          orientation: wallRot,
          parentPiece: pieceType,
        });
      }
      // Horizontal edge sockets for adjacent foundations
      // Position at edge midpoints, normal pointing outward
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + rotRad;
        const nx = Math.sin(angle);
        const nz = Math.cos(angle);
        // Socket sits at edge midpoint — adjacent foundation center will be at GRID distance
        sockets.push({
          type: "foundation",
          position: rotatePoint(nx * g / 2, nz * g / 2),
          normal: rotateNormal(nx, nz),
          orientation: rotation,
          parentPiece: pieceType,
        });
      }
      // Floor socket on top (for building upward)
      sockets.push({
        type: "floor",
        position: new THREE.Vector3(worldPos.x, topY, worldPos.z),
        normal: new THREE.Vector3(0, 1, 0),
        orientation: rotation,
        parentPiece: pieceType,
      });
      break;
    }
    case "wall": {
      // Top socket — floors snap on top of walls
      sockets.push({
        type: "floor",
        position: new THREE.Vector3(worldPos.x, worldPos.y + h, worldPos.z),
        normal: new THREE.Vector3(0, 1, 0),
        orientation: rotation,
        parentPiece: pieceType,
      });
      // Side sockets for wall-to-wall perpendicular connection
      // Wall rotation 0: spans along X axis, flat face is at Z=0
      // Perpendicular walls connect at the left/right ends of this wall
      const wallSideSockets = [
        { lx: g / 2, lz: 0, rotOff: 1 },   // right end
        { lx: -g / 2, lz: 0, rotOff: 3 },  // left end
      ];
      for (let i = 0; i < 2; i++) {
        const es = wallSideSockets[i];
        const pos = rotatePoint(es.lx, es.lz);
        pos.y = worldPos.y;
        const nx = es.lx > 0 ? cos : -cos;
        const nz = es.lx > 0 ? sin : -sin;
        const normal = new THREE.Vector3(nx, 0, nz).normalize();
        sockets.push({
          type: "wall",
          position: pos,
          normal,
          orientation: ((es.rotOff + rotation) % 4 + 4) % 4,
          parentPiece: pieceType,
        });
      }
      break;
    }
    case "floor": {
      // Bottom socket
      sockets.push({
        type: "foundation",
        position: new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z),
        normal: new THREE.Vector3(0, -1, 0),
        orientation: rotation,
        parentPiece: pieceType,
      });
      // Top socket — walls snap on top of floors
      const topY = worldPos.y + h;
      const edgeSockets = [
        { lx: 0, lz: -g / 2, nx: 0, nz: -1, rotOff: 0 },
        { lx: 0, lz: g / 2, nx: 0, nz: 1, rotOff: 2 },
        { lx: -g / 2, lz: 0, nx: -1, nz: 0, rotOff: 3 },
        { lx: g / 2, lz: 0, nx: 1, nz: 0, rotOff: 1 },
      ];
      for (let i = 0; i < 4; i++) {
        const es = edgeSockets[i];
        const pos = rotatePoint(es.lx, es.lz);
        pos.y = topY;
        const normal = rotateNormal(es.nx, es.nz);
        const wallRot = ((es.rotOff + rotation) % 4 + 4) % 4;
        sockets.push({
          type: "wall",
          position: pos,
          normal,
          orientation: wallRot,
          parentPiece: pieceType,
        });
      }
      // Horizontal edge sockets for adjacent floors
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + rotRad;
        const nx = Math.sin(angle);
        const nz = Math.cos(angle);
        sockets.push({
          type: "floor",
          position: rotatePoint(nx * g / 2, nz * g / 2),
          normal: rotateNormal(nx, nz),
          orientation: rotation,
          parentPiece: pieceType,
        });
      }
      break;
    }
    case "stairs": {
      // Bottom socket (snaps to foundation/floor)
      sockets.push({
        type: "foundation",
        position: new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z),
        normal: new THREE.Vector3(0, -1, 0),
        orientation: rotation,
        parentPiece: pieceType,
      });
      break;
    }
    case "roof": {
      // Bottom socket (snaps to wall top or floor)
      sockets.push({
        type: "wall",
        position: new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z),
        normal: new THREE.Vector3(0, -1, 0),
        orientation: rotation,
        parentPiece: pieceType,
      });
      break;
    }
  }
  return sockets;
}

export interface SnapResult {
  position: THREE.Vector3;
  rotation: number;
  valid: boolean;
  snappedTo: number | null;
  snappedSocket: Socket | null;
}

// Find the best snap position for a new piece given a raycast hit
export function findSnapPosition(
  pieceType: BuildPieceType,
  hitPoint: THREE.Vector3,
  hitNormal: THREE.Vector3 | null,
  placedBuilds: PlacedBuildV2[],
  terrainGetHeight: (x: number, z: number) => number,
  currentRotation: number,
): SnapResult {
  const def = BUILD_PIECE_DEFS[pieceType];
  const range = 4.0; // snap detection range (generous)

  // Collect all sockets from placed builds
  let bestDist = Infinity;
  let bestSnap: SnapResult | null = null;

  for (const pb of placedBuilds) {
    const pbPos = new THREE.Vector3(pb.worldX, pb.worldY, pb.worldZ);
    const sockets = getSocketsForPiece(pb.pieceType, pbPos, pb.rotation);

    for (const socket of sockets) {
      // Check socket type compatibility
      if (!isCompatibleSocket(pieceType, socket.type)) continue;

      const dist = socket.position.distanceTo(hitPoint);
      if (dist > range || dist > bestDist) continue;

      // Calculate placement position from socket
      const placePos = calculatePlacementFromSocket(pieceType, socket, currentRotation);

      // Inherit rotation from socket for walls (so they align properly)
      const placeRot = def.category === "wall" ? socket.orientation : currentRotation;

      // Check validity
      const valid = checkPlacementValidity(pieceType, placePos, placeRot, placedBuilds);

      if (dist < bestDist) {
        bestDist = dist;
        bestSnap = {
          position: placePos,
          rotation: placeRot,
          valid,
          snappedTo: pb.id,
          snappedSocket: socket,
        };
      }
    }
  }

  // If no socket snap found, allow ground/air placement for all piece types
  if (!bestSnap) {
    const gx = Math.round(hitPoint.x / GRID);
    const gz = Math.round(hitPoint.z / GRID);
    let posY: number;

    if (def.category === "foundation") {
      // Foundation sits on terrain
      posY = terrainGetHeight(gx * GRID, gz * GRID);
    } else if (def.category === "wall" || def.category === "floor" || def.category === "stairs" || def.category === "roof") {
      // Non-foundation pieces: place at the ray hit height (can go on terrain or in air)
      // Snap Y to nearest 0.5m increment for clean stacking
      posY = Math.round(hitPoint.y * 2) / 2;
      // For walls on ground: ensure they sit on terrain if no higher snap found
      if (def.category === "wall" && posY < terrainGetHeight(hitPoint.x, hitPoint.z) + 0.1) {
        posY = terrainGetHeight(hitPoint.x, hitPoint.z);
      }
    } else {
      posY = hitPoint.y;
    }
    const pos = new THREE.Vector3(gx * GRID, posY, gz * GRID);
    const valid = true; // free placement is always valid when no socket snap found
    return { position: pos, rotation: currentRotation, valid, snappedTo: null, snappedSocket: null };
  }

  return bestSnap;
}

function isCompatibleSocket(newPiece: BuildPieceType, socketType: PieceCategory): boolean {
  const newCat = BUILD_PIECE_DEFS[newPiece].category;
  // Walls snap to foundation/floor top edges and wall sides
  if (newCat === "wall" && (socketType === "foundation" || socketType === "floor" || socketType === "wall")) return true;
  // Foundations snap to foundation horizontal edges
  if (newCat === "foundation" && socketType === "foundation") return true;
  // Floors snap to wall tops, floor edges, foundation top
  if (newCat === "floor" && (socketType === "wall" || socketType === "floor")) return true;
  // Stairs snap to foundations/floors
  if (newCat === "stairs" && (socketType === "foundation" || socketType === "floor")) return true;
  // Roofs snap to wall tops and floors
  if (newCat === "roof" && (socketType === "wall" || socketType === "floor")) return true;
  return false;
}

function calculatePlacementFromSocket(
  pieceType: BuildPieceType,
  socket: Socket,
  rotation: number,
): THREE.Vector3 {
  const def = BUILD_PIECE_DEFS[pieceType];
  const pos = socket.position.clone();

  switch (def.category) {
    case "wall":
      // Wall center sits at the socket position (which is the edge of the parent)
      // The wall should be placed so its center is exactly at the edge
      // No offset needed — the wall is centered at the socket position
      break;
    case "floor":
      // Floor sits on top of whatever the socket is on
      if (socket.normal.y > 0) {
        // Floor on foundation/floor top — center on it
        pos.y += def.height / 2;
      } else if (socket.type === "wall" && socket.normal.y === 0) {
        // Floor placed on wall side socket — this is wall-to-wall-floor connection
        // Place floor at the same height as the wall, centered
        pos.y = socket.position.y + def.height / 2;
      }
      break;
    case "foundation":
      // Foundation placed adjacent to another foundation
      // Socket is at edge midpoint (distance GRID/2 from center), so offset
      // by another GRID/2 to reach the adjacent foundation's center (total GRID apart)
      pos.add(socket.normal.clone().multiplyScalar(GRID / 2));
      break;
    case "stairs":
      // Stairs sit on foundation/floor top
      if (socket.normal.y < 0) {
        pos.y = socket.position.y;
      }
      break;
    case "roof":
      // Roof on wall top
      if (socket.normal.y < 0) {
        pos.y = socket.position.y;
      }
      break;
  }
  return pos;
}

export function checkPlacementValidity(
  pieceType: BuildPieceType,
  position: THREE.Vector3,
  rotation: number,
  placedBuilds: PlacedBuildV2[],
): boolean {
  const def = BUILD_PIECE_DEFS[pieceType];
  const halfW = (def.gridW * GRID) / 2;
  const halfD = (def.gridD * GRID) / 2;
  const tolerance = 0.05; // small overlap tolerance for snapping

  for (const pb of placedBuilds) {
    const pbDef = BUILD_PIECE_DEFS[pb.pieceType];
    const pbHalfW = (pbDef.gridW * GRID) / 2;
    const pbHalfD = (pbDef.gridD * GRID) / 2;

    const dx = Math.abs(position.x - pb.worldX);
    const dy = Math.abs(position.y - pb.worldY);
    const dz = Math.abs(position.z - pb.worldZ);

    const overlapX = dx < halfW + pbHalfW - tolerance;
    const overlapY = dy < (def.height + pbDef.height) / 2;
    const overlapZ = dz < halfD + pbHalfD - tolerance;

    if (overlapX && overlapY && overlapZ) {
      // Allow intentional overlaps:
      // - wall on foundation/floor (wall bottom overlaps with foundation top)
      if (def.category === "wall" && (pbDef.category === "foundation" || pbDef.category === "floor")) continue;
      // - floor on wall (floor bottom at wall top)
      if (def.category === "floor" && pbDef.category === "wall") continue;
      // - wall on wall (adjacent walls at same height share an edge)
      if (def.category === "wall" && pbDef.category === "wall" && Math.abs(dy) < tolerance) continue;
      // - foundation next to foundation
      if (def.category === "foundation" && pbDef.category === "foundation" && Math.abs(dy) < 0.5) continue;
      // - floor next to floor
      if (def.category === "floor" && pbDef.category === "floor" && Math.abs(dy) < 0.5) continue;
      // - stairs on foundation
      if (def.category === "stairs" && (pbDef.category === "foundation" || pbDef.category === "floor")) continue;
      // - roof on wall
      if (def.category === "roof" && pbDef.category === "wall") continue;
      // Otherwise it's an invalid overlap
      return false;
    }
  }
  return true;
}

export function getHologramColor(valid: boolean): number {
  return valid ? 0x4488ff : 0xff3333;
}

// ===== Collision helpers for the engine =====

// Collision box for a single solid piece (local space, centered at piece origin)
export interface CollisionBox {
  minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
}

// Per-piece-type precise collision definitions (local space, centered at piece origin)
// These are tight-fitted to the actual visual geometry, not oversized boxes.
// Returns an array of collision boxes for complex shapes (stairs).
// Also returns walkable surface Y for foundations/floors (player can stand on top).
export function getCollisionBoxes(pieceType: BuildPieceType, tier: TierType): {
  boxes: CollisionBox[];
  walkableY?: number; // Y (world-relative) of walkable top surface
  isSlope?: boolean;  // stairs have walkable slopes
} {
  const s = TIER_SCALE[tier];
  const t = WALL_THICKNESS * s;
  switch (pieceType) {
    case "squareFoundation": {
      // Only block the sides/perimeter below the top surface
      // The top surface (worldY + height) is walkable
      const h = BUILD_PIECE_DEFS.squareFoundation.height * s;
      return {
        boxes: [{
          // Solid block for the slab — only blocks below the top surface
          minX: -GRID/2*s, maxX: GRID/2*s,
          minY: -0.6, maxY: h,
          minZ: -GRID/2*s, maxZ: GRID/2*s,
        }],
        walkableY: h,
      };
    }
    case "triangleFoundation": {
      const h = BUILD_PIECE_DEFS.triangleFoundation.height * s;
      return {
        boxes: [{
          minX: -GRID/2*s, maxX: GRID/2*s,
          minY: -0.6, maxY: h,
          minZ: -GRID/2*s, maxZ: GRID/2*s,
        }],
        walkableY: h,
      };
    }
    case "wall":
      return { boxes: [{ minX: -GRID/2*s, maxX: GRID/2*s, minY: 0, maxY: WALL_H, minZ: -t/2, maxZ: t/2 }] };
    case "halfWall":
      return { boxes: [{ minX: -GRID/2*s, maxX: GRID/2*s, minY: 0, maxY: WALL_H*0.5, minZ: -t/2, maxZ: t/2 }] };
    case "lowWall":
      return { boxes: [{ minX: -GRID/2*s, maxX: GRID/2*s, minY: 0, maxY: WALL_H*0.33, minZ: -t/2, maxZ: t/2 }] };
    case "doorway":
      return { boxes: [{ minX: -GRID/2*s, maxX: GRID/2*s, minY: 0, maxY: WALL_H, minZ: -t/2, maxZ: t/2 }] };
    case "windowFrame":
      return { boxes: [{ minX: -GRID/2*s, maxX: GRID/2*s, minY: 0, maxY: WALL_H, minZ: -t/2, maxZ: t/2 }] };
    case "wallFrame":
      return { boxes: [{ minX: -GRID/2*s, maxX: GRID/2*s, minY: 0, maxY: WALL_H, minZ: -t/2, maxZ: t/2 }] };
    case "squareFloor":
      return {
        boxes: [{
          minX: -GRID/2*s, maxX: GRID/2*s, minY: 0, maxY: 0.2, minZ: -GRID/2*s, maxZ: GRID/2*s,
        }],
        walkableY: 0.2,
      };
    case "triangleFloor":
      return {
        boxes: [{
          minX: -GRID/2*s, maxX: GRID/2*s, minY: 0, maxY: 0.2, minZ: -GRID/2*s, maxZ: GRID/2*s,
        }],
        walkableY: 0.2,
      };
    case "floorFrame":
      return {
        boxes: [{
          minX: -GRID/2*s, maxX: GRID/2*s, minY: 0, maxY: 0.2, minZ: -GRID/2*s, maxZ: GRID/2*s,
        }],
        walkableY: 0.2,
      };
    case "straightStairs": {
      // Stairs: thin slabs for each step, not a solid block
      const stepCount = 6;
      const stepH = WALL_H / stepCount;
      const stepD = GRID / stepCount;
      const boxes: CollisionBox[] = [];
      for (let i = 0; i < stepCount; i++) {
        boxes.push({
          minX: -0.7*s, maxX: 0.7*s,
          minY: i * stepH, maxY: (i + 1) * stepH,
          minZ: -GRID/2 + i * stepD, maxZ: -GRID/2 + (i + 1) * stepD,
        });
      }
      return { boxes, walkableY: WALL_H, isSlope: true };
    }
    case "uStairs": {
      // U-stairs: two parallel runs connected by a landing
      const stepCount = 5;
      const stepH = WALL_H / (stepCount * 2); // two flights
      const stepD = (GRID * 0.35) / stepCount;
      const boxes: CollisionBox[] = [];
      // Left run
      for (let i = 0; i < stepCount; i++) {
        boxes.push({
          minX: -GRID/2 + 0.1*s, maxX: -GRID/2 + 0.1*s + 1.0*s,
          minY: i * stepH, maxY: (i + 1) * stepH,
          minZ: -GRID/2 + i * stepD, maxZ: -GRID/2 + (i + 1) * stepD,
        });
      }
      // Right run (ascending from opposite end)
      for (let i = 0; i < stepCount; i++) {
        boxes.push({
          minX: GRID/2 - 0.1*s - 1.0*s, maxX: GRID/2 - 0.1*s,
          minY: (stepCount - 1 - i) * stepH, maxY: (stepCount - i) * stepH,
          minZ: GRID/2 - (i + 1) * stepD, maxZ: GRID/2 - i * stepD,
        });
      }
      return { boxes, walkableY: WALL_H, isSlope: true };
    }
    case "lStairs": {
      // L-stairs: one flight going up, then a landing, then another direction
      const stepCount = 5;
      const stepH = WALL_H / (stepCount * 2);
      const stepD = (GRID * 0.4) / stepCount;
      const boxes: CollisionBox[] = [];
      // First flight (ascending along Z)
      for (let i = 0; i < stepCount; i++) {
        boxes.push({
          minX: -GRID/2 + 0.1*s, maxX: -GRID/2 + 0.1*s + 1.0*s,
          minY: i * stepH, maxY: (i + 1) * stepH,
          minZ: -GRID/2 + i * stepD, maxZ: -GRID/2 + (i + 1) * stepD,
        });
      }
      // Landing + second flight (ascending along X)
      const landingY = stepCount * stepH;
      for (let i = 0; i < stepCount; i++) {
        boxes.push({
          minX: -GRID/2 + 0.1*s + GRID * 0.4 + i * stepD,
          maxX: -GRID/2 + 0.1*s + GRID * 0.4 + (i + 1) * stepD,
          minY: landingY + i * stepH, maxY: landingY + (i + 1) * stepH,
          minZ: -GRID/2 + 0.1*s, maxZ: -GRID/2 + 0.1*s + 1.0*s,
        });
      }
      return { boxes, walkableY: WALL_H, isSlope: true };
    }
    case "roof":
      return { boxes: [{ minX: -GRID/2*s, maxX: GRID/2*s, minY: 0, maxY: 1.8, minZ: -GRID/2*s, maxZ: GRID/2*s }] };
    default:
      return { boxes: [{ minX: -GRID/2, maxX: GRID/2, minY: 0, maxY: 0.2, minZ: -GRID/2, maxZ: GRID/2 }] };
  }
}

// Get walkable surface Y in world space for a placed build (for ground detection)
export function getWalkableSurfaceY(pb: PlacedBuildV2): number | null {
  const coll = getCollisionBoxes(pb.pieceType, pb.tier);
  if (coll.walkableY !== undefined) {
    return pb.worldY + coll.walkableY;
  }
  return null;
}

// Get collision AABB in world space for a placed build, accounting for rotation.
// Returns the first (or primary) collision box in world space.
// Use getAllWorldCollisionBoxes for multi-box pieces like stairs.
export function getWorldCollisionBox(pb: PlacedBuildV2): {
  minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
  isSlope?: boolean;
} {
  const coll = getCollisionBoxes(pb.pieceType, pb.tier);
  if (coll.boxes.length === 0) {
    const hs = GRID / 2;
    return { minX: pb.worldX - hs, maxX: pb.worldX + hs, minY: pb.worldY, maxY: pb.worldY + 0.2, minZ: pb.worldZ - hs, maxZ: pb.worldZ + hs };
  }
  // Use first box as primary for backward compat
  const box = coll.boxes[0];
  const rotOdd = (pb.rotation % 2) === 1;
  const hw = rotOdd ? (box.maxZ - box.minZ) / 2 : (box.maxX - box.minX) / 2;
  const hd = rotOdd ? (box.maxX - box.minX) / 2 : (box.maxZ - box.minZ) / 2;
  return {
    minX: pb.worldX - hw,
    maxX: pb.worldX + hw,
    minY: pb.worldY + box.minY,
    maxY: pb.worldY + box.maxY,
    minZ: pb.worldZ - hd,
    maxZ: pb.worldZ + hd,
    isSlope: coll.isSlope,
  };
}

// Get ALL collision boxes in world space for a placed build (for precise collision with stairs etc)
export function getAllWorldCollisionBoxes(pb: PlacedBuildV2): {
  minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
}[] {
  const coll = getCollisionBoxes(pb.pieceType, pb.tier);
  return coll.boxes.map(box => {
    const rotOdd = (pb.rotation % 2) === 1;
    const hw = rotOdd ? (box.maxZ - box.minZ) / 2 : (box.maxX - box.minX) / 2;
    const hd = rotOdd ? (box.maxX - box.minX) / 2 : (box.maxZ - box.minZ) / 2;
    return {
      minX: pb.worldX - hw,
      maxX: pb.worldX + hw,
      minY: pb.worldY + box.minY,
      maxY: pb.worldY + box.maxY,
      minZ: pb.worldZ - hd,
      maxZ: pb.worldZ + hd,
    };
  });
}

// Check if a piece type should block player XZ movement.
// Foundations now use Y-aware collision in the engine, so they're included here.
// Floors/roofs don't block (they're walkable surfaces).
export function shouldBlockPlayer(pieceType: BuildPieceType): boolean {
  const nonBlocking: BuildPieceType[] = [
    "squareFloor", "triangleFloor", "floorFrame",
    "roof",
    "lowWall",
  ];
  return !nonBlocking.includes(pieceType);
}

// For doorway/window frames, get the opening bounds for projectile/pass-through
export function getOpeningBounds(pieceType: BuildPieceType, tier: TierType):
  | { minX: number; maxX: number; minY: number; maxY: number }[]
  | null {
  const s = TIER_SCALE[tier];
  switch (pieceType) {
    case "doorway":
      return [{ minX: -0.9 * s, maxX: 0.9 * s, minY: 0, maxY: 2.2 }];
    case "windowFrame":
      return [{ minX: -0.5 * s, maxX: 0.5 * s, minY: 1.2, maxY: 2.0 }];
    case "wallFrame":
      return [{ minX: -1.1 * s, maxX: 1.1 * s, minY: 0, maxY: 2.2 }];
    case "floorFrame":
      return [{ minX: -0.45 * s, maxX: 0.45 * s, minY: -0.45 * s, maxY: 0.45 * s }];
    default:
      return null;
  }
}

// ===== Deployable Geometry Generation =====
export function generateDeployableGeometry(type: DeployableType): THREE.BufferGeometry {
  const def = DEPLOYABLE_DEFS[type];
  const geos: THREE.BufferGeometry[] = [];

  switch (type) {
    case "woodenDoor": {
      // Door panel
      geos.push(new THREE.BoxGeometry(def.w, def.h, def.d));
      geos[geos.length - 1].translate(0, def.h / 2, 0);
      // Door frame (slightly larger border)
      const frameW = 0.06;
      const frameD = def.d + 0.04;
      // Left frame
      geos.push(boxAt(frameW, def.h, frameD, -def.w / 2, def.h / 2, 0));
      // Right frame
      geos.push(boxAt(frameW, def.h, frameD, def.w / 2, def.h / 2, 0));
      // Top frame
      geos.push(boxAt(def.w + frameW * 2, frameW, frameD, 0, def.h, 0));
      // Handle
      geos.push(boxAt(0.04, 0.04, 0.15, def.w / 2 - 0.15, def.h * 0.6, def.d / 2 + 0.03));
      break;
    }
    case "storageBox": {
      // Main body
      geos.push(boxAt(def.w, def.h * 0.7, def.d, 0, def.h * 0.35, 0));
      // Lid (slightly wider, thinner)
      geos.push(boxAt(def.w + 0.04, def.h * 0.15, def.d + 0.04, 0, def.h * 0.7 + def.h * 0.075, 0));
      // Metal bands
      for (const yFrac of [0.25, 0.65]) {
        geos.push(boxAt(def.w + 0.02, 0.03, def.d + 0.02, 0, def.h * yFrac, 0));
      }
      break;
    }
    case "campfire": {
      // Stone ring
      const ringR = def.w / 2;
      const ringH = def.h;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * (ringR - 0.12);
        const z = Math.sin(angle) * (ringR - 0.12);
        geos.push(boxAt(0.22, ringH, 0.22, x, ringH / 2, z));
      }
      // Logs in center
      geos.push(boxAt(def.w * 0.5, 0.06, 0.06, 0, 0.1, 0));
      geos.push(boxAt(0.06, 0.06, def.w * 0.5, 0, 0.1, 0));
      break;
    }
    case "furnace": {
      // Main body (box approximation of tapered cylinder)
      geos.push(boxAt(def.w, def.h, def.d, 0, def.h / 2, 0));
      // Chimney
      geos.push(boxAt(0.24, 0.5, 0.24, 0, def.h + 0.25, 0));
      // Door opening (dark face)
      geos.push(boxAt(0.5, 0.5, 0.05, 0, 0.35, def.d / 2));
      break;
    }
    case "workbench": {
      // Table top
      geos.push(boxAt(def.w, 0.08, def.d, 0, def.h * 0.85, 0));
      // 4 legs
      const legH = def.h * 0.85;
      const legW = 0.06;
      for (const [lx, lz] of [[-0.4, -0.35], [0.4, -0.35], [-0.4, 0.35], [0.4, 0.35]]) {
        geos.push(boxAt(legW, legH, legW, lx, legH / 2, lz));
      }
      // Cross beam under table
      geos.push(boxAt(def.w * 0.7, 0.06, 0.06, 0, def.h * 0.4, 0));
      break;
    }
  }

  return mergeGeometries(prepareForMerge(geos))!;
}

// Find snap position for free-placed deployables near existing same-type deployables
export function findDeployableSnapPosition(
  type: DeployableType,
  position: THREE.Vector3,
  placedDeployables: PlacedDeployable[],
): { snapped: boolean; position: THREE.Vector3 } {
  const snapRange = 2.0; // radius to detect nearby same-type deployables
  const snapDist = DEPLOYABLE_DEFS[type].w + 0.2; // distance between snapped deployables
  let best: THREE.Vector3 | null = null;
  let bestDist = Infinity;

  for (const dep of placedDeployables) {
    if (dep.type !== type) continue;
    const depPos = new THREE.Vector3(dep.worldX, dep.worldY, dep.worldZ);
    const dist = position.distanceTo(depPos);
    if (dist < snapRange && dist < bestDist) {
      bestDist = dist;
      // Snap to the side of the existing deployable closest to the placement point
      const dir = position.clone().sub(depPos).normalize();
      // For same-type snap: place next to it at snapDist
      const snapPos = depPos.clone().add(dir.multiplyScalar(snapDist));
      snapPos.y = dep.worldY; // same height
      best = snapPos;
    }
  }
  if (best) return { snapped: true, position: best };
  return { snapped: false, position };
}

// Check if a deployable placement would overlap an existing one
export function checkDeployableOverlap(
  type: DeployableType,
  position: THREE.Vector3,
  placedDeployables: PlacedDeployable[],
  excludeId?: number,
): boolean {
  const def = DEPLOYABLE_DEFS[type];
  const hw = def.w / 2;
  const hd = def.d / 2;
  // Tighter overlap margin — only block if they significantly overlap
  const margin = 0.1;

  for (const dep of placedDeployables) {
    if (dep.id === excludeId) continue;
    const depDef = DEPLOYABLE_DEFS[dep.type];
    const dx = Math.abs(position.x - dep.worldX);
    const dz = Math.abs(position.z - dep.worldZ);
    const overlapX = dx < hw + depDef.w / 2 - margin;
    const overlapZ = dz < hd + depDef.d / 2 - margin;
    if (overlapX && overlapZ) return true;
  }
  return false;
}

// Find doorway sockets for door placement
export function findDoorwaySockets(
  placedBuilds: PlacedBuildV2[],
  hitPoint: THREE.Vector3,
  range: number = 3.0,
): { position: THREE.Vector3; buildId: number; rotation: number } | null {
  let bestDist = Infinity;
  let bestSocket: { position: THREE.Vector3; buildId: number; rotation: number } | null = null;

  for (const pb of placedBuilds) {
    if (pb.pieceType !== "doorway") continue;
    const pbPos = new THREE.Vector3(pb.worldX, pb.worldY + BUILD_PIECE_DEFS.doorway.height / 2, pb.worldZ);

    // The door should be placed at the doorway center
    const dist = pbPos.distanceTo(hitPoint);
    if (dist < range && dist < bestDist) {
      bestDist = dist;
      bestSocket = {
        position: pbPos.clone(),
        buildId: pb.id,
        rotation: pb.rotation,
      };
    }
  }

  return bestSocket;
}
