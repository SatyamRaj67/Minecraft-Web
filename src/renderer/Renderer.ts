import { FrameStats } from "../debug/FrameStats";
import { Logger } from "../debug/Logger";
import { TempPass } from "./passes/TempPass";

export class Renderer {
  private width: number = 1;
  private height: number = 1;

  private tempPass: TempPass;
  constructor(
    private device: GPUDevice,
    private context: GPUCanvasContext,
    private format: GPUTextureFormat,
  ) {
    this.tempPass = new TempPass();
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.tempPass.onInit(this.device, this.format);
  }

  renderFrame(): void {
    const encoder = this.device.createCommandEncoder({
      label: `Frame_${FrameStats.frameNumber}`,
    });

    const swapTexture = this.context.getCurrentTexture();
    const swapView = swapTexture.createView();

    this.tempPass.execute(encoder, swapView);

    const commandBuffer = encoder.finish();
    this.device.queue.submit([commandBuffer]);
  }

  destroy(): void {
    this.tempPass.onDestroy();

    Logger.info("Renderer: destroyed");
  }
}
