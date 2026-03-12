import { NextRequest, NextResponse } from "next/server";
import { getLobby, setLobby } from "@/lib/redis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerName } = await request.json();

  if (!playerName?.trim()) {
    return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 });
  }

  const lobby = await getLobby(code.toUpperCase());
  if (!lobby) {
    return NextResponse.json({ error: "Lobby ikke funnet" }, { status: 404 });
  }

  if (lobby.state !== "waiting") {
    return NextResponse.json(
      { error: "Spillet har allerede startet" },
      { status: 400 }
    );
  }

  const playerId = crypto.randomUUID();
  lobby.players.push({
    id: playerId,
    name: playerName.trim(),
    isHost: false,
    currentArticle: null,
    clickCount: 0,
    finished: false,
    finishTime: null,
  });

  await setLobby(lobby);

  return NextResponse.json({ playerId, lobby });
}
