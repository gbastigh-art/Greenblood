"use client";
// Rust-style radial menu for Building Plan and Hammer tools.
// Appears when holding RMB with these tools equipped. Cream/white background,
// orange/red segments with silhouette icons. Hover highlights segment.
// Center circle shows hovered item name, description, and resource cost.
import { useEffect, useMemo, useCallback } from "react";
import { useGame } from "@/lib/game/store";
import {
  BUILD_RADIAL_ITEMS,
  HAMMER_RADIAL_ITEMS,
  UPGRADE_RADIAL_ITEMS,
  BUILD_PIECE_DEFS,
  type RadialMenuItem,
} from "@/lib/game/building/index";

// Icon SVG path data — simple silhouettes
const ICON_PATHS: Record<string, string> = {
  squareFoundation: "M2,22 L2,2 L22,2 L22,22 Z",
  triangleFoundation: "M12,2 L22,22 L2,22 Z",
  wall: "M4,2 L20,2 L20,22 L4,22 Z",
  halfWall: "M4,10 L20,10 L20,22 L4,22 Z",
  lowWall: "M4,15 L20,15 L20,22 L4,22 Z",
  doorway: "M4,2 L20,2 L20,22 L4,22 Z M7,2 L7,14 L17,14 L17,2",
  windowFrame: "M4,2 L20,2 L20,22 L4,22 Z M7,4 L17,4 L17,12 L7,12 Z",
  wallFrame: "M4,2 L20,2 L20,22 L4,22 Z M6,4 L18,4 L18,20 L6,20 Z",
  squareFloor: "M2,2 L22,2 L22,22 L2,22 Z",
  triangleFloor: "M12,2 L22,22 L2,22 Z",
  floorFrame: "M2,2 L22,2 L22,22 L2,22 Z M6,6 L18,6 L18,18 L6,18 Z",
  uStairs: "M5,20 L5,6 L10,6 L10,14 L15,14 L15,6 L20,6 L20,20 Z",
  lStairs: "M5,20 L5,6 L10,6 L10,10 L20,10 L20,14 L15,14 L15,20 Z",
  straightStairs: "M3,20 L3,16 L7,12 L11,8 L15,4 L19,4 L19,8 L15,12 L11,16 L7,20 Z",
  roof: "M2,18 L12,2 L22,18 Z",
  upgrade: "M12,4 L12,20 M6,10 L12,4 L18,10",
  repair: "M8,18 L4,18 L4,14 M16,18 L20,18 L20,14 M8,10 L8,6 L12,2 L16,6 L16,10",
  rotate: "M18,8 A8,8 0 1,0 16,4",
  demolish: "M6,6 L18,18 M18,6 L6,18",
  wood: "M12,20 L12,8 M8,8 L12,4 L16,8",
  stone: "M8,20 L12,4 L16,20 Z",
  metal: "M4,8 L10,8 L10,16 L4,16 Z M14,8 L20,8 L20,16 L14,16 Z",
  armored: "M12,3 L20,8 L20,16 L12,21 L4,16 L4,8 Z",
};

function getIconForItem(item: RadialMenuItem): string {
  return ICON_PATHS[item.data] || item.icon;
}

// Segment angle calculation — starts from top (-PI/2) going clockwise
function getSegmentAngle(index: number, total: number): { start: number; end: number } {
  const anglePerSegment = (2 * Math.PI) / total;
  const start = -Math.PI / 2 + index * anglePerSegment;
  const end = start + anglePerSegment;
  return { start, end };
}

function angleInSegment(angle: number, start: number, end: number): boolean {
  let a = angle;
  while (a < -Math.PI) a += 2 * Math.PI;
  while (a > Math.PI) a -= 2 * Math.PI;
  let s = start;
  let e = end;
  while (s < -Math.PI) s += 2 * Math.PI;
  while (e < -Math.PI) e += 2 * Math.PI;
  while (s > Math.PI) s -= 2 * Math.PI;
  while (e > Math.PI) e -= 2 * Math.PI;
  if (s < e) return a >= s && a < e;
  return a >= s || a < e;
}

