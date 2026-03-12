import { Redis } from "@upstash/redis";
import { Lobby } from "./types";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const LOBBY_TTL = 7200; // 2 hours

function lobbyKey(code: string) {
  return `lobby:${code}`;
}

export async function getLobby(code: string): Promise<Lobby | null> {
  const data = await redis.get<Lobby>(lobbyKey(code));
  return data;
}

export async function setLobby(lobby: Lobby): Promise<void> {
  await redis.set(lobbyKey(lobby.code), lobby, { ex: LOBBY_TTL });
}

export async function deleteLobby(code: string): Promise<void> {
  await redis.del(lobbyKey(code));
}

export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default redis;
