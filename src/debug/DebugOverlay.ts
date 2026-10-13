import type { InputManager } from "../core/input/InputManager";
import { assert } from "./Assert";
import { FrameStats } from "./stats/FrameStats";
import { Logger } from "./Logger";
import type { Player } from "../core/player/Player";

const FRAME_MS_GREEN = 10; // < 10ms: good
const FRAME_MS_YELLOW = 14; // < 14ms: acceptable
//  >14ms: red (approaching over 16.6ms budget)

const PANEL_BG = "#1e1e1edd";
const COLOR_GREEN = "#90be6d";
const COLOR_YELLOW = "#f9c74f";
const COLOR_RED = "#f94144";
const COLOR_WHITE = "#d4d4d4";
const COLOR_GREY = "#888888";
const FONT = '13px "JetBrains Mono", "Fira Code", monospace';

export class DebugOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private visible = true;

  private inputManager: InputManager;
  private player: Player;

  constructor(
    parentElement: HTMLElement,
    inputManager: InputManager,
    player: Player,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.style.zIndex = "10000";
    this.canvas.style.pointerEvents = "none";
    parentElement.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    assert(ctx !== null, "Failed to get 2D context for debug overlay canvas", {
      canvas: this.canvas,
    });
    this.ctx = ctx!;

    this.inputManager = inputManager;
    this.player = player;

    Logger.info("DebugOverlay: initialized (press F3 to toggle)");
  }

  toggle(): void {
    this.visible = !this.visible;
    if (!this.visible) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    Logger.verbose("DebugOverlay", `Overlay visibility: ${this.visible}`);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(): void {
    if (!this.visible) return;

    const ctx = this.ctx;

    // === Frame Snapshot ===
    const frameSnap = FrameStats.snapshot();
    const smooth = frameSnap.smooth;
    const raw = frameSnap.raw;

    // === Input Snapshot ===
    const inputSnap = this.inputManager.InputSnapshot;

    // === Player Snapshot ===
    const playerSnap = this.player.PlayerSnap;

    // === Canvas Rendering ===
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.font = FONT;

    const leftLines: Array<{ label: string; value: string; color?: string }> = [
      { label: "Frame", value: `#${frameSnap.frameNumber}`, color: COLOR_GREY },
      {
        label: "FPS",
        value: this.fpsStr(1000 / (smooth["cpuFrameMs"] ?? 0)),
        color: this.frameColor(smooth["fps"] ?? 0),
      },
      {
        label: "CPU",
        value: this.msStr(smooth["cpuFrameMs"] ?? 0),
        color: this.frameColor(smooth["cpuFrameMs"] ?? 0),
      },
      {
        label: "GPU",
        value: this.msStr(FrameStats.getSmooth(FrameStats.KEY.GPU_FRAME_MS)),
        color: this.frameColor(
          FrameStats.getSmooth(FrameStats.KEY.GPU_FRAME_MS),
        ),
      },
      { label: "Triangles", value: this.kStr(smooth["triangles"] ?? 0) },
      { label: "VRAM est.", value: this.mbStr(raw["vramBytes"] ?? 0) },
      { label: "JS Heap", value: this.mbStr(raw["jsHeapBytes"] ?? 0) },
      {
        label: "GC pauses",
        value: String(raw["gcPauses"] ?? 0),
        color: (raw["gcPauses"] ?? 0) > 0 ? COLOR_RED : COLOR_GREEN,
      },
      {
        label: "Position",
        value: `(${playerSnap.position[0].toFixed(1)}, ${playerSnap.position[1].toFixed(1)}, ${playerSnap.position[2].toFixed(1)})`,
      },
      {
        label: "Rotation",
        value: `(${playerSnap.rotation[0].toFixed(1)}°, ${playerSnap.rotation[1].toFixed(1)}°)`,
      },
      {
        label: "Held",
        value:
          inputSnap.held.length > 0
            ? Array.from(inputSnap.held).join(", ")
            : "None",
      },
    ];

    const lineH = 18;
    const padX = 10;
    const padY = 10;
    const panelW = 230;
    const panelH = leftLines.length * lineH + padY * 2;

    ctx.fillStyle = PANEL_BG;
    ctx.beginPath();
    ctx.roundRect(padX, padY, panelW, panelH, 4);
    ctx.fill();

    let y = padY + lineH;
    for (const line of leftLines) {
      const labelW = 80;
      ctx.fillStyle = COLOR_GREY;
      ctx.fillText(line.label.padEnd(10), padX + 8, y);

      ctx.fillStyle = line.color ?? COLOR_WHITE;
      ctx.fillText(line.value, padX + 8 + labelW, y);

      y += lineH;
    }
  }

  destroy(): void {
    this.canvas.remove();
  }

  private msStr(ms: number): string {
    return ms.toFixed(2) + "ms";
  }

  private kStr(n: number): string {
    if (n >= 1_000_100) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
    return String(Math.round(n));
  }

  private mbStr(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1) + "MB";
  }

  private fpsStr(fps: number): string {
    return fps.toFixed(1) + " FPS";
  }

  private frameColor(ms: number): string {
    if (ms < FRAME_MS_GREEN) return COLOR_GREEN;
    if (ms < FRAME_MS_YELLOW) return COLOR_YELLOW;
    return COLOR_RED;
  }
}
