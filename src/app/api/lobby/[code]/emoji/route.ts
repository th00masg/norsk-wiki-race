import { NextRequest, NextResponse } from "next/server";
import { getLobby, setLobby } from "@/lib/redis";

const ALLOWED_EMOJIS = ["🎉", "🔥", "😂", "🏆", "💀", "🚀", "👀", "🎂"];
const MAX_EMOJIS = 50;
const EMOJI_TTL_MS = 15_000; // remove emojis older than 15s

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId, emoji } = await request.json();

  if (!ALLOWED_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: "Ugyldig emoji" }, { status: 400 });
  }

  const lobby = await getLobby(code.toUpperCase());
  if (!lobby) {
    return NextResponse.json({ error: "Lobby ikke funnet" }, { status: 404 });
  }

  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) {
    return NextResponse.json({ error: "Spiller ikke funnet" }, { status: 404 });
  }

  const now = Date.now();

  // Initialize and prune old emojis
  lobby.emojis = (lobby.emojis || []).filter(
    (e) => now - e.timestamp < EMOJI_TTL_MS
  );

  // Add new emoji
  lobby.emojis.push({
    id: `${playerId}-${now}`,
    emoji,
    playerName: player.name,
    timestamp: now,
  });

  // Cap the array
  if (lobby.emojis.length > MAX_EMOJIS) {
    lobby.emojis = lobby.emojis.slice(-MAX_EMOJIS);
  }

  await setLobby(lobby);

  return NextResponse.json({ ok: true });
}
