"use client";

import { useState, useEffect, useRef } from "react";

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
  gameStartTime,
}: PlayerPanelProps) {
  const [html, setHtml] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const lastSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentArticle || currentArticle === lastSlugRef.current) return;
    lastSlugRef.current = currentArticle;
    setLoading(true);

    fetch(`/api/wiki/${encodeURIComponent(currentArticle)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.html) {
          setHtml(data.html);
          setTitle(data.title);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentArticle]);

  function formatTime(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div
      className={`flex flex-col border rounded-lg overflow-hidden ${
        finished
          ? "border-success/50 bg-success/5"
          : "border-card-border bg-card"
      }`}
    >
      {/* Player header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-card-border bg-background/50 shrink-0">
        <span className="font-semibold truncate flex-1">{name}</span>
        <span className="font-mono text-accent font-bold">{clickCount}</span>
        <span className="text-xs text-gray-400">klikk</span>
        {finished && finishTime && (
          <span className="text-xs text-success font-medium ml-1">
            {formatTime(finishTime)}
          </span>
        )}
        {finished && (
          <span className="text-success text-sm">&#10003;</span>
        )}
      </div>

      {/* Article preview */}
      <div className="flex-1 overflow-y-auto relative">
        {finished && (
          <div className="absolute inset-0 bg-success/10 z-10 flex items-center justify-center">
            <div className="bg-card/90 rounded-lg px-4 py-3 text-center">
              <div className="text-success font-bold text-lg">I mal!</div>
              <div className="text-sm text-gray-400">
                {clickCount} klikk
                {finishTime
                  ? ` \u00b7 ${formatTime(finishTime)}`
                  : ""}
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="wiki-content wiki-content-mini">
            <div className="text-xs font-bold text-gray-500 mb-1 border-b pb-1">
              <span dangerouslySetInnerHTML={{ __html: title }} />
            </div>
            <div
              className="pointer-events-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
