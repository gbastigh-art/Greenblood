"use client";
// Phase 7: Settings panel — adjust day/night speed, music volume, FOV, crosshair, minimap.
// Performance: render distance (visibility culling radius) + graphics quality preset.
// Also includes a button to open the keybinding menu (rebind any action).
import { useState } from "react";
import { useGame } from "@/lib/game/store";
import { KeybindMenu } from "./KeybindMenu";

export function SettingsPanel() {
  const settingsOpen = useGame((s) => s.settingsOpen);
  const dayNightSpeed = useGame((s) => s.dayNightSpeed);
  const musicVolume = useGame((s) => s.musicVolume);
  const fov = useGame((s) => s.fov);
  const showCrosshair = useGame((s) => s.showCrosshair);
  const showMinimap = useGame((s) => s.showMinimap);
  const showCompass = useGame((s) => s.showCompass);
  const showSunHorizon = useGame((s) => s.showSunHorizon);
  const renderDistance = useGame((s) => s.renderDistance);
  const graphicsQuality = useGame((s) => s.graphicsQuality);

  const setDayNightSpeed = useGame((s) => s.setDayNightSpeed);
  const setSettingsOpen = useGame((s) => s.setSettingsOpen);
  const setMusicVolume = useGame((s) => s.setMusicVolume);
  const setFov = useGame((s) => s.setFov);
  const setShowCrosshair = useGame((s) => s.setShowCrosshair);
  const setShowMinimap = useGame((s) => s.setShowMinimap);
  const setShowCompass = useGame((s) => s.setShowCompass);
  const setShowSunHorizon = useGame((s) => s.setShowSunHorizon);
  const setRenderDistance = useGame((s) => s.setRenderDistance);
  const setGraphicsQuality = useGame((s) => s.setGraphicsQuality);

  const [keybindsOpen, setKeybindsOpen] = useState(false);

  if (!settingsOpen) return null;

  return (
    <>
      <KeybindMenu open={keybindsOpen} onClose={() => setKeybindsOpen(false)} />
      <div className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSettingsOpen(false)}>
        <div
          className="w-full max-w-md rounded-lg border-2 border-amber-500/40 bg-zinc-900/95 shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-900/50 to-yellow-800/50 px-4 py-3 border-b border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚙️</span>
              <span className="text-amber-200 font-bold text-lg tracking-wide">Settings</span>
            </div>
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-2.5 py-1 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white border border-white/15 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Settings body */}
          <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh] custom-scroll">
            {/* Graphics Quality */}
            <SettingRow label="Graphics Quality" value={graphicsQuality.toUpperCase()} hint="Low = no shadows, lower res (best FPS). High = full shadows + AA.">
              <div className="grid grid-cols-3 gap-2 w-full">
                {(["low", "medium", "high"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setGraphicsQuality(q)}
                    className={`px-2 py-1.5 text-xs font-bold rounded border transition-colors capitalize ${
                      graphicsQuality === q
                        ? "bg-amber-600 border-amber-400 text-white"
                        : "bg-zinc-800 border-white/10 text-white/70 hover:bg-zinc-700"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </SettingRow>

            {/* Render Distance */}
            <SettingRow label="Render Distance" value={`${renderDistance}m`} hint="Hide world objects beyond this radius. Lower = better FPS.">
              <div className="flex items-center gap-2 w-full">
                <span className="text-[10px] text-white/40 w-10 text-right">60m</span>
                <input
                  type="range"
                  min={60}
                  max={500}
                  step={20}
                  value={renderDistance}
                  onChange={(e) => setRenderDistance(parseInt(e.target.value))}
                  className="flex-1 accent-amber-500 h-1.5 cursor-pointer"
                />
                <span className="text-[10px] text-white/40 w-12">500m</span>
              </div>
            </SettingRow>

            {/* Day/Night Speed */}
            <SettingRow label="Day/Night Speed" value={`${dayNightSpeed.toFixed(1)}x`} hint="Slow → Fast">
              <div className="flex items-center gap-2 w-full">
                <span className="text-[10px] text-white/40 w-8 text-right">0.5x</span>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={dayNightSpeed}
                  onChange={(e) => setDayNightSpeed(parseFloat(e.target.value))}
                  className="flex-1 accent-amber-500 h-1.5 cursor-pointer"
                />
                <span className="text-[10px] text-white/40 w-8">3.0x</span>
              </div>
            </SettingRow>

            {/* Music Volume */}
            <SettingRow label="Music Volume" value={`${musicVolume}%`} hint="0 → 100">
              <div className="flex items-center gap-2 w-full">
                <span className="text-[10px] text-white/40 w-4">🔇</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                  className="flex-1 accent-amber-500 h-1.5 cursor-pointer"
                />
                <span className="text-[10px] text-white/40 w-4">🔊</span>
              </div>
            </SettingRow>

            {/* FOV */}
            <SettingRow label="Field of View" value={`${fov}°`} hint="60 → 110">
              <div className="flex items-center gap-2 w-full">
                <span className="text-[10px] text-white/40 w-6 text-right">60°</span>
                <input
                  type="range"
                  min={60}
                  max={110}
                  step={1}
                  value={fov}
                  onChange={(e) => setFov(parseInt(e.target.value))}
                  className="flex-1 accent-amber-500 h-1.5 cursor-pointer"
                />
                <span className="text-[10px] text-white/40 w-7">110°</span>
              </div>
            </SettingRow>

            {/* Crosshair Toggle */}
            <SettingRow label="Crosshair" value="" hint="">
              <ToggleSwitch checked={showCrosshair} onChange={setShowCrosshair} />
            </SettingRow>

            {/* Minimap Toggle */}
            <SettingRow label="Minimap" value="" hint="">
              <ToggleSwitch checked={showMinimap} onChange={setShowMinimap} />
            </SettingRow>

            {/* Compass Toggle */}
            <SettingRow label="Compass" value="" hint="Top-center heading compass bar.">
              <ToggleSwitch checked={showCompass} onChange={setShowCompass} />
            </SettingRow>

            {/* Sun Horizon Toggle */}
            <SettingRow label="Sun Horizon" value="" hint="Top-left day/night sun arc widget.">
              <ToggleSwitch checked={showSunHorizon} onChange={setShowSunHorizon} />
            </SettingRow>

            {/* Keybindings button */}
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => setKeybindsOpen(true)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded border border-amber-500/40 bg-zinc-800/70 hover:bg-zinc-700 hover:border-amber-400 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">⌨️</span>
                  <div className="text-left">
                    <div className="text-sm font-bold text-amber-100">Key Bindings</div>
                    <div className="text-[10px] text-white/45">Reassign any action to your preferred key</div>
                  </div>
                </div>
                <span className="text-amber-400/60 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all">›</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-black/40 px-4 py-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 rounded text-white transition-colors shadow-sm"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SettingRow({ label, value, hint, children }: { label: string; value: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-amber-100">{label}</span>
        {value && <span className="text-xs font-mono text-amber-400">{value}</span>}
      </div>
      {children}
      {hint && <div className="text-[10px] text-white/40">{hint}</div>}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-amber-600" : "bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
