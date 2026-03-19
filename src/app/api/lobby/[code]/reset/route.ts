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
      { error: "Bare verten kan starte ny runde" },
      { status: 403 }
    );
  }

  // Reset lobby to waiting state, keep all players
  lobby.state = "waiting";
  lobby.gameStartTime = null;
  lobby.startArticle = null;
  lobby.endArticle = null;
  lobby.startArticleTitle = null;
  lobby.endArticleTitle = null;
  lobby.emojis = [];

  for (const player of lobby.players) {
    player.currentArticle = null;
    player.clickCount = 0;
    player.finished = false;
    player.finishTime = null;
    player.path = [];
  }

  await setLobby(lobby);

  return NextResponse.json({ ok: true });
}
