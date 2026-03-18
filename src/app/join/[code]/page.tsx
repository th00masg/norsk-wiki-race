"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/lobby/${code.toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem("playerId", data.playerId);
      sessionStorage.setItem("playerName", name.trim());
      router.push(`/lobby/${code.toUpperCase()}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl tracking-wide text-pink leading-tight mb-2">
            Wiki Race
          </h1>
          <p className="text-foreground/50 text-sm">
            Bli med i lobby
          </p>
          <span className="font-[var(--font-space-mono)] text-3xl md:text-4xl tracking-[0.2em] text-pink font-bold">
            {code.toUpperCase()}
          </span>
        </div>

        <div className="bg-card/80 border border-card-border rounded-2xl p-6">
          {error && (
            <div className="bg-pink/10 border border-pink/30 rounded-xl px-4 py-2.5 mb-4 text-pink text-sm">
              {error}
            </div>
          )}

          <label className="block text-xs text-foreground/35 mb-1 font-semibold uppercase tracking-wider">
            Ditt navn
          </label>
          <input
            type="text"
            placeholder="Skriv inn navnet ditt..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="w-full bg-white border-2 border-card-border rounded-xl px-4 py-3 text-foreground placeholder-foreground/30 focus:outline-none focus:border-cyan transition-all"
            maxLength={20}
            autoFocus
          />
          <button
            onClick={handleJoin}
            disabled={loading || !name.trim()}
            className="w-full bg-cyan hover:bg-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xl tracking-wide py-3 rounded-xl mt-4 transition-all"
          >
            {loading ? "Blir med..." : "Bli med!"}
          </button>
        </div>
      </div>
    </div>
  );
}
