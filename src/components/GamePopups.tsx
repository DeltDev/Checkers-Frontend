import { useEffect, useState } from "react";
import type { GameState, PieceColor } from "../api/types";
import type { DrawOffer, Notice, Resignation } from "../state/gameStore";
import { audio } from "../audio/audioManager";

/**
 * Every on-screen popup of the match, in one place:
 *   1. illegal-move / rejected-action toast   (notice, auto-dismissing)
 *   2. draw-offer modal with Accept / Decline (drawOffer, until answered)
 *   3. resignation announcement banner        (resignation, auto-dismissing)
 *   4. match-result modal                     (terminal state.status)
 *
 * The turn banner ("WHITE'S TURN") lives in GameHud because it is driven by
 * turn changes rather than by store events.
 */
interface GamePopupsProps {
  state: GameState | null;
  drawOffer: DrawOffer | null;
  resignation: Resignation | null;
  notice: Notice | null;
  busy: boolean;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onDismissNotice: () => void;
  onRematch: () => void;
  onExit: () => void;
}

/** How long the illegal-move toast stays on screen (matches toast-in). */
const NOTICE_MS = 2400;

/** How long the resignation announcement stays (matches announce-in). */
const RESIGN_MS = 2600;

function titleClassFor(color: PieceColor | "Draw"): string {
  if (color === "White") return "modal__title modal__title--white";
  if (color === "Black") return "modal__title modal__title--black";
  return "modal__title";
}

export function GamePopups({
  state,
  drawOffer,
  resignation,
  notice,
  busy,
  onAcceptDraw,
  onDeclineDraw,
  onDismissNotice,
  onRematch,
  onExit,
}: GamePopupsProps) {
  const finished = state !== null && state.status !== "Ongoing";

  // Illegal-move toast: self-dismissing after NOTICE_MS.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(onDismissNotice, NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice, onDismissNotice]);

  // Resignation banner: appears, then self-dismisses after RESIGN_MS. Both
  // flips happen in timer callbacks (the effect body sets no state); while
  // there is no resignation the render guard hides the banner anyway.
  const [showResign, setShowResign] = useState(false);
  useEffect(() => {
    if (!resignation) return;
    const showTimer = window.setTimeout(() => setShowResign(true), 0);
    const hideTimer = window.setTimeout(() => setShowResign(false), RESIGN_MS);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [resignation]);

  // A draw offer only matters while the game is still running; a move
  // clears it in the store, and both-agreed flips status to Draw.
  const offerVisible = drawOffer !== null && !finished;

  const winner =
    state?.winnerId != null
      ? state.players.find((p) => p.id === state.winnerId)
      : undefined;
  const winnerColor: PieceColor | "Draw" =
    state?.status === "WhiteWon"
      ? "White"
      : state?.status === "BlackWon"
        ? "Black"
        : "Draw";
  const resultTitle =
    winnerColor === "Draw" ? "Draw" : `${winnerColor} wins`;
  const resultSub = resignation
    ? `${resignation.byName} resigned`
    : winner
      ? `winner: ${winner.name}`
      : "the match is over";

  return (
    <>
      {/* 1. illegal-move / rejected-action toast -------------------- */}
      {notice ? (
        // SFX: invalid plays at the source in gameStore (the action that
        // caused this toast), so the toast itself stays silent.
        <div key={notice.id} className="toast">
          {notice.text}
        </div>
      ) : null}

      {/* 2. draw-offer modal: accept / decline ---------------------- */}
      {offerVisible ? (
        <div className="modal-backdrop">
          <div className="modal modal--draw">
            <div className="modal__kicker">draw offer</div>
            {/* SFX: uiClick - for Accept and Decline below. */}
            <h2 className="modal__title">
              {drawOffer.byName} offers a draw
            </h2>
            <div className="modal__sub">
              {drawOffer.color} wants to end the match. Accept to draw, or
              decline to keep playing.
            </div>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy}
                onClick={() => {
                  audio.playSfx("uiClick");
                  onAcceptDraw();
                }}
              >
                Accept
              </button>
              <button
                type="button"
                className="btn btn--danger"
                disabled={busy}
                onClick={() => {
                  audio.playSfx("uiClick");
                  onDeclineDraw();
                }}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. resignation announcement banner ------------------------- */}
      {resignation && showResign ? (
        // SFX: gameEnd (the match-ending sting) is played once, in
        // gameStore.refresh, when the status flips - not re-played here.
        <div className="announce">
          <div className="announce__main">
            {resignation.byName} resigns
          </div>
          <div className="announce__sub">
            {resignation.color} forfeits the match
          </div>
        </div>
      ) : null}

      {/* 4. match-result modal -------------------------------------- */}
      {finished && state ? (
        // SFX: gameEnd is played once, in gameStore.refresh, when the status
        // flips from Ongoing to a terminal state.
        <div className="modal-backdrop">
          <div className={`modal${resignation ? " modal--delayed" : ""}`}>
            <div className="modal__kicker">match result</div>
            <h2 className={titleClassFor(winnerColor)}>{resultTitle}</h2>
            <div className="modal__sub">{resultSub}</div>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  audio.playSfx("uiClick");
                  onRematch();
                }}
              >
                Rematch
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  audio.playSfx("uiClick");
                  onExit();
                }}
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
