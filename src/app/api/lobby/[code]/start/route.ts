import { NextRequest, NextResponse } from "next/server";
import { getLobby, setLobby } from "@/lib/redis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId } = await request.json();

  const lobby = await getLobby(code.toUpperCase());
  if (!lobby) {
    return NextResponse.json({ error: "Lobby ikke funnet" }, { status: 404 });
  }

  if (lobby.hostId !== playerId) {
    return NextResponse.json(
      { error: "Bare verten kan starte spillet" },
      { status: 403 }
    );
  }

  if (!lobby.startArticle || !lobby.endArticle) {
    return NextResponse.json(
      { error: "Velg start- og målartikkel først" },
      { status: 400 }
    );
  }

  lobby.state = "playing";
  lobby.gameStartTime = Date.now();
  lobby.timeLimit = 10 * 60 * 1000; // 10 minutes

  // Set players to start article (skip host unless hostPlaying)
  for (const player of lobby.players) {
    if (player.isHost && !lobby.hostPlaying) continue;
    player.currentArticle = lobby.startArticle;
    player.clickCount = 0;
    player.finished = false;
    player.finishTime = null;
    player.path = [lobby.startArticle];
  }

  await setLobby(lobby);

  return NextResponse.json({ ok: true });
}
