import { useEffect, useRef } from "react";
import type { GameState, Position } from "../api/types";
import { createBoardScene3d } from "../board3d/boardScene3d";
import type { BoardScene3dHandle } from "../board3d/boardScene3d";

interface BoardCanvas3dProps {
  state: GameState | null;
  selected: Position | null;

  legalTargets: Position[];
  onCellPicked: (cell: Position) => void;
}

export function BoardCanvas3d({ state, selected, legalTargets, onCellPicked }: BoardCanvas3dProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<BoardScene3dHandle | null>(null);
  const pickedRef = useRef(onCellPicked);

  useEffect(() => {
    pickedRef.current = onCellPicked;
  }, [onCellPicked]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handle = createBoardScene3d(canvas, (cell) => pickedRef.current(cell));
    handleRef.current = handle;

    return () => {
      handleRef.current = null;
      handle.dispose();
    };
  }, []);
  
  useEffect(() => {
    handleRef.current?.applyState(state, selected, legalTargets);
  }, [state, selected, legalTargets]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
    />
  );
}
