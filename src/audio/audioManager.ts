import { Engine, Sound } from "@babylonjs/core";
import { BGM_URL, BGM_VOLUME, SFX_URLS, SFX_VOLUME } from "./sounds";
import type { SfxName } from "./sounds";

const FADE_MS = 800;
const MUTED_KEY = "checkers.muted";

class AudioManager {
  private readonly sfx = new Map<SfxName, Sound>();
  private bgm: Sound | null = null;
  private unlocked = false;
  private started = false;
  /** BGM requested but its file has not finished probing/loading yet. */
  private wantBgm = false;
  private muted = readMuted();

  constructor() {
    this.applyMute();
    // Browsers only allow sound after a user gesture; unlock on the first.
    window.addEventListener("pointerdown", () => this.unlock(), { once: true });
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /**
   * Toggle global mute (BGM + SFX together, no volume settings). Mute is a
   * global volume of 0, so it survives new sounds loaded later. Returns the
   * new muted state for immediate UI feedback.
   */
  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTED_KEY, this.muted ? "1" : "0");
    } catch {
      /* storage unavailable - mute just does not persist */
    }
    this.applyMute();
    this.playSfx("uiClick"); // confirms the toggle (silenced when muting)
    return this.muted;
  }

  private applyMute(): void {
    Engine.audioEngine?.setGlobalVolume(this.muted ? 0 : 1);
  }

  /**
   * Probe every audio file and load the ones that exist. Babylon has no
   * load-error callback, so a missing file is skipped here instead of
   * spamming the console. Idempotent.
   */
  preload(): void {
    if (this.started) return;
    this.started = true;
    void this.loadAll();
  }

  private async loadAll(): Promise<void> {
    for (const [name, url] of Object.entries(SFX_URLS)) {
      if (!(await exists(url))) continue;
      this.sfx.set(name as SfxName, makeSound(name, url, { volume: SFX_VOLUME }));
    }

    if (await exists(BGM_URL)) {
      this.bgm = makeSound("bgm", BGM_URL, { loop: true, volume: this.wantBgm ? BGM_VOLUME : 0 });
      if (this.wantBgm && !this.bgm.isPlaying) this.bgm.play();
    }

    // The audio engine is created with the first Sound; re-apply mute now
    // that it exists (the constructor call ran too early).
    this.applyMute();
  }

  private unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    Engine.audioEngine?.unlock();
  }

  playSfx(name: SfxName): void {
    const sound = this.sfx.get(name);
    if (!sound) return;
    // audioEngine is undefined until the first Sound exists (no files yet).
    if (!Engine.audioEngine || !Engine.audioEngine.unlocked) return;
    sound.stop();
    sound.play();
  }

  /** Fade the looping BGM in (entering the game screen). */
  startBgm(): void {
    this.wantBgm = true;
    if (!this.bgm) return; // still probing - loadAll picks the request up
    if (this.bgm.isPlaying) return;
    this.bgm.play();
    this.bgm.setVolume(BGM_VOLUME, FADE_MS);
  }

  /** Fade the BGM out (leaving to the menu). */
  stopBgm(): void {
    this.wantBgm = false;
    if (!this.bgm || !this.bgm.isPlaying) return;
    this.bgm.setVolume(0, FADE_MS);
    const bgm = this.bgm;
    window.setTimeout(() => {
      if (!this.wantBgm && bgm.getVolume() === 0) bgm.stop();
    }, FADE_MS + 50);
  }
}

function makeSound(name: string, url: string, opts: { loop?: boolean; volume: number }): Sound {
  return new Sound(name, url, undefined, undefined, {
    autoplay: false,
    loop: opts.loop ?? false,
    volume: opts.volume,
    spatialSound: false,
  });
}

/** True when the static file exists (HEAD 404s for anything missing). */
async function exists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export const audio = new AudioManager();
