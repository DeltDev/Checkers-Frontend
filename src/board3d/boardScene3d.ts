import {
  ArcRotateCamera,
  Color3,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointerEventTypes,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import type { AbstractMesh, Material } from "@babylonjs/core";
import type { GameState, PieceColor, PieceType, Position } from "../api/types";
import { BOARD_SIZE, cellToWorld, sameCell, squareIndex } from "../board/layout";


export interface BoardScene3dHandle {
  readonly scene: Scene;
  applyState: (state: GameState | null, selected: Position | null, legalTargets: Position[]) => void;
  dispose: () => void;
}

const HOP_MS = 170;
const CAPTURE_MS = 180;

const SURFACE_Y = 0.06;
const BODY_HALF = 0.11;

const smoothstep = (k: number): number => k * k * (3 - 2 * k);

export function createBoardScene3d(
  canvas: HTMLCanvasElement,
  onCellPicked: (cell: Position) => void,
): BoardScene3dHandle {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  const camera = new ArcRotateCamera(
    "camera3d",
    -Math.PI / 2, 
    0.9,
    14,
    Vector3.Zero(),
    scene,
  );
  camera.lowerBetaLimit = 0.15;
  camera.upperBetaLimit = 1.35;
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 26;
  camera.panningSensibility = 0;
  camera.wheelDeltaPercentage = 0.01;
  camera.attachControl(canvas, true);

  const sky = new HemisphericLight("sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.65;
  sky.groundColor = Color3.FromHexString("#40465a");

  const sun = new DirectionalLight("sun", new Vector3(-1, -2, 1), scene);
  sun.intensity = 0.45;

  const shadows = new ShadowGenerator(1024, sun);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 16;

  const mat = (name: string, hex: string, alpha = 1): StandardMaterial => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor = Color3.FromHexString("#151515");
    m.alpha = alpha;
    if (alpha < 1) {
      m.disableLighting = true;
      m.emissiveColor = Color3.FromHexString(hex);
    }
    return m;
  };

  const lightTileMat = mat("tileLight", "#e6d3ae");
  const darkTileMat = mat("tileDark", "#7a5232");
  const slabMat = mat("slab", "#8a6b4a");
  const whiteMat = mat("pieceWhite", "#f4efe2");
  const blackMat = mat("pieceBlack", "#23262e");
  const goldMat = mat("crown", "#e8b64c");
  const selectMat = mat("hlSelect", "#ffd166", 0.45);
  const targetMat = mat("hlTarget", "#4ade80", 0.5);

  const slab = MeshBuilder.CreateBox(
    "board",
    { width: BOARD_SIZE, height: 0.4, depth: BOARD_SIZE },
    scene,
  );
  slab.position.y = -0.2;
  slab.material = slabMat;
  slab.receiveShadows = true;

  const tiles: Mesh[] = new Array(BOARD_SIZE * BOARD_SIZE);
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = { row, col };
      const tile = MeshBuilder.CreateBox(
        `tile-${row}-${col}`,
        { width: 1, height: SURFACE_Y, depth: 1 },
        scene,
      );
      const { x, z } = cellToWorld(cell);
      tile.position.set(x, SURFACE_Y / 2, z);
      tile.metadata = { cell };
      tile.material = (row + col) % 2 === 0 ? darkTileMat : lightTileMat;
      tile.receiveShadows = true;
      tiles[squareIndex(cell)] = tile;
    }
  }

  const makeOverlay = (name: string, size: number, y: number, material: Material): Mesh => {
    const overlay = MeshBuilder.CreateBox(name, { width: size, height: 0.005, depth: size }, scene);
    overlay.position.y = y;
    overlay.isPickable = false;
    overlay.material = material;
    overlay.setEnabled(false);
    return overlay;
  };

  const targetOverlay = makeOverlay("hlTarget", 0.6, SURFACE_Y + 0.006, targetMat);
  const selectOverlay = makeOverlay("hlSelect", 0.96, SURFACE_Y + 0.008, selectMat);

  interface PieceView {
    root: TransformNode;
    meshes: Mesh[];
    crown: Mesh | null;
    cell: Position;
  }

  const pieces = new Map<number, PieceView>();
  const activeToken = new Map<number, number>();
  let tokenSeq = 0;
  let builtFor: string | null = null;
  let lastAppliedTurn = -1;

  const toWorld = (cell: Position): Vector3 => {
    const { x, z } = cellToWorld(cell);
    return new Vector3(x, SURFACE_Y, z);
  };

  const createPiece = (id: number, color: PieceColor, type: PieceType, cell: Position): PieceView => {
    const root = new TransformNode(`piece-${id}`, scene);
    root.position = toWorld(cell);

    const body = MeshBuilder.CreateCylinder(
      `piece-${id}-body`,
      { diameter: 0.8, height: BODY_HALF * 2, tessellation: 32 },
      scene,
    );
    body.parent = root;
    body.position.y = BODY_HALF;
    body.material = color === "White" ? whiteMat : blackMat;
    body.metadata = { cell, pieceId: id };
    shadows.addShadowCaster(body);

    const crown = MeshBuilder.CreateTorus(
      `piece-${id}-crown`,
      { diameter: 0.46, thickness: 0.09, tessellation: 24 },
      scene,
    );
    crown.parent = root;
    crown.position.y = BODY_HALF * 2 + 0.04;
    crown.material = goldMat;
    crown.setEnabled(type === "King");
    crown.metadata = { cell, pieceId: id };

    return { root, meshes: [body, crown], crown, cell };
  };

  const setKing = (view: PieceView, isKing: boolean): void => {
    if (view.crown) view.crown.setEnabled(isKing);
  };

  const disposePiece = (view: PieceView): void => {
    for (const mesh of view.meshes) shadows.removeShadowCaster(mesh);
    view.root.dispose(false, false);
  };

  const clearPieces = (): void => {
    pieces.forEach(disposePiece);
    pieces.clear();
    activeToken.clear();
    builtFor = null;
    lastAppliedTurn = -1;
  };

  const tween = (ms: number, step: (k: number) => void): Promise<void> =>
    new Promise((resolve) => {
      const start = performance.now();
      const observer = scene.onBeforeRenderObservable.add(() => {
        const t = Math.min(1, (performance.now() - start) / ms);
        step(smoothstep(t));
        if (t >= 1) {
          scene.onBeforeRenderObservable.remove(observer);
          resolve();
        }
      });
    });

  const animateMove = async (
    id: number,
    view: PieceView,
    points: Vector3[],
    token: number,
  ): Promise<void> => {
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1];
      const to = points[i];
      await tween(HOP_MS, (k) => {
        if (activeToken.get(id) !== token) return;
        view.root.position = Vector3.Lerp(from, to, k);
      });
      if (activeToken.get(id) !== token) return;
    }
    view.root.position = points[points.length - 1];
    if (activeToken.get(id) === token) activeToken.delete(id);
  };

  const animateCapture = (view: PieceView): void => {
    const startScale = view.root.scaling.clone();
    void tween(CAPTURE_MS, (k) => {
      const s = 1 - k;
      view.root.scaling = startScale.scale(s);
      for (const mesh of view.meshes) mesh.visibility = s;
    }).then(() => disposePiece(view));
  };

  const place = (overlay: Mesh, cell: Position | null): void => {
    if (!cell) {
      overlay.setEnabled(false);
      return;
    }
    const { x, z } = cellToWorld(cell);
    overlay.position.x = x;
    overlay.position.z = z;
    overlay.setEnabled(true);
  };

  const targetPool: Mesh[] = [targetOverlay];

  const setHighlights = (selected: Position | null, targets: Position[]): void => {
    place(selectOverlay, selected);

    for (const overlay of targetPool) overlay.setEnabled(false);
    targets.forEach((cell, index) => {
      let overlay = targetPool[index];
      if (!overlay) {
        overlay = MeshBuilder.CreateBox(
          `hlTarget-${index}`,
          { width: 0.6, height: 0.005, depth: 0.6 },
          scene,
        );
        overlay.position.y = SURFACE_Y + 0.006;
        overlay.isPickable = false;
        overlay.material = targetMat;
        targetPool.push(overlay);
      }
      const { x, z } = cellToWorld(cell);
      overlay.position.x = x;
      overlay.position.z = z;
      overlay.setEnabled(true);
    });
  };

  let hovered: AbstractMesh | null = null;
  scene.onPointerObservable.add((pointerInfo) => {
    const mesh = pointerInfo.pickInfo?.pickedMesh;
    const cell = (mesh?.metadata?.cell ?? null) as Position | null;

    if (pointerInfo.type === PointerEventTypes.POINTERDOWN && cell) {
      onCellPicked(cell);
      return;
    }

    if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
      const next = mesh && cell ? mesh : null;
      if (next !== hovered) {
        if (hovered) hovered.renderOutline = false;
        hovered = next;
        if (hovered) {
          hovered.renderOutline = true;
          hovered.outlineColor = Color3.FromHexString("#ffd166");
          hovered.outlineWidth = 0.03;
        }
      }
    }
  });

  const handleResize = () => engine.resize();
  window.addEventListener("resize", handleResize);

  engine.runRenderLoop(() => {
    scene.render();
  });

  const applyState = (
    state: GameState | null,
    selected: Position | null,
    legalTargets: Position[],
  ): void => {
    if (!state) {
      clearPieces();
      setHighlights(null, []);
      return;
    }

    if (state.gameId !== builtFor) {
      clearPieces();
      builtFor = state.gameId;
      for (const square of state.squares) {
        if (square.occupantId == null || !square.occupantColor || !square.occupantType) continue;
        const view = createPiece(
          square.occupantId,
          square.occupantColor,
          square.occupantType,
          square.position,
        );
        pieces.set(square.occupantId, view);
      }
      lastAppliedTurn = state.turn;
      setHighlights(selected, legalTargets);
      return;
    }

    const lastMove = state.history.length > 0 ? state.history[state.history.length - 1] : null;
    const turnAdvanced = lastMove !== null && state.turn > lastAppliedTurn;
    const seen = new Set<number>();

    for (const square of state.squares) {
      const id = square.occupantId;
      if (id == null || !square.occupantColor || !square.occupantType) continue;
      seen.add(id);

      let view = pieces.get(id);
      if (!view) {
        view = createPiece(id, square.occupantColor, square.occupantType, square.position);
        pieces.set(id, view);
        continue;
      }

      const from = view.cell;
      const to = square.position;
      view.cell = to;
      setKing(view, square.occupantType === "King");
      if (sameCell(from, to)) continue;

      const isThisMove =
        turnAdvanced &&
        lastMove !== null &&
        lastMove.color === square.occupantColor &&
        sameCell(lastMove.from, from) &&
        sameCell(lastMove.to, to);

      if (isThisMove && lastMove !== null) {
        const points = [from, ...lastMove.path, to].map(toWorld);
        const token = ++tokenSeq;
        activeToken.set(id, token);
        void animateMove(id, view, points, token);
      } else {
        activeToken.delete(id);
        view.root.position = toWorld(to);
      }
    }

    for (const [id, view] of [...pieces]) {
      if (seen.has(id)) continue;
      pieces.delete(id);
      activeToken.delete(id);
      animateCapture(view);
    }

    lastAppliedTurn = state.turn;
    setHighlights(selected, legalTargets);
  };

  return {
    scene,
    applyState,
    dispose: () => {
      window.removeEventListener("resize", handleResize);
      clearPieces();
      engine.dispose();
      scene.dispose();
    },
  };
}
