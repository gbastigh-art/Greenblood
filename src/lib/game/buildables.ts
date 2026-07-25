// Buildable structures and their 3D specs.
// Each buildable has a footprint (grid size), a height, and rendering info.

export type BuildKind =
  | "woodWall"
  | "woodFloor"
  | "woodRoof"
  | "woodDoor"
  | "woodPillar"
  | "woodStairs"
  | "woodWindow"
  | "woodLadder"
  | "stoneWall"
  | "stoneFloor"
  | "stoneRoof"
  | "stoneDoor"
  | "stoneStairs"
  | "stoneWindow"
  | "gate"
  | "triangularRoof"
  | "halfWall"
  | "fencePost"
  | "fenceGate"
  | "campfire"
  | "bed"
  | "woodChest"
  | "torch"
  | "workbench"
  | "furnace"
  | "anvil"
  | "dryingRack"
  | "farmingPlot"
  | "rainBarrel"
  | "signPost"
  | "scarecrow"
  | "beehive"
  | "ramp"
  | "balcony"
  | "triangularFloor"
  | "raft"
  | "questBoard"
  | "generator"
  | "wire"
  | "electricLight"
  | "cookingPot";

export interface BuildDef {
  kind: BuildKind;
  itemId: string;
  w: number; // x size in meters
  d: number; // z size in meters
  h: number; // height in meters
  color: number;
  snapHeight?: number; // multiples of WALL_H
  category: "structure" | "furniture";
}

// Global building grid
export const GRID = 3; // 3 meters per cell (Rust-like)
export const WALL_H = 3; // 3 meters per story
export const EYE_H = 1.7;

export const BUILDS: Record<BuildKind, BuildDef> = {
  woodWall: { kind: "woodWall", itemId: "woodWall", w: 3, d: 0.25, h: WALL_H, color: 0x8b5a2b, snapHeight: 1, category: "structure" },
  woodFloor: { kind: "woodFloor", itemId: "woodFloor", w: 3, d: 3, h: 0.2, color: 0x9b6a3b, category: "structure" },
  woodRoof: { kind: "woodRoof", itemId: "woodRoof", w: 3, d: 3, h: 1.5, color: 0x7b4a1b, category: "structure" },
  woodDoor: { kind: "woodDoor", itemId: "woodDoor", w: 3, d: 0.25, h: WALL_H, color: 0x6b4220, snapHeight: 1, category: "structure" },
  woodPillar: { kind: "woodPillar", itemId: "woodPillar", w: 0.3, d: 0.3, h: WALL_H, color: 0x7b4a1b, snapHeight: 1, category: "structure" },
  woodStairs: { kind: "woodStairs", itemId: "woodStairs", w: 3, d: 3, h: WALL_H, color: 0x8b5a2b, snapHeight: 1, category: "structure" },
  woodWindow: { kind: "woodWindow", itemId: "woodWindow", w: 3, d: 0.25, h: WALL_H, color: 0x9b6a3b, snapHeight: 1, category: "structure" },
  woodLadder: { kind: "woodLadder", itemId: "woodLadder", w: 0.5, d: 0.5, h: WALL_H, color: 0x7b4a1b, snapHeight: 1, category: "structure" },
  stoneWall: { kind: "stoneWall", itemId: "stoneWall", w: 3, d: 0.3, h: WALL_H, color: 0x7a7a7a, snapHeight: 1, category: "structure" },
  stoneFloor: { kind: "stoneFloor", itemId: "stoneFloor", w: 3, d: 3, h: 0.2, color: 0x888888, category: "structure" },
  stoneRoof: { kind: "stoneRoof", itemId: "stoneRoof", w: 3, d: 3, h: 1.5, color: 0x6a6a6a, category: "structure" },
  stoneDoor: { kind: "stoneDoor", itemId: "stoneDoor", w: 3, d: 0.3, h: WALL_H, color: 0x5a5a5a, snapHeight: 1, category: "structure" },
  stoneStairs: { kind: "stoneStairs", itemId: "stoneStairs", w: 3, d: 3, h: WALL_H, color: 0x7a7a7a, snapHeight: 1, category: "structure" },
  stoneWindow: { kind: "stoneWindow", itemId: "stoneWindow", w: 3, d: 0.3, h: WALL_H, color: 0x888888, snapHeight: 1, category: "structure" },
  gate: { kind: "gate", itemId: "gate", w: 3, d: 0.3, h: WALL_H * 1.5, color: 0x5a3a1a, snapHeight: 1, category: "structure" },
  // Phase 4: new structure pieces
  triangularRoof: { kind: "triangularRoof", itemId: "triangularRoof", w: 3, d: 3, h: 1.5, color: 0x7b4a1b, category: "structure" },
  halfWall: { kind: "halfWall", itemId: "halfWall", w: 3, d: 0.25, h: 1.5, color: 0x8b5a2b, category: "structure" },
  fencePost: { kind: "fencePost", itemId: "fencePost", w: 0.2, d: 0.2, h: 1.2, color: 0x7c4a2a, category: "structure" },
  fenceGate: { kind: "fenceGate", itemId: "fenceGate", w: 3, d: 0.3, h: 1.5, color: 0x6b4220, category: "structure" },
  campfire: { kind: "campfire", itemId: "campfire", w: 1.2, d: 1.2, h: 0.4, color: 0x222222, category: "furniture" },
  bed: { kind: "bed", itemId: "bed", w: 1, d: 2.2, h: 0.6, color: 0x8b5a2b, category: "furniture" },
  woodChest: { kind: "woodChest", itemId: "woodChest", w: 1.2, d: 0.7, h: 0.9, color: 0x6b4220, category: "furniture" },
  torch: { kind: "torch", itemId: "torch", w: 0.15, d: 0.15, h: 1.4, color: 0xd97706, category: "furniture" },
  workbench: { kind: "workbench", itemId: "workbench", w: 2.2, d: 1, h: 1.0, color: 0x7c4a2a, category: "furniture" },
  furnace: { kind: "furnace", itemId: "furnace", w: 1, d: 1, h: 1.2, color: 0x444444, category: "furniture" },
  anvil: { kind: "anvil", itemId: "anvil", w: 0.8, d: 0.6, h: 0.9, color: 0x2a2a2a, category: "furniture" },
  dryingRack: { kind: "dryingRack", itemId: "dryingRack", w: 1.2, d: 0.5, h: 1.6, color: 0x7c4a2a, category: "furniture" },
  farmingPlot: { kind: "farmingPlot", itemId: "farmingPlot", w: 2.8, d: 2.8, h: 0.2, color: 0x5a4a2a, category: "furniture" },
  rainBarrel: { kind: "rainBarrel", itemId: "rainBarrel", w: 1, d: 1, h: 1.2, color: 0x4a5a6a, category: "furniture" },
  signPost: { kind: "signPost", itemId: "signPost", w: 0.2, d: 0.2, h: 2.0, color: 0x7c4a2a, category: "furniture" },
  scarecrow: { kind: "scarecrow", itemId: "scarecrow", w: 0.6, d: 0.6, h: 1.8, color: 0x8b5a2b, category: "furniture" },
  // Phase 4: beekeeping
  beehive: { kind: "beehive", itemId: "beehive", w: 1.2, d: 1.2, h: 1.5, color: 0xd4a020, category: "furniture" },
  // Phase 5: new structures + furniture
  ramp: { kind: "ramp", itemId: "ramp", w: 3, d: 3, h: WALL_H, color: 0x8b5a2b, snapHeight: 1, category: "structure" },
  balcony: { kind: "balcony", itemId: "balcony", w: 3, d: 1.5, h: 0.2, color: 0x9b6a3b, category: "structure" },
  triangularFloor: { kind: "triangularFloor", itemId: "triangularFloor", w: 3, d: 3, h: 0.2, color: 0x9b6a3b, category: "structure" },
  raft: { kind: "raft", itemId: "raft", w: 2.5, d: 2.5, h: 0.3, color: 0x7c4a2a, category: "furniture" },
  questBoard: { kind: "questBoard", itemId: "questBoard", w: 1.2, d: 0.2, h: 2.0, color: 0x7c4a2a, category: "furniture" },
  // Phase 6: electricity
  generator: { kind: "generator", itemId: "generator", w: 0.8, d: 0.8, h: 1.2, color: 0x5a5a5a, category: "furniture" },
  wire: { kind: "wire", itemId: "wire", w: 0.1, d: 0.1, h: 3, color: 0x8a8a3a, category: "furniture" },
  electricLight: { kind: "electricLight", itemId: "electricLight", w: 0.3, d: 0.3, h: 0.3, color: 0xfff5d0, category: "furniture" },
  // Phase 7: cooking pot
  cookingPot: { kind: "cookingPot", itemId: "cookingPot", w: 1.0, d: 1.0, h: 0.6, color: 0x4a4a4a, category: "furniture" },
};

