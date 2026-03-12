"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import ArticleSearch from "@/components/ArticleSearch";
import { Lobby } from "@/lib/types";

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

  const playerId =
    typeof window !== "undefined"
      ? sessionStorage.getItem("playerId")
      : null;
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
      }

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
    } catch {
      setError("Kunne ikke hente lobby");
    }
  }, [code, router]);

  useEffect(() => {
    fetchLobby();
    const interval = setInterval(fetchLobby, 3000);
    return () => clearInterval(interval);
  }, [fetchLobby]);

  async function handleSetArticles(
    start: { title: string; slug: string } | null,
    end: { title: string; slug: string } | null
  ) {
    if (!start || !end || !playerId) return;
    await fetch(`/api/lobby/${code}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        startArticle: start.slug,
        startTitle: start.title,
        endArticle: end.slug,
        endTitle: end.title,
      }),
    });
  }

  async function handleStart() {
    if (!playerId) return;
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
        <div className="bg-card border border-card-border rounded-xl p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="text-accent hover:underline"
          >
            Tilbake til forsiden
          </button>
        </div>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Lobby</h1>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-3xl tracking-widest text-accent font-bold">
              {code.toUpperCase()}
            </span>
            <button
              onClick={copyCode}
              className="text-sm bg-card border border-card-border rounded-lg px-3 py-1 hover:bg-accent/20 transition-colors"
            >
              {copied ? "Kopiert!" : "Kopier"}
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Del koden med andre spillere
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-2 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-card border border-card-border rounded-xl p-6 mb-4">
          <h2 className="text-lg font-semibold mb-3">
            Spillere ({lobby.players.length})
          </h2>
          <div className="space-y-2">
            {lobby.players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-background rounded-lg px-3 py-2"
              >
                <span className="flex-1">{p.name}</span>
                {p.isHost && (
                  <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                    Vert
                  </span>
                )}
                {p.id === playerId && (
                  <span className="text-xs text-gray-500">(deg)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <div className="bg-card border border-card-border rounded-xl p-6 mb-4">
            <h2 className="text-lg font-semibold mb-3">Velg artikler</h2>
            <ArticleSearch
              label="Startartikkel"
              value={startArticle}
              onSelect={(v) => {
                setStartArticle(v);
                if (v && endArticle) handleSetArticles(v, endArticle);
              }}
            />
            <ArticleSearch
              label="Malartikkel"
              value={endArticle}
              onSelect={(v) => {
                setEndArticle(v);
                if (startArticle && v) handleSetArticles(startArticle, v);
              }}
            />
            <button
              onClick={handleStart}
              disabled={!startArticle || !endArticle}
              className="w-full bg-success hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors mt-4 text-lg"
            >
              Start spill
            </button>
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl p-6 text-center">
            {lobby.startArticleTitle && lobby.endArticleTitle ? (
              <div>
                <p className="text-gray-400 mb-2">Rute valgt:</p>
                <p className="text-lg">
                  <span className="text-accent font-medium">
                    {lobby.startArticleTitle}
                  </span>
                  <span className="text-gray-500 mx-2">&rarr;</span>
                  <span className="text-success font-medium">
                    {lobby.endArticleTitle}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-gray-400">
                Venter pa at verten velger artikler og starter spillet...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
