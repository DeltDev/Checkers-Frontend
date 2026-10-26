import { useEffect, useMemo, useState } from "react";
import { BoardCanvas3d } from "./components/BoardCanvas3d";
import { GameHud } from "./components/GameHud";
import { MainMenu } from "./components/MainMenu";
import { MoveLog } from "./components/MoveLog";
import { sameCell } from "./board/layout";
import { useGameStore } from "./state/gameStore";
import type { PlayerNames } from "./state/gameStore";

type Screen = "menu" | "game";

const DEFAULT_NAMES: PlayerNames = { white: "Player 1", black: "Player 2" };

function App() {
  const store = useGameStore();
  const { checkHealth, createGame, loadGame } = store;

  const [screen, setScreen] = useState<Screen>(() =>
    new URLSearchParams(window.location.search).get("game") ? "game" : "menu",
  );

  const [names, setNames] = useState<PlayerNames>(DEFAULT_NAMES);

  useEffect(() => {
    void checkHealth();
    const gameId = new URLSearchParams(window.location.search).get("game");
    if (gameId) loadGame(gameId);
  }, [checkHealth, loadGame]);

  const startGame = () => {
    // BGM: fade the background music in when entering the game screen (audio.startBgm()).
    setScreen("game");
    createGame(names);
  };

  const resumeGame = () => {
    if (!store.gameId) return;
    setScreen("game");
    loadGame(store.gameId);
  };

  const exitToMenu = () => {
    // BGM: fade the background music out when returning to the menu (audio.stopBgm()).
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
    // 100% (not 100vw) so the stage never exceeds the root when a scrollbar
    // is present - 100vw includes the scrollbar and causes horizontal overflow.
    <div style={{ width: "100%", height: "100vh", overflow: "hidden", position: "relative", background: "#12151d" }}>
      {screen === "menu" ? (
        <MainMenu
          apiOnline={store.apiOnline}
          busy={store.busy}
          errorMessage={store.lastError?.message ?? null}
          names={names}
          resumeGameId={store.gameId}
          onNamesChange={setNames}
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
            bottom: 16,
            left: 16,
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
