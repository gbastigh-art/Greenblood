"use client";
// Screenshot Gallery — full-screen modal showing player-taken screenshots.
// Accessible via the 📸 button or by opening galleryOpen from the store.
import { useState } from "react";
import { useGame } from "@/lib/game/store";

export function ScreenshotGallery() {
  const galleryOpen = useGame((s) => s.galleryOpen);
  const screenshots = useGame((s) => s.screenshots);
  const setGalleryOpen = useGame((s) => s.setGalleryOpen);
  const deleteScreenshot = useGame((s) => s.deleteScreenshot);

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (!galleryOpen) return null;

  return (
    <>
      {/* Main gallery overlay */}
      <div
        className="fixed inset-0 z-[55] bg-zinc-900/95 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => setGalleryOpen(false)}
      >
        <div
          className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg border-2 border-amber-500/40 bg-zinc-900/95 shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-900/50 to-yellow-800/50 px-4 py-3 border-b border-amber-500/30 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📸</span>
              <div>
                <div className="text-amber-200 font-bold text-lg tracking-wide">
                  Screenshot Gallery
                </div>
                <div className="text-amber-100/70 text-xs font-mono">
                  {screenshots.length}/12 screenshots
                </div>
              </div>
            </div>
            <button
              onClick={() => setGalleryOpen(false)}
              className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded text-white border border-white/15 transition-colors"
            >
              ✕ Close
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scroll">
            {screenshots.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {screenshots.map((ss) => (
                  <ScreenshotCard
                    key={ss.id}
                    id={ss.id}
                    dataUrl={ss.dataUrl}
                    dayCount={ss.dayCount}
                    location={ss.location}
                    timestamp={ss.timestamp}
                    onDelete={deleteScreenshot}
                    onView={setLightboxSrc}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox overlay */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Screenshot full view"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 px-3 py-1.5 text-xs font-bold bg-black/70 hover:bg-black/90 rounded text-white border border-white/20 transition-colors"
          >
            ✕ Close
          </button>
        </div>
      )}
    </>
  );
}

function ScreenshotCard({
  id,
  dataUrl,
  dayCount,
  location,
  timestamp,
  onDelete,
  onView,
}: {
  id: string;
  dataUrl: string;
  dayCount: number;
  location: { x: number; z: number };
  timestamp: number;
  onDelete: (id: string) => void;
  onView: (src: string) => void;
}) {
  const dateStr = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative group rounded-lg overflow-hidden border border-amber-500/20 bg-black/40 hover:border-amber-400/50 transition-all duration-200 hover:shadow-[0_0_12px_rgba(251,191,36,0.2)]">
      {/* Thumbnail */}
      <div
        className="cursor-pointer"
        onClick={() => onView(dataUrl)}
      >
        <img
          src={dataUrl}
          alt={`Screenshot Day ${dayCount}`}
          className="w-full h-[180px] object-cover rounded-t-lg"
        />
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(id);
        }}
        className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/70 hover:bg-rose-700/90 border border-white/15 text-white/70 hover:text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        title="Delete screenshot"
      >
        ✕
      </button>

      {/* Info overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-black/0 px-2.5 py-2 pointer-events-none">
        <div className="text-[10px] text-amber-200/90 font-mono flex items-center justify-between">
          <span>☀️ Day {dayCount}</span>
          <span>
            📍 {location.x}, {location.z}
          </span>
          <span>🕐 {dateStr}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4 opacity-40">📷</span>
      <div className="text-white/60 text-sm font-semibold mb-2">
        No screenshots yet
      </div>
      <div className="text-white/40 text-xs max-w-xs leading-relaxed">
        Enter photo mode (<kbd className="bg-white/10 px-1 rounded text-[10px] font-mono">P</kbd>) and press{" "}
        <kbd className="bg-white/10 px-1 rounded text-[10px] font-mono">S</kbd> to capture.
      </div>
    </div>
  );
}
