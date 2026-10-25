import type { Position } from "../api/types";

/**
 * Cell <-> world mapping for the 2D board (pseudocode section 7).
 * 1 world unit = 1 cell. X = col, Z = row, board centred on the origin,
 * row 0 at the TOP of the screen.
 */

export const BOARD_SIZE = 10;
export const CELL = 1;
/** Board width in world units, plus a small margin for the frustum. */
export const BOARD_EXTENT = (BOARD_SIZE * CELL) / 2;

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

// TODO(orientation): confirm which screen corner row 0 lands on once the
// camera is in place, and whether White plays from the bottom of the screen
// (the API gives no "flipped view" flag - the view rule belongs to the UI).
