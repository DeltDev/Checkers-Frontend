import { useEffect, useRef } from "react";
import type { GameState, Position } from "../api/types";
import { createBoardScene } from "../board/boardScene";
import type { BoardSceneHandle } from "../board/boardScene";

interface BoardCanvasProps {
  state: GameState | null;
  selected: Position | null;
  onCellPicked: (cell: Position) => void;
}


export function BoardCanvas({ state, selected, onCellPicked }: BoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<BoardSceneHandle | null>(null);
  const pickedRef = useRef(onCellPicked);

  useEffect(() => {
    pickedRef.current = onCellPicked;
  }, [onCellPicked]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handle = createBoardScene(canvas, (cell) => pickedRef.current(cell));
    handleRef.current = handle;

    return () => {
      handleRef.current = null;
      handle.dispose();
    };
  }, []);

  useEffect(() => {
    handleRef.current?.applyState(state, selected);
  }, [state, selected]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
    />
  );
}
