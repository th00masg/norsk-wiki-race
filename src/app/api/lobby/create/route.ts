import { NextRequest, NextResponse } from "next/server";
import { getLobby, setLobby, generateCode } from "@/lib/redis";
import { Lobby } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { playerName } = await request.json();
  if (!playerName?.trim()) {
    return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 });
  }

  // Generate unique code
  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    const existing = await getLobby(code);
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  const playerId = crypto.randomUUID();

  const lobby: Lobby = {
    code,
    hostId: playerId,
    players: [
      {
        id: playerId,
        name: playerName.trim(),
        isHost: true,
        currentArticle: null,
        clickCount: 0,
        finished: false,
        finishTime: null,
      },
    ],
    state: "waiting",
    startArticle: null,
    endArticle: null,
    startArticleTitle: null,
    endArticleTitle: null,
    gameStartTime: null,
    timeLimit: 10 * 60 * 1000,
  };

  await setLobby(lobby);

  return NextResponse.json({ code, playerId });
}
