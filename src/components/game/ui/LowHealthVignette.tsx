"use client";
// Phase 11: Critical health warning vignette.
// Renders a pulsing red radial gradient that intensifies as HP drops below 25%.
// Also applies a subtle screen shake at critical levels.
import { useEffect, useState } from "react";
import { useGame } from "@/lib/game/store";

export function LowHealthVignette() {
  const intensity = useGame((s) => s.lowHealthIntensity);
  const mode = useGame((s) => s.mode);
  const hp = useGame((s) => s.stats.health);
  const [tick, setTick] = useState(0);

  // Re-render at ~30fps so the pulse animates smoothly
  useEffect(() => {
    if (intensity < 0.05) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 1000), 33);
    return () => clearInterval(id);
  }, [intensity]);

  if (mode === "dead" || mode === "loading" || mode === "menu") return null;
  if (intensity < 0.05 || hp <= 0) return null;

  // Pulse phase: 0..1 across ~1.2s, synced roughly with heartbeat
  const pulsePhase = (Date.now() % 1200) / 1200;
  // Two-beat envelope (lub-dub): sharp rise ~0.1, dip, rise ~0.3, slow decay
  const beat =
    Math.exp(-Math.pow((pulsePhase - 0.05) * 10, 2)) +
    Math.exp(-Math.pow((pulsePhase - 0.25) * 12, 2)) * 0.7;
  const pulse = Math.min(1, beat);

  // Vignette opacity scales with intensity and pulse
  const opacity = 0.18 + intensity * 0.55 + pulse * 0.2 * intensity;
  // Vignette size (smaller = more red on edges): shrinks at low HP
  const vignetteSize = 70 - intensity * 25; // 70% at edge of low, 45% at critical
  // Subtle screen shake at critical levels
  const shake = intensity > 0.6 ? (Math.random() - 0.5) * intensity * 3 : 0;
  const shakeY = intensity > 0.6 ? (Math.random() - 0.5) * intensity * 2 : 0;
  // Red tint strength
  const redTint = intensity * 0.12 + pulse * 0.05 * intensity;

  return (
    <>
      {/* Pulse-synced animation styles */}
      <style>{`
        @keyframes lowHealthPulse {
          0%, 100% { transform: scale(1); opacity: var(--base-opacity); }
          50% { transform: scale(1.04); opacity: var(--peak-opacity); }
        }
        @keyframes lowHealthGlow {
          0%, 100% { box-shadow: inset 0 0 80px rgba(220,38,38,0.4); }
          50% { box-shadow: inset 0 0 130px rgba(220,38,38,0.7); }
        }
      `}</style>
      {/* Full-screen red vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          background: `radial-gradient(ellipse at center, transparent ${vignetteSize}%, rgba(180,20,20,${opacity}) 100%)`,
          transform: `translate(${shake}px, ${shakeY}px)`,
          transition: "background 0.2s ease-out",
        }}
      />
      {/* Red tint overlay — only at critical levels */}
      {redTint > 0.03 && (
        <div
          className="pointer-events-none fixed inset-0 z-30"
          style={{
            background: `rgba(180, 30, 30, ${redTint})`,
            mixBlendMode: "multiply",
          }}
        />
      )}
      {/* "DANGER" warning text at very low HP */}
      {intensity > 0.7 && (
        <div
          className="pointer-events-none fixed top-[28%] left-1/2 -translate-x-1/2 z-40 text-center"
          style={{
            opacity: 0.5 + pulse * 0.5,
            transform: `translate(-50%, 0) scale(${1 + pulse * 0.08})`,
          }}
        >
          <div
            className="text-2xl font-black tracking-[0.3em] text-red-500"
            style={{
              textShadow:
                "0 0 12px rgba(220,38,38,0.95), 0 0 24px rgba(220,38,38,0.7), 0 2px 4px rgba(0,0,0,0.9)",
              animation: "lowHealthPulse 1.2s ease-in-out infinite",
            }}
          >
            ⚠ DANGER ⚠
          </div>
          <div
            className="mt-1 text-xs font-bold tracking-[0.2em] text-red-300"
            style={{ textShadow: "0 0 6px rgba(220,38,38,0.8), 0 1px 2px rgba(0,0,0,0.9)" }}
          >
            HP CRITICAL — {Math.ceil(hp)} HP
          </div>
        </div>
      )}
      {/* Heartbeat indicator (small pulsing heart icon) at bottom-center */}
      {intensity > 0.1 && (
        <div
          className="pointer-events-none fixed bottom-32 left-1/2 -translate-x-1/2 z-30"
          style={{ opacity: 0.6 + pulse * 0.4 }}
        >
          <div
            className="text-3xl"
            style={{
              transform: `scale(${1 + pulse * 0.35})`,
              filter: `drop-shadow(0 0 ${4 + pulse * 8}px rgba(220,38,38,${0.7 + pulse * 0.3}))`,
              transition: "transform 0.08s ease-out",
            }}
          >
            ❤️
          </div>
        </div>
      )}
    </>
  );
}
