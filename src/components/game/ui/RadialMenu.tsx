"use client";
// Rust-style radial menu for Building Plan and Hammer tools.
// Appears when holding RMB with these tools equipped. Cream/white background,
// orange/red segments with silhouette icons. Hover highlights segment.
import { useEffect, useMemo } from "react";
import { useGame } from "@/lib/game/store";
import {
  BUILD_RADIAL_ITEMS,
  HAMMER_RADIAL_ITEMS,
  UPGRADE_RADIAL_ITEMS,
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
  // Start from top (-PI/2) and go clockwise
  const start = -Math.PI / 2 + index * anglePerSegment;
  const end = start + anglePerSegment;
  return { start, end };
}

function angleInSegment(angle: number, start: number, end: number): boolean {
  // Normalize angle to -PI..PI
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

  // Calculate hovered segment from mouse position
  const hoveredIndex = useMemo(() => {
    if (!radialMenuOpen || items.length === 0) return -1;
    const dx = radialMenuMouseX;
    const dy = radialMenuMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Dead center zone (within 15% of radius)
    if (dist < 0.15) return -1;
    // Calculate angle from center (atan2 gives angle from positive X axis)
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

  // Handle RMB release (selection)
  useEffect(() => {
    if (!radialMenuOpen) return;
    const onUp = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        if (hoveredIndex >= 0 && hoveredIndex < items.length) {
          confirmRadialSelection(items[hoveredIndex].data);
        } else {
          confirmRadialSelection(null); // cancel
        }
      }
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [radialMenuOpen, hoveredIndex, items, confirmRadialSelection]);

  if (!radialMenuOpen || items.length === 0) return null;

  // Much bigger menu
  const size = items.length > 8 ? 440 : 380;
  const center = size / 2;
  const radius = size / 2 - 10;
  const innerRadius = radius * 0.22;
  const anglePerSegment = 360 / items.length;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
      style={{ opacity: 1, transition: "opacity 0.1s ease-out" }}
    >
      {/* Radial wheel */}
      <div
        className="relative"
        style={{
          width: size,
          height: size,
        }}
      >
        {/* Cream/white background circle */}
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
          style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.6))" }}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="#f0ead6"
          />
          {/* Inner dead zone circle */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="#e8e0cc"
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

            // Icon position (midpoint of segment, at ~60% radius)
            const midAngle = start + (Math.PI) / items.length;
            const iconR = radius * 0.55;
            const iconX = center + iconR * Math.cos(midAngle);
            const iconY = center + iconR * Math.sin(midAngle);

            // Label position (at ~82% radius)
            const labelR = radius * 0.82;
            const labelX = center + labelR * Math.cos(midAngle);
            const labelY = center + labelR * Math.sin(midAngle);

            const iconPath = getIconForItem(item);
            const iconScale = items.length > 8 ? 1.6 : 2.0;

            return (
              <g key={item.id}>
                {/* Segment fill — no stroke/lines between segments */}
                <path
                  d={pathD}
                  fill={isHovered ? "#c44020" : "rgba(196, 64, 32, 0.12)"}
                  style={{ transition: "fill 0.08s ease" }}
                />
                {/* Icon */}
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
                {/* Label */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isHovered ? "#ffffff" : "#5a4a3a"}
                  fontSize={items.length > 8 ? "7" : "8"}
                  fontFamily="sans-serif"
                  fontWeight={isHovered ? "bold" : "normal"}
                  style={{ transition: "fill 0.08s ease", userSelect: "none" }}
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
