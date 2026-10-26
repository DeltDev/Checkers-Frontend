import { useEffect, useRef } from "react";
import type { Move } from "../api/types";
import { audio } from "../audio/audioManager";

interface MoveLogProps {
  history: Move[];
}

/**
 * Notation history, bottom-left of the stage, scrollable. The CSS caps the
 * panel at roughly 10 rows (max-height), so older moves scroll out of view.
 */
export function MoveLog({ history }: MoveLogProps) {
  // SFX: tick - a tiny tick whenever a new notation line appears
  // (i.e. when history.length grows after a move).
  const prevCount = useRef(history.length);
  useEffect(() => {
    if (history.length > prevCount.current) audio.playSfx("tick");
    prevCount.current = history.length;
  }, [history.length]);

  return (
    <div className="movelog">
      <div className="movelog__head">move log ({history.length})</div>
      {history.length === 0 ? (
        <div className="movelog__empty">no moves yet</div>
      ) : (
        history.map((move, index) => (
          <div key={`${index}-${move.notation}`} className="movelog__row">
            <b>{index + 1}.</b> {move.notation}
            {move.type === "Capture" ? (
              <span className="movelog__cap"> (x{move.capturedPieceIds.length})</span>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
