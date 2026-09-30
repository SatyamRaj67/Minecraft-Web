import { assert } from "../debug/Assert";
import { DebugOverlay } from "../debug/DebugOverlay";
import { FrameStats } from "../debug/FrameStats";
import { Logger } from "../debug/Logger";
import { GPUContext } from "../gpu/gpuContext";

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  powerPreference: GPUPowerPreference;
}

export class Engine {
  private running: boolean = false;
  private lastTimestamp: number = 0;
  private rafHandle: number | null = null;

  private debugOverlay!: DebugOverlay;

  async init(config: EngineConfig): Promise<void> {
    Logger.info("Engine: initializing...");

    const gpu = await GPUContext.create({
      canvas: config.canvas,
      powerPreference: config.powerPreference,
      validation: __DEV__,
    });

    // === Debug Overlay ===
    this.debugOverlay = new DebugOverlay(
      config.canvas.parentElement ?? document.body,
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
    this.debugOverlay.render();

    FrameStats.endFrame();
    this.rafHandle = requestAnimationFrame((ts) => this.loop(ts));
  }

  destroy(): void {
    this.stop();

    this.debugOverlay.destroy();

    Logger.info("Engine: destroyed");
  }
}
