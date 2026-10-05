import { Logger } from "../../debug/Logger";
import type { RenderPass } from "./RenderPass";

import commonWGSL from "../shaders/common/common.wgsl?raw";
import { FrameStats } from "../../debug/FrameStats";

export class TempPass implements RenderPass {
  private device!: GPUDevice;
  private pipeline!: GPURenderPipeline;
  private format!: GPUTextureFormat;

  onInit(device: GPUDevice, format: GPUTextureFormat): void {
    this.device = device;
    this.format = format;
    this.pipeline = this.buildPipeline(device);

    Logger.info("TempPass initialized");
  }

  onResize(_w: number, _h: number): void {}

  getPipeline(): GPURenderPipeline {
    return this.pipeline;
  }

  execute(encoder: GPUCommandEncoder, swapView: GPUTextureView): void {
    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: `RenderPass_${FrameStats.frameNumber}`,
      colorAttachments: [
        {
          view: swapView,
          clearValue: [0.3, 0.3, 0.3, 1.0],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const passEncoder = encoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.draw(3);
    passEncoder.end();
  }

  onDestroy(): void {}

  //   === Private Methods ===
  private buildPipeline(device: GPUDevice): GPURenderPipeline {
    const shaderModule = device.createShaderModule({
      label: "TempPass Shader Module",
      code: commonWGSL,
    });

    return device.createRenderPipeline({
      label: "TempPass Pipeline",
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [{ format: this.format }],
      },
    });
  }
}
