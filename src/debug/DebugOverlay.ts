import { assert } from "./Assert";
import { FrameStats } from "./FrameStats";
import { Logger } from "./Logger";

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

  constructor(parentElement: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.style.zIndex = "10000";
    this.canvas.style.pointerEvents = "none";
    parentElement.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    assert(ctx !== null, "Failed to get 2D context for debug overlay canvas", {
      canvas: this.canvas,
    });
    this.ctx = ctx!;

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

  render(gpuTimings?: Map<string, number>): void {
    if (!this.visible) return;

    const ctx = this.ctx;
    const snap = FrameStats.snapshot();
    const smooth = snap.smooth;
    const raw = snap.raw;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.font = FONT;

    const leftLines: Array<{ label: string; value: string; color?: string }> = [
      { label: "Frame", value: `#${snap.frameNumber}`, color: COLOR_GREY },
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
        value: gpuTimings ? this.msStr(gpuTimings.get("total") ?? 0) : "?ms",
        color: this.frameColor(gpuTimings?.get("total") ?? 0),
      },
      { label: "Triangles", value: this.kStr(smooth["triangles"] ?? 0) },
      { label: "VRAM est.", value: this.mbStr(raw["vramBytes"] ?? 0) },
      { label: "JS Heap", value: this.mbStr(raw["jsHeapBytes"] ?? 0) },
      {
        label: "GC pauses",
        value: String(raw["gcPauses"] ?? 0),
        color: (raw["gcPauses"] ?? 0) > 0 ? COLOR_RED : COLOR_GREEN,
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

    if (gpuTimings && gpuTimings.size > 0) {
      const rightPanelW = 200;
      const rightX = this.canvas.width - rightPanelW - padX;
      const passEntries = [...gpuTimings.entries()].filter(
        ([k]) => k !== "total",
      );
      const rightH = passEntries.length * lineH + padY * 2 + lineH;

      ctx.fillStyle = PANEL_BG;
      ctx.beginPath();
      ctx.roundRect(rightX, padY, rightPanelW, rightH, 4);
      ctx.fill();

      let ry = padY + lineH;
      ctx.fillStyle = COLOR_GREY;
      ctx.fillText("GPU Passes", rightX + 8, ry);
      ry += lineH;

      for (const [passName, ms] of passEntries) {
        ctx.fillStyle = COLOR_GREY;
        ctx.fillText(passName.substring(0, 12).padEnd(14), rightX + 8, ry);
        ctx.fillStyle = this.frameColor(ms);
        ctx.fillText(this.msStr(ms), rightX + 8 + 120, ry);
        ry += lineH;
      }
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