export interface PlacedBuild {
  id: number;
  kind: BuildKind;
  gx: number;
  gz: number;
  gy: number; // vertical level
  rot: number; // 0,1,2,3 quarter turns
  hp: number;
  worldX: number;
  worldZ: number;
  worldY: number;
}

export function snapToGrid(x: number, z: number) {
  return {
    gx: Math.round(x / GRID),
    gz: Math.round(z / GRID),
  };
}

export function gridToWorld(gx: number, gz: number) {
  return { x: gx * GRID, z: gz * GRID };
}

// Auto-snap target finder — Rust-style.
// Tries to snap walls to adjacent walls, raises gy if stacked on floor.
export function findSnapTarget(
  newKind: BuildKind,
  x: number,
  z: number,
  y: number,
  existing: PlacedBuild[]
): { gx: number; gz: number; gy: number; rot: number; worldX: number; worldZ: number; worldY: number } {
  const def = BUILDS[newKind];
  const snap = snapToGrid(x, z);
  const { x: wx, z: wz } = gridToWorld(snap.gx, snap.gz);

  // For walls/doors — copy rotation of adjacent wall if any
  let rot = 0;
  if (def.snapHeight) {
    const neighbors = existing.filter(
      (b) =>
        BUILDS[b.kind].snapHeight &&
        ((Math.abs(b.gx - snap.gx) === 1 && b.gz === snap.gz) ||
          (Math.abs(b.gz - snap.gz) === 1 && b.gx === snap.gx))
    );
    if (neighbors.length > 0) {
      rot = neighbors[0].rot;
    }
    let gy = 0;
    const sameCol = existing.filter(
      (b) => b.gx === snap.gx && b.gz === snap.gz && BUILDS[b.kind].snapHeight
    );
    if (sameCol.length > 0) gy = Math.max(...sameCol.map((b) => b.gy + 1));
    if (y > gy * WALL_H + 1.5) gy += 1;
    return { gx: snap.gx, gz: snap.gz, gy, rot, worldX: wx, worldZ: wz, worldY: gy * WALL_H };
  }
  // Furniture: snap to grid but stay at ground level
  return { gx: snap.gx, gz: snap.gz, gy: 0, rot, worldX: wx, worldZ: wz, worldY: 0 };
}
