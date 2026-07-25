"use client";
// Greenblood main menu — dark, gritty coastal survival aesthetic.
// Screens: main (PLAY GAME / NEWS / OPTIONS / ACHIEVEMENTS) → server browser → game.
// Also hosts News, Options, and Achievements sub-screens.
import { useState, useEffect } from "react";
import { useGame, ACHIEVEMENTS, type Achievement } from "@/lib/game/store";
import { KeybindMenu } from "./KeybindMenu";

// ===== Shared background — dark stormy coastal scene =====
function CoastalBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Stormy sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #1a1d24 0%, #232830 35%, #2d2f36 55%, #1a1a1f 80%, #0d0e12 100%)",
        }}
      />
      {/* Heavy cloud layer — drifting */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 120% 50% at 30% 25%, rgba(50,55,65,0.7) 0%, transparent 60%), radial-gradient(ellipse 100% 40% at 75% 20%, rgba(35,40,50,0.6) 0%, transparent 65%)",
        }}
      />
      {/* Distant warehouse + lighthouse silhouette */}
      <svg
        viewBox="0 0 1600 600"
        preserveAspectRatio="xMidYMax slice"
        className="absolute bottom-0 left-0 w-full h-[60%]"
      >
        {/* Sea */}
        <rect x="0" y="380" width="1600" height="220" fill="#1a2028" />
        {/* Sea texture lines */}
        <g stroke="#2a3038" strokeWidth="2" opacity="0.5">
          <line x1="0" y1="400" x2="1600" y2="400" />
          <line x1="0" y1="420" x2="1600" y2="420" />
          <line x1="0" y1="445" x2="1600" y2="445" />
          <line x1="0" y1="475" x2="1600" y2="475" />
        </g>
        {/* Concrete seawall */}
        <rect x="0" y="360" width="1600" height="30" fill="#3a3a3a" />
        <g fill="#2a2a2a">
          <rect x="40" y="365" width="60" height="20" />
          <rect x="180" y="365" width="80" height="20" />
          <rect x="340" y="365" width="70" height="20" />
          <rect x="900" y="365" width="90" height="20" />
          <rect x="1100" y="365" width="70" height="20" />
          <rect x="1300" y="365" width="80" height="20" />
        </g>
        {/* Warehouse (left of center) — corrugated metal */}
        <g>
          <polygon points="120,360 120,180 520,180 520,360" fill="#5a3a28" />
          {/* roof */}
          <polygon points="110,185 530,185 540,170 100,170" fill="#3a2418" />
          {/* corrugation lines */}
          <g stroke="#3a2418" strokeWidth="2" opacity="0.7">
            <line x1="150" y1="185" x2="150" y2="360" />
            <line x1="180" y1="185" x2="180" y2="360" />
            <line x1="210" y1="185" x2="210" y2="360" />
            <line x1="240" y1="185" x2="240" y2="360" />
            <line x1="270" y1="185" x2="270" y2="360" />
            <line x1="300" y1="185" x2="300" y2="360" />
            <line x1="330" y1="185" x2="330" y2="360" />
            <line x1="360" y1="185" x2="360" y2="360" />
            <line x1="390" y1="185" x2="390" y2="360" />
            <line x1="420" y1="185" x2="420" y2="360" />
            <line x1="450" y1="185" x2="450" y2="360" />
            <line x1="480" y1="185" x2="480" y2="360" />
          </g>
          {/* boarded windows */}
          <rect x="180" y="240" width="50" height="35" fill="#1a1a1a" />
          <rect x="260" y="240" width="50" height="35" fill="#1a1a1a" />
          <rect x="340" y="240" width="50" height="35" fill="#1a1a1a" />
          <rect x="420" y="240" width="50" height="35" fill="#1a1a1a" />
          {/* door */}
          <rect x="230" y="290" width="60" height="70" fill="#2a1a10" />
          {/* faded mural */}
          <text x="320" y="220" fill="#4a3020" fontSize="22" fontFamily="Impact, sans-serif" opacity="0.5">STORAGE</text>
        </g>
        {/* Rusted truck in front of warehouse */}
        <g>
          <rect x="250" y="320" width="90" height="40" fill="#6a3a20" />
          <rect x="340" y="330" width="35" height="30" fill="#5a3018" />
          <circle cx="275" cy="365" r="12" fill="#1a1a1a" />
          <circle cx="275" cy="365" r="6" fill="#3a3a3a" />
          <circle cx="355" cy="365" r="12" fill="#1a1a1a" />
          <circle cx="355" cy="365" r="6" fill="#3a3a3a" />
        </g>
        {/* Concrete pier extending right with lighthouse */}
        <g>
          <rect x="900" y="355" width="380" height="15" fill="#4a4a4a" />
          {/* pier supports */}
          <g fill="#2a2a2a">
            <rect x="930" y="370" width="15" height="50" />
            <rect x="1050" y="370" width="15" height="50" />
            <rect x="1170" y="370" width="15" height="50" />
          </g>
          {/* Lighthouse — red & white striped */}
          <g>
            <rect x="1210" y="200" width="40" height="160" fill="#d9d9d9" />
            {/* red stripes */}
            <rect x="1210" y="220" width="40" height="22" fill="#a02828" />
            <rect x="1210" y="270" width="40" height="22" fill="#a02828" />
            <rect x="1210" y="320" width="40" height="22" fill="#a02828" />
            {/* top */}
            <rect x="1200" y="180" width="60" height="22" fill="#3a3a3a" />
            <rect x="1205" y="160" width="50" height="22" fill="#6a6a6a" />
            <circle cx="1230" cy="150" r="8" fill="#ffcc44" opacity="0.9" />
            {/* light glow */}
            <circle cx="1230" cy="150" r="40" fill="#ffcc44" opacity="0.12" />
          </g>
        </g>
        {/* Rusted crane far right */}
        <g stroke="#3a3028" strokeWidth="6" fill="none">
          <line x1="1400" y1="360" x2="1400" y2="120" />
          <line x1="1340" y1="160" x2="1460" y2="160" />
          <line x1="1400" y1="120" x2="1340" y2="160" />
          <line x1="1400" y1="120" x2="1460" y2="160" />
          <line x1="1440" y1="160" x2="1440" y2="220" />
        </g>
        {/* Shadowy building far right edge */}
        <rect x="1480" y="240" width="120" height="120" fill="#1a1a20" />
      </svg>
      {/* Dark vignette overlay for legibility */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.45)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, transparent 20%, rgba(0,0,0,0.55) 80%)",
        }}
      />
      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

