import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { BoardCanvas3d } from "./components/BoardCanvas3d";
import { GameHud } from "./components/GameHud";
import { MainMenu } from "./components/MainMenu";
import { MuteButton } from "./components/MuteButton";
import { MoveLog } from "./components/MoveLog";
import { audio } from "./audio/audioManager";
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
    audio.preload(); // probe + load every file in public/audio (missing ones are skipped)
    void checkHealth();
    const gameId = new URLSearchParams(window.location.search).get("game");
    if (gameId) loadGame(gameId);
  }, [checkHealth, loadGame]);

  const startGame = () => {
    audio.startBgm(); // fade the background music in on entering the game
    setScreen("game");
    createGame(names);
  };

  const resumeGame = () => {
    if (!store.gameId) return;
    setScreen("game");
    loadGame(store.gameId);
  };

  const exitToMenu = () => {
    audio.stopBgm(); // fade the background music out on returning to the menu
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
    <div className="stage">
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
          <div className="stage__canvas">
            <BoardCanvas3d {...canvasProps} />
          </div>

          <GameHud
            state={store.state}
            busy={store.busy}
            apiOnline={store.apiOnline}
            errorMessage={store.lastError?.message ?? null}
            drawOffer={store.drawOffer}
            resignation={store.resignation}
            notice={store.notice}
            onNewGame={() => createGame(names)}
            onOfferDraw={store.offerDraw}
            onAcceptDraw={store.acceptDraw}
            onDeclineDraw={store.declineDraw}
            onResign={store.resign}
            onExit={exitToMenu}
            onDismissNotice={store.dismissNotice}
            onClearError={store.clearError}
          />

          <MoveLog history={store.state?.history ?? []} />
        </>
      )}

      {/* Global sound toggle - above every popup on both screens. */}
      <MuteButton />
    </div>
  );
}

export default App;
