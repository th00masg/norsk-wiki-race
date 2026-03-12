import { NextRequest, NextResponse } from "next/server";
import { getLobby } from "@/lib/redis";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const lobby = await getLobby(code.toUpperCase());

  if (!lobby) {
    return NextResponse.json({ error: "Lobby ikke funnet" }, { status: 404 });
  }

  return NextResponse.json(lobby);
}