export function RadialMenu() {
  const radialMenuOpen = useGame((s) => s.radialMenuOpen);
  const radialMenuType = useGame((s) => s.radialMenuType);
  const radialMenuMouseX = useGame((s) => s.radialMenuMouseX);
  const radialMenuMouseY = useGame((s) => s.radialMenuMouseY);
  const setRadialHoveredIndex = useGame((s) => s.setRadialHoveredIndex);
  const confirmRadialSelection = useGame((s) => s.confirmRadialSelection);
  const countItem = useGame((s) => s.countItem);

  // Get items based on menu type
  const items = useMemo(() => {
    if (!radialMenuType) return [];
    switch (radialMenuType) {
      case "build": return BUILD_RADIAL_ITEMS;
      case "hammer": return HAMMER_RADIAL_ITEMS;
      case "upgrade": return UPGRADE_RADIAL_ITEMS;
      default: return [];
    }
  }, [radialMenuType]);

  // Track if upgrade menu was opened (doesn't require hold)
  const isUpgradeMenu = radialMenuType === "upgrade";

  // Calculate hovered segment from mouse position
  const hoveredIndex = useMemo(() => {
    if (!radialMenuOpen || items.length === 0) return -1;
    const dx = radialMenuMouseX;
    const dy = radialMenuMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Dead center zone — hollow center
    if (dist < 0.15) return -1;
    const angle = Math.atan2(dy, dx);
    for (let i = 0; i < items.length; i++) {
      const { start, end } = getSegmentAngle(i, items.length);
      if (angleInSegment(angle, start, end)) return i;
    }
    return -1;
  }, [radialMenuOpen, radialMenuMouseX, radialMenuMouseY, items]);

  // Update store with hovered index
  useEffect(() => {
    setRadialHoveredIndex(hoveredIndex);
  }, [hoveredIndex, setRadialHoveredIndex]);

  // Handle selection: 
  // For build/hammer menus (hold RMB): selection on RMB release
  // For upgrade menu (no hold needed): selection on LMB click
  const handleLMBClick = useCallback((e: MouseEvent) => {
    if (!radialMenuOpen || !isUpgradeMenu) return;
    e.preventDefault();
    e.stopPropagation();
    if (hoveredIndex >= 0 && hoveredIndex < items.length) {
      confirmRadialSelection(items[hoveredIndex].data);
    } else {
      confirmRadialSelection(null);
    }
  }, [radialMenuOpen, isUpgradeMenu, hoveredIndex, items, confirmRadialSelection]);

  // Listen for LMB clicks when upgrade menu is open
  useEffect(() => {
    if (!isUpgradeMenu) return;
    window.addEventListener("mousedown", handleLMBClick);
    return () => window.removeEventListener("mousedown", handleLMBClick);
  }, [isUpgradeMenu, handleLMBClick]);

  // Handle RMB release (selection for build/hammer menus)
  useEffect(() => {
    if (!radialMenuOpen || isUpgradeMenu) return;
    const onUp = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        if (hoveredIndex >= 0 && hoveredIndex < items.length) {
          confirmRadialSelection(items[hoveredIndex].data);
        } else {
          confirmRadialSelection(null);
        }
      }
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [radialMenuOpen, isUpgradeMenu, hoveredIndex, items, confirmRadialSelection]);

  if (!radialMenuOpen || items.length === 0) return null;

  // Bigger menu sizes
  const size = items.length > 8 ? 560 : 500;
  const center = size / 2;
  const radius = size / 2 - 15;
  const innerRadius = radius * 0.32; // Larger hollow center for info display
  const anglePerSegment = 360 / items.length;

  // Get hovered item info for center display
  const hoveredItem = hoveredIndex >= 0 && hoveredIndex < items.length ? items[hoveredIndex] : null;
  const pieceDef = hoveredItem?.data ? BUILD_PIECE_DEFS[hoveredItem.data as keyof typeof BUILD_PIECE_DEFS] : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ pointerEvents: isUpgradeMenu ? "auto" : "none" }}
    >
      {/* Blur overlay — blurs the area outside the menu */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
          backgroundColor: "rgba(0, 0, 0, 0.25)",
          pointerEvents: "none",
        }}
      />

      {/* Radial wheel */}
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          pointerEvents: "none",
        }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
          style={{ filter: "drop-shadow(0 6px 24px rgba(0,0,0,0.7))" }}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="#f0ead6"
          />
          {/* Inner hollow circle — shows info when hovering */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill={hoveredItem ? "rgba(240, 234, 214, 0.95)" : "rgba(240, 234, 214, 0.85)"}
            stroke="#e0d8c0"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />

          {/* Draw each segment */}
          {items.map((item, i) => {
            const { start } = getSegmentAngle(i, items.length);
            const nextAngle = start + (2 * Math.PI) / items.length;
            const isHovered = hoveredIndex === i;

            // Arc path for the segment
            const x1Outer = center + radius * Math.cos(start);
            const y1Outer = center + radius * Math.sin(start);
            const x2Outer = center + radius * Math.cos(nextAngle);
            const y2Outer = center + radius * Math.sin(nextAngle);
            const x1Inner = center + innerRadius * Math.cos(start);
            const y1Inner = center + innerRadius * Math.sin(start);
            const x2Inner = center + innerRadius * Math.cos(nextAngle);
            const y2Inner = center + innerRadius * Math.sin(nextAngle);

            const largeArc = anglePerSegment > 180 ? 1 : 0;

            const pathD = [
              `M ${x1Outer} ${y1Outer}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
              `L ${x2Inner} ${y2Inner}`,
              `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}`,
              "Z",
            ].join(" ");

            // Icon position (midpoint of segment, at ~50% of radius range) — no labels
            const midAngle = start + (Math.PI) / items.length;
            const iconR = innerRadius + (radius - innerRadius) * 0.50;
            const iconX = center + iconR * Math.cos(midAngle);
            const iconY = center + iconR * Math.sin(midAngle);

            const iconPath = getIconForItem(item);
            const iconScale = items.length > 8 ? 1.6 : 2.0;

            return (
              <g key={item.id}>
                {/* Segment fill — no stroke/lines between segments */}
                <path
                  d={pathD}
                  fill={isHovered ? "#c44020" : "rgba(196, 64, 32, 0.10)"}
                  style={{ transition: "fill 0.08s ease" }}
                />
                {/* Icon only — no text labels on segments */}
                <g
                  transform={`translate(${iconX - 12 * iconScale / 2}, ${iconY - 12 * iconScale / 2}) scale(${iconScale})`}
                >
                  <path
                    d={iconPath}
                    fill="none"
                    stroke={isHovered ? "#ffffff" : "#d45030"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: "stroke 0.08s ease" }}
                  />
                </g>
              </g>
            );
          })}

          {/* Center info text — shown for all menu types when hovering */}
          {hoveredItem && (() => {
            // Compute text layout based on what info is available
            const hasPieceDef = !!pieceDef;
            const hasResourceCost = !!hoveredItem.resourceCost && !pieceDef;
            const hasDesc = !!(pieceDef?.description || hoveredItem.description);

            // Name Y position
            const nameY = (hasPieceDef || hasResourceCost) ? center - 22 : (hasDesc ? center - 12 : center - 4);
            // Description Y position
            const descY = (hasPieceDef || hasResourceCost) ? center - 6 : center + 6;
            // Cost Y position (always same when present)
            const costY = center + 14;
            const haveY = center + 28;

            return (
              <g>
                <text
                  x={center} y={nameY}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#2a1f14" fontSize="13" fontWeight="bold"
                  fontFamily="sans-serif" style={{ userSelect: "none" }}
                >
                  {pieceDef ? pieceDef.displayName : hoveredItem.label}
                </text>

                {hasDesc && (
                  <text
                    x={center} y={descY}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#6b5a4a" fontSize="8"
                    fontFamily="sans-serif" style={{ userSelect: "none" }}
                  >
                    {pieceDef?.description || hoveredItem.description}
                  </text>
                )}

                {/* Resource cost — for build pieces */}
                {pieceDef && (() => {
                  const cost = pieceDef.woodCost;
                  const owned = countItem(pieceDef.resourceType);
                  const hasEnough = owned >= cost;
                  const label = pieceDef.resourceType === "wood" ? "Wood" : pieceDef.resourceType;
                  return (
                    <>
                      <text x={center} y={costY}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={hasEnough ? "#4a8a3a" : "#c44020"}
                        fontSize="11" fontWeight="bold"
                        fontFamily="sans-serif" style={{ userSelect: "none" }}
                      >{cost} {label}</text>
                      <text x={center} y={haveY}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="#8a7a6a" fontSize="9"
                        fontFamily="sans-serif" style={{ userSelect: "none" }}
                      >Have: {owned}</text>
                    </>
                  );
                })()}

                {/* Resource cost — for upgrade tiers */}
                {hoveredItem.resourceCost && !pieceDef && (() => {
                  const rc = hoveredItem.resourceCost;
                  const owned = countItem(rc.id);
                  const hasEnough = owned >= rc.qty;
                  return (
                    <>
                      <text x={center} y={costY}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={hasEnough ? "#4a8a3a" : "#c44020"}
                        fontSize="11" fontWeight="bold"
                        fontFamily="sans-serif" style={{ userSelect: "none" }}
                      >{rc.qty} {rc.label}</text>
                      <text x={center} y={haveY}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="#8a7a6a" fontSize="9"
                        fontFamily="sans-serif" style={{ userSelect: "none" }}
                      >Have: {owned}</text>
                    </>
                  );
                })()}
              </g>
            );
          })()}

          {/* Center hint when nothing hovered */}
          {!hoveredItem && (
            <text
              x={center}
              y={center}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#a09880"
              fontSize="10"
              fontFamily="sans-serif"
              style={{ userSelect: "none" }}
            >
              Select...
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
