import { NextRequest, NextResponse } from "next/server";
import { getLobby, setLobby } from "@/lib/redis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId, startArticle, startTitle, endArticle, endTitle, hostPlaying, timeLimit } =
    await request.json();

  const lobby = await getLobby(code.toUpperCase());
  if (!lobby) {
    return NextResponse.json({ error: "Lobby ikke funnet" }, { status: 404 });
  }

  if (lobby.hostId !== playerId) {
    return NextResponse.json(
      { error: "Bare verten kan endre innstillinger" },
      { status: 403 }
    );
  }

  if (startArticle !== undefined) {
    lobby.startArticle = startArticle;
    lobby.startArticleTitle = startTitle;
  }
  if (endArticle !== undefined) {
    lobby.endArticle = endArticle;
    lobby.endArticleTitle = endTitle;
  }
  if (hostPlaying !== undefined) {
    lobby.hostPlaying = hostPlaying;
  }
  if (timeLimit !== undefined) {
    lobby.timeLimit = timeLimit;
  }

  await setLobby(lobby);

  return NextResponse.json({ ok: true });
}
