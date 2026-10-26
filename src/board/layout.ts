import type { Position } from "../api/types";

/**
 * Cell <-> world mapping shared by the 3D board scene.
 * 1 world unit = 1 cell. Z = row, X = mirrored col (see cellToWorld),
 * board centred on the origin.
 */

export const BOARD_SIZE = 10;
export const CELL = 1;

export function cellToWorld(pos: Position): { x: number; z: number } {
  return {
    // COLS ARE MIRRORED ON PURPOSE. A camera at +Z looking at the origin
    // (White's side) sees world -X as its RIGHT, so a plain col -> x mapping
    // put file A on the RIGHT of the screen and flipped White's view against
    // the standard diagram (whose bottom-left cell A1 is dark and occupied -
    // ours showed an empty bottom-left). Negating col puts A on the left for
    // White's camera (and on the right for Black's, as it should be from that
    // seat), and both players' near-left corner then land on a dark, occupied
    // square.
    x: ((BOARD_SIZE - 1) / 2 - pos.col) * CELL,
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
// Columns: col 0 (file A) -> x = +4.5, col 9 (file J) -> x = -4.5, so from
// White's camera A reads left->right as in the standard diagram (A1 dark
// with a White man, A10 light and empty - backend parity confirmed:
// isDark <=> (row+col) odd on all 100 squares).
