import { Camera, Engine, FreeCamera, HemisphericLight, PointerEventTypes, Scene, Vector3 } from "@babylonjs/core";
import type { GameState, Position } from "../api/types";
import { BOARD_EXTENT, BOARD_SIZE } from "./layout";


export interface BoardSceneHandle {
  readonly scene: Scene;
  applyState: (state: GameState | null, selected: Position | null) => void;
  dispose: () => void;
}

export function createBoardScene(
  canvas: HTMLCanvasElement,
  onCellPicked: (cell: Position) => void,
): BoardSceneHandle {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  const camera = new FreeCamera("board2d", new Vector3(0, BOARD_SIZE, 0), scene);
  camera.upVector = new Vector3(0, 0, -1);
  camera.setTarget(Vector3.Zero());
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = BOARD_SIZE * 4;
  
  const fitFrustum = () => {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    camera.orthoLeft = -BOARD_EXTENT * aspect;
    camera.orthoRight = BOARD_EXTENT * aspect;
    camera.orthoTop = BOARD_EXTENT;
    camera.orthoBottom = -BOARD_EXTENT;
  };
  fitFrustum();

  const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
  light.intensity = 0.9;

  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) return;
    const picked = pointerInfo.pickInfo?.pickedMesh;
    const cell = picked?.metadata?.cell as Position | undefined;
    if (cell) {
      onCellPicked(cell);
    }
  });


  const handleResize = () => {
    fitFrustum();
    engine.resize();
  };
  window.addEventListener("resize", handleResize);

  engine.runRenderLoop(() => {
    scene.render();
  });

  return {
    scene,
    applyState: (state, selected) => {
      void state;
      void selected;
    },
    dispose: () => {
      window.removeEventListener("resize", handleResize);
      engine.dispose();
      scene.dispose();
    },
  };
}
