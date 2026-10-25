import { useEffect, useMemo, useState } from "react";
import { BoardCanvas3d } from "./components/BoardCanvas3d";
import { GameHud } from "./components/GameHud";
import { MainMenu } from "./components/MainMenu";
import { MoveLog } from "./components/MoveLog";
import { sameCell } from "./board/layout";
import { useGameStore } from "./state/gameStore";
import type { PlayerNames } from "./state/gameStore";

type View = "2d" | "3d";

type Screen = "menu" | "game";

const DEFAULT_NAMES: PlayerNames = { white: "Player 1", black: "Player 2" };

function App() {
  const store = useGameStore();
  const { checkHealth, createGame, loadGame } = store;

  const [screen, setScreen] = useState<Screen>(() =>
    new URLSearchParams(window.location.search).get("game") ? "game" : "menu",
  );

  const [view, setView] = useState<View>(() => "3d");
  const [names, setNames] = useState<PlayerNames>(DEFAULT_NAMES);

  useEffect(() => {
    void checkHealth();
    const gameId = new URLSearchParams(window.location.search).get("game");
    if (gameId) loadGame(gameId);
  }, [checkHealth, loadGame]);

  const toggleView = (next: View) => {
    if (next !== "3d") return; 
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState(null, "", url.toString());
  };

  const startGame = () => {
    setScreen("game");
    createGame(names); 
  };

  const resumeGame = () => {
    if (!store.gameId) return;
    setScreen("game");
    loadGame(store.gameId);
  };

  const exitToMenu = () => {
    setScreen("menu");
    store.clearError();
  };

  const legalTargets = useMemo(
    () =>
      store.selected
        ? store.legalMoves.filter((m) => sameCell(m.from, store.selected)).map((m) => m.to)
        : [],
    [store.selected, store.legalMoves],
  );

  const canvasProps = {
    state: store.state,
    selected: store.selected,
    legalTargets,
    onCellPicked: (cell: { row: number; col: number }) => store.selectSquare(cell),
  };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", background: "#12151d" }}>
      {screen === "menu" ? (
        <MainMenu
          apiOnline={store.apiOnline}
          busy={store.busy}
          errorMessage={store.lastError?.message ?? null}
          names={names}
          view={view}
          resumeGameId={store.gameId}
          onNamesChange={setNames}
          onViewChange={toggleView}
          onStart={startGame}
          onResume={resumeGame}
        />
      ) : (
        <>
      <GameHud
        state={store.state}
        busy={store.busy}
        apiOnline={store.apiOnline}
        errorMessage={store.lastError?.message ?? null}
        names={names}
        onNamesChange={setNames}
        onNewGame={() => createGame(names)}
        onOfferDraw={store.offerDraw}
        onResign={store.resign}
        onExit={exitToMenu}
        onClearError={store.clearError}
      />

      {store.apiOnline === false ? (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 12,
            padding: "8px 14px",
            borderRadius: 8,
            background: "rgba(146, 34, 34, 0.92)",
            color: "#ffe4e4",
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
          }}
        >
          API offline
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 11,
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <button
          type="button"
          disabled
          title="The 2D board is not applied to this project yet - only the 3D UI is wired"
          style={{
            padding: "6px 12px",
            borderRadius: "6px 0 0 6px",
            border: "1px solid #3a4660",
            background: "#1d2433",
            color: "#7b849b",
            cursor: "not-allowed",
            opacity: 0.6,
          }}
        >
          2D
        </button>
        <button
          type="button"
          onClick={() => toggleView("3d")}
          style={{
            padding: "6px 12px",
            borderRadius: "0 6px 6px 0",
            border: "1px solid #3a4660",
            borderLeft: "none",
            background: view === "3d" ? "#2f6feb" : "#1d2433",
            color: "#e8ecf5",
            cursor: "pointer",
          }}
        >
          3D
        </button>
      </div>

      <div style={{ position: "absolute", inset: 0 }}>
        <BoardCanvas3d {...canvasProps} />
      </div>

      <MoveLog history={store.state?.history ?? []} />
        </>
      )}
    </div>
  );
}

export default App;
