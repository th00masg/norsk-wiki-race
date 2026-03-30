"use client";

import { useState, useEffect, useCallback, useRef, use, Fragment } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  path: string[];
}

interface GameState {
  state: "waiting" | "playing" | "finished";
  players: PlayerState[];
  startArticle: string | null;
  startArticleTitle: string | null;
  endArticle: string | null;
  endArticleTitle: string | null;
  gameStartTime: number | null;
  timeLimit: number;
  hostPlaying: boolean;
}

const CONFETTI_COLORS = ["#FF5757", "#4DA6FF", "#34D399", "#FFB800", "#A78BFA", "#F472B6"];

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

function ResultCard({
  player: p,
  rank: i,
  rankStyle,
  rankLabel,
  formatTime,
  formatSlug,
}: {
  player: PlayerState;
  rank: number;
  rankStyle: string;
  rankLabel: string;
  formatTime: (s: number) => string;
  formatSlug: (slug: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const path = p.path || [];

  return (
    <div
      className={`bg-card/90 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all ${
        i === 0 && p.finished
          ? "border-gold/50 glow-gold"
          : "border-card-border"
      }`}
    >
      <div className="p-4 flex items-center gap-4">
        <div className={`font-['Slackey'] font-bold w-10 text-center ${rankStyle}`}>
          {rankLabel}
        </div>
        <div className="flex-1">
          <div className="font-['Slackey'] font-semibold text-lg">
            {p.name}
          </div>
          <div className="text-sm text-foreground/40">
            {p.finished ? (
              <>
                {p.finishTime && (
                  <span className="text-cyan font-[var(--font-space-mono)] font-bold">
                    {formatTime(Math.floor(p.finishTime / 1000))}
                  </span>
                )}
                <span className="text-pink font-[var(--font-space-mono)] ml-2">
                  {p.clickCount} klikk
                </span>
              </>
            ) : (
              <span className="text-foreground/20">Ikke i mål</span>
            )}
          </div>
        </div>
        {p.finished && (
          <div className={`text-2xl ${i === 0 ? "animate-bounce" : ""}`}>
            {i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : "✅"}
          </div>
        )}
        {path.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-foreground/40 hover:text-foreground text-sm font-['Slackey'] transition-colors px-2"
          >
            {expanded ? "Skjul sti" : "Vis sti"}
          </button>
        )}
      </div>
      {expanded && path.length > 0 && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-surface/50 rounded-xl px-4 py-3 flex flex-wrap items-center gap-1 text-sm">
            {path.map((slug, j) => (
              <Fragment key={j}>
                {j > 0 && (
                  <span className="text-foreground/20 mx-1">&rarr;</span>
                )}
                <span
                  className={`font-['Slackey'] ${
                    j === 0
                      ? "text-cyan font-semibold"
                      : j === path.length - 1 && p.finished
                        ? "text-lime font-semibold"
                        : "text-foreground/70"
                  }`}
                >
                  {formatSlug(slug)}
                </span>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const [resetting, setResetting] = useState(false);
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
        if (data.state === "waiting") {
          router.push(`/lobby/${codeRef.current}`);
          return;
        }
        setGameState(data);
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const timeLimit = gameState?.timeLimit || 10 * 60 * 1000;
  const remaining = gameState?.gameStartTime
    ? Math.max(0, Math.floor((timeLimit - (Date.now() - gameState.gameStartTime)) / 1000))
    : Math.floor(timeLimit / 1000);

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

  async function handleNewRound() {
    const pid = sessionStorage.getItem("playerId");
    if (!pid || resetting) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/lobby/${code}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: pid }),
      });
      if (res.ok) {
        router.push(`/lobby/${code}`);
      }
    } catch {
      // ignore
    } finally {
      setResetting(false);
    }
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
      // Fastest time wins, clicks as tiebreaker
      if ((a.finishTime || 0) !== (b.finishTime || 0)) return (a.finishTime || 0) - (b.finishTime || 0);
      return a.clickCount - b.clickCount;
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

    function formatSlug(slug: string) {
      return decodeURIComponent(slug).replace(/_/g, " ");
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <ConfettiEffect />
        <div className="w-full max-w-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-auto mb-3 opacity-90">
              <Image src="/trophy.svg" alt="" width={100} height={120} className="w-full h-auto" />
            </div>
            <h1 className="text-5xl font-['Slackey'] tracking-wide title-gradient mb-2">
              Resultater!
            </h1>
            <p className="text-foreground/50 font-['Slackey']">
              <span className="text-cyan">{gameState.startArticleTitle}</span>
              <span className="text-foreground/30 mx-2">&rarr;</span>
              <span className="text-lime">{gameState.endArticleTitle}</span>
            </p>
          </div>

          <div className="space-y-3">
            {sortedPlayers.map((p, i) => (
              <ResultCard
                key={p.id}
                player={p}
                rank={i}
                rankStyle={i < 3 && p.finished ? RANK_STYLES[i] : "text-foreground/30 text-lg"}
                rankLabel={i < 3 && p.finished ? RANK_LABELS[i] : `${i + 1}.`}
                formatTime={formatTime}
                formatSlug={formatSlug}
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center items-center">
            {isHost ? (
              <button
                onClick={handleNewRound}
                disabled={resetting}
                className="btn-party text-white font-['Slackey'] text-xl tracking-wide py-3 px-8 rounded-xl disabled:opacity-50"
              >
                {resetting ? "Tilbakestiller..." : "Ny runde!"}
              </button>
            ) : (
              <p className="text-foreground/40 font-['Slackey'] text-sm">
                Venter på at verten starter ny runde...
              </p>
            )}
            <button
              onClick={() => router.push("/")}
              className="bg-card/80 border border-card-border text-foreground/60 hover:text-foreground font-['Slackey'] text-base tracking-wide py-2.5 px-6 rounded-xl transition-colors"
            >
              Forlat spillet
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
            <div className="text-xs text-foreground/40 font-['Slackey']">Rute</div>
            <div className="font-['Slackey'] font-medium">
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
            <div className={`text-xl font-[var(--font-space-mono)] font-bold ${remaining <= 60 ? "text-red-500" : remaining <= 120 ? "text-orange" : "text-pink"}`}>
              {formatTime(remaining)}
            </div>
            <div className="text-xs text-foreground/40 font-['Slackey']">gjenstår</div>
          </div>
          <div className="text-center px-4">
            <div className="text-xl font-[var(--font-space-mono)] text-lime font-bold">
              {gamePlayers.filter((p) => p.finished).length}/{playerCount}
            </div>
            <div className="text-xs text-foreground/40 font-['Slackey']">i mal</div>
          </div>
          <button
            onClick={handleEndGame}
            className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl px-4 py-2 text-sm hover:bg-red-500/30 transition-colors font-['Slackey']"
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
      <div className="bg-card/80 backdrop-blur-sm border-b border-card-border px-2 py-2 md:px-4 md:py-3 shrink-0">
        {/* Top row: click count, timer, target */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex-1 min-w-0 hidden md:block">
            <div className="text-xs text-foreground/40 font-['Slackey']">Du leser</div>
            <div
              className="font-['Slackey'] font-medium truncate"
              dangerouslySetInnerHTML={{ __html: articleTitle }}
            />
          </div>
          <div className="text-center px-2 md:px-4">
            <div className="text-2xl md:text-3xl font-[var(--font-space-mono)] font-bold text-pink">
              {clickCount}
            </div>
            <div className="text-[10px] md:text-xs text-foreground/40 font-['Slackey']">klikk</div>
          </div>
          <div className="text-center px-2 md:px-4">
            <div className={`text-base md:text-lg font-[var(--font-space-mono)] font-bold ${remaining <= 60 ? "text-red-500" : remaining <= 120 ? "text-orange" : "text-cyan"}`}>
              {formatTime(remaining)}
            </div>
            <div className="text-[10px] md:text-xs text-foreground/40 font-['Slackey']">gjenstår</div>
          </div>
          <div className="text-right flex-1 min-w-0">
            <div className="text-[10px] md:text-xs text-foreground/40 font-['Slackey']">Mål</div>
            <div className="font-['Slackey'] font-semibold text-lime truncate text-sm md:text-base">
              {gameState.endArticleTitle}
            </div>
          </div>
        </div>
        {/* Mobile: current article title row */}
        <div className="md:hidden mt-1 truncate text-xs text-foreground/50 font-['Slackey']">
          Du leser: <span className="text-foreground/80" dangerouslySetInnerHTML={{ __html: articleTitle }} />
        </div>
      </div>

      {finished && (
        <div className="bg-lime/10 border-b border-lime/30 px-4 py-3 text-center">
          <span className="text-lime font-['Slackey'] text-2xl tracking-wide">
            Du fant malet!
          </span>
          <span className="text-foreground/60 ml-3 font-[var(--font-space-mono)]">
            {clickCount} klikk &middot; {formatTime(elapsed)}
          </span>
          <span className="text-foreground/30 ml-3 text-sm font-['Slackey']">
            Venter pa de andre...
          </span>
        </div>
      )}

      <div
        ref={articleContainerRef}
        className="flex-1 overflow-y-auto p-2 md:p-4"
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
