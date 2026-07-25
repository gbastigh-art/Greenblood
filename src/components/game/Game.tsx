"use client";
// Greenblood — Main game component. Mounts the Three.js engine and overlays HUD.
import { useCallback, useEffect, useRef, useState } from "react";
import { Engine } from "@/lib/game/engine/engine";
import { useGame } from "@/lib/game/store";
import { Hotbar } from "./ui/Hotbar";
import { StatsBars } from "./ui/StatsBars";
import { Crosshair } from "./ui/Crosshair";
import { Toasts } from "./ui/Toasts";
import { InventoryPanel } from "./ui/InventoryPanel";
import { RadialMenu } from "./ui/RadialMenu";
import { DeathScreen } from "./ui/DeathScreen";
import { LoadingScreen } from "./ui/LoadingScreen";
import { StartMenu, PauseMenu, type ServerInfo } from "./ui/StartMenu";
import { DamageNumbers } from "./ui/DamageNumbers";
import { SettingsPanel } from "./ui/SettingsPanel";
import { Compass } from "./ui/Compass";
import { DayNightArc } from "./ui/DayNightArc";
import { Minimap } from "./ui/Minimap";
// DebugMenu self-mounts via a window event listener when the engine fires it
import "./ui/DebugMenu";

export default function Game() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [started, setStarted] = useState(false);
  const [yaw, setYaw] = useState(0);

  useEffect(() => {
    if (!started || !containerRef.current) return;
    const eng = new Engine(containerRef.current);
    engineRef.current = eng;
    (window as unknown as { __gameStore?: unknown }).__gameStore = useGame;
    (window as unknown as { __engine?: Engine }).__engine = eng;
    try {
      eng.init();
    } catch (e) {
      console.error("Engine init failed", e);
    }
    return () => {
      eng.dispose();
      engineRef.current = null;
      (window as unknown as { __engine?: Engine }).__engine = undefined;
    };
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      if (engineRef.current) {
        setYaw(engineRef.current.playerYaw);
      }
    }, 66);
    return () => clearInterval(id);
  }, [started]);

  const mode = useGame((s) => s.mode);

  const quitToMainMenu = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    if (document.pointerLockElement) document.exitPointerLock();
    useGame.getState().setPaused(false);
    useGame.getState().setMode("menu");
    setStarted(false);
  }, []);

  useEffect(() => {
    if (!started) return;
    const onQuit = () => quitToMainMenu();
    window.addEventListener("greenblood-quit-to-menu", onQuit);
    return () => window.removeEventListener("greenblood-quit-to-menu", onQuit);
  }, [started, quitToMainMenu]);

  function handleJoinServer(server: ServerInfo) {
    useGame.getState().setServerId(server.id);
    useGame.getState().setServerBots(server.bots);
    setStarted(true);
  }

  function handleResume() {
    useGame.getState().setPaused(false);
  }

  const paused = useGame((s) => s.paused);
  const showHud = started && mode !== "loading" && !paused;
  const showRadial = useGame((s) => s.radialMenuOpen);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none" style={{ cursor: mode === "play" && !paused && !showRadial ? "none" : "default" }}>
      <div ref={containerRef} className="absolute inset-0" />

      {showHud && (
        <>
          <Hotbar />
          <StatsBars />
          <ConditionalCrosshair />
          <ConditionalCompass yaw={yaw} />
          <ConditionalDayNightArc />
          <ConditionalMinimap />
          <Toasts />
          <InventoryPanel />
          <DeathScreen />
          <DamageNumbers />
          <SettingsPanel />
        </>
      )}

      {/* Radial menu renders on top of everything including when paused */}
      {started && <RadialMenu />}

      {!started && <StartMenu onJoin={handleJoinServer} />}

      {started && mode === "loading" && <LoadingScreen />}

      {started && paused && <PauseMenu onResume={handleResume} onQuit={quitToMainMenu} />}
    </div>
  );
}

function ConditionalCrosshair() {
  const showCrosshair = useGame((s) => s.showCrosshair);
  if (!showCrosshair) return null;
  return <Crosshair />;
}

function ConditionalCompass({ yaw }: { yaw: number }) {
  const showCompass = useGame((s) => s.showCompass);
  if (!showCompass) return null;
  return <Compass yaw={yaw} />;
}

function ConditionalDayNightArc() {
  const showSunHorizon = useGame((s) => s.showSunHorizon);
  if (!showSunHorizon) return null;
  return <DayNightArc />;
}

function ConditionalMinimap() {
  const showMinimap = useGame((s) => s.showMinimap);
  if (!showMinimap) return null;
  return <Minimap />;
}
