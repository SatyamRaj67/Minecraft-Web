import { FrameStats } from "../debug/FrameStats";
import { Logger } from "../debug/Logger";

export class Renderer {
  private width: number = 1;
  private height: number = 1;

  constructor(
    private device: GPUDevice,
    private context: GPUCanvasContext,
    private format: GPUTextureFormat,
  ) {}

  init(width: number, height: number): void {
    this.resize(width, height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(): void {
    const encoder = this.device.createCommandEncoder({
      label: `Frame_${FrameStats.frameNumber}`,
    });

    const commandBuffer = encoder.finish();
    this.device.queue.submit([commandBuffer]);
  }

  destroy(): void {
    Logger.info("Renderer: destroyed");
  }
}
