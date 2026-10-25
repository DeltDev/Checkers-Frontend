import type { CSSProperties } from "react";
import type { Move } from "../api/types";

interface MoveLogProps {
  history: Move[];
}

const panel: CSSProperties = {
  position: "absolute",
  right: 16,
  bottom: 16,
  zIndex: 10,
  width: 240,
  maxHeight: "45vh",
  overflowY: "auto",
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(15, 18, 26, 0.86)",
  color: "#e8ecf5",
  fontFamily: "ui-monospace, monospace",
  fontSize: 13,
};


export function MoveLog({ history }: MoveLogProps) {
  return (
    <div style={panel}>
      <div style={{ marginBottom: 6, opacity: 0.7 }}>moves ({history.length})</div>
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
