"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [hostName, setHostName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!hostName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lobby/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: hostName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem("playerId", data.playerId);
      sessionStorage.setItem("playerName", hostName.trim());
      router.push(`/lobby/${data.code}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!joinName.trim() || !joinCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const code = joinCode.toUpperCase().trim();
      const res = await fetch(`/api/lobby/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: joinName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem("playerId", data.playerId);
      sessionStorage.setItem("playerName", joinName.trim());
      router.push(`/lobby/${code}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">
            <span className="title-gradient font-[var(--font-fredoka)] font-bold text-6xl">
              Wiki Race
            </span>
          </div>
          <p className="text-xl text-pink font-[var(--font-fredoka)]">
            Mathias&apos; bursdagsutfordring!
          </p>
          <p className="text-sm text-foreground/50 mt-1">
            Hvem finner veien gjennom Wikipedia forst?
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-2 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-card/80 backdrop-blur-sm border border-card-border rounded-2xl p-6 mb-4 glow-pink">
          <h2 className="text-lg font-[var(--font-fredoka)] font-semibold mb-4 text-pink">
            Opprett lobby
          </h2>
          <input
            type="text"
            placeholder="Ditt navn"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-3 text-foreground placeholder-foreground/30 focus:outline-none focus:border-pink transition-colors"
            maxLength={20}
          />
          <button
            onClick={handleCreate}
            disabled={loading || !hostName.trim()}
            className="w-full btn-party text-white font-[var(--font-fredoka)] font-semibold py-3 rounded-xl mt-3 text-lg"
          >
            {loading ? "Oppretter..." : "Opprett lobby"}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-card-border to-transparent" />
          <span className="text-foreground/30 text-sm font-[var(--font-fredoka)]">
            eller
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-card-border to-transparent" />
        </div>

        <div className="bg-card/80 backdrop-blur-sm border border-card-border rounded-2xl p-6 glow-cyan">
          <h2 className="text-lg font-[var(--font-fredoka)] font-semibold mb-4 text-cyan">
            Bli med i lobby
          </h2>
          <input
            type="text"
            placeholder="Ditt navn"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-3 text-foreground placeholder-foreground/30 focus:outline-none focus:border-cyan transition-colors"
            maxLength={20}
          />
          <input
            type="text"
            placeholder="LOBBYKODE"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="w-full bg-background/50 border border-card-border rounded-xl px-4 py-3 mt-3 text-foreground placeholder-foreground/30 focus:outline-none focus:border-cyan tracking-[0.3em] text-center font-[var(--font-space-mono)] text-xl"
            maxLength={6}
          />
          <button
            onClick={handleJoin}
            disabled={loading || !joinName.trim() || joinCode.length < 6}
            className="w-full bg-gradient-to-r from-cyan to-blue-500 hover:from-blue-500 hover:to-cyan disabled:opacity-40 disabled:cursor-not-allowed text-white font-[var(--font-fredoka)] font-semibold py-3 rounded-xl mt-3 text-lg transition-all hover:shadow-[0_4px_15px_rgba(0,229,255,0.4)]"
          >
            {loading ? "Blir med..." : "Bli med!"}
          </button>
        </div>
      </div>
    </div>
  );
}
