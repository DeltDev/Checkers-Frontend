import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { api } from "../api/endpoints";
import type { GameState, Move, PieceColor, Player, Position } from "../api/types";
import { sameCell, squareIndex } from "../board/layout";
import { audio } from "../audio/audioManager";



export type StorePhase = "idle" | "loading" | "ready" | "error";

export interface PlayerNames {
  white: string;
  black: string;
}

/** A draw offer waiting for the opponent's answer (tracked client-side -
 *  the GameState wire contract does not expose pending offers). */
export interface DrawOffer {
  byPlayerId: number;
  byName: string;
  color: PieceColor;
}

/** Who resigned, so the popup can say it (the wire contract has no
 *  end-reason field either - only status + winnerId). */
export interface Resignation {
  byPlayerId: number;
  byName: string;
  color: PieceColor;
}

/** Transient full-width alert (illegal move, rejected draw offer, ...). */
export interface Notice {
  id: number;
  text: string;
}

export interface GameStore {
  phase: StorePhase;
  gameId: string | null;
  state: GameState | null;

  legalMoves: Move[];
  selected: Position | null;
  lastError: ApiError | null;

  drawOffer: DrawOffer | null;
  resignation: Resignation | null;
  notice: Notice | null;

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
  acceptDraw: () => void;
  declineDraw: () => void;
  resign: () => void;
  dismissNotice: () => void;
  clearError: () => void;
}

