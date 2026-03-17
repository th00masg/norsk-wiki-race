"use client";

interface PlayerPanelProps {
  name: string;
  currentArticle: string | null;
  clickCount: number;
  finished: boolean;
  finishTime: number | null;
  gameStartTime: number | null;
}

export default function PlayerPanel({
  name,
  currentArticle,
  clickCount,
  finished,
  finishTime,
}: PlayerPanelProps) {
  function formatTime(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const frameUrl = currentArticle
    ? `/api/wiki-frame/${encodeURIComponent(currentArticle)}`
    : "about:blank";

  return (
    <div
      className={`flex flex-col rounded-xl overflow-hidden ${
        finished
          ? "border-2 border-lime/50 glow-lime"
          : "border border-card-border"
      } bg-card/90 backdrop-blur-sm`}
    >
      {/* Player header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-card-border bg-surface/40 shrink-0">
        <span className="font-[var(--font-bangers)] text-lg tracking-wide truncate flex-1 text-pink">
          {name}
        </span>
        <span className="font-[var(--font-space-mono)] text-cyan font-bold text-lg">
          {clickCount}
        </span>
        <span className="text-xs text-foreground/30 font-semibold uppercase tracking-wider">
          klikk
        </span>
        {finished && finishTime && (
          <span className="text-xs text-lime font-[var(--font-space-mono)] font-bold ml-1">
            {formatTime(finishTime)}
          </span>
        )}
        {finished && <span className="text-lg">🏁</span>}
      </div>

      {/* Article iframe */}
      <div className="flex-1 relative overflow-hidden">
        {finished && (
          <div className="absolute inset-0 bg-lime/5 z-10 flex items-center justify-center backdrop-blur-[1px]">
            <div className="bg-card/95 rounded-xl px-5 py-4 text-center border border-lime/30">
              <div className="text-3xl mb-1">🏁</div>
              <div className="text-lime font-[var(--font-bangers)] text-2xl tracking-wide">
                I mal!
              </div>
              <div className="text-sm text-foreground/50 font-[var(--font-space-mono)]">
                {clickCount} klikk
                {finishTime ? ` · ${formatTime(finishTime)}` : ""}
              </div>
            </div>
          </div>
        )}
        <iframe
          src={frameUrl}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-same-origin allow-scripts"
          title={`${name} sin artikkel`}
        />
      </div>
    </div>
  );
}
