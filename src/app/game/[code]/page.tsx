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
  hostPlaying: boolean;
}

const CONFETTI_COLORS = ["#ff6bcd", "#00e5ff", "#39ff14", "#ff9100", "#ffd700", "#e040fb"];

function ConfettiEffect() {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 3,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 10,
  }));

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
          }}
        />
      ))}
    </>
  );
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

  useEffect(() => {
    setPlayerId(sessionStorage.getItem("playerId"));
  }, []);

  const isHost = gameState?.players.find((p) => p.id === playerId)?.isHost ?? false;
  const hostPlaying = gameState?.hostPlaying ?? false;
  const isSpectator = isHost && !hostPlaying;

  const gamePlayers = gameState
    ? gameState.players.filter((p) => !(p.isHost && !hostPlaying))
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

      const me = data.players.find((p) => p.id === playerId);
      const meIsPlaying = me && (!me.isHost || data.hostPlaying);
      if (meIsPlaying) {
        setClickCount(me.clickCount);
        setFinished(me.finished);
        if (me.currentArticle) {
          fetchArticle(me.currentArticle);
        }
      }
    }
    init();
  }, [playerId, fetchArticle, router]);

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

  useEffect(() => {
    if (!gameState?.gameStartTime || finished || gameState.state === "finished")
      return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - gameState.gameStartTime!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState?.gameStartTime, finished, gameState?.state]);

  const handleNavigate = useCallback(
    async (slug: string) => {
      const pid = sessionStorage.getItem("playerId");
      if (!pid) return;

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

  if (playerId === null || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ========== RESULTS ==========
  if (gameState.state === "finished") {
    const RANK_STYLES = [
      "text-gold text-3xl",
      "text-silver text-2xl",
      "text-bronze text-xl",
    ];
    const RANK_LABELS = ["1.", "2.", "3."];

    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <ConfettiEffect />
        <div className="w-full max-w-xl relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-[var(--font-fredoka)] font-bold title-gradient mb-2">
              Resultater!
            </h1>
            <p className="text-foreground/50 font-[var(--font-fredoka)]">
              <span className="text-cyan">{gameState.startArticleTitle}</span>
              <span className="text-foreground/30 mx-2">&rarr;</span>
              <span className="text-lime">{gameState.endArticleTitle}</span>
            </p>
          </div>

          <div className="space-y-3">
            {sortedPlayers.map((p, i) => (
              <div
                key={p.id}
                className={`bg-card/80 backdrop-blur-sm border rounded-2xl p-4 flex items-center gap-4 transition-all ${
                  i === 0 && p.finished
                    ? "border-gold/50 glow-pink"
                    : "border-card-border"
                }`}
              >
                <div className={`font-[var(--font-fredoka)] font-bold w-10 text-center ${
                  i < 3 && p.finished ? RANK_STYLES[i] : "text-foreground/30 text-lg"
                }`}>
                  {i < 3 && p.finished ? RANK_LABELS[i] : `${i + 1}.`}
                </div>
                <div className="flex-1">
                  <div className="font-[var(--font-fredoka)] font-semibold text-lg">
                    {p.name}
                  </div>
                  <div className="text-sm text-foreground/40">
                    {p.finished ? (
                      <>
                        <span className="text-pink font-[var(--font-space-mono)]">
                          {p.clickCount} klikk
                        </span>
                        {p.finishTime && (
                          <span className="text-cyan font-[var(--font-space-mono)] ml-2">
                            {formatTime(Math.floor(p.finishTime / 1000))}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-foreground/20">Ga seg</span>
                    )}
                  </div>
                </div>
                {p.finished && (
                  <div className={`text-2xl ${i === 0 ? "animate-bounce" : ""}`}>
                    {i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : "✅"}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-8 justify-center">
            <button
              onClick={() => router.push("/")}
              className="btn-party text-white font-[var(--font-fredoka)] font-semibold py-3 px-8 rounded-xl text-lg"
            >
              Spill igjen!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== HOST DASHBOARD (spectator mode) ==========
  if (isSpectator) {
    const playerCount = gamePlayers.length;
    const cols =
      playerCount <= 1
        ? 1
        : playerCount <= 4
          ? 2
          : 3;

    return (
      <div className="h-screen flex flex-col">
        <div className="bg-card/80 backdrop-blur-sm border-b border-card-border px-4 py-3 flex items-center gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-foreground/40 font-[var(--font-fredoka)]">Rute</div>
            <div className="font-[var(--font-fredoka)] font-medium">
              <span className="text-cyan">
                {gameState.startArticleTitle}
              </span>
              <span className="text-foreground/30 mx-2">&rarr;</span>
              <span className="text-lime">
                {gameState.endArticleTitle}
              </span>
            </div>
          </div>
          <div className="text-center px-4">
            <div className="text-xl font-[var(--font-space-mono)] text-pink font-bold">{formatTime(elapsed)}</div>
            <div className="text-xs text-foreground/40 font-[var(--font-fredoka)]">tid</div>
          </div>
          <div className="text-center px-4">
            <div className="text-xl font-[var(--font-space-mono)] text-lime font-bold">
              {gamePlayers.filter((p) => p.finished).length}/{playerCount}
            </div>
            <div className="text-xs text-foreground/40 font-[var(--font-fredoka)]">i mal</div>
          </div>
          <button
            onClick={handleEndGame}
            className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl px-4 py-2 text-sm hover:bg-red-500/30 transition-colors font-[var(--font-fredoka)]"
          >
            Avslutt
          </button>
        </div>

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
      <div className="bg-card/80 backdrop-blur-sm border-b border-card-border px-4 py-3 flex items-center gap-4 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-foreground/40 font-[var(--font-fredoka)]">Du leser</div>
          <div
            className="font-[var(--font-fredoka)] font-medium truncate"
            dangerouslySetInnerHTML={{ __html: articleTitle }}
          />
        </div>
        <div className="text-center px-4">
          <div className="text-3xl font-[var(--font-space-mono)] font-bold text-pink">
            {clickCount}
          </div>
          <div className="text-xs text-foreground/40 font-[var(--font-fredoka)]">klikk</div>
        </div>
        <div className="text-center px-4">
          <div className="text-lg font-[var(--font-space-mono)] text-cyan">{formatTime(elapsed)}</div>
          <div className="text-xs text-foreground/40 font-[var(--font-fredoka)]">tid</div>
        </div>
        <div className="text-right flex-1 min-w-0">
          <div className="text-xs text-foreground/40 font-[var(--font-fredoka)]">Mal</div>
          <div className="font-[var(--font-fredoka)] font-semibold text-lime truncate">
            {gameState.endArticleTitle}
          </div>
        </div>
      </div>

      {finished && (
        <div className="bg-lime/10 border-b border-lime/30 px-4 py-3 text-center">
          <span className="text-lime font-[var(--font-fredoka)] font-bold text-xl">
            Du fant malet!
          </span>
          <span className="text-foreground/60 ml-3 font-[var(--font-space-mono)]">
            {clickCount} klikk &middot; {formatTime(elapsed)}
          </span>
          <span className="text-foreground/30 ml-3 text-sm font-[var(--font-fredoka)]">
            Venter pa de andre...
          </span>
        </div>
      )}

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
