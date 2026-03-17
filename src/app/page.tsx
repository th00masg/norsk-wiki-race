"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background compass */}
      <div className="absolute top-8 right-8 opacity-[0.04] pointer-events-none hidden md:block">
        <Image src="/compass.svg" alt="" width={300} height={300} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Hero */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="mx-auto w-32 h-auto mb-4 opacity-80">
            <Image src="/viking-ship.svg" alt="Vikingskip" width={200} height={160} className="w-full h-auto" />
          </div>
          <h1 className="font-[var(--font-bangers)] text-7xl tracking-wide title-gradient leading-tight">
            Wiki Race
          </h1>
          <p className="text-pink font-semibold text-lg mt-2">
            Mathias&apos; bursdagsutfordring!
          </p>
          <p className="text-foreground/35 text-sm mt-1">
            Hvem finner veien gjennom Wikipedia forst?
          </p>
        </div>

        {error && (
          <div className="bg-pink/10 border border-pink/30 rounded-xl px-4 py-2.5 mb-5 text-pink text-sm animate-slide-up">
            {error}
          </div>
        )}

        {/* Create lobby */}
        <div
          className="bg-card/80 backdrop-blur-sm border border-card-border rounded-2xl p-6 mb-5 glow-pink animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="font-[var(--font-bangers)] text-2xl tracking-wide text-pink mb-4">
            Opprett lobby
          </h2>
          <input
            type="text"
            placeholder="Ditt navn"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="w-full bg-surface/60 border border-card-border rounded-xl px-4 py-3 text-foreground placeholder-foreground/25 focus:outline-none focus:border-ring focus:shadow-[0_0_0_3px_rgba(42,63,107,0.3)] transition-all"
            maxLength={20}
          />
          <button
            onClick={handleCreate}
            disabled={loading || !hostName.trim()}
            className="w-full btn-party font-[var(--font-bangers)] text-xl tracking-wide py-3 rounded-xl mt-3"
          >
            {loading ? "Oppretter..." : "Opprett lobby"}
          </button>
        </div>

        {/* Divider */}
        <div
          className="flex items-center gap-4 mb-5 animate-slide-up"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-card-border to-transparent" />
          <span className="text-foreground/25 text-sm font-semibold uppercase tracking-wider">
            eller
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-card-border to-transparent" />
        </div>

        {/* Join lobby */}
        <div
          className="bg-card/80 backdrop-blur-sm border border-card-border rounded-2xl p-6 glow-cyan animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <h2 className="font-[var(--font-bangers)] text-2xl tracking-wide text-cyan mb-4">
            Bli med i lobby
          </h2>
          <input
            type="text"
            placeholder="Ditt navn"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            className="w-full bg-surface/60 border border-card-border rounded-xl px-4 py-3 text-foreground placeholder-foreground/25 focus:outline-none focus:border-ring focus:shadow-[0_0_0_3px_rgba(42,63,107,0.3)] transition-all"
            maxLength={20}
          />
          <input
            type="text"
            placeholder="LOBBYKODE"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="w-full bg-surface/60 border border-card-border rounded-xl px-4 py-3 mt-3 text-foreground placeholder-foreground/25 focus:outline-none focus:border-ring focus:shadow-[0_0_0_3px_rgba(42,63,107,0.3)] tracking-[0.3em] text-center font-[var(--font-space-mono)] text-xl transition-all"
            maxLength={6}
          />
          <button
            onClick={handleJoin}
            disabled={loading || !joinName.trim() || joinCode.length < 6}
            className="w-full bg-gradient-to-r from-cyan to-blue-500 hover:from-blue-500 hover:to-cyan disabled:opacity-35 disabled:cursor-not-allowed text-white font-[var(--font-bangers)] text-xl tracking-wide py-3 rounded-xl mt-3 transition-all hover:shadow-[0_4px_20px_rgba(77,166,255,0.3)] hover:-translate-y-0.5"
          >
            {loading ? "Blir med..." : "Bli med!"}
          </button>
        </div>
      </div>
    </div>
  );
}
