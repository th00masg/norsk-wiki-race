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
      { error: "Bare verten kan avslutte spillet" },
      { status: 403 }
    );
  }

  lobby.state = "finished";
  await setLobby(lobby);

  return NextResponse.json({ ok: true });
}
