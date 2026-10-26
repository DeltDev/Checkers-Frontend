import { useEffect, useMemo, useRef, useState } from "react";
import type { GameState, PieceColor } from "../api/types";
import type { DrawOffer, Notice, Resignation } from "../state/gameStore";
import { GamePopups } from "./GamePopups";
import { audio } from "../audio/audioManager";

interface GameHudProps {
  state: GameState | null;
  busy: boolean;
  apiOnline: boolean | null;
  errorMessage: string | null;
  drawOffer: DrawOffer | null;
  resignation: Resignation | null;
  notice: Notice | null;
  onNewGame: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onResign: () => void;
  onExit: () => void;
  onDismissNotice: () => void;
  onClearError: () => void;
}

/** How long the big "X's turn" banner stays on screen (matches banner-in). */
const BANNER_MS = 2000;

/** Starting pieces per side on a 10x10 international board. */
const STARTING_PIECES = 20;

function pieceCount(state: GameState | null, color: PieceColor): number {
  if (!state) return STARTING_PIECES;
  return state.squares.reduce(
    (count, square) => (square.occupantColor === color ? count + 1 : count),
    0,
  );
}

interface PlayerPanelProps {
  side: "left" | "right";
  label: string;
  name: string;
  color: PieceColor;
  active: boolean;
  result: string | null;
  pieces: number;
}

function PlayerPanel({ side, label, name, color, active, result, pieces }: PlayerPanelProps) {
  const chip = color === "White" ? "player__chip player__chip--white" : "player__chip player__chip--black";
  return (
    <div className={`player${side === "right" ? " player--right" : ""}${active ? " is-active" : ""}`}>
      <div className="player__flag">
        {side === "left" ? <span className={chip} /> : null}
        {label}
        {side === "right" ? <span className={chip} /> : null}
      </div>
      <div className="player__name">{name}</div>
      <div className="player__meta">
        {result ?? `${pieces} pieces`}
      </div>
    </div>
  );
}

export function GameHud({
  state,
  busy,
  apiOnline,
  errorMessage,
  drawOffer,
  resignation,
  notice,
  onNewGame,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onResign,
  onExit,
  onDismissNotice,
  onClearError,
}: GameHudProps) {
  const finished = state !== null && state.status !== "Ongoing";

  // ---- turn banner --------------------------------------------------------
  // Shown on entering the game and on every turn change, never after the
  // match ends. Animation: banner-in (2s, ends invisible).
  const [banner, setBanner] = useState<{ key: number; color: PieceColor; name: string } | null>(null);

  // Freshest state for use inside timer callbacks.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Show the banner whenever a new turn begins (including game start) and
  // hide it after BANNER_MS; never after the match ends. Both flips happen
  // in timer callbacks, so the effect body itself sets no state.
  const bannerKey = state ? `${state.gameId}:${state.turn}` : "";
  useEffect(() => {
    const s = stateRef.current;
    if (!s || s.status !== "Ongoing") return;
    const mover = s.players.find((p) => p.color === s.turnColor);
    const showTimer = window.setTimeout(() => {
      setBanner({ key: s.turn, color: s.turnColor, name: mover?.name ?? "" });
    }, 0);
    const hideTimer = window.setTimeout(() => setBanner(null), BANNER_MS);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [bannerKey]);

  // Load/API errors use the same auto-dismissing toast as notices.
  useEffect(() => {
    if (!errorMessage || notice) return;
    const timer = window.setTimeout(onClearError, BANNER_MS + 400);
    return () => window.clearTimeout(timer);
  }, [errorMessage, notice, onClearError]);

  // ---- derived player data ------------------------------------------------
  const white = state?.players.find((p) => p.color === "White");
  const black = state?.players.find((p) => p.color === "Black");
  const whitePieces = useMemo(() => pieceCount(state, "White"), [state]);
  const blackPieces = useMemo(() => pieceCount(state, "Black"), [state]);

  const winnerName =
    state?.winnerId != null
      ? state.players.find((p) => p.id === state.winnerId)?.name
      : undefined;

  const resultFor = (color: PieceColor): string | null => {
    if (!finished || !state) return null;
    if (state.status === "Draw") return "draw";
    const winnerColor = state.status === "WhiteWon" ? "White" : "Black";
    if (winnerColor === color) return `winner - ${winnerName ?? color}`;
    if (resignation?.color === color) return "resigned";
    return "defeated";
  };

  const turnStrip = !state
    ? "creating match..."
    : finished
      ? "match over"
      : `turn ${state.turn} \u00b7 ${state.turnColor.toLowerCase()} to move`;

  return (
    <>
      {/* ---- top: 1v1 player panels + VS ---- */}
      <div className="hud__players">
        <PlayerPanel
          side="left"
          label="player 1"
          name={white?.name ?? "player 1"}
          color="White"
          active={state?.turnColor === "White" && !finished}
          result={resultFor("White")}
          pieces={whitePieces}
        />
        <div className="player__vs">vs</div>
        <PlayerPanel
          side="right"
          label="player 2"
          name={black?.name ?? "player 2"}
          color="Black"
          active={state?.turnColor === "Black" && !finished}
          result={resultFor("Black")}
          pieces={blackPieces}
        />
      </div>

      {/* ---- top-center: turn strip ---- */}
      <div className="hud__turnstrip">{turnStrip}</div>

      {/* ---- center: big turn banner ---- */}
      {banner ? (
        <div key={banner.key} className="turnbanner">
          <div
            className={`turnbanner__main turnbanner__main--${banner.color.toLowerCase()}`}
          >
            {banner.color}&apos;s turn
          </div>
          {banner.name ? <div className="turnbanner__sub">{banner.name}</div> : null}
        </div>
      ) : null}

      {/* ---- bottom-center: action bar ---- */}
      {/* SFX: uiClick - one short UI click for every button below. */}
      <div className="hud__actions">
        <button
          type="button"
          className="btn"
          disabled={busy || finished || !state}
          onClick={() => {
            audio.playSfx("uiClick");
            onOfferDraw();
          }}
        >
          Offer draw
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={busy || finished || !state}
          onClick={() => {
            audio.playSfx("uiClick");
            onResign();
          }}
        >
          Resign
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => {
            audio.playSfx("uiClick");
            onNewGame();
          }}
        >
          New game
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => {
            audio.playSfx("uiClick");
            onExit();
          }}
        >
          Menu
        </button>
      </div>

      {/* ---- load/API error toast (auto-dismissing; interactive errors
              go through the notice toast instead, so never both at once) ---- */}
      {errorMessage && !notice ? (
        <div key={errorMessage} className="toast">
          {errorMessage}
        </div>
      ) : null}

      {/* ---- API offline chip ---- */}
      {apiOnline === false ? <div className="api-offline">api offline</div> : null}

      {/* ---- all match popups ---- */}
      <GamePopups
        state={state}
        drawOffer={drawOffer}
        resignation={resignation}
        notice={notice}
        busy={busy}
        onAcceptDraw={onAcceptDraw}
        onDeclineDraw={onDeclineDraw}
        onDismissNotice={onDismissNotice}
        onRematch={onNewGame}
        onExit={onExit}
      />
    </>
  );
}
