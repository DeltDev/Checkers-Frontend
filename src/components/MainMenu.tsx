import type { CSSProperties } from "react";
import type { PlayerNames } from "../state/gameStore";
import { MenuCanvas3d } from "./MenuCanvas3d";
import { audio } from "../audio/audioManager";

interface MainMenuProps {
  apiOnline: boolean | null;
  busy: boolean;
  errorMessage: string | null;
  names: PlayerNames;
  resumeGameId: string | null;
  onNamesChange: (next: PlayerNames) => void;
  onStart: () => void;
  onResume: () => void;
}

const TITLE = "CHECKERS";

export function MainMenu({
  apiOnline,
  busy,
  errorMessage,
  names,
  resumeGameId,
  onNamesChange,
  onStart,
  onResume,
}: MainMenuProps) {
  const statusText =
    apiOnline === null ? "checking api..." : apiOnline ? "api online" : "api offline";
  const dotClass =
    apiOnline === null ? "dot" : apiOnline ? "dot dot--online" : "dot dot--offline";

  return (
    <div className="menu">
      {/* 3D backdrop: board + starting position, slow orbiting camera, and
          random-sized man/king pieces tumbling in mid-air (menuScene3d). */}
      <MenuCanvas3d />
      {/* Readability scrim between the scene and the menu GUI. */}
      <div className="menu__scrim" />
      {/* Animated title: every letter drops in (letter-drop, staggered via
          --i), then the whole word breathes gold (title-glow) with a slow
          sheen sweep (title-sheen). Pure CSS - no audio/engine needed. */}
      <div className="menu__titlewrap">
        <h1 className="menu__title" aria-label={TITLE}>
          {TITLE.split("").map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="menu__letter"
              style={{ "--i": index } as CSSProperties}
            >
              {letter}
            </span>
          ))}
        </h1>
      </div>
      <div className="menu__subtitle">international draughts &middot; 10&times;10</div>

      <div className="menu__panel">
        <div className="menu__status">
          <span className={dotClass} />
          {statusText}
        </div>

        <div className="menu__names">
          <label>
            <span className="menu__namelabel menu__namelabel--white">
              Player 1 &middot; White
            </span>
            <input
              className="menu__nameinput"
              value={names.white}
              placeholder="Player 1"
              onChange={(e) => onNamesChange({ ...names, white: e.target.value })}
            />
          </label>
          <label>
            <span className="menu__namelabel menu__namelabel--black">
              Player 2 &middot; Black
            </span>
            <input
              className="menu__nameinput"
              value={names.black}
              placeholder="Player 2"
              onChange={(e) => onNamesChange({ ...names, black: e.target.value })}
            />
          </label>
        </div>

        {/* SFX: uiClick - one short UI click for every button in this menu. */}
        <div className="menu__buttons">
          <button
            type="button"
            className="btn btn--primary btn--wide"
            disabled={busy}
            onClick={() => {
              audio.playSfx("uiClick");
              onStart();
            }}
          >
            {busy ? "starting..." : "new game"}
          </button>
          <button
            type="button"
            className="btn btn--wide"
            disabled={busy || !resumeGameId}
            onClick={() => {
              audio.playSfx("uiClick");
              onResume();
            }}
          >
            continue game
          </button>
        </div>

        {errorMessage ? <div className="menu__error">{errorMessage}</div> : null}

        <div className="menu__hint">mandatory captures &middot; max-capture rule</div>
      </div>
    </div>
  );
}
