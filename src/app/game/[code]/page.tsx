"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import WikiArticle from "@/components/WikiArticle";
import PlayerPanel from "@/components/PlayerPanel";

interface PlayerState {
  id: string;
  name: string;
  isHost: boolean;
  currentArticle: string | null;
  clickCount: number;
  finished: boolean;
  finishTime: number | null;
}

interface GameState {
  state: "waiting" | "playing" | "finished";
  players: PlayerState[];
  startArticle: string | null;
  startArticleTitle: string | null;
  endArticle: string | null;
  endArticleTitle: string | null;
  gameStartTime: number | null;
}

export default function GamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [articleHtml, setArticleHtml] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [clickCount, setClickCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const articleContainerRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef(code);

  // Load playerId from sessionStorage on mount
  useEffect(() => {
    setPlayerId(sessionStorage.getItem("playerId"));
  }, []);

  const isHost = gameState?.players.find((p) => p.id === playerId)?.isHost ?? false;

  // Non-host players (the actual game participants)
  const gamePlayers = gameState
    ? gameState.players.filter((p) => !p.isHost)
    : [];

  const fetchArticle = useCallback(async (slug: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wiki/${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (res.ok) {
        setArticleHtml(data.html);
        setArticleTitle(data.title);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (playerId === null) return;

    async function init() {
      const res = await fetch(`/api/game/${codeRef.current}/state`);
      const data: GameState = await res.json();
      setGameState(data);

      if (data.state === "waiting") {
        router.push(`/lobby/${codeRef.current}`);
        return;
      }

      // Only fetch article if we're a player (not the host)
      const me = data.players.find((p) => p.id === playerId);
      if (me && !me.isHost) {
        setClickCount(me.clickCount);
        setFinished(me.finished);
        if (me.currentArticle) {
          fetchArticle(me.currentArticle);
        }
      }
    }
    init();
  }, [playerId, fetchArticle, router]);

  // Poll game state - use ref to avoid re-creating interval
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/game/${codeRef.current}/state`);
        const data: GameState = await res.json();
        setGameState(data);
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Timer
  useEffect(() => {
    if (!gameState?.gameStartTime || finished || gameState.state === "finished")
      return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - gameState.gameStartTime!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState?.gameStartTime, finished, gameState?.state]);

  // Stable navigate callback - prevents WikiArticle re-renders
  const handleNavigate = useCallback(
    async (slug: string) => {
      const pid = sessionStorage.getItem("playerId");
      if (!pid) return;

      // Optimistic update
      setClickCount((c) => c + 1);
      fetchArticle(slug);

      if (articleContainerRef.current) {
        articleContainerRef.current.scrollTop = 0;
      }

      try {
        const res = await fetch(`/api/game/${codeRef.current}/navigate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: pid, article: slug }),
        });
        const data = await res.json();
        if (res.ok) {
          setClickCount(data.clickCount);
          if (data.finished) {
            setFinished(true);
          }
        }
      } catch {
        // ignore
      }
    },
    [fetchArticle]
  );

  async function handleEndGame() {
    const pid = sessionStorage.getItem("playerId");
    if (!pid) return;
    await fetch(`/api/lobby/${code}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: pid }),
    });
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const sortedPlayers = gamePlayers.sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    if (a.finished && b.finished) {
      if (a.clickCount !== b.clickCount) return a.clickCount - b.clickCount;
      return (a.finishTime || 0) - (b.finishTime || 0);
    }
    return a.clickCount - b.clickCount;
  });

  // Loading state
  if (playerId === null || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Results view (shown to everyone)
  if (gameState.state === "finished") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <h1 className="text-3xl font-bold text-center mb-2">Resultater</h1>
          <p className="text-center text-gray-400 mb-6">
            {gameState.startArticleTitle}{" "}
            <span className="text-gray-500">&rarr;</span>{" "}
            {gameState.endArticleTitle}
          </p>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-card-border text-sm text-gray-400">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Spiller</th>
                  <th className="px-4 py-3 text-center">Klikk</th>
                  <th className="px-4 py-3 text-center">Tid</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-card-border last:border-b-0 ${
                      p.id === playerId ? "bg-accent/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold text-lg ${
                          i === 0 && p.finished
                            ? "text-gold"
                            : i === 1 && p.finished
                              ? "text-silver"
                              : i === 2 && p.finished
                                ? "text-bronze"
                                : "text-gray-500"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-center font-mono">
                      {p.finished ? p.clickCount : "-"}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm">
                      {p.finishTime
                        ? formatTime(Math.floor(p.finishTime / 1000))
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.finished ? (
                        <span className="text-success text-sm">Fullfort</span>
                      ) : (
                        <span className="text-gray-500 text-sm">
                          Ikke fullfort
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 mt-6 justify-center">
            <button
              onClick={() => router.push("/")}
              className="bg-card border border-card-border hover:bg-accent/20 text-foreground font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Hjem
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== HOST DASHBOARD ==========
  if (isHost) {
    const playerCount = gamePlayers.length;
    const cols =
      playerCount <= 1
        ? 1
        : playerCount <= 4
          ? 2
          : 3;

    return (
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-card-border px-4 py-3 flex items-center gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-400">Rute</div>
            <div className="font-medium">
              <span className="text-accent">
                {gameState.startArticleTitle}
              </span>
              <span className="text-gray-500 mx-2">&rarr;</span>
              <span className="text-success">
                {gameState.endArticleTitle}
              </span>
            </div>
          </div>
          <div className="text-center px-4">
            <div className="text-lg font-mono">{formatTime(elapsed)}</div>
            <div className="text-xs text-gray-400">tid</div>
          </div>
          <div className="text-center px-4">
            <div className="text-lg font-mono">
              {gamePlayers.filter((p) => p.finished).length}/{playerCount}
            </div>
            <div className="text-xs text-gray-400">i mal</div>
          </div>
          <button
            onClick={handleEndGame}
            className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg px-4 py-2 text-sm hover:bg-red-500/30 transition-colors"
          >
            Avslutt spill
          </button>
        </div>

        {/* Player grid */}
        <div
          className="flex-1 overflow-hidden p-3 grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridAutoRows: "1fr",
          }}
        >
          {gamePlayers.map((p) => (
            <PlayerPanel
              key={p.id}
              name={p.name}
              currentArticle={p.currentArticle}
              clickCount={p.clickCount}
              finished={p.finished}
              finishTime={p.finishTime}
              gameStartTime={gameState.gameStartTime}
            />
          ))}
        </div>
      </div>
    );
  }

  // ========== PLAYER VIEW ==========
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-card-border px-4 py-3 flex items-center gap-4 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-400">Navaerende artikkel</div>
          <div
            className="font-medium truncate"
            dangerouslySetInnerHTML={{ __html: articleTitle }}
          />
        </div>
        <div className="text-center px-4">
          <div className="text-3xl font-bold font-mono text-accent">
            {clickCount}
          </div>
          <div className="text-xs text-gray-400">klikk</div>
        </div>
        <div className="text-center px-4">
          <div className="text-lg font-mono">{formatTime(elapsed)}</div>
          <div className="text-xs text-gray-400">tid</div>
        </div>
        <div className="text-right flex-1 min-w-0">
          <div className="text-sm text-gray-400">Mal</div>
          <div className="font-medium text-success truncate">
            {gameState.endArticleTitle}
          </div>
        </div>
      </div>

      {/* Finish overlay */}
      {finished && (
        <div className="bg-success/20 border-b border-success/50 px-4 py-3 text-center">
          <span className="text-success font-bold text-lg">
            Du fant malet!
          </span>
          <span className="text-gray-300 ml-3">
            {clickCount} klikk &middot; {formatTime(elapsed)}
          </span>
          <span className="text-gray-400 ml-3 text-sm">
            Venter pa andre spillere...
          </span>
        </div>
      )}

      {/* Article content */}
      <div
        ref={articleContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <WikiArticle
          html={articleHtml}
          onNavigate={handleNavigate}
          loading={loading}
        />
      </div>
    </div>
  );
}
