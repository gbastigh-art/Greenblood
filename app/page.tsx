"use client";

import dynamic from "next/dynamic";

// Game uses Three.js which requires the browser — load only client-side, no SSR.
const Game = dynamic(() => import("@/components/game/Game"), { ssr: false });

export default function Home() {
  return <Game />;
}
