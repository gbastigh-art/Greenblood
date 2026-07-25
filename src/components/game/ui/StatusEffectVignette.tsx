"use client";
// Full-screen vignette overlays for status effects:
// - Poison: green pulsing vignette
// - Hypothermia: blue cold vignette + frost edges
// - Well-Rested: warm golden glow
// - Bleeding: red pulsing vignette
// - Hydrated: subtle blue shimmer
// - Critical health (<25%): red heartbeat vignette
import { useGame } from "@/lib/game/store";

export function StatusEffectVignette() {
  const poisoning = useGame((s) => s.poisoning);
  const hypothermia = useGame((s) => s.hypothermia);
  const wellRested = useGame((s) => s.wellRested);
  const hydrated = useGame((s) => s.hydrated);
  const bleeding = useGame((s) => s.bleeding);
  const health = useGame((s) => s.stats.health);
  const radiation = useGame((s) => s.radiation);
  const radiationZoneActive = useGame((s) => s.radiationZoneActive);
  const mode = useGame((s) => s.mode);

  if (mode !== "play") return null;

  const isPoisoned = poisoning > 0;
  const isHypothermic = hypothermia > 0;
  const isBleeding = bleeding > 0;
  const isWellRested = wellRested > 0;
  const isHydrated = hydrated > 0;
  const isCriticalHealth = health < 25;
  const isRadiationSick = radiation > 30;
  const isInRadZone = radiationZoneActive;

  if (!isPoisoned && !isHypothermic && !isBleeding && !isWellRested && !isHydrated && !isCriticalHealth && !isRadiationSick && !isInRadZone) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {/* Bleeding — red pulsing vignette */}
      {isBleeding && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background: "radial-gradient(ellipse at center, transparent 35%, rgba(180,30,30,0.35) 100%)",
          }}
        />
      )}

      {/* Critical health — red heartbeat vignette */}
      {isCriticalHealth && (
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 30%, rgba(220,38,38,0.45) 100%)",
            animation: "heartbeat 1.1s ease-in-out infinite",
          }}
        />
      )}

      {/* Poison — green pulsing vignette */}
      {isPoisoned && (
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 40%, rgba(16,185,129,0.32) 100%)",
            animation: "poisonPulse 2.4s ease-in-out infinite",
          }}
        />
      )}

      {/* Hypothermia — cold blue vignette + frost corners */}
      {isHypothermic && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 30%, rgba(30,64,175,0.4) 100%)",
            }}
          />
          {/* Frost edges — top and bottom */}
          <div
            className="absolute top-0 left-0 right-0 h-24"
            style={{
              background: "linear-gradient(to bottom, rgba(186,230,253,0.45), transparent)",
              backdropFilter: "blur(1px)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-24"
            style={{
              background: "linear-gradient(to top, rgba(186,230,253,0.45), transparent)",
              backdropFilter: "blur(1px)",
            }}
          />
        </>
      )}

      {/* Well-Rested — warm golden glow at edges */}
      {isWellRested && (
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 55%, rgba(251,191,36,0.16) 100%)",
          }}
        />
      )}

      {/* Hydrated — subtle blue shimmer */}
      {isHydrated && (
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 60%, rgba(56,189,248,0.12) 100%)",
          }}
        />
      )}

      {/* Phase 7: Radiation zone — sickly green-yellow pulsing vignette */}
      {isInRadZone && (
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 35%, rgba(132,204,22,0.25) 100%)",
            animation: "radPulse 1.8s ease-in-out infinite",
          }}
        />
      )}
      {isRadiationSick && !isInRadZone && (
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 50%, rgba(132,204,22,0.12) 100%)",
          }}
        />
      )}

      {/* Status text in corner */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        {isCriticalHealth && (
          <div className="text-rose-300 text-sm font-bold tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-pulse">
            ⚠ CRITICAL HEALTH
          </div>
        )}
        {isHypothermic && (
          <div className="text-sky-200 text-xs font-bold tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            🥶 Freezing — find warmth
          </div>
        )}
        {isBleeding && (
          <div className="text-rose-200 text-xs font-bold tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            🩸 Bleeding — use bandage
          </div>
        )}
        {isPoisoned && (
          <div className="text-emerald-200 text-xs font-bold tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            ☠ Poisoned — use painkillers
          </div>
        )}
        {isInRadZone && (
          <div className="text-lime-200 text-xs font-bold tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-pulse">
            ☢ RADIATION ZONE — leave now!
          </div>
        )}
        {isRadiationSick && !isInRadZone && (
          <div className="text-lime-300/80 text-xs font-bold tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            ☢ Radiation sickness — use Rad-X
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes heartbeat {
          0%, 100% { opacity: 0.7; }
          20% { opacity: 1; }
          40% { opacity: 0.6; }
          60% { opacity: 0.95; }
        }
        @keyframes poisonPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.85; }
        }
        @keyframes radPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
