export const BGM_URL = "/audio/bgm.mp3";

export const BGM_VOLUME = 0.3;

export const SFX_VOLUME = 0.9;

export const SFX_URLS = {
  uiClick: "/audio/ui-click.mp3",
  select: "/audio/select.mp3",
  move: "/audio/move.mp3",
  capture: "/audio/capture.mp3",
  promote: "/audio/promote.mp3",
  gameEnd: "/audio/game-end.mp3",
  invalid: "/audio/invalid.mp3",
} as const;

export type SfxName = keyof typeof SFX_URLS;