// ===== Shared button styles =====
const menuBtnClass =
  "group relative w-full text-left px-8 py-3 text-white font-black tracking-[0.18em] text-3xl transition-all duration-150 hover:translate-x-2 hover:text-red-500";

// ===== Logo block — red square icon + GREENBLOOD wordmark =====
function Logo({ size = "lg" }: { size?: "lg" | "md" }) {
  const iconSize = size === "lg" ? 56 : 40;
  const titleSize = size === "lg" ? "text-5xl" : "text-3xl";
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Red square icon with stylized symbol */}
      <div
        className="flex items-center justify-center bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg viewBox="0 0 40 40" width={iconSize * 0.7} height={iconSize * 0.7}>
          {/* Broken compass / crossed tools symbol */}
          <g stroke="#0a0a0a" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="8" y1="8" x2="32" y2="32" />
            <line x1="32" y1="8" x2="8" y2="32" />
            <circle cx="20" cy="20" r="6" />
            <polygon points="20,4 22,10 20,9 18,10" fill="#0a0a0a" stroke="none" />
            <polygon points="20,36 22,30 20,31 18,30" fill="#0a0a0a" stroke="none" />
          </g>
        </svg>
      </div>
      <h1
        className={`${titleSize} font-black tracking-[0.08em] text-white`}
        style={{
          fontFamily: "Impact, 'Bebas Neue', 'Arial Narrow', sans-serif",
          textShadow: "0 2px 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.6)",
          letterSpacing: "0.04em",
        }}
      >
        GREENBLOOD
      </h1>
    </div>
  );
}

// ===== Server definitions — 4 servers with varying bot counts =====
interface ServerInfo {
  id: string;
  name: string;
  region: string;
  bots: number;
  maxPlayers: number;
  wipe: string;
  ping: number;
}

