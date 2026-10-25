import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { api } from "../api/endpoints";
import type { GameState, Move, Player, Position } from "../api/types";
import { sameCell, squareIndex } from "../board/layout";



export type StorePhase = "idle" | "loading" | "ready" | "error";

export interface PlayerNames {
  white: string;
  black: string;
}

export interface GameStore {
  phase: StorePhase;
  gameId: string | null;
  state: GameState | null;

  legalMoves: Move[];
  selected: Position | null;
  lastError: ApiError | null;

  busy: boolean;

  apiOnline: boolean | null;
}

export interface GameStoreActions {
  legalMovesFrom: (pos: Position) => Move[];
 
  legalTargets: Position[];
  isPlayersTurn: (playerId: number) => boolean;
  checkHealth: () => void;
  createGame: (names: PlayerNames) => void;
  loadGame: (gameId: string) => void;
  selectSquare: (pos: Position) => void;
  offerDraw: () => void;
  resign: () => void;
  clearError: () => void;
}

const INITIAL: GameStore = {
  phase: "idle",
  gameId: null,
  state: null,
  legalMoves: [],
  selected: null,
  lastError: null,
  busy: false,
  apiOnline: null,
};

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(-1, error instanceof Error ? error.message : String(error));
}

export function useGameStore(): GameStore & GameStoreActions {
  const [store, setStore] = useState<GameStore>(INITIAL);

  const ref = useRef(store);
  useEffect(() => {
    ref.current = store;
  }, [store]);


  const refresh = useCallback(async (gameId: string): Promise<void> => {
    try {
      const state = await api.getGame(gameId);
      const mover: Player | undefined = state.players.find((p) => p.color === state.turnColor);
      const moves =
        state.status === "Ongoing" && mover
          ? (await api.getLegalMoves(gameId, mover.id)).moves
          : [];
      setStore((prev) => {
        if (prev.gameId !== gameId) return prev; // R5: another game took over
        if (prev.state && state.turn < prev.state.turn) return prev; // R4: stale
        return { ...prev, phase: "ready", state, legalMoves: moves, busy: false, lastError: null };
      });
    } catch (error) {
      setStore((prev) =>
        prev.gameId === gameId
          ? { ...prev, phase: "error", busy: false, lastError: toApiError(error) }
          : prev,
      );
    }
  }, []);

  const checkHealth = useCallback(async (): Promise<void> => {
    try {
      await api.health();
      setStore((p) => ({ ...p, apiOnline: true }));
    } catch {
      setStore((p) => ({ ...p, apiOnline: false }));
    }
  }, []);

  const createGame = useCallback(
    (names: PlayerNames) => {
      setStore((p) => ({ ...p, phase: "loading", busy: true, lastError: null, selected: null }));
      void (async () => {
        try {
          const created = await api.createGame({
            whitePlayerName: names.white,
            blackPlayerName: names.black,
          });
          setStore((prev) => ({
            ...INITIAL,
            apiOnline: prev.apiOnline,
            phase: "ready",
            gameId: created.gameId,
            state: created,
          }));

          const url = new URL(window.location.href);
          url.searchParams.set("game", created.gameId);
          window.history.replaceState(null, "", url.toString());
          await refresh(created.gameId);
        } catch (error) {
          const apiError = toApiError(error);
          setStore((prev) => ({
            ...prev,
            phase: "error",
            busy: false,
            lastError: apiError,
            apiOnline: apiError.status === 0 ? false : prev.apiOnline,
          }));
        }
      })();
    },
    [refresh],
  );

  const loadGame = useCallback(
    (gameId: string) => {
      setStore((p) => ({
        ...p,
        phase: "loading",
        busy: true,
        gameId,
        state: null,
        legalMoves: [],
        selected: null,
        lastError: null,
      }));
      void refresh(gameId);
    },
    [refresh],
  );

  const playMove = useCallback(
    async (move: Move): Promise<void> => {
      const s = ref.current;
      if (!s.gameId || !s.state) return;
      const mover = s.state.players.find((p) => p.color === s.state?.turnColor);
      if (!mover) return;

      const gameId = s.gameId;
      setStore((p) => ({ ...p, busy: true }));
      try {
        await api.makeMove(gameId, {
          playerId: mover.id,
          from: move.from,
          to: move.to,
          path: move.path.length > 0 ? move.path : null,
        });
        setStore((p) => ({ ...p, selected: null }));
        await refresh(gameId);
      } catch (error) {

        setStore((p) => ({ ...p, busy: false, lastError: toApiError(error) }));
      }
    },
    [refresh],
  );

  const selectSquare = useCallback(
    (pos: Position) => {
      const s = ref.current;
      if (!s.gameId || !s.state || s.busy || s.state.status !== "Ongoing") return;

      if (s.selected) {
        const target = s.legalMoves.find(
          (m) => sameCell(m.from, s.selected) && sameCell(m.to, pos),
        );
        if (target) {
          void playMove(target);
          return;
        }
      }

      const square = s.state.squares[squareIndex(pos)];
      const ownPiece = square.occupantColor === s.state.turnColor;
      const canStart = ownPiece && s.legalMoves.some((m) => sameCell(m.from, pos));
      setStore((p) => ({ ...p, selected: canStart ? pos : null }));
    },
    [playMove],
  );

  const offerDraw = useCallback(() => {
    const s = ref.current;
    if (!s.gameId || !s.state || s.busy || s.state.status !== "Ongoing") return;
    const me = s.state.players.find((p) => p.color === s.state?.turnColor);
    if (!me) return;

    const gameId = s.gameId;
    setStore((p) => ({ ...p, busy: true }));
    void (async () => {
      try {
        const result = await api.offerDraw(gameId, { playerId: me.id });
        if (result.success) {
          await refresh(gameId);
        } else {

          setStore((p) => ({
            ...p,
            busy: false,
            lastError: new ApiError(200, result.message ?? "draw offer rejected"),
          }));
        }
      } catch (error) {
        setStore((p) => ({ ...p, busy: false, lastError: toApiError(error) }));
      }
    })();
  }, [refresh]);

  const resign = useCallback(() => {
    const s = ref.current;
    if (!s.gameId || !s.state || s.busy) return;
    const me = s.state.players.find((p) => p.color === s.state?.turnColor);
    if (!me) return;

    const gameId = s.gameId;
    setStore((p) => ({ ...p, busy: true }));
    void (async () => {
      try {
        await api.resign(gameId, { playerId: me.id });
        await refresh(gameId);
      } catch (error) {
        setStore((p) => ({ ...p, busy: false, lastError: toApiError(error) }));
      }
    })();
  }, [refresh]);

  const clearError = useCallback(() => {
    setStore((p) => ({ ...p, lastError: null }));
  }, []);

  const legalMovesFrom = useCallback(
    (pos: Position): Move[] =>
      store.legalMoves.filter((m) => sameCell(m.from, pos)),
    [store.legalMoves],
  );

  const selected = store.selected;
  const legalTargets = useMemo<Position[]>(
    () =>
      selected
        ? store.legalMoves.filter((m) => sameCell(m.from, selected)).map((m) => m.to)
        : [],
    [selected, store.legalMoves],
  );

  const turnColor = store.state?.turnColor;
  const isPlayersTurn = useCallback(
    (playerId: number): boolean =>
      store.state !== null &&
      store.state.status === "Ongoing" &&
      store.state.players.find((p) => p.id === playerId)?.color === turnColor,
    [store.state, turnColor],
  );

  return {
    ...store,
    legalMovesFrom,
    legalTargets,
    isPlayersTurn,
    checkHealth,
    createGame,
    loadGame,
    selectSquare,
    offerDraw,
    resign,
    clearError,
  };
}
