"use client";
// Photo mode HUD — minimal overlay shown only while `photoMode === true`.
// All elements are pointer-events-none so they don't intercept mouse-look.
// Includes a vignette, top-center "PHOTO MODE" chip, bottom key hint bar,
// bottom-right watermark, and a top-right hint. The parent agent mounts this;
// the engine's P key (or store.togglePhotoMode) handles exit.
import { useGame } from "@/lib/game/store";

export function PhotoModeHud() {
  const photoMode = useGame((s) => s.photoMode);
  if (!photoMode) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 select-none">
      {/* Cinematic vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Top-center chip */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-amber-400/60 shadow-[0_0_16px_rgba(251,191,36,0.4)] animate-pulse">
          <span className="text-base">📷</span>
          <span className="text-amber-200 text-xs font-bold uppercase tracking-[0.2em]">
            Photo Mode
          </span>
        </div>
      </div>

      {/* Top-right hint */}
      <div className="absolute top-4 right-4">
        <div className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">
          HUD hidden
        </div>
      </div>

      {/* Bottom-center hint bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-black/65 backdrop-blur-sm border border-white/15 shadow-2xl">
          <HintKey k="P" label="Exit photo mode" />
          <Divider />
          <HintKey k="Mouse" label="Look around" />
          <Divider />
          <HintKey k="F12" label="Browser screenshot" />
        </div>
      </div>

      {/* Bottom-right watermark */}
      <div className="absolute bottom-3 right-4">
        <div className="text-white/30 text-[10px] font-mono tracking-wider">
          🌲 WILDERNESS v5.0
        </div>
      </div>
    </div>
  );
}

function HintKey({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <kbd className="bg-white/10 border border-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono text-white/90 font-bold">
        {k}
      </kbd>
      <span className="text-white/75 text-[11px]">{label}</span>
    </div>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-white/15" />;
}
