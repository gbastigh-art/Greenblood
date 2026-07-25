"use client";
// Phase 7: Companion command radial menu — appears when F is pressed near companion.
// Shows 4 options in a circle: Follow (top), Wait (right), Gather (bottom), Attack (left).
import { useGame } from "@/lib/game/store";

type Command = "follow" | "wait" | "gather" | "attack";

const COMMANDS: { cmd: Command; icon: string; label: string; labelLong: string; angle: number }[] = [
  { cmd: "follow", icon: "🏃", label: "Follow", labelLong: "Following", angle: -90 },   // top
  { cmd: "wait", icon: "✋", label: "Wait", labelLong: "Waiting", angle: 0 },           // right
  { cmd: "gather", icon: "🌾", label: "Gather", labelLong: "Gathering", angle: 90 },    // bottom
  { cmd: "attack", icon: "⚔️", label: "Attack", labelLong: "Attacking", angle: 180 },  // left
];

export function CompanionCommandMenu() {
  const menuOpen = useGame((s) => s.companionCommandMenuOpen);
  const currentCmd = useGame((s) => s.companionCommand);
  const setCommand = useGame((s) => s.setCompanionCommand);
  const toggleMenu = useGame((s) => s.toggleCompanionCommandMenu);
  const mode = useGame((s) => s.mode);

  if (!menuOpen || mode !== "play") return null;

  const RADIUS = 70; // px from center

  return (
    <>
      {/* Dimmed backdrop — click to close */}
      <div
        className="fixed inset-0 z-[60] bg-black/20"
        onClick={toggleMenu}
      />
      {/* Radial menu centered on screen */}
      <div className="pointer-events-auto fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61]">
        {COMMANDS.map(({ cmd, icon, label, angle }) => {
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * RADIUS;
          const y = Math.sin(rad) * RADIUS;
          const isActive = currentCmd === cmd;

          return (
            <button
              key={cmd}
              onClick={() => setCommand(cmd)}
              className={`absolute flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 transition-all duration-150 -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                isActive
                  ? "bg-amber-900/90 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.5)] scale-110"
                  : "bg-zinc-900/90 border-amber-500/40 hover:border-amber-400 hover:bg-amber-900/70 hover:scale-105"
              }`}
              style={{
                left: x,
                top: y,
              }}
              title={label}
            >
              <span className="text-xl">{icon}</span>
              <span className={`text-[9px] font-bold mt-0.5 ${isActive ? "text-amber-300" : "text-amber-100/70"}`}>
                {label}
              </span>
            </button>
          );
        })}
        {/* Center indicator */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900/80 border border-amber-500/30">
          <span className="text-amber-400 text-xs font-bold">F</span>
        </div>
      </div>
    </>
  );
}