const SERVERS: ServerInfo[] = [
  {
    id: "coast",
    name: "Coastal Outpost",
    region: "EU West",
    bots: 0,
    maxPlayers: 1,
    wipe: "Weekly",
    ping: 24,
  },
  {
    id: "pine",
    name: "Pinewood Ridge",
    region: "US East",
    bots: 1,
    maxPlayers: 2,
    wipe: "Bi-weekly",
    ping: 88,
  },
  {
    id: "forge",
    name: "Ironforge Valley",
    region: "EU North",
    bots: 2,
    maxPlayers: 3,
    wipe: "Monthly",
    ping: 41,
  },
  {
    id: "storm",
    name: "Stormbreak Isle",
    region: "US West",
    bots: 3,
    maxPlayers: 4,
    wipe: "Weekly",
    ping: 132,
  },
  {
    id: "test",
    name: "Test Range",
    region: "DEBUG",
    bots: 0,
    maxPlayers: 1,
    wipe: "Never",
    ping: 1,
  },
];

type Screen = "main" | "servers" | "news" | "options" | "achievements";

export function StartMenu({ onJoin }: { onJoin: (server: ServerInfo) => void }) {
  const [screen, setScreen] = useState<Screen>("main");
  const [selectedServer, setSelectedServer] = useState<ServerInfo | null>(null);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black select-none">
      <CoastalBackground />
      {/* Top-left logo */}
      <div className="absolute top-6 left-8 z-10">
        <Logo size="lg" />
      </div>
      {/* Version chip bottom-right */}
      <div className="absolute bottom-4 right-6 z-10 text-[11px] text-white/40 font-mono">
        Greenblood · v1.0
      </div>
      {/* Compass hint icon bottom-right corner */}
      <div className="absolute bottom-4 right-6 z-10 mb-4 hidden" />

      {/* Screen content */}
      <div className="relative z-10 w-full h-full flex items-center">
        {screen === "main" && (
          <MainScreen onPlay={() => setScreen("servers")} onNews={() => setScreen("news")} onOptions={() => setScreen("options")} onAchievements={() => setScreen("achievements")} />
        )}
        {screen === "servers" && (
          <ServersScreen
            servers={SERVERS}
            onBack={() => setScreen("main")}
            onJoin={(s) => {
              setSelectedServer(s);
              onJoin(s);
            }}
          />
        )}
        {screen === "news" && <NewsScreen onBack={() => setScreen("main")} />}
        {screen === "options" && <OptionsScreen onBack={() => setScreen("main")} />}
        {screen === "achievements" && <AchievementsScreen onBack={() => setScreen("main")} />}
      </div>
    </div>
  );
}

// ===== Main menu screen =====
function MainScreen({
  onPlay,
  onNews,
  onOptions,
  onAchievements,
}: {
  onPlay: () => void;
  onNews: () => void;
  onOptions: () => void;
  onAchievements: () => void;
}) {
  return (
    <div className="pl-8 sm:pl-16 max-w-md w-full">
      <nav className="flex flex-col gap-1">
        <button className={menuBtnClass} onClick={onPlay}>
          PLAY GAME
        </button>
        <button className={menuBtnClass} onClick={onNews}>
          <span className="inline-flex items-center gap-2">
            NEWS
            <span className="inline-block bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 tracking-normal align-middle">
              NEW
            </span>
          </span>
        </button>
        <button className={menuBtnClass} onClick={onOptions}>
          OPTIONS
        </button>
        <button className={menuBtnClass} onClick={onAchievements}>
          ACHIEVEMENTS
        </button>
      </nav>
    </div>
  );
}

