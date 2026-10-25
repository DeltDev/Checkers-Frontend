import { request } from "./client";
import type { ActionResult, CreateGame, GameState, LegalMoves, MoveCmd, PlayerCmd } from "./types";

export const api = {
  /** Liveness gate; answers plain text "ok", hence raw: true. */
  health: () => request<string>("/health", { raw: true }),

  /** 201 + Location; the 201 body already carries gameId. */
  createGame: (body: CreateGame) => request<GameState>("/api/games", { method: "POST", body }),

  getGame: (gameId: string) => request<GameState>(`/api/games/${gameId}`),

  /** Empty moves[] is a NORMAL 200 (wrong turn / finished game), never an error (D3). */
  getLegalMoves: (gameId: string, playerId: number) =>
    request<LegalMoves>(`/api/games/${gameId}/moves?playerId=${playerId}`),

  /** 409 { success:false, message, status } on wrong turn / illegal / finished (D6). */
  makeMove: (gameId: string, cmd: MoveCmd) =>
    request<ActionResult>(`/api/games/${gameId}/moves`, { method: "POST", body: cmd }),

  /** 200 even when rejected - check `success` (D5). */
  offerDraw: (gameId: string, cmd: PlayerCmd) =>
    request<ActionResult>(`/api/games/${gameId}/draw`, { method: "POST", body: cmd }),

  /** 409 "game already finished" once the game is over (D6). */
  resign: (gameId: string, cmd: PlayerCmd) =>
    request<ActionResult>(`/api/games/${gameId}/resign`, { method: "POST", body: cmd }),
};
