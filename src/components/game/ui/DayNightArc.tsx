"use client";
// Phase 9: Day/Night Progress Arc widget
// Top-left under the WILDERNESS logo — shows a curved arc representing the sun/moon
// position through the day. Also shows current time, day count, and time until
// the next sunrise/sunset. Has a glowing sun (day) or moon (night) icon that
// travels along the arc as time progresses.
import { useGame } from "@/lib/game/store";

function formatTime(t: number): string {
  const hours = Math.floor(t * 24);
  const mins = Math.floor((t * 24 - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function DayNightArc() {
  const timeOfDay = useGame((s) => s.timeOfDay);
  const dayCount = useGame((s) => s.dayCount);
  const weather = useGame((s) => s.weather);

  // timeOfDay: 0 = midnight, 0.25 = sunrise (06:00), 0.5 = noon, 0.75 = sunset (18:00)
  // Convert to angle on arc: 0..1 → 180°..360° (left side to right side, top semicircle)
  // Map timeOfDay to arc angle: t=0 (midnight) → far left, t=0.5 (noon) → top center, t=1 → far right
  const arcAngle = timeOfDay * Math.PI; // 0..π
  // Sun position on semicircle (top half)
  // Center coordinates of arc (svg viewBox 100x60, center at 50,50)
  const cx = 50;
  const cy = 50;
  const r = 42;
  const sunX = cx - Math.cos(arcAngle) * r;
  const sunY = cy - Math.sin(arcAngle) * r;

  // Determine if day or night
  const isDay = timeOfDay > 0.25 && timeOfDay < 0.75;
  // Determine phase
  const phase = isDay
    ? timeOfDay < 0.3 ? "Dawn" : timeOfDay < 0.7 ? "Day" : "Dusk"
    : timeOfDay < 0.2 || timeOfDay > 0.8 ? "Night" : "Twilight";

  // Calculate time to next sunrise (0.25) or sunset (0.75)
  let nextEvent: { label: string; time: number };
  if (timeOfDay < 0.25) {
    const diff = (0.25 - timeOfDay) * 24 * 60; // minutes
    nextEvent = { label: "Sunrise", time: diff };
  } else if (timeOfDay < 0.75) {
    const diff = (0.75 - timeOfDay) * 24 * 60;
    nextEvent = { label: "Sunset", time: diff };
  } else {
    const diff = (1.25 - timeOfDay) * 24 * 60;
    nextEvent = { label: "Sunrise", time: diff };
  }
  const minsToEvent = Math.floor(nextEvent.time);
  const eventTimeStr = `${Math.floor(minsToEvent / 60)}h ${minsToEvent % 60}m`;

  // Color shifts for the arc
  const skyGradient = isDay
    ? "from-amber-300 via-sky-400 to-indigo-500"  // daytime
    : "from-indigo-900 via-purple-900 to-slate-900"; // nighttime

  return (
    <div className="pointer-events-none fixed top-12 left-3 z-30 select-none">
      <style>{`
        @keyframes arc-glow {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(251,191,36,0.6)); }
          50%      { filter: drop-shadow(0 0 10px rgba(251,191,36,0.95)); }
        }
        @keyframes moon-glow {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(199,210,254,0.5)); }
          50%      { filter: drop-shadow(0 0 8px rgba(199,210,254,0.85)); }
        }
        .sun-dot { animation: arc-glow 2s ease-in-out infinite; }
        .moon-dot { animation: moon-glow 3s ease-in-out infinite; }
      `}</style>
      <div className="flex flex-col gap-1">
        <div className="relative w-[140px] h-[78px] bg-black/55 backdrop-blur-sm rounded-lg border border-white/12 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
          {/* Sky gradient backdrop */}
          <div className={`absolute inset-0 bg-gradient-to-b ${skyGradient} opacity-25`} />
          {/* Stars at night */}
          {!isDay && (
            <div className="absolute inset-0 opacity-60">
              {[
                { x: "15%", y: "20%", s: 1 },
                { x: "30%", y: "35%", s: 1.5 },
                { x: "55%", y: "15%", s: 1 },
                { x: "75%", y: "30%", s: 1.5 },
                { x: "85%", y: "50%", s: 1 },
                { x: "20%", y: "55%", s: 1 },
                { x: "65%", y: "55%", s: 1.2 },
              ].map((s, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    left: s.x,
                    top: s.y,
                    width: `${s.s}px`,
                    height: `${s.s}px`,
                    opacity: 0.7,
                    boxShadow: "0 0 2px rgba(255,255,255,0.8)",
                  }}
                />
              ))}
            </div>
          )}
          {/* SVG arc */}
          <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="dayArc" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(251,191,36,0.2)" />
                <stop offset="50%" stopColor="rgba(251,191,36,0.8)" />
                <stop offset="100%" stopColor="rgba(251,191,36,0.2)" />
              </linearGradient>
              <linearGradient id="nightArc" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(199,210,254,0.15)" />
                <stop offset="50%" stopColor="rgba(199,210,254,0.5)" />
                <stop offset="100%" stopColor="rgba(199,210,254,0.15)" />
              </linearGradient>
            </defs>
            {/* Arc background track */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Active arc */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke={isDay ? "url(#dayArc)" : "url(#nightArc)"}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Tick marks at sunrise/sunset/noon */}
            <line x1={cx} y1={cy - r - 2} x2={cx} y2={cy - r + 2} stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
            <line x1={cx - r * Math.cos(Math.PI / 4)} y1={cy - r * Math.sin(Math.PI / 4) - 1} x2={cx - r * Math.cos(Math.PI / 4)} y2={cy - r * Math.sin(Math.PI / 4) + 1} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            <line x1={cx + r * Math.cos(Math.PI / 4)} y1={cy - r * Math.sin(Math.PI / 4) - 1} x2={cx + r * Math.cos(Math.PI / 4)} y2={cy - r * Math.sin(Math.PI / 4) + 1} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            {/* Horizon line */}
            <line x1="6" y1={cy} x2="94" y2={cy} stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" strokeDasharray="2,2" />
          </svg>
          {/* Sun or Moon (positioned by current timeOfDay) */}
          <div
            className={`absolute ${isDay ? "sun-dot" : "moon-dot"}`}
            style={{
              left: `calc(${sunX}% - 7px)`,
              top: `calc(${(sunY / 60) * 100}% - 7px)`,
              width: "14px",
              height: "14px",
              transition: "left 0.4s linear, top 0.4s linear",
            }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: isDay
                  ? "radial-gradient(circle at 35% 35%, #fff5cc 0%, #fbbf24 60%, #f59e0b 100%)"
                  : "radial-gradient(circle at 35% 35%, #f1f5f9 0%, #cbd5e1 60%, #94a3b8 100%)",
                boxShadow: isDay
                  ? "0 0 8px rgba(251,191,36,0.85), 0 0 16px rgba(251,191,36,0.5)"
                  : "0 0 5px rgba(199,210,254,0.7), 0 0 10px rgba(199,210,254,0.4)",
              }}
            />
          </div>
          {/* Top-left time label */}
          <div className="absolute top-1 left-1.5 text-[10px] font-mono font-bold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {formatTime(timeOfDay)}
          </div>
          {/* Top-right phase label */}
          <div className={`absolute top-1 right-1.5 text-[9px] font-bold uppercase tracking-wide ${isDay ? "text-amber-200" : "text-indigo-200"}`}>
            {phase}
          </div>
          {/* Bottom weather indicator */}
          <div className="absolute bottom-0.5 left-1.5 text-[9px] text-white/65 font-mono">
            {weather === "sunny" ? "☀️" : weather === "cloudy" ? "☁️" : weather === "rainy" ? "🌧️" : weather === "foggy" ? "🌫️" : "❄️"} {weather}
          </div>
          {/* Bottom-right next event */}
          <div className="absolute bottom-0.5 right-1.5 text-[8px] text-white/55 font-mono">
            {nextEvent.label} in {eventTimeStr}
          </div>
        </div>
        {/* Day counter chip below arc */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm border border-amber-500/30 text-[10px] font-mono font-bold text-amber-200 w-fit shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
          <span>📅</span>
          <span>Day {dayCount}</span>
        </div>
      </div>
    </div>
  );
}
