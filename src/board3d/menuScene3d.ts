import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  Space,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import type { Mesh } from "@babylonjs/core";
import { BOARD_SIZE, cellToWorld } from "../board/layout";

/**
 * Decorative backdrop behind the main-menu GUI:
 *   1. a 10x10 board carrying the full starting position (20 + 20 pieces)
 *   2. a camera far away (radius 27) slowly revolving around it (~57s/lap)
 *   3. FLOATER_COUNT man/king pieces of random size tumbling in random spots
 *
 * Purely presentational: every mesh is non-pickable and the camera's inputs
 * are cleared, so nothing here reacts to the pointer - the menu GUI above it
 * owns all interaction.
 */

export interface MenuScene3dHandle {
  dispose: () => void;
}

const SURFACE_Y = 0.06;
const BODY_HALF = 0.11;

const CAMERA_BETA = 0.95;
const CAMERA_RADIUS = 27;
/** Slow orbit: one full revolution every ~57 seconds. */
const ORBIT_RAD_PER_SEC = 0.11;
const FLOATER_COUNT = 16;

const FLOATER_MIN_RADIUS = 7;
const FLOATER_MAX_RADIUS = 19;
const FLOATER_MIN_Y = 0.8;
const FLOATER_MAX_Y = 7.5;

/**
 * Seeded RNG (mulberry32) so the scatter is identical across StrictMode's
 * mount -> dispose -> remount cycle instead of reshuffling the menu.
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Floater {
  root: TransformNode;
  /** Normalized random tumble axis. */
  axis: Vector3;
  /** Radians per second around `axis`. */
  speed: number;
  baseY: number;
  bobAmp: number;
  bobPhase: number;
  bobFreq: number;
}

export function createMenuScene3d(canvas: HTMLCanvasElement): MenuScene3dHandle {
  const rng = mulberry32(0xc0ffee);
  const range = (min: number, max: number): number => min + (max - min) * rng();

  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.035, 0.043, 0.075, 1);

  // Far-away vantage point, aimed slightly above the board so the board sits
  // a touch below screen centre (where the menu panel covers less of it).
  const camera = new ArcRotateCamera(
    "menuCam",
    Math.PI / 2,
    CAMERA_BETA,
    CAMERA_RADIUS,
    new Vector3(0, 1.5, 0),
    scene,
  );
  camera.inputs.clear();

  const sky = new HemisphericLight("sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.65;
  sky.groundColor = Color3.FromHexString("#40465a");

  const sun = new DirectionalLight("sun", new Vector3(-1, -2, 1), scene);
  sun.intensity = 0.5;

  const shadows = new ShadowGenerator(1024, sun);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 16;

  const mat = (name: string, hex: string): StandardMaterial => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor = Color3.FromHexString("#151515");
    return m;
  };

  const lightTileMat = mat("tileLight", "#e6d3ae");
  const darkTileMat = mat("tileDark", "#7a5232");
  const slabMat = mat("slab", "#8a6b4a");
  const whiteMat = mat("pieceWhite", "#f4efe2");
  const blackMat = mat("pieceBlack", "#23262e");
  const goldMat = mat("crown", "#e8b64c");

  const slab = MeshBuilder.CreateBox(
    "board",
    { width: BOARD_SIZE, height: 0.4, depth: BOARD_SIZE },
    scene,
  );
  slab.position.y = -0.2;
  slab.material = slabMat;
  slab.isPickable = false;
  slab.receiveShadows = true;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const tile = MeshBuilder.CreateBox(
        `tile-${row}-${col}`,
        { width: 1, height: SURFACE_Y, depth: 1 },
        scene,
      );
      const { x, z } = cellToWorld({ row, col });
      tile.position.set(x, SURFACE_Y / 2, z);
      tile.material = (row + col) % 2 === 1 ? darkTileMat : lightTileMat;
      tile.isPickable = false;
      tile.receiveShadows = true;
    }
  }

  /** Body + optional gold crown, parented to `root` (same geometry as the game). */
  const buildPiece = (
    name: string,
    isWhite: boolean,
    isKing: boolean,
    root: TransformNode,
    castsShadow: boolean,
  ): Mesh => {
    const body = MeshBuilder.CreateCylinder(
      `${name}-body`,
      { diameter: 0.8, height: BODY_HALF * 2, tessellation: 32 },
      scene,
    );
    body.parent = root;
    body.position.y = BODY_HALF;
    body.material = isWhite ? whiteMat : blackMat;
    body.isPickable = false;
    if (castsShadow) shadows.addShadowCaster(body);

    const crown = MeshBuilder.CreateTorus(
      `${name}-crown`,
      { diameter: 0.46, thickness: 0.09, tessellation: 24 },
      scene,
    );
    crown.parent = root;
    crown.position.y = BODY_HALF * 2 + 0.04;
    crown.material = goldMat;
    crown.isPickable = false;
    crown.setEnabled(isKing);

    return body;
  };

  // --- starting position: dark squares of rows 0-3 (black) and 6-9 (white)
  let pieceIndex = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (row >= 4 && row <= 5) continue;
    const isWhite = row >= 6;
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 !== 1) continue;
      const root = new TransformNode(`piece-${pieceIndex}`, scene);
      const { x, z } = cellToWorld({ row, col });
      root.position.set(x, SURFACE_Y, z);
      buildPiece(`piece-${pieceIndex}`, isWhite, false, root, true);
      pieceIndex++;
    }
  }

  // --- floaters: random man/king pieces, random size, random place, tumbling
  const floaters: Floater[] = [];
  for (let i = 0; i < FLOATER_COUNT; i++) {
    const root = new TransformNode(`floater-${i}`, scene);

    const angle = range(0, Math.PI * 2);
    const radius = range(FLOATER_MIN_RADIUS, FLOATER_MAX_RADIUS);
    const baseY = range(FLOATER_MIN_Y, FLOATER_MAX_Y);
    root.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);

    const scale = range(0.5, 2.3);
    root.scaling.setAll(scale);

    buildPiece(`floater-${i}`, rng() < 0.5, rng() < 0.5, root, false);

    const axis = new Vector3(range(-1, 1), range(-1, 1), range(-1, 1));
    if (axis.lengthSquared() < 1e-6) axis.set(0, 1, 0);
    axis.normalize();

    floaters.push({
      root,
      axis,
      speed: range(0.2, 0.9),
      baseY,
      bobAmp: range(0.12, 0.45),
      bobPhase: range(0, Math.PI * 2),
      bobFreq: range(0.3, 0.8),
    });
  }

  let elapsed = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);
    elapsed += dt;

    camera.alpha += ORBIT_RAD_PER_SEC * dt;

    for (const f of floaters) {
      f.root.rotate(f.axis, f.speed * dt, Space.LOCAL);
      f.root.position.y = f.baseY + Math.sin(elapsed * f.bobFreq + f.bobPhase) * f.bobAmp;
    }
  });

  const handleResize = () => engine.resize();
  window.addEventListener("resize", handleResize);

  engine.runRenderLoop(() => scene.render());

  return {
    dispose: () => {
      window.removeEventListener("resize", handleResize);
      engine.dispose();
      scene.dispose();
    },
  };
}
