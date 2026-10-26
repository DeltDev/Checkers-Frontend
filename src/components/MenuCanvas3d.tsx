import { useEffect, useRef } from "react";
import { createMenuScene3d } from "../board3d/menuScene3d";

/**
 * Hosts the decorative Babylon backdrop behind the main-menu GUI.
 * The canvas never receives pointer events - the menu panel owns interaction.
 */
export function MenuCanvas3d() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handle = createMenuScene3d(canvas);
    return () => handle.dispose();
  }, []);

  return <canvas ref={canvasRef} className="menu__bg" aria-hidden="true" />;
}
