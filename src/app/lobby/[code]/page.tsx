"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import ArticleSearch from "@/components/ArticleSearch";
import { Lobby, EmojiReaction } from "@/lib/types";

const PLAYER_COLORS = ["text-pink", "text-cyan", "text-lime", "text-orange", "text-violet-400", "text-rose-400"];
const EMOJI_OPTIONS = ["🎉", "🔥", "😂", "🏆", "💀", "🚀", "👀", "🎂"];

interface FlyingEmoji {
  id: string;
  emoji: string;
  playerName: string;
  left: number;
}

function FlyingEmojis({ emojis }: { emojis: FlyingEmoji[] }) {
  return (
    <>
      {emojis.map((e) => (
        <div
          key={e.id}
          className="flying-emoji"
          style={{ left: `${e.left}%` }}
        >
          <span className="emoji-char">{e.emoji}</span>
          <span className="emoji-name">{e.playerName}</span>
        </div>
      ))}
    </>
  );
}

function EmojiPicker({
  onSend,
  disabled,
}: {
  onSend: (emoji: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSend(emoji)}
          disabled={disabled}
          className="text-2xl hover:scale-125 active:scale-90 transition-transform disabled:opacity-30 disabled:hover:scale-100"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export default function LobbyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [error, setError] = useState("");
  const [startArticle, setStartArticle] = useState<{
    title: string;
    slug: string;
  } | null>(null);
  const [endArticle, setEndArticle] = useState<{
    title: string;
    slug: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [hostPlaying, setHostPlaying] = useState(false);
  const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([]);
  const [emojiCooldown, setEmojiCooldown] = useState(false);

  const localArticlesRef = useRef(false);
  const seenEmojiIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setPlayerId(sessionStorage.getItem("playerId"));
  }, []);

  const isHost = lobby?.hostId === playerId;

  const fetchLobby = useCallback(async () => {
    try {
      const res = await fetch(`/api/lobby/${code}`);
      const data: Lobby = await res.json();
      if (!res.ok) {
        setError((data as unknown as { error: string }).error);
        return;
      }
      setLobby(data);

      if (data.state === "playing") {
        router.push(`/game/${code}`);
        return;
      }

      if (!localArticlesRef.current) {
        if (data.startArticle && data.startArticleTitle) {
          setStartArticle({
            title: data.startArticleTitle,
            slug: data.startArticle,
          });
        }
        if (data.endArticle && data.endArticleTitle) {
          setEndArticle({
            title: data.endArticleTitle,
            slug: data.endArticle,
          });
        }
      }

      // Process new emojis
      const newEmojis = (data.emojis || []).filter(
        (e: EmojiReaction) => !seenEmojiIdsRef.current.has(e.id)
      );
      if (newEmojis.length > 0) {
        const flying = newEmojis.map((e: EmojiReaction) => ({
          id: e.id,
          emoji: e.emoji,
          playerName: e.playerName,
          left: 10 + Math.random() * 80,
        }));
        newEmojis.forEach((e: EmojiReaction) => seenEmojiIdsRef.current.add(e.id));
        setFlyingEmojis((prev) => [...prev, ...flying]);
        // Remove after animation (3s)
        setTimeout(() => {
          const ids = new Set(flying.map((f: FlyingEmoji) => f.id));
          setFlyingEmojis((prev) => prev.filter((f) => !ids.has(f.id)));
        }, 3500);
      }
    } catch {
      setError("Kunne ikke hente lobby");
    }
  }, [code, router]);

  useEffect(() => {
    fetchLobby();
    const interval = setInterval(fetchLobby, 2000);
    return () => clearInterval(interval);
  }, [fetchLobby]);

  useEffect(() => {
    if (!startArticle || !endArticle || !playerId || !isHost) return;

    fetch(`/api/lobby/${code}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        startArticle: startArticle.slug,
        startTitle: startArticle.title,
        endArticle: endArticle.slug,
        endTitle: endArticle.title,
        hostPlaying,
      }),
    }).catch(() => {});
  }, [startArticle, endArticle, playerId, isHost, code, hostPlaying]);

  async function handleStart() {
    if (!playerId || starting) return;
    setStarting(true);
    setError("");
    try {
      const res = await fetch(`/api/lobby/${code}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      if (res.ok) {
        router.push(`/game/${code}`);
      } else {
        const data = await res.json();
        setError(data.error);
        setStarting(false);
      }
    } catch {
      setError("Kunne ikke starte spillet");
      setStarting(false);
    }
  }

  async function handleSendEmoji(emoji: string) {
    if (!playerId || emojiCooldown) return;
    setEmojiCooldown(true);
    setTimeout(() => setEmojiCooldown(false), 500);

    try {
      await fetch(`/api/lobby/${code}/emoji`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, emoji }),
      });
    } catch {
      // ignore
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code.toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (error && !lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card/80 border border-card-border rounded-2xl p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="text-pink hover:underline font-['Slackey']"
          >
            Tilbake til forsiden
          </button>
        </div>
      </div>
    );
  }

  if (!lobby || playerId === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ===== NON-HOST VIEW =====
  if (!isHost) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <FlyingEmojis emojis={flyingEmojis} />
        <div className="w-full max-w-xl">
          <div className="text-center mb-5">
            <h1 className="text-2xl md:text-4xl font-['Slackey'] tracking-wide mb-2 title-gradient">
              Venteområdet
            </h1>
            <span className="lobby-code font-[var(--font-space-mono)] text-3xl md:text-4xl tracking-[0.2em] md:tracking-[0.3em] text-pink font-bold">
              {code.toUpperCase()}
            </span>
            <div className="mt-3">
              <div className="bg-white p-2 rounded-xl border-2 border-card-border inline-block">
                <QRCodeSVG
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${code.toUpperCase()}`}
                  size={96}
                  bgColor="#ffffff"
                  fgColor="#1a1a2e"
                  level="M"
                  className="w-20 h-20 md:w-24 md:h-24"
                />
              </div>
              <p className="text-foreground/30 text-xs mt-1 font-['Slackey']">
                Skann for å bli med!
              </p>
            </div>
          </div>

          <div className="bg-card/80 border border-card-border rounded-2xl p-4 md:p-6 mb-3">
            <h2 className="text-base md:text-xl font-['Slackey'] tracking-wide mb-3 text-cyan">
              Spillere ({lobby.players.length})
            </h2>
            <div className="space-y-2">
              {lobby.players.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 bg-background/30 rounded-xl px-3 py-2 player-color-${i % 6}`}
                >
                  <span className={`flex-1 font-semibold text-sm md:text-base ${PLAYER_COLORS[i % PLAYER_COLORS.length]}`}>
                    {p.name}
                  </span>
                  {p.isHost && (
                    <span className="text-xs bg-pink/15 text-pink px-2 py-0.5 rounded-full font-semibold">
                      Vert
                    </span>
                  )}
                  {p.id === playerId && (
                    <span className="text-xs text-foreground/30">(deg)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card/80 border border-card-border rounded-2xl p-4 md:p-6 text-center mb-3">
            {lobby.startArticleTitle && lobby.endArticleTitle ? (
              <div>
                <p className="text-foreground/40 mb-2 text-sm font-['Slackey']">
                  Rute valgt:
                </p>
                <p className="text-sm md:text-lg font-['Slackey']">
                  <span className="text-cyan font-semibold">
                    {lobby.startArticleTitle}
                  </span>
                  <span className="text-foreground/30 mx-2 md:mx-3">&rarr;</span>
                  <span className="text-lime font-semibold">
                    {lobby.endArticleTitle}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-foreground/40 text-sm md:text-base font-['Slackey']">
                Venter på at verten velger artikler...
              </p>
            )}
          </div>

          {/* Emoji picker */}
          <div className="bg-card/80 border border-card-border rounded-2xl p-3 md:p-4 text-center">
            <p className="text-foreground/40 text-xs mb-2 font-['Slackey']">
              Send en reaksjon!
            </p>
            <EmojiPicker onSend={handleSendEmoji} disabled={emojiCooldown} />
          </div>
        </div>
      </div>
    );
  }

  // ===== HOST VIEW =====
  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-6">
      <FlyingEmojis emojis={flyingEmojis} />

      {/* Header: title + code */}
      <div className="w-full max-w-5xl flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-['Slackey'] tracking-wide mb-2 title-gradient">
            Venteområdet
          </h1>
          <div className="flex items-center gap-3 mb-1">
            <span className="lobby-code font-[var(--font-space-mono)] text-4xl md:text-6xl lg:text-7xl tracking-[0.2em] md:tracking-[0.3em] text-pink font-bold">
              {code.toUpperCase()}
            </span>
            <button
              onClick={copyCode}
              className="text-xs md:text-sm bg-card/80 border border-card-border rounded-xl px-2.5 py-1 md:px-3 md:py-1.5 hover:bg-pink/20 hover:border-pink/50 transition-all font-['Slackey']"
            >
              {copied ? "Kopiert!" : "Kopier"}
            </button>
          </div>
          <p className="text-foreground/40 text-sm md:text-lg font-['Slackey']">
            Del koden med de andre gjestene!
          </p>
        </div>
        <div className="text-center shrink-0">
          <div className="bg-white p-2 rounded-xl border-2 border-card-border inline-block">
            <QRCodeSVG
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${code.toUpperCase()}`}
              size={128}
              bgColor="#ffffff"
              fgColor="#1a1a2e"
              level="M"
              className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40"
            />
          </div>
          <p className="text-foreground/30 text-xs mt-1.5 font-['Slackey']">
            Skann for å bli med!
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-2 mb-4 text-red-300 text-sm w-full max-w-5xl">
          {error}
        </div>
      )}

      {/* Cards: Artikler first, Spillere second, Start third — stacked on mobile, 3-col on desktop */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Artikler (first on mobile) */}
        <div className="bg-card/80 border border-card-border rounded-2xl p-4 md:p-6 order-1 md:order-2">
          <h2 className="text-lg md:text-xl font-['Slackey'] tracking-wide mb-3 text-pink">
            Velg artikler
          </h2>
          <ArticleSearch
            label="Startartikkel"
            value={startArticle}
            onSelect={(v) => {
              setStartArticle(v);
              if (v) localArticlesRef.current = true;
            }}
          />
          <ArticleSearch
            label="Målartikkel"
            value={endArticle}
            onSelect={(v) => {
              setEndArticle(v);
              if (v) localArticlesRef.current = true;
            }}
          />
        </div>

        {/* Spillere (second on mobile) */}
        <div className="bg-card/80 border border-card-border rounded-2xl p-4 md:p-6 order-2 md:order-1">
          <h2 className="text-lg md:text-xl font-['Slackey'] tracking-wide mb-3 text-cyan">
            Spillere ({lobby.players.length})
          </h2>
          <div className="space-y-2">
            {lobby.players.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 bg-surface/40 rounded-xl px-3 md:px-4 py-2 md:py-2.5 player-color-${i % 6}`}
              >
                <span className={`flex-1 font-semibold text-sm md:text-base ${PLAYER_COLORS[i % PLAYER_COLORS.length]}`}>
                  {p.name}
                </span>
                {p.isHost && (
                  <span className="text-xs bg-pink/15 text-pink px-2 py-0.5 rounded-full font-semibold">
                    Vert
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Start (third on mobile) */}
        <div className="glow-pink border border-card-border rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center order-3">
          <button
            onClick={handleStart}
            disabled={!startArticle || !endArticle || starting}
            className="w-full btn-go py-5 md:py-8 rounded-2xl text-2xl md:text-4xl font-['Slackey'] tracking-wider disabled:opacity-30"
          >
            {starting ? "Starter..." : "KJØR!"}
          </button>
          {(!startArticle || !endArticle) && (
            <p className="text-white/60 text-xs md:text-sm mt-2 md:mt-3 font-['Slackey'] text-center">
              Velg start- og målartikkel først
            </p>
          )}
          <button
            onClick={() => setHostPlaying((v) => !v)}
            className="mt-3 md:mt-4 flex items-center gap-2 text-xs md:text-sm font-['Slackey'] text-white/70 hover:text-white transition-colors"
          >
            <div className={`w-9 h-4.5 md:w-10 md:h-5 rounded-full transition-colors relative ${hostPlaying ? "bg-lime/60" : "bg-white/30"}`}>
              <div className={`absolute top-0.5 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-white transition-all ${hostPlaying ? "left-4.5 md:left-5" : "left-0.5"}`} />
            </div>
            {hostPlaying ? "Spiller med" : "Kun tilskuer"}
          </button>
        </div>
      </div>
    </div>
  );
}
