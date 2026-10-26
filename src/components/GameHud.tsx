import type { CSSProperties } from "react";
import type { GameState, Player } from "../api/types";
import type { PlayerNames } from "../state/gameStore";

interface GameHudProps {
  state: GameState | null;
  busy: boolean;
  apiOnline: boolean | null;
  errorMessage: string | null;
  names: PlayerNames;
  onNamesChange: (next: PlayerNames) => void;
  onNewGame: () => void;
  onOfferDraw: () => void;
  onResign: () => void;

  onExit: () => void;
  onClearError: () => void;
}

const panel: CSSProperties = {
  position: "absolute",
  top: 16,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10,
  padding: "12px 16px",
  borderRadius: 10,
  background: "rgba(15, 18, 26, 0.86)",
  color: "#e8ecf5",
  fontFamily: "system-ui, sans-serif",
  maxWidth: 320,
};

const button: CSSProperties = {
  margin: "6px 6px 0 0",
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #3a4660",
  background: "#1d2433",
  color: "#e8ecf5",
  cursor: "pointer",
};

const input: CSSProperties = {
  width: 96,
  margin: "6px 6px 0 0",
  padding: "4px 6px",
  borderRadius: 6,
  border: "1px solid #3a4660",
  background: "#10131b",
  color: "#e8ecf5",
  fontSize: 13,
};


export function GameHud({
  state,
  busy,
  apiOnline,
  errorMessage,
  names,
  onNamesChange,
  onNewGame,
  onOfferDraw,
  onResign,
  onExit,
  onClearError,
}: GameHudProps) {
  const status = state?.status ?? "no game";
  const winner: Player | undefined = state?.players.find((p) => p.id === state.winnerId);
  const finished = state !== null && state.status !== "Ongoing";
  const turn = !state
    ? "creating a game..."
    : finished
      ? "game over"
      : `${state.turnColor} to move (turn ${state.turn})`;

  return (
    <div style={panel}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Checkers</span>
        <span
          title={apiOnline === null ? "probing /health" : apiOnline ? "API online" : "API offline"}
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: apiOnline === null ? "#8a93a6" : apiOnline ? "#4ade80" : "#f87171",
          }}
        />
      </div>

      <div style={{ fontSize: 13, opacity: 0.85 }}>{turn}</div>
      <div style={{ fontSize: 13, opacity: 0.85 }}>status: {status}</div>
      {winner ? <div style={{ fontSize: 13, fontWeight: 600 }}>winner: {winner.name}</div> : null}

      <div>
        <input
          style={input}
          value={names.white}
          placeholder="White"
          onChange={(e) => onNamesChange({ ...names, white: e.target.value })}
        />
        <input
          style={input}
          value={names.black}
          placeholder="Black"
          onChange={(e) => onNamesChange({ ...names, black: e.target.value })}
        />
      </div>

      {/* SFX: uiClick - one short UI click for every button below
          (New game, Offer draw, Resign, Menu, dismiss). */}
      <div>
        <button type="button" style={button} disabled={busy} onClick={onNewGame}>
          New game
        </button>
        <button type="button" style={button} disabled={busy || finished || !state} onClick={onOfferDraw}>
          Offer draw
        </button>
        <button type="button" style={button} disabled={busy || finished || !state} onClick={onResign}>
          Resign
        </button>
        <button type="button" style={button} disabled={busy} onClick={onExit}>
          Menu
        </button>
      </div>

      {/* SFX (optional): turnChime - a soft chime when `turn` changes to the
          other player; the camera swing is the visual counterpart. */}
      {errorMessage ? (
        <div style={{ marginTop: 8, fontSize: 13, color: "#ffb4a8" }}>
          {errorMessage}{" "}
          <button type="button" style={{ ...button, padding: "2px 8px" }} onClick={onClearError}>
            dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
