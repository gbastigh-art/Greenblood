"use client";
// Top compass bar — shows cardinal directions and yaw degrees.
export function Compass({ yaw }: { yaw: number }) {
  const dirs = [
    { deg: 0, label: "N" },
    { deg: 45, label: "NE" },
    { deg: 90, label: "E" },
    { deg: 135, label: "SE" },
    { deg: 180, label: "S" },
    { deg: 225, label: "SW" },
    { deg: 270, label: "W" },
    { deg: 315, label: "NW" },
  ];
  // yaw is in radians, 0 = facing -Z (north). Convert to compass deg.
  let deg = (-yaw * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360;
  const ticks: { label: string; x: number; isCardinal: boolean; isOrdinal: boolean }[] = [];
  for (let d = -90; d <= 90; d += 15) {
    const cd = ((deg + d) % 360 + 360) % 360;
    const isCardinal = cd % 90 === 0; // N, E, S, W
    const isOrdinal = cd % 45 === 0;  // NE, SE, SW, NW
    const cardinal = dirs.find((x) => x.deg === cd);
    const label = cardinal ? cardinal.label : isOrdinal ? "" : `${Math.round(cd)}`;
    ticks.push({ label, x: (d / 90) * 50 + 50, isCardinal, isOrdinal });
  }

  return (
    <div className="pointer-events-none fixed top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1">
      <div className="relative w-[300px] sm:w-[360px] md:w-[420px] h-10 bg-black/65 backdrop-blur-md rounded-full border border-white/15 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
        {/* Top fade — markings fade in/out at top edge */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-[5]" />
        {/* Side fades for edge fade-in/out */}
        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-[5]" />
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-[5]" />
        {/* center marker — vertical amber line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-amber-400 z-10 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-amber-400 z-10" />
        {/* ticks (letters + degree numbers) */}
        {ticks.map((t, i) => {
          const isLetter = t.isCardinal || t.isOrdinal;
          // A letter is "centered" when near x=50 — grow it + add glow.
          const distFromCenter = Math.abs(t.x - 50);
          const isCentered = isLetter && distFromCenter < 6;
          return (
            <div
              key={i}
              className={`absolute font-bold transition-all ${
                isLetter
                  ? isCentered
                    ? "text-amber-300 text-[16px] drop-shadow-[0_0_8px_rgba(251,191,36,0.9)] scale-110"
                    : "text-white text-[13px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  : "text-white/55 text-[10px] font-mono"
              }`}
              style={{ left: `${t.x}%`, top: "42%", transform: "translate(-50%, -50%)" }}
            >
              {t.label}
            </div>
          );
        })}
        {/* Tick marks — small vertical lines at bottom of strip, every 15°. Longer at cardinals. */}
        {ticks.map((t, i) => (
          <div
            key={`tick-${i}`}
            className={`absolute bottom-0 w-px ${t.isCardinal ? "h-3 bg-white/80" : t.isOrdinal ? "h-2 bg-white/55" : "h-1.5 bg-white/35"}`}
            style={{ left: `${t.x}%`, transform: "translateX(-50%)" }}
          />
        ))}
      </div>
      {/* Heading chip — current degree number below compass */}
      <div className="px-2 py-0.5 rounded-full bg-black/50 border border-white/15 text-[10px] font-mono text-amber-200 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
        {Math.round(deg)}°
      </div>
    </div>
  );
}
