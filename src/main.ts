import "./style.css";
import { Logger, LogLevel } from "./debug/Logger";
import { Engine } from "./core/Engine";

const canvas = document.getElementById(
  "game-canvas",
) as HTMLCanvasElement | null;
if (!canvas) {
  document.getElementById("error-section")!.classList.add("active");
  const errorMsg = document.querySelector(".error-msg");
  if (errorMsg) {
    errorMsg.innerHTML = "<b>Game Canvas</b> was not found in the DOM";
  }
  Logger.fatal("Missing #game-canvas in DOM");
}

canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;

// === ENGINE ===
const engine = new Engine();

// Allow all type of messages to be sent during Development (and protect it during Production)
if (__DEV__) {
  (globalThis as Record<string, unknown>).__engine = engine;
  Logger.setLevel(LogLevel.VERBOSE);
}

engine
  .init({
    canvas,
    powerPreference: "high-performance",
  })
  .then(() => {
    engine.start();
  })
  .catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    Logger.error("Engine init failed", { err });

    document.getElementById("error-section")!.classList.add("active");
    const errorMsg = document.querySelector(".error-msg");
    if (errorMsg) {
      errorMsg.innerHTML = `<b>Engine Ignition</b> failed: ${msg}`;
    }
  });

// === Destroy Engine on Page Unload ===
window.addEventListener("beforeunload", () => {
  engine.destroy();
});
