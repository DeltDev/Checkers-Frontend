import type { Position } from "../api/types";

/**
 * Cell <-> world mapping shared by the 3D board scene.
 * 1 world unit = 1 cell. X = col, Z = row, board centred on the origin.
 */

export const BOARD_SIZE = 10;
export const CELL = 1;

export function cellToWorld(pos: Position): { x: number; z: number } {
  return {
    x: (pos.col - (BOARD_SIZE - 1) / 2) * CELL,
    z: (pos.row - (BOARD_SIZE - 1) / 2) * CELL,
  };
}

/** GameState.squares is flattened row by row. */
export function squareIndex(pos: Position): number {
  return pos.row * BOARD_SIZE + pos.col;
}

export function indexToSquare(index: number): Position {
  return { row: Math.floor(index / BOARD_SIZE), col: index % BOARD_SIZE };
}

export function sameCell(a: Position | null, b: Position | null): boolean {
  return a !== null && b !== null && a.row === b.row && a.col === b.col;
}

// Orientation (confirmed with the camera in place):
// row 0 -> z = -4.5 (far top when viewing from +Z), row 9 -> z = +4.5.
// Backend setup: Black occupies rows 0-3 (-Z), White rows 6-9 (+Z), so
// White plays from the bottom of the screen when the camera sits on +Z.
