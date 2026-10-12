import { FrameStats } from "../debug/stats/FrameStats";
import { Logger } from "../debug/Logger";
import { Player } from "../core/player/Player";
import commonModuleWGSL from "./shaders/common.wgsl?raw";
import { mat4 } from "wgpu-matrix";

export class Renderer {
  private width: number = 1;
  private height: number = 1;
  private pipeline!: GPURenderPipeline;
  private globalsBuffer!: GPUBuffer;
  private globalsBindGroup!: GPUBindGroup;

  constructor(
    private device: GPUDevice,
    private context: GPUCanvasContext,
    private format: GPUTextureFormat,
    private player: Player,
  ) {
    this.player = player;
  }

  init(width: number, height: number): void {
    const module = this.device.createShaderModule({
      label: "Common Module",
      code: commonModuleWGSL,
    });

    this.pipeline = this.device.createRenderPipeline({
      label: "Triangle Pipeline",
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vs_main",
      },
      fragment: {
        module,
        entryPoint: "fs_main",
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: "triangle-list",
      },
    });

    this.globalsBuffer = this.device.createBuffer({
      label: "Global MVP Uniforms",
      size: 3 * 16 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.globalsBindGroup = this.device.createBindGroup({
      label: "Global MVP Bind Group",
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.globalsBuffer } }],
    });

    this.resize(width, height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(): void {
    const modelMatrix = mat4.translation([0, 0, -3]);

    const viewMatrix = this.player.getCameraMatrix();
    const projectionMatrix = mat4.perspective(
      (60 * Math.PI) / 180,
      this.width / this.height,
      0.1,
      100,
    );

    const globals = new Float32Array(3 * 16);
    globals.set(modelMatrix, 0);
    globals.set(viewMatrix, 16);
    globals.set(projectionMatrix, 32);
    this.device.queue.writeBuffer(this.globalsBuffer, 0, globals);

    const encoder = this.device.createCommandEncoder({
      label: `Frame_${FrameStats.frameNumber}`,
    });

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalsBindGroup);
    pass.draw(3);
    pass.end();

    const commandBuffer = encoder.finish();
    this.device.queue.submit([commandBuffer]);
  }

  destroy(): void {
    this.globalsBuffer.destroy();
    Logger.info("Renderer: destroyed");
  }
}
