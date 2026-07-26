// Radial menu item definitions for Building Plan, Hammer, and Upgrade radial menus.
// These arrays are consumed by the RadialMenu UI component.

export interface RadialItem {
  id: string;
  label: string;
  icon: string; // key into ICON_PATHS in RadialMenu.tsx
}

// ===== Building Plan radial (15 structural pieces) =====
export const BUILD_RADIAL_ITEMS: RadialItem[] = [
  { id: "sq-foundation",  label: "Sq. Found.",  icon: "sq-foundation" },
  { id: "tri-foundation",  label: "Tri. Found.",  icon: "tri-foundation" },
  { id: "wall",           label: "Wall",         icon: "wall" },
  { id: "half-wall",      label: "Half Wall",    icon: "half-wall" },
  { id: "low-wall",       label: "Low Wall",     icon: "low-wall" },
  { id: "doorway",        label: "Doorway",      icon: "doorway" },
  { id: "window",         label: "Window",       icon: "window" },
  { id: "wall-frame",     label: "Wall Frame",   icon: "wall-frame" },
  { id: "sq-floor",       label: "Sq. Floor",    icon: "sq-floor" },
  { id: "tri-floor",      label: "Tri. Floor",   icon: "tri-floor" },
  { id: "floor-frame",    label: "Floor Frame",  icon: "floor-frame" },
  { id: "u-stairs",       label: "U-Stairs",     icon: "u-stairs" },
  { id: "l-stairs",       label: "L-Stairs",     icon: "l-stairs" },
  { id: "straight-stairs", label: "Stairs",      icon: "straight-stairs" },
  { id: "roof",           label: "Roof",         icon: "roof" },
];

// ===== Hammer radial (4 actions) =====
export const HAMMER_RADIAL_ITEMS: RadialItem[] = [
  { id: "upgrade",   label: "Upgrade",   icon: "upgrade" },
  { id: "repair",    label: "Repair",    icon: "repair" },
  { id: "rotate",    label: "Rotate",    icon: "rotate" },
  { id: "demolish",  label: "Demolish",  icon: "demolish" },
];

// ===== Upgrade tier radial (4 material tiers) =====
export const UPGRADE_RADIAL_ITEMS: RadialItem[] = [
  { id: "wood",    label: "Wood",    icon: "wood" },
  { id: "stone",   label: "Stone",   icon: "stone" },
  { id: "metal",   label: "Metal",   icon: "metal" },
  { id: "armored", label: "Armored", icon: "armored" },
];
