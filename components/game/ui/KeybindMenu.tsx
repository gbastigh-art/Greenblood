"use client";
// Keybinding menu — lets the user reassign any action to a key of their choosing.
// Opens as a modal overlay. Click an action's key cap to enter "listening" mode,
// then press any key to rebind. Conflicts are detected and warned about.
import { useEffect, useState } from "react";
import { useGame, KEYBIND_LABELS, DEFAULT_KEYBINDS, formatKey } from "@/lib/game/store";

export function KeybindMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const keybinds = useGame((s) => s.keybinds);
  const setKeybind = useGame((s) => s.setKeybind);
  const resetKeybinds = useGame((s) => s.resetKeybinds);
  const [listening, setListening] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);

  // Capture the next keypress while in listening mode.
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Esc cancels rebinding without assigning.
      if (e.key === "Escape") {
        setListening(null);
        return;
      }
      // Normalize the key to match our keybind format (lowercase).
      const key = e.key.toLowerCase();
      // Reject modifier-only presses that aren't the target (we want the actual key).
      // But allow Shift / Ctrl / Alt as standalone binds.
      // Detect conflict: is this key already bound to another action?
      const conflictAction = Object.entries(keybinds).find(
        ([action, k]) => k === key && action !== listening
      );
      if (conflictAction) {
        setConflict(conflictAction[0]);
        // Clear the conflict warning after 2.5s.
        setTimeout(() => setConflict(null), 2500);
        setListening(null);
        return;
      }
      setKeybind(listening, key);
      setListening(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listening, keybinds, setKeybind]);

  if (!open) return null;

  // Group actions by their `group` field for a tidy layout.
  const groups: Record<string, typeof KEYBIND_LABELS> = {};
  for (const entry of KEYBIND_LABELS) {
    if (!groups[entry.group]) groups[entry.group] = [];
    groups[entry.group].push(entry);
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => { if (listening) setListening(null); else onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-lg border-2 border-amber-500/40 bg-zinc-900/95 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/50 to-yellow-800/50 px-4 py-3 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⌨️</span>
            <span className="text-amber-200 font-bold text-lg tracking-wide">Key Bindings</span>
          </div>
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white border border-white/15 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Conflict warning */}
        {conflict && (
          <div className="mx-4 mt-3 px-3 py-2 rounded border border-rose-500/50 bg-rose-950/60 text-rose-200 text-xs font-bold animate-pulse">
            ⚠ That key is already bound to &quot;{KEYBIND_LABELS.find((k) => k.action === conflict)?.label}&quot; — rebind or pick another key.
          </div>
        )}

        {/* Listening hint */}
        {listening && (
          <div className="mx-4 mt-3 px-3 py-2 rounded border border-sky-500/50 bg-sky-950/60 text-sky-200 text-xs font-bold">
            Press any key to bind to &quot;{KEYBIND_LABELS.find((k) => k.action === listening)?.label}&quot;… (Esc to cancel)
          </div>
        )}

        {/* Bindings list — grouped + scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh] custom-scroll">
          {Object.entries(groups).map(([groupName, actions]) => (
            <div key={groupName}>
              <div className="text-[10px] uppercase tracking-widest text-amber-400/70 font-bold mb-2 pb-1 border-b border-white/10">
                {groupName}
              </div>
              <div className="space-y-1.5">
                {actions.map(({ action, label }) => {
                  const bound = keybinds[action] ?? "";
                  const isListening = listening === action;
                  return (
                    <div
                      key={action}
                      className="flex items-center justify-between gap-3 px-2.5 py-2 rounded bg-white/5 hover:bg-white/8 border border-white/5 transition-colors"
                    >
                      <span className="text-sm text-white/85 font-medium">{label}</span>
                      <button
                        onClick={() => setListening(isListening ? null : action)}
                        className={`min-w-[72px] px-3 py-1.5 rounded text-xs font-bold border transition-all ${
                          isListening
                            ? "border-sky-400 bg-sky-600/30 text-sky-200 animate-pulse"
                            : "border-amber-500/40 bg-zinc-800 text-amber-200 hover:bg-zinc-700 hover:border-amber-400"
                        }`}
                      >
                        {isListening ? "…" : formatKey(bound) || "—"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-black/40 px-4 py-3 border-t border-white/10 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              if (confirm("Reset all key bindings to defaults?")) {
                resetKeybinds();
                setListening(null);
              }
            }}
            className="px-3 py-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 rounded text-white/80 border border-white/15 transition-colors"
          >
            ↺ Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 rounded text-white transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
