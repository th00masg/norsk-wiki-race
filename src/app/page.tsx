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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Norsk Wiki Race</h1>
          <p className="text-gray-400">
            Kappkjor gjennom norske Wikipedia-artikler!
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-2 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-card border border-card-border rounded-xl p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4">Opprett lobby</h2>
          <input
            type="text"
            placeholder="Ditt navn"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full bg-background border border-card-border rounded-lg px-3 py-2 mb-3 text-foreground placeholder-gray-500 focus:outline-none focus:border-accent"
            maxLength={20}
          />
          <button
            onClick={handleCreate}
            disabled={loading || !hostName.trim()}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? "Oppretter..." : "Opprett lobby"}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-card-border" />
          <span className="text-gray-500 text-sm">eller</span>
          <div className="flex-1 h-px bg-card-border" />
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Bli med i lobby</h2>
          <input
            type="text"
            placeholder="Ditt navn"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            className="w-full bg-background border border-card-border rounded-lg px-3 py-2 mb-3 text-foreground placeholder-gray-500 focus:outline-none focus:border-accent"
            maxLength={20}
          />
          <input
            type="text"
            placeholder="Lobbykode (6 tegn)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="w-full bg-background border border-card-border rounded-lg px-3 py-2 mb-3 text-foreground placeholder-gray-500 focus:outline-none focus:border-accent tracking-widest text-center font-mono text-lg"
            maxLength={6}
          />
          <button
            onClick={handleJoin}
            disabled={loading || !joinName.trim() || joinCode.length < 6}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? "Blir med..." : "Bli med"}
          </button>
        </div>
      </div>
    </div>
  );
}