const INITIAL: GameStore = {
  phase: "idle",
  gameId: null,
  state: null,
  legalMoves: [],
  selected: null,
  lastError: null,
  drawOffer: null,
  resignation: null,
  notice: null,
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

  const noticeSeq = useRef(0);

  // Synchronous re-entrancy guard for move submission: two picks arriving in
  // the same tick both see the PRE-move store (ref.current only refreshes
  // after React commits), so the async `busy` flag alone cannot stop a
  // duplicate POST of the same move.
  const moveInFlight = useRef(false);

  const pushNotice = useCallback((text: string) => {
    noticeSeq.current += 1;
    setStore((p) => ({ ...p, notice: { id: noticeSeq.current, text } }));
  }, []);


  const refresh = useCallback(async (gameId: string): Promise<void> => {
    try {
      const state = await api.getGame(gameId);
      // SFX: gameEnd - the end-of-game sting fires the first time the status
      // flips from "Ongoing" to WhiteWon / BlackWon / Draw (diffed against
      // the previous committed state, never inside the setStore updater).
      const prev = ref.current;
      const endedNow =
        prev.gameId === gameId &&
        prev.state != null &&
        prev.state.status === "Ongoing" &&
        state.status !== "Ongoing";
      if (endedNow) audio.playSfx("gameEnd");
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
          // SFX: gameStart - a short chime once the new board exists.
          audio.playSfx("gameStart");

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
          pushNotice(apiError.message);
        }
      })();
    },
    [pushNotice, refresh],
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
      // SFX: gameStart - a short chime when resuming builds a fresh board.
      audio.playSfx("gameStart");
      void refresh(gameId);
    },
    [refresh],
  );

  const playMove = useCallback(
    async (move: Move): Promise<void> => {
      const s = ref.current;
      if (!s.gameId || !s.state) return;
      if (moveInFlight.current) return;
      const mover = s.state.players.find((p) => p.color === s.state?.turnColor);
      if (!mover) return;

      const gameId = s.gameId;
      moveInFlight.current = true;
      setStore((p) => ({ ...p, busy: true }));
      try {
        await api.makeMove(gameId, {
          playerId: mover.id,
          from: move.from,
          to: move.to,
          path: move.path.length > 0 ? move.path : null,
        });
        // A successful move also clears any pending draw offers server-side.
        setStore((p) => ({ ...p, selected: null, drawOffer: null }));
        await refresh(gameId);
      } catch (error) {
        // SFX: invalid - the server rejected the move (stale or not legal
        // after all); a short "denied" buzz.
        audio.playSfx("invalid");
        const apiError = toApiError(error);
        setStore((p) => ({ ...p, busy: false, lastError: apiError }));
        pushNotice(apiError.message);
      } finally {
        moveInFlight.current = false;
      }
    },
    [pushNotice, refresh],
  );

  const selectSquare = useCallback(
    (pos: Position) => {
      const s = ref.current;
      if (!s.gameId || !s.state || s.busy || s.state.status !== "Ongoing") {
        // SFX: invalid - click ignored (busy or the game already ended).
        audio.playSfx("invalid");
        return;
      }

      const hadSelection = s.selected !== null;

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
      // SFX: canStart -> "select" (piece picked up); otherwise -> "invalid"
      // (dead click on an empty/enemy/unmovable square, which also deselects).
      if (canStart) {
        audio.playSfx("select");
      } else {
        audio.playSfx("invalid");
      }
      if (hadSelection && !canStart) {
        // A piece was selected and this square was none of its legal
        // targets - that is an attempted illegal move: say it out loud.
        pushNotice("illegal move");
      }
      setStore((p) => ({ ...p, selected: canStart ? pos : null }));
    },
    [playMove, pushNotice],
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
          if (ref.current.state?.status === "Ongoing") {
            // Offer recorded, opponent has not answered yet - show the popup.
            setStore((p) => ({
              ...p,
              drawOffer: { byPlayerId: me.id, byName: me.name, color: me.color },
            }));
          }
          // "draw agreed" -> the game is already Draw; result popup takes over.
        } else {
          // SFX: invalid - the draw offer was refused (success === false).
          audio.playSfx("invalid");
          const message = result.message ?? "draw offer rejected";
          setStore((p) => ({ ...p, busy: false, lastError: new ApiError(200, message) }));
          pushNotice(message);
        }
      } catch (error) {
        const apiError = toApiError(error);
        setStore((p) => ({ ...p, busy: false, lastError: apiError }));
        pushNotice(apiError.message);
      }
    })();
  }, [pushNotice, refresh]);

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
        // Record who resigned BEFORE refresh - the wire contract only says
        // "WhiteWon/BlackWon", never that it was a resignation.
        setStore((p) => ({
          ...p,
          resignation: { byPlayerId: me.id, byName: me.name, color: me.color },
        }));
        await refresh(gameId);
      } catch (error) {
        const apiError = toApiError(error);
        setStore((p) => ({ ...p, busy: false, lastError: apiError }));
        pushNotice(apiError.message);
      }
    })();
  }, [pushNotice, refresh]);

  const acceptDraw = useCallback(() => {
    const s = ref.current;
    const offer = s.drawOffer;
    if (!s.gameId || !s.state || s.busy || s.state.status !== "Ongoing" || !offer) return;

    // The responder is the player who did NOT make the offer.
    const responder = s.state.players.find((p) => p.id !== offer.byPlayerId);
    if (!responder) return;

    const gameId = s.gameId;
    setStore((p) => ({ ...p, busy: true }));
    void (async () => {
      try {
        // Accepting = the opponent also offering a draw: two offers -> Draw.
        const result = await api.offerDraw(gameId, { playerId: responder.id });
        setStore((p) => ({ ...p, drawOffer: null }));
        if (!result.success) {
          pushNotice(result.message ?? "draw offer rejected");
        }
        await refresh(gameId);
      } catch (error) {
        const apiError = toApiError(error);
        setStore((p) => ({ ...p, busy: false, lastError: apiError }));
        pushNotice(apiError.message);
      }
    })();
  }, [pushNotice, refresh]);

  const declineDraw = useCallback(() => {
    // Local-only: the backend has no "reject" call - a pending offer is
    // cleared by the next move, so declining just dismisses the popup.
    setStore((p) => ({ ...p, drawOffer: null }));
  }, []);

  const dismissNotice = useCallback(() => {
    setStore((p) => ({ ...p, notice: null }));
  }, []);

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
    acceptDraw,
    declineDraw,
    resign,
    dismissNotice,
    clearError,
  };
}
