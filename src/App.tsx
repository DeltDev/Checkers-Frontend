import { BabylonScene } from "./components/BabylonScene";

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>

      <div style={{ position: "absolute", top: 20, left: 20, color: "white", zIndex: 10, pointerEvents: "none" }}>
        <h1 style={{ margin: 0, fontSize: "24px" }}>Vite + React + Babylon.js</h1>
        <p>Gunakan mouse drag untuk menggerakkan kamera.</p>
      </div>

      <BabylonScene />
    </div>
  );
}

export default App;
