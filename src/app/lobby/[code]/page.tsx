"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import ArticleSearch from "@/components/ArticleSearch";
import { Lobby } from "@/lib/types";

const PLAYER_COLORS = ["text-pink", "text-cyan", "text-lime", "text-orange", "text-gold", "text-purple-400"];

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

  const localArticlesRef = useRef(false);

  useEffect(() => {
    setPlayerId(sessionStorage.getItem("playerId"));
  }, []);

  const isHost = lobby?.hostId === playerId;

  const fetchLobby = useCallback(async () => {
    try {
      const res = await fetch(`/api/lobby/${code}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
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
    } catch {
      setError("Kunne ikke hente lobby");
    }
  }, [code, router]);

  useEffect(() => {
    fetchLobby();
    const interval = setInterval(fetchLobby, 3000);
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
      }),
    }).catch(() => {});
  }, [startArticle, endArticle, playerId, isHost, code]);

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
            className="text-pink hover:underline font-[var(--font-fredoka)]"
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-[var(--font-fredoka)] font-bold mb-3 title-gradient">
            Venteomradet
          </h1>
          <div className="flex items-center justify-center gap-3">
            <span className="lobby-code font-[var(--font-space-mono)] text-4xl tracking-[0.3em] text-pink font-bold">
              {code.toUpperCase()}
            </span>
            <button
              onClick={copyCode}
              className="text-sm bg-card/80 border border-card-border rounded-xl px-3 py-1.5 hover:bg-pink/20 hover:border-pink/50 transition-all font-[var(--font-fredoka)]"
            >
              {copied ? "Kopiert!" : "Kopier"}
            </button>
          </div>
          <p className="text-foreground/40 text-sm mt-2 font-[var(--font-fredoka)]">
            Del koden med de andre gjestene!
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-2 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-card/80 backdrop-blur-sm border border-card-border rounded-2xl p-6 mb-4">
          <h2 className="text-lg font-[var(--font-fredoka)] font-semibold mb-3 text-cyan">
            Spillere ({lobby.players.length})
          </h2>
          <div className="space-y-2">
            {lobby.players.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 bg-background/30 rounded-xl px-4 py-2.5 player-color-${i % 6}`}
              >
                <span className={`flex-1 font-[var(--font-fredoka)] font-medium ${PLAYER_COLORS[i % PLAYER_COLORS.length]}`}>
                  {p.name}
                </span>
                {p.isHost && (
                  <span className="text-xs bg-pink/20 text-pink px-2.5 py-0.5 rounded-full font-[var(--font-fredoka)]">
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

        {isHost ? (
          <div className="bg-card/80 backdrop-blur-sm border border-card-border rounded-2xl p-6 mb-4 glow-pink">
            <h2 className="text-lg font-[var(--font-fredoka)] font-semibold mb-3 text-pink">
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
              label="Malartikkel"
              value={endArticle}
              onSelect={(v) => {
                setEndArticle(v);
                if (v) localArticlesRef.current = true;
              }}
            />
            <button
              onClick={handleStart}
              disabled={!startArticle || !endArticle || starting}
              className="w-full btn-go py-3.5 rounded-xl mt-4 text-lg font-[var(--font-fredoka)]"
            >
              {starting ? "Starter..." : "KJOR!"}
            </button>
          </div>
        ) : (
          <div className="bg-card/80 backdrop-blur-sm border border-card-border rounded-2xl p-6 text-center">
            {lobby.startArticleTitle && lobby.endArticleTitle ? (
              <div>
                <p className="text-foreground/40 mb-2 font-[var(--font-fredoka)]">
                  Rute valgt:
                </p>
                <p className="text-lg font-[var(--font-fredoka)]">
                  <span className="text-cyan font-semibold">
                    {lobby.startArticleTitle}
                  </span>
                  <span className="text-foreground/30 mx-3">&rarr;</span>
                  <span className="text-lime font-semibold">
                    {lobby.endArticleTitle}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-foreground/40 font-[var(--font-fredoka)]">
                Venter pa at verten velger artikler...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
