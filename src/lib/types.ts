export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  currentArticle: string | null;
  clickCount: number;
  finished: boolean;
  finishTime: number | null;
}

export interface Lobby {
  code: string;
  hostId: string;
  players: Player[];
  state: "waiting" | "playing" | "finished";
  startArticle: string | null;
  endArticle: string | null;
  startArticleTitle: string | null;
  endArticleTitle: string | null;
  gameStartTime: number | null;
}

export interface PlayerResult {
  id: string;
  name: string;
  clickCount: number;
  finishTime: number | null;
  finished: boolean;
}
