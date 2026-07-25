"use client";
// Leaderboard panel — full-screen modal showing the top 5 survival runs.
// Open when `mode === "leaderboard"`. Esc closes (returns to play mode).
// Entries are saved by the store on player death. #1 row has a golden glow +
// CSS particle shimmer. Empty state shows a placeholder hint.
import { useEffect } from "react";
import { useGame } from "@/lib/game/store";

interface Entry {
  day: number;
  kills: number;
  builds: number;
  date: number;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  return `${mo}mo ago`;
}

function rankCircleClass(rank: number): string {
  if (rank === 1) return "bg-gradient-to-br from-amber-300 to-yellow-500 text-black border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.7)]";
  if (rank === 2) return "bg-gradient-to-br from-zinc-200 to-zinc-400 text-black border-zinc-100";
  if (rank === 3) return "bg-gradient-to-br from-orange-500 to-amber-700 text-white border-orange-300";
  return "bg-black/60 text-white/70 border-white/15";
}

export function LeaderboardPanel() {
  const mode = useGame((s) => s.mode);
  const setMode = useGame((s) => s.setMode);
  const leaderboard = useGame((s) => s.leaderboard);

  const open = mode === "leaderboard";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setMode("play");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setMode]);

  if (!open) return null;

  const entries = (leaderboard as Entry[]).slice(0, 5);
  const best = entries.reduce((m, e) => Math.max(m, e.day), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-xl border-2 border-amber-500/50 bg-zinc-900/95 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/60 to-yellow-800/40 px-4 py-3 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">🏆</span>
            <div className="min-w-0">
              <div className="text-amber-200 font-bold text-lg tracking-wide truncate">
                Survival Leaderboard
              </div>
              <div className="text-amber-100/60 text-xs">
                Your top 5 longest survival runs. New entry saved each time you die.
              </div>
            </div>
          </div>
          <button
            onClick={() => setMode("play")}
            className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white border border-white/15 transition-colors shrink-0"
          >
            ✕ Close [Esc]
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-3">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <div className="text-5xl mb-3 opacity-60">🏕️</div>
              <div className="text-sm font-semibold">No runs yet — survive to set a record!</div>
              <div className="text-[11px] mt-1 text-white/35">
                Your best day count will be recorded here when you die.
              </div>
            </div>
          ) : (
            <ol className="space-y-2">
              {entries.map((e, i) => {
                const rank = i + 1;
                const isTop = rank === 1;
                return (
                  <li
                    key={`${e.date}-${i}`}
                    className={`relative rounded-lg border p-3 flex items-center gap-3 transition-all ${
                      isTop
                        ? "border-amber-400/70 bg-gradient-to-r from-amber-500/10 to-yellow-700/5 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
                        : "border-white/10 bg-black/30"
                    }`}
                  >
                    {/* Rank circle */}
                    <div
                      className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-extrabold text-lg shrink-0 ${rankCircleClass(
                        rank
                      )}`}
                    >
                      {rank}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          className={`font-extrabold text-lg ${
                            isTop ? "text-amber-200" : "text-white"
                          }`}
                        >
                          Day {e.day}
                        </span>
                        {isTop && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300/80">
                            ★ Best Run
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/65 flex items-center gap-3 mt-0.5 font-mono tabular-nums">
                        <span>🏹 {e.kills} kills</span>
                        <span>🏠 {e.builds} builds</span>
                        <span className="text-white/45">{relativeTime(e.date)}</span>
                      </div>
                    </div>

                    {/* Top-rank shimmer particles */}
                    {isTop && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                        <span className="leaderboard-spark" style={{ left: "10%", animationDelay: "0s" }} />
                        <span className="leaderboard-spark" style={{ left: "30%", animationDelay: "1.1s" }} />
                        <span className="leaderboard-spark" style={{ left: "55%", animationDelay: "2.3s" }} />
                        <span className="leaderboard-spark" style={{ left: "75%", animationDelay: "0.6s" }} />
                        <span className="leaderboard-spark" style={{ left: "90%", animationDelay: "1.8s" }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="bg-black/40 px-4 py-2.5 border-t border-white/10 flex items-center justify-between text-[11px] shrink-0">
          <div className="text-white/55">Press L to close</div>
          {best > 0 && (
            <div className="text-amber-200/80">
              Best:{" "}
              <span className="font-mono tabular-nums font-bold text-amber-200">Day {best}</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes leaderboardSpark {
          0%   { transform: translateY(0)    scale(0.6); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateY(-22px) scale(1.1); opacity: 0; }
        }
        .leaderboard-spark {
          position: absolute;
          bottom: 0;
          width: 3px;
          height: 3px;
          border-radius: 9999px;
          background: #fde68a;
          box-shadow: 0 0 6px rgba(251,191,36,0.9);
          animation: leaderboardSpark 3.2s ease-out infinite;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
