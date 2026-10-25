import type { CSSProperties } from "react";
import type { PlayerNames } from "../state/gameStore";

type View = "2d" | "3d";

interface MainMenuProps {

  apiOnline: boolean | null;
  busy: boolean;

  errorMessage: string | null;
  names: PlayerNames;
  view: View;

  resumeGameId: string | null;
  onNamesChange: (next: PlayerNames) => void;
  onViewChange: (next: View) => void;
  onStart: () => void;
  onResume: () => void;
}

const screen: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, sans-serif",
};

const card: CSSProperties = {
  width: 340,
  padding: "28px 30px",
  borderRadius: 14,
  background: "rgba(15, 18, 26, 0.94)",
  color: "#e8ecf5",
  boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
  textAlign: "center",
};

const button: CSSProperties = {
  width: "100%",
  marginTop: 10,
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #3a4660",
  background: "#2f6feb",
  color: "#f4f7ff",
  fontSize: 15,
  cursor: "pointer",
};

const secondary: CSSProperties = {
  ...button,
  background: "#1d2433",
};

const input: CSSProperties = {
  width: "100%",
  marginTop: 4,
  padding: "7px 9px",
  borderRadius: 7,
  border: "1px solid #3a4660",
  background: "#10131b",
  color: "#e8ecf5",
  fontSize: 14,
  boxSizing: "border-box",
};

const label: CSSProperties = {
  display: "block",
  marginTop: 12,
  fontSize: 12,
  textAlign: "left",
  opacity: 0.75,
};


export function MainMenu({
  apiOnline,
  busy,
  errorMessage,
  names,
  view,
  resumeGameId,
  onNamesChange,
  onViewChange,
  onStart,
  onResume,
}: MainMenuProps) {
  const statusText =
    apiOnline === null ? "checking API..." : apiOnline ? "API online" : "API offline";

  return (
    <div style={screen}>
      <div style={card}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>CHECKERS</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
          10x10 international draughts - 2D &amp; 3D
        </div>

        <div style={{ fontSize: 12, marginTop: 14, opacity: 0.85 }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              marginRight: 6,
              background: apiOnline === null ? "#8a93a6" : apiOnline ? "#4ade80" : "#f87171",
            }}
          />
          {statusText}
        </div>

        <label style={label}>
          White
          <input
            style={input}
            value={names.white}
            placeholder="Player 1"
            onChange={(e) => onNamesChange({ ...names, white: e.target.value })}
          />
        </label>
        <label style={label}>
          Black
          <input
            style={input}
            value={names.black}
            placeholder="Player 2"
            onChange={(e) => onNamesChange({ ...names, black: e.target.value })}
          />
        </label>

        <div style={{ marginTop: 16, fontSize: 12, opacity: 0.75 }}>board view</div>
        <div style={{ marginTop: 6 }}>
          <button
            type="button"
            disabled
            title="The 2D board is not applied to this project yet - only the 3D UI is wired"
            onClick={() => onViewChange("2d")}
            style={{
              ...secondary,
              width: "auto",
              display: "inline-block",
              marginTop: 0,
              marginRight: 6,
              padding: "6px 16px",
              background: "#1d2433",
              color: "#7b849b",
              cursor: "not-allowed",
              opacity: 0.6,
            }}
          >
            2D (soon)
          </button>
          <button
            type="button"
            onClick={() => onViewChange("3d")}
            style={{
              ...secondary,
              width: "auto",
              display: "inline-block",
              marginTop: 0,
              padding: "6px 16px",
              background: view === "3d" ? "#2f6feb" : "#1d2433",
            }}
          >
            3D
          </button>
        </div>

        <button type="button" style={button} disabled={busy} onClick={onStart}>
          {busy ? "starting..." : "New game"}
        </button>
        <button
          type="button"
          style={{ ...secondary, opacity: resumeGameId ? 1 : 0.45 }}
          disabled={busy || !resumeGameId}
          onClick={onResume}
        >
          Continue game
        </button>

        {errorMessage ? (
          <div style={{ marginTop: 12, fontSize: 13, color: "#ffb4a8" }}>{errorMessage}</div>
        ) : null}
      </div>
    </div>
  );
}
