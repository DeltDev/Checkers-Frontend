import {
  Color4,
  DynamicTexture,
  ParticleSystem,
  Scene,
  Vector3,
} from "@babylonjs/core";

/**
 * One-shot particle VFX for the 3D board:
 *   landingPuff   - quiet-move dust kicked up where a piece lands
 *   captureBurst  - hot spark burst as a captured piece is taken
 *   promoteFlash  - gold motes rising when a man becomes a king
 *
 * Three persistent ParticleSystems are reused (repositioned, reset and
 * restarted per event) instead of being created/disposed per hit: start()
 * clears the stop state and frame counter, so every replay emits the full
 * burst again. The emitter is a Vector3, so minEmitBox/maxEmitBox are
 * offsets around it (the default emitter type is a BoxParticleEmitter).
 */

export interface BoardVfx {
  landingPuff: (at: Vector3) => void;
  captureBurst: (at: Vector3) => void;
  promoteFlash: (at: Vector3) => void;
  dispose: () => void;
}

/** Soft round dot drawn once and shared by every system. */
function createDotTexture(scene: Scene): DynamicTexture {
  const size = 64;
  const tex = new DynamicTexture(
    "vfxDot",
    { width: size, height: size },
    scene,
    false,
  );
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.65)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.update();
  return tex;
}

export function createBoardVfx(scene: Scene): BoardVfx {
  const dot = createDotTexture(scene);

  // --- 1. quiet move: dust puff at the landing square ----------------------
  const dust = new ParticleSystem("vfxDust", 120, scene);
  dust.particleTexture = dot;
  dust.emitRate = 260;
  dust.targetStopDuration = 0.14;
  dust.minEmitBox = new Vector3(-0.34, 0.02, -0.34);
  dust.maxEmitBox = new Vector3(0.34, 0.1, 0.34);
  dust.direction1 = new Vector3(-0.6, 0.7, -0.6);
  dust.direction2 = new Vector3(0.6, 1.6, 0.6);
  dust.minEmitPower = 0.35;
  dust.maxEmitPower = 0.9;
  dust.minLifeTime = 0.3;
  dust.maxLifeTime = 0.6;
  dust.minSize = 0.05;
  dust.maxSize = 0.17;
  dust.gravity = new Vector3(0, -2.2, 0);
  dust.color1 = Color4.FromHexString("#f2e9d6bb");
  dust.color2 = Color4.FromHexString("#b7a687aa");
  dust.colorDead = Color4.FromHexString("#b7a68700");

  // --- 2. capture: hot spark burst as the piece is taken --------------------
  const burst = new ParticleSystem("vfxBurst", 160, scene);
  burst.particleTexture = dot;
  burst.blendMode = ParticleSystem.BLENDMODE_ADD;
  burst.emitRate = 480;
  burst.targetStopDuration = 0.12;
  burst.minEmitBox = new Vector3(-0.22, 0.1, -0.22);
  burst.maxEmitBox = new Vector3(0.22, 0.38, 0.22);
  burst.direction1 = new Vector3(-1, 0.15, -1);
  burst.direction2 = new Vector3(1, 1, 1);
  burst.minEmitPower = 1.6;
  burst.maxEmitPower = 3.4;
  burst.minLifeTime = 0.25;
  burst.maxLifeTime = 0.65;
  burst.minSize = 0.05;
  burst.maxSize = 0.16;
  burst.gravity = new Vector3(0, -7, 0);
  burst.color1 = Color4.FromHexString("#ffe08aff");
  burst.color2 = Color4.FromHexString("#ff6a3dff");
  burst.colorDead = Color4.FromHexString("#ff3b0b00");

  // --- 3. promotion: gold motes rising around the new king -----------------
  const flash = new ParticleSystem("vfxFlash", 140, scene);
  flash.particleTexture = dot;
  flash.blendMode = ParticleSystem.BLENDMODE_ADD;
  flash.emitRate = 300;
  flash.targetStopDuration = 0.3;
  flash.minEmitBox = new Vector3(-0.3, 0, -0.3);
  flash.maxEmitBox = new Vector3(0.3, 0.25, 0.3);
  flash.direction1 = new Vector3(-0.35, 0.9, -0.35);
  flash.direction2 = new Vector3(0.35, 2.2, 0.35);
  flash.minEmitPower = 0.7;
  flash.maxEmitPower = 1.5;
  flash.minLifeTime = 0.5;
  flash.maxLifeTime = 1.1;
  flash.minSize = 0.04;
  flash.maxSize = 0.13;
  flash.gravity = new Vector3(0, -0.55, 0);
  flash.color1 = Color4.FromHexString("#fff6d0ff");
  flash.color2 = Color4.FromHexString("#e8b64cff");
  flash.colorDead = Color4.FromHexString("#e8b64c00");

  const systems = [dust, burst, flash];

  // Reposition + replay. The position is cloned so a live piece transform is
  // never aliased into a running burst.
  const fire = (ps: ParticleSystem, at: Vector3): void => {
    ps.emitter = at.clone();
    ps.reset();
    ps.start();
  };

  return {
    landingPuff: (at) => fire(dust, at),
    captureBurst: (at) => fire(burst, at),
    promoteFlash: (at) => fire(flash, at),
    dispose: () => {
      for (const ps of systems) {
        ps.particleTexture = null; // shared dot is disposed once, below
        ps.dispose();
      }
      dot.dispose();
    },
  };
}
