import { NextRequest, NextResponse } from "next/server";
import { getLobby, setLobby } from "@/lib/redis";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const lobby = await getLobby(code.toUpperCase());

  if (!lobby) {
    return NextResponse.json({ error: "Lobby ikke funnet" }, { status: 404 });
  }

  // Auto-end game if time limit exceeded
  const timeLimit = lobby.timeLimit || 10 * 60 * 1000;
  if (
    lobby.state === "playing" &&
    lobby.gameStartTime &&
    Date.now() - lobby.gameStartTime > timeLimit
  ) {
    lobby.state = "finished";
    await setLobby(lobby);
  }

  return NextResponse.json({
    state: lobby.state,
    players: lobby.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      currentArticle: p.currentArticle,
      clickCount: p.clickCount,
      finished: p.finished,
      finishTime: p.finishTime,
      path: p.path || [],
    })),
    startArticle: lobby.startArticle,
    startArticleTitle: lobby.startArticleTitle,
    endArticle: lobby.endArticle,
    endArticleTitle: lobby.endArticleTitle,
    gameStartTime: lobby.gameStartTime,
    timeLimit: lobby.timeLimit || 10 * 60 * 1000,
    hostPlaying: lobby.hostPlaying ?? false,
  });
}