// ===== Server browser screen =====
function ServersScreen({
  servers,
  onBack,
  onJoin,
}: {
  servers: ServerInfo[];
  onBack: () => void;
  onJoin: (s: ServerInfo) => void;
}) {
  return (
    <div className="w-full max-w-3xl mx-auto px-8">
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-4xl font-black tracking-[0.1em] text-white"
          style={{ fontFamily: "Impact, 'Bebas Neue', sans-serif" }}
        >
          SELECT A SERVER
        </h2>
        <button
          onClick={onBack}
          className="text-white/60 hover:text-white text-sm font-bold tracking-widest transition-colors"
        >
          ← BACK
        </button>
      </div>
      <div className="space-y-2.5">
        {servers.map((s) => {
          const full = s.bots >= s.maxPlayers;
          return (
            <button
              key={s.id}
              onClick={() => onJoin(s)}
              disabled={full}
              className="group w-full text-left flex items-center gap-5 px-6 py-4 bg-zinc-900/70 border border-white/10 hover:border-red-600/60 hover:bg-zinc-800/80 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {/* Player count */}
              <div className="flex flex-col items-center min-w-[64px]">
                <div className="text-3xl font-black text-white group-hover:text-red-500 transition-colors">
                  {s.bots}
                  <span className="text-white/30 text-lg">/{s.maxPlayers}</span>
                </div>
                <div className="text-[9px] uppercase tracking-widest text-white/40">players</div>
              </div>
              <div className="h-12 w-px bg-white/10" />
              {/* Server info */}
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-white tracking-wide group-hover:text-red-400 transition-colors">
                  {s.name}
                </div>
                <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                  <span>{s.region}</span>
                  <span className="text-white/20">·</span>
                  <span>Wipe: {s.wipe}</span>
                  <span className="text-white/20">·</span>
                  <span className={s.ping < 60 ? "text-emerald-400" : s.ping < 110 ? "text-amber-400" : "text-red-400"}>
                    {s.ping}ms
                  </span>
                </div>
              </div>
              {/* Status / Join */}
              <div className="text-right">
                {full ? (
                  <span className="text-red-500 font-bold text-sm tracking-wider">FULL</span>
                ) : (
                  <span className="text-emerald-400 font-bold text-sm tracking-widest group-hover:translate-x-1 inline-block transition-transform">
                    JOIN →
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-6 text-center text-white/35 text-xs">
        Each server hosts a different number of AI survivors. Pick one and drop in.
      </p>
    </div>
  );
}

// ===== News screen (empty feed) =====
function NewsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-8">
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-4xl font-black tracking-[0.1em] text-white"
          style={{ fontFamily: "Impact, 'Bebas Neue', sans-serif" }}
        >
          NEWS
        </h2>
        <button
          onClick={onBack}
          className="text-white/60 hover:text-white text-sm font-bold tracking-widest transition-colors"
        >
          ← BACK
        </button>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-6xl mb-4 opacity-30">📰</div>
        <p className="text-white/50 text-lg font-bold tracking-wide">No news yet</p>
        <p className="text-white/30 text-sm mt-2">
          The latest dispatches will appear here. Check back after the next wipe.
        </p>
      </div>
    </div>
  );
}

// ===== Options screen =====
function OptionsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="w-full max-w-xl mx-auto px-8 max-h-[85vh] overflow-y-auto custom-scroll">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-black/40 backdrop-blur-sm py-2 -mx-8 px-8 z-10">
        <h2
          className="text-4xl font-black tracking-[0.1em] text-white"
          style={{ fontFamily: "Impact, 'Bebas Neue', sans-serif" }}
        >
          OPTIONS
        </h2>
        <button
          onClick={onBack}
          className="text-white/60 hover:text-white text-sm font-bold tracking-widest transition-colors"
        >
          ← BACK
        </button>
      </div>
      <OptionsBody />
    </div>
  );
}

// ===== Shared options body — used by both main menu Options and pause menu Options =====
export function OptionsBody() {
  const dayNightSpeed = useGame((s) => s.dayNightSpeed);
  const musicVolume = useGame((s) => s.musicVolume);
  const fov = useGame((s) => s.fov);
  const showCrosshair = useGame((s) => s.showCrosshair);
  const showMinimap = useGame((s) => s.showMinimap);
  const showCompass = useGame((s) => s.showCompass);
  const showSunHorizon = useGame((s) => s.showSunHorizon);
  const companionEnabled = useGame((s) => s.companionEnabled);
  const renderDistance = useGame((s) => s.renderDistance);
  const graphicsQuality = useGame((s) => s.graphicsQuality);

  const setDayNightSpeed = useGame((s) => s.setDayNightSpeed);
  const setMusicVolume = useGame((s) => s.setMusicVolume);
  const setFov = useGame((s) => s.setFov);
  const setShowCrosshair = useGame((s) => s.setShowCrosshair);
  const setShowMinimap = useGame((s) => s.setShowMinimap);
  const setShowCompass = useGame((s) => s.setShowCompass);
  const setShowSunHorizon = useGame((s) => s.setShowSunHorizon);
  const setCompanionEnabled = useGame((s) => s.setCompanionEnabled);
  const setRenderDistance = useGame((s) => s.setRenderDistance);
  const setGraphicsQuality = useGame((s) => s.setGraphicsQuality);

  const [keybindsOpen, setKeybindsOpen] = useState(false);

  return (
    <div className="space-y-6 pb-8">
      <KeybindMenu open={keybindsOpen} onClose={() => setKeybindsOpen(false)} />
      <SettingRow label="Graphics Quality" value={graphicsQuality.toUpperCase()} hint="Low = no shadows, lower res (best FPS). High = full shadows + AA.">
        <div className="grid grid-cols-3 gap-2 w-full">
          {(["low", "medium", "high"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setGraphicsQuality(q)}
              className={`px-2 py-1.5 text-xs font-bold rounded-sm border transition-colors capitalize tracking-widest ${
                graphicsQuality === q
                  ? "bg-red-700 border-red-500 text-white"
                  : "bg-zinc-800 border-white/10 text-white/70 hover:bg-zinc-700"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </SettingRow>
      <SettingRow label="Render Distance" value={`${renderDistance}m`} hint="Hide world objects beyond this radius. Lower = better FPS.">
        <Slider min={60} max={500} step={20} value={renderDistance} onChange={setRenderDistance} />
      </SettingRow>
      <SettingRow label="Day / Night Speed" value={`${dayNightSpeed.toFixed(1)}x`}>
        <Slider min={0.5} max={3} step={0.1} value={dayNightSpeed} onChange={setDayNightSpeed} />
      </SettingRow>
      <SettingRow label="Music Volume" value={`${musicVolume}%`}>
        <Slider min={0} max={100} step={1} value={musicVolume} onChange={setMusicVolume} />
      </SettingRow>
      <SettingRow label="Field of View" value={`${fov}°`}>
        <Slider min={60} max={110} step={1} value={fov} onChange={setFov} />
      </SettingRow>
      <SettingRow label="Crosshair" value={showCrosshair ? "ON" : "OFF"}>
        <ToggleSwitch checked={showCrosshair} onChange={setShowCrosshair} />
      </SettingRow>
      <SettingRow label="Minimap" value={showMinimap ? "ON" : "OFF"}>
        <ToggleSwitch checked={showMinimap} onChange={setShowMinimap} />
      </SettingRow>
      <SettingRow label="Compass" value={showCompass ? "ON" : "OFF"} hint="Top-center heading compass bar.">
        <ToggleSwitch checked={showCompass} onChange={setShowCompass} />
      </SettingRow>
      <SettingRow label="Sun Horizon" value={showSunHorizon ? "ON" : "OFF"} hint="Top-left day/night sun arc widget.">
        <ToggleSwitch checked={showSunHorizon} onChange={setShowSunHorizon} />
      </SettingRow>
      <SettingRow label="Companion" value={companionEnabled ? "ON" : "OFF"} hint="Toggle the AI companion NPC on or off.">
        <ToggleSwitch checked={companionEnabled} onChange={setCompanionEnabled} />
      </SettingRow>
      {/* Keybindings — opens a dedicated menu to rebind any action */}
      <div className="pt-2 border-t border-white/10">
        <button
          onClick={() => setKeybindsOpen(true)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded border border-red-500/40 bg-zinc-800/70 hover:bg-zinc-700 hover:border-red-400 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⌨️</span>
            <div className="text-left">
              <div className="text-sm font-bold tracking-widest text-white/85 uppercase">Key Bindings</div>
              <div className="text-[10px] text-white/45">Reassign any action to your preferred key</div>
            </div>
          </div>
          <span className="text-red-400/60 group-hover:text-red-300 group-hover:translate-x-0.5 transition-all">›</span>
        </button>
      </div>
    </div>
  );
}

function SettingRow({ label, value, hint, children }: { label: string; value: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold tracking-widest text-white/85 uppercase">{label}</span>
        <span className="text-xs font-mono text-red-400">{value}</span>
      </div>
      {children}
      {hint && <div className="text-[10px] text-white/35">{hint}</div>}
    </div>
  );
}

function Slider({ min, max, step, value, onChange }: { min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-red-600 h-1.5 cursor-pointer"
      />
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-sm transition-colors duration-200 ${checked ? "bg-red-700" : "bg-zinc-700"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-sm bg-white transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

// ===== Achievements screen =====
function AchievementsScreen({ onBack }: { onBack: () => void }) {
  const unlocked = useGame((s) => s.unlockedAchievements);
  const byTier: Record<string, Achievement[]> = { common: [], rare: [], epic: [], legendary: [] };
  for (const a of ACHIEVEMENTS) byTier[a.tier].push(a);
  const tierColor: Record<string, string> = {
    common: "text-emerald-300 border-emerald-500/40",
    rare: "text-sky-300 border-sky-500/40",
    epic: "text-purple-300 border-purple-500/40",
    legendary: "text-amber-300 border-amber-500/40",
  };
  return (
    <div className="w-full max-w-2xl mx-auto px-8 max-h-[85vh] overflow-y-auto custom-scroll">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-black/40 backdrop-blur-sm py-2 -mx-8 px-8 z-10">
        <h2
          className="text-4xl font-black tracking-[0.1em] text-white"
          style={{ fontFamily: "Impact, 'Bebas Neue', sans-serif" }}
        >
          ACHIEVEMENTS
        </h2>
        <button
          onClick={onBack}
          className="text-white/60 hover:text-white text-sm font-bold tracking-widest transition-colors"
        >
          ← BACK
        </button>
      </div>
      <div className="mb-4 text-sm text-white/55 font-mono">
        {unlocked.length} / {ACHIEVEMENTS.length} unlocked
      </div>
      <div className="space-y-6 pb-8">
        {(["legendary", "epic", "rare", "common"] as const).map((tier) => (
          <div key={tier}>
            <div className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${tierColor[tier].split(" ")[0]}`}>
              {tier} ({byTier[tier].filter((a) => unlocked.includes(a.id)).length}/{byTier[tier].length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {byTier[tier].map((a) => {
                const isUnlocked = unlocked.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-2.5 p-2 border ${isUnlocked ? `${tierColor[tier].split(" ")[1]} bg-white/5` : "border-white/5 bg-black/30 opacity-55"}`}
                  >
                    <span className={`text-2xl ${isUnlocked ? "" : "grayscale"}`}>{isUnlocked ? a.icon : "🔒"}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold truncate ${isUnlocked ? "text-white" : "text-white/50"}`}>{a.name}</div>
                      <div className="text-[10px] text-white/55 truncate">{a.desc}</div>
                    </div>
                    {isUnlocked && <span className="text-emerald-400 text-xs">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Pause menu — shown in-game when Esc is pressed =====
// Styled identically to the main menu (same CoastalBackground + Logo + red
// tracked buttons) so the in-game pause feels like an extension of the main
// menu rather than a foreign overlay.
export function PauseMenu({
  onResume,
  onQuit,
}: {
  onResume: () => void;
  onQuit: () => void;
}) {
  const [screen, setScreen] = useState<"main" | "options">("main");
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black select-none">
      <CoastalBackground />
      <div className="absolute top-6 left-8 z-10">
        <Logo size="md" />
      </div>
      <div className="absolute top-6 right-8 z-10 text-white/40 text-xs tracking-widest font-mono">PAUSED</div>
      <div className="relative z-10 w-full h-full flex items-center">
        {screen === "main" && (
          <div className="pl-8 sm:pl-16 max-w-md w-full">
            <nav className="flex flex-col gap-1">
              <button className={menuBtnClass} onClick={onResume}>
                RESUME
              </button>
              <button className={menuBtnClass} onClick={() => setScreen("options")}>
                OPTIONS
              </button>
              <button className={menuBtnClass} onClick={onQuit}>
                MAIN MENU
              </button>
            </nav>
          </div>
        )}
        {screen === "options" && (
          <div className="w-full max-w-xl mx-auto px-8 max-h-[85vh] overflow-y-auto custom-scroll">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-4xl font-black tracking-[0.1em] text-white" style={{ fontFamily: "Impact, 'Bebas Neue', sans-serif" }}>
                OPTIONS
              </h2>
              <button onClick={() => setScreen("main")} className="text-white/60 hover:text-white text-sm font-bold tracking-widest transition-colors">
                ← BACK
              </button>
            </div>
            <OptionsBody />
          </div>
        )}
      </div>
    </div>
  );
}

export type { ServerInfo };
