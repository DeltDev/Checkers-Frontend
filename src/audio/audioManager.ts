import { Engine, Sound } from "@babylonjs/core";
import { BGM_URL, BGM_VOLUME, SFX_URLS, SFX_VOLUME } from "./sounds";
import type { SfxName } from "./sounds";

const FADE_MS = 800;

class AudioManager {
  private readonly sfx = new Map<SfxName, Sound>();
  private bgm: Sound | null = null;
  private unlocked = false;

  preload(): void {
    if (this.sfx.size > 0) return;

    const names = Object.keys(SFX_URLS) as SfxName[];
    for (const name of names) {
      const sound = new Sound(name, SFX_URLS[name], undefined, undefined, {
        autoplay: false,
        volume: SFX_VOLUME,
        spatialSound: false,
      });
      this.sfx.set(name, sound);
    }

    this.unlock();

    window.addEventListener(
      "pointerdown",
      () => {
        Engine.audioEngine?.unlock();
      },
      { once: true },
    );
  }

  private unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    Engine.audioEngine?.unlock();
  }

  playSfx(name: SfxName): void {
    const sound = this.sfx.get(name);
    if (!sound) return;
    if (Engine.audioEngine === null || !Engine.audioEngine.unlocked) return;
    sound.stop();
    sound.play();
  }

  startBgm(): void {
    if (!this.bgm) {
      this.bgm = new Sound("bgm", BGM_URL, undefined, undefined, {
        autoplay: false,
        loop: true,
        volume: 0,
        spatialSound: false,
      });
    }
    if (this.bgm.isPlaying) return;
    this.bgm.play();
    this.bgm.setVolume(BGM_VOLUME, FADE_MS);
  }

  stopBgm(): void {
    if (!this.bgm || !this.bgm.isPlaying) return;
    this.bgm.setVolume(0, FADE_MS);
    const bgm = this.bgm;
    window.setTimeout(() => {
      if (bgm.getVolume() === 0) bgm.stop();
    }, FADE_MS + 50);
  }
}

export const audio = new AudioManager();
