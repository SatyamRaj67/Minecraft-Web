import { assert } from "../debug/Assert";
import { DebugOverlay } from "../debug/DebugOverlay";
import { FrameStats } from "../debug/FrameStats";
import { Logger } from "../debug/Logger";
import { GPUContext } from "../gpu/gpuContext";
import { Renderer } from "../renderer/Renderer";
import { Gameplay } from "./game/Gameplay";
import { GameplayContext } from "./game/Actions";
import { InputManager } from "./input/InputManager";

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  powerPreference: GPUPowerPreference;
}

export class Engine {
  private running: boolean = false;
  private lastTimestamp: number = 0;
  private rafHandle: number | null = null;

  private inputManager!: InputManager;
  private game!: Gameplay;

  private debugOverlay!: DebugOverlay;

  private renderer!: Renderer;

  async init(config: EngineConfig): Promise<void> {
    Logger.info("Engine: initializing...");

    const gpu = await GPUContext.create({
      canvas: config.canvas,
      powerPreference: config.powerPreference,
      validation: __DEV__,
    });

    this.renderer = new Renderer(gpu.device, gpu.context, gpu.format);
    this.renderer.init(config.canvas.clientWidth, config.canvas.clientHeight);

    this.inputManager = new InputManager(config.canvas);
    this.inputManager.push(GameplayContext);

    this.game = new Gameplay(this.inputManager);

    this.inputManager.onPointerLockLost = () => this.game.openPause();

    // === Debug Overlay ===
    this.debugOverlay = new DebugOverlay(
      config.canvas.parentElement ?? document.body,
      this.inputManager,
    );
    this.debugOverlay.resize(
      config.canvas.clientWidth,
      config.canvas.clientHeight,
    );

    // === Canvas Resize Observer ===
    const resizeObserver = new ResizeObserver(() => {
      const w = config.canvas.clientWidth * devicePixelRatio;
      const h = config.canvas.clientHeight * devicePixelRatio;

      config.canvas.width = w;
      config.canvas.height = h;
      this.debugOverlay.resize(w, h);
    });
    resizeObserver.observe(config.canvas);

    Logger.info("Engine: initialized successfully");
  }

  //   === Game Loop ===
  start(): void {
    assert(!this.running, "Engine is already running");
    this.running = true;
    this.lastTimestamp = performance.now();
    this.rafHandle = requestAnimationFrame((ts) => this.loop(ts));
    Logger.info("Engine: Game Loop started");
  }

  stop(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    Logger.info("Engine: Game Loop stopped");
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    let dt = (timestamp - this.lastTimestamp) / 1000; // seconds
    this.lastTimestamp = timestamp;

    if (dt > 0.1) dt = 0.1; // clamp to 100ms
    FrameStats.beginFrame();

    // Render Frame
    this.inputManager.update();
    this.game.update(dt);

    this.renderer.renderFrame();

    this.debugOverlay.render();

    FrameStats.endFrame();
    this.rafHandle = requestAnimationFrame((ts) => this.loop(ts));
  }

  destroy(): void {
    this.stop();

    this.renderer.destroy();
    this.debugOverlay.destroy();

    Logger.info("Engine: destroyed");
  }
}
