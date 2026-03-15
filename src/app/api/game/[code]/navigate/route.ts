import { NextRequest, NextResponse } from "next/server";
import { getLobby, setLobby } from "@/lib/redis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId, article } = await request.json();

  const lobby = await getLobby(code.toUpperCase());
  if (!lobby) {
    return NextResponse.json({ error: "Lobby ikke funnet" }, { status: 404 });
  }

  if (lobby.state !== "playing") {
    return NextResponse.json(
      { error: "Spillet er ikke aktivt" },
      { status: 400 }
    );
  }

  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) {
    return NextResponse.json(
      { error: "Spiller ikke funnet" },
      { status: 404 }
    );
  }

  if (player.finished) {
    return NextResponse.json(
      { error: "Du har allerede fullført" },
      { status: 400 }
    );
  }

  player.clickCount += 1;
  player.currentArticle = article;
  if (!player.path) player.path = [];
  player.path.push(article);

  // Check if player reached the end article
  const normalizedArticle = decodeURIComponent(article).replace(/_/g, " ").toLowerCase();
  const normalizedEnd = (lobby.endArticle || "").replace(/_/g, " ").toLowerCase();

  if (normalizedArticle === normalizedEnd) {
    player.finished = true;
    player.finishTime = Date.now() - (lobby.gameStartTime || 0);
  }

  // Check if all playing players finished (skip spectating host)
  const allFinished = lobby.players
    .filter((p) => !(p.isHost && !lobby.hostPlaying))
    .every((p) => p.finished);
  if (allFinished) {
    lobby.state = "finished";
  }

  await setLobby(lobby);

  return NextResponse.json({
    clickCount: player.clickCount,
    finished: player.finished,
    allFinished,
  });
}
