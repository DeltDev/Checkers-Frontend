import type { CSSProperties } from "react";
import type { Move } from "../api/types";

interface MoveLogProps {
  history: Move[];
}

const panel: CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  zIndex: 10,
  width: 240,
  // 10 rows of 16px + header (16px + 6px gap) + 20px padding = 202px.
  maxHeight: 202,
  overflowY: "auto",
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(15, 18, 26, 0.86)",
  color: "#e8ecf5",
  fontFamily: "ui-monospace, monospace",
  fontSize: 13,
  lineHeight: "16px",
  boxSizing: "border-box",
};


export function MoveLog({ history }: MoveLogProps) {
  return (
    // SFX (optional): tick - a tiny tick whenever a new notation line appears
    // (i.e. when history.length grows after a move).
    <div style={panel}>
      <div style={{ marginBottom: 6, lineHeight: "16px", opacity: 0.7 }}>
        moves ({history.length})
      </div>
      {history.length === 0 ? (
        <div style={{ opacity: 0.6 }}>no moves yet</div>
      ) : (
        history.map((move, index) => (
          <div key={`${index}-${move.notation}`}>
            {index + 1}. {move.notation}
            {move.type === "Capture" ? ` (x${move.capturedPieceIds.length})` : ""}
          </div>
        ))
      )}
    </div>
  );
}
