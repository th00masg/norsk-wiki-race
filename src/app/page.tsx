"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Step = "intro" | "choose" | "host" | "join";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
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

  function goBack() {
    setError("");
    if (step === "host" || step === "join") setStep("choose");
    else if (step === "choose") setStep("intro");
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section — text left, image right (full bleed) */}
      <section className="relative overflow-hidden md:min-h-screen">
        <div className="flex flex-col md:flex-row items-center md:items-center md:min-h-screen">
          {/* Left side — interactive steps */}
          <div className="md:w-[38%] md:flex-shrink-0 px-6 md:pl-[max(2rem,calc((100vw-80rem)/2+2rem))] md:pr-8 py-10 md:py-20">
            {/* Title — always visible */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl tracking-wide text-pink leading-tight mb-2">
              Wiki Race
            </h1>

            {/* ── Step: Intro ── */}
            {step === "intro" && (
              <div key="intro">
                <p className="text-foreground/60 text-lg md:text-xl mt-4 max-w-md">
                  Kappløp gjennom Wikipedia med venner. Finn veien fra en
                  artikkel til en annen — raskest mulig!
                </p>
                <button
                  onClick={() => setStep("choose")}
                  className="mt-8 btn-party px-8 py-3 rounded-xl text-xl tracking-wide"
                >
                  Start spillet
                </button>
              </div>
            )}

            {/* ── Step: Choose host/join ── */}
            {step === "choose" && (
              <div key="choose">
                <p className="text-foreground/60 text-base mt-3 mb-6">
                  Vil du opprette en ny lobby eller bli med i en eksisterende?
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setStep("host")}
                    className="w-full btn-party px-6 py-4 rounded-xl text-xl tracking-wide"
                  >
                    Opprett lobby
                  </button>
                  <button
                    onClick={() => setStep("join")}
                    className="w-full bg-cyan hover:bg-cyan/90 text-white font-bold px-6 py-4 rounded-xl text-xl tracking-wide transition-all"
                  >
                    Bli med i lobby
                  </button>
                </div>
                <button
                  onClick={goBack}
                  className="mt-4 text-foreground/40 hover:text-foreground/70 text-sm transition-colors"
                >
                  ← Tilbake
                </button>
              </div>
            )}

            {/* ── Step: Host form ── */}
            {step === "host" && (
              <div key="host">
                <p className="text-foreground/60 text-base mt-3 mb-5">
                  Skriv inn navnet ditt for å opprette en lobby.
                </p>

                {error && (
                  <div className="bg-pink/10 border border-pink/30 rounded-xl px-4 py-2.5 mb-4 text-pink text-sm">
                    {error}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Ditt navn"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  className="w-full bg-white border-2 border-card-border rounded-xl px-4 py-3 text-foreground placeholder-foreground/30 focus:outline-none focus:border-pink transition-all"
                  maxLength={20}
                  autoFocus
                />
                <button
                  onClick={handleCreate}
                  disabled={loading || !hostName.trim()}
                  className="w-full btn-party text-xl tracking-wide py-3 rounded-xl mt-3"
                >
                  {loading ? "Oppretter..." : "Opprett lobby"}
                </button>
                <button
                  onClick={goBack}
                  className="mt-4 text-foreground/40 hover:text-foreground/70 text-sm transition-colors"
                >
                  ← Tilbake
                </button>
              </div>
            )}

            {/* ── Step: Join form ── */}
            {step === "join" && (
              <div key="join">
                <p className="text-foreground/60 text-base mt-3 mb-5">
                  Skriv inn navnet ditt og lobbykoden du har fått.
                </p>

                {error && (
                  <div className="bg-pink/10 border border-pink/30 rounded-xl px-4 py-2.5 mb-4 text-pink text-sm">
                    {error}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Ditt navn"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  className="w-full bg-white border-2 border-card-border rounded-xl px-4 py-3 text-foreground placeholder-foreground/30 focus:outline-none focus:border-cyan transition-all"
                  maxLength={20}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="LOBBYKODE"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  className="w-full bg-white border-2 border-card-border rounded-xl px-4 py-3 mt-3 text-foreground placeholder-foreground/30 focus:outline-none focus:border-cyan tracking-[0.3em] text-center font-[var(--font-space-mono)] text-xl transition-all"
                  maxLength={6}
                />
                <button
                  onClick={handleJoin}
                  disabled={loading || !joinName.trim() || joinCode.length < 6}
                  className="w-full bg-cyan hover:bg-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xl tracking-wide py-3 rounded-xl mt-3 transition-all"
                >
                  {loading ? "Blir med..." : "Bli med!"}
                </button>
                <button
                  onClick={goBack}
                  className="mt-4 text-foreground/40 hover:text-foreground/70 text-sm transition-colors"
                >
                  ← Tilbake
                </button>
              </div>
            )}
          </div>

          {/* Hero image — fills remaining right side, edge to edge */}
          <div className="w-full md:flex-1 flex items-end">
            <Image
              src="/hero-wiki.jpg"
              alt="Wiki Race illustrasjon"
              width={1200}
              height={750}
              className="w-full h-auto block"
              priority
            />
          </div>
        </div>
      </section>

      {/* How it works — bold colored cards */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl md:text-4xl text-foreground text-center mb-10">
          Slik fungerer det
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl p-6 bg-[#E84538] text-white">
            <div className="text-5xl mb-3 font-bold opacity-80">1</div>
            <h3 className="text-xl mb-2 font-bold">Opprett en lobby</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Lag et rom og del den unike lobbykoden med vennene dine.
            </p>
          </div>
          <div className="rounded-2xl p-6 bg-[#2B6CB0] text-white">
            <div className="text-5xl mb-3 font-bold opacity-80">2</div>
            <h3 className="text-xl mb-2 font-bold">Velg artikler</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Velg start- og sluttartikkel på Wikipedia — eller la det bli tilfeldig!
            </p>
          </div>
          <div className="rounded-2xl p-6 bg-[#2D8B4E] text-white">
            <div className="text-5xl mb-3 font-bold opacity-80">3</div>
            <h3 className="text-xl mb-2 font-bold">Kappløp!</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Naviger fra lenke til lenke. Færrest klikk vinner!
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
