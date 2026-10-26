import { useState } from "react";
import { audio } from "../audio/audioManager";

/**
 * Global sound toggle (BGM + SFX together - no volume settings, by design).
 * Lives on the stage, so it is visible on both the menu and the game screen.
 */
export function MuteButton() {
  const [muted, setMuted] = useState<boolean>(audio.isMuted);

  return (
    <button
      type="button"
      className={`mutebtn${muted ? " is-muted" : ""}`}
      aria-pressed={muted}
      aria-label={muted ? "unmute sound" : "mute sound"}
      onClick={() => setMuted(audio.toggleMute())}
    >
      {muted ? "\u{1F507}" : "\u{1F50A}"}
    </button>
  );
}
