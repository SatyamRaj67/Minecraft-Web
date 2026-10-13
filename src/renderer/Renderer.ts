import { FrameStats } from "../debug/stats/FrameStats";
import { Logger } from "../debug/Logger";
import { Player } from "../core/player/Player";
import commonModuleWGSL from "./shaders/common.wgsl?raw";
import { mat4 } from "wgpu-matrix";
import { GPUContext } from "../gpu/gpuContext";

export class Renderer {
  private width: number = 1;
  private height: number = 1;
  private hasTimestampQuery: boolean = false;

  private pipeline!: GPURenderPipeline;
  private globalsBuffer!: GPUBuffer;
  private globalsBindGroup!: GPUBindGroup;

  // === Timestamp ===
  private timestampQuerySet?: GPUQuerySet;
  private timestampResolveBuffer?: GPUBuffer;
  private timestampResultBuffer?: GPUBuffer;

  constructor(
    private device: GPUDevice,
    private context: GPUCanvasContext,
    private format: GPUTextureFormat,
    private player: Player,
  ) {
    this.player = player;
    this.hasTimestampQuery = GPUContext.hasTimestampQuery;
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

    if (this.hasTimestampQuery) {
      this.timestampQuerySet = this.device.createQuerySet({
        type: "timestamp",
        count: 2,
      });
      this.timestampResolveBuffer = this.device.createBuffer({
        size: this.timestampQuerySet.count * 8,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      });

      this.timestampResultBuffer = this.device.createBuffer({
        size: this.timestampResolveBuffer.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
    }

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
      label: "Main RenderPass",
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      ...(this.hasTimestampQuery &&
        this.timestampQuerySet && {
          timestampWrites: {
            querySet: this.timestampQuerySet,
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1,
          },
        }),
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalsBindGroup);
    pass.draw(3);
    pass.end();

    if (
      this.hasTimestampQuery &&
      this.timestampQuerySet &&
      this.timestampResolveBuffer &&
      this.timestampResultBuffer
    ) {
      encoder.resolveQuerySet(
        this.timestampQuerySet,
        0,
        2,
        this.timestampResolveBuffer,
        0,
      );
      if (this.timestampResultBuffer.mapState === "unmapped") {
        encoder.copyBufferToBuffer(
          this.timestampResolveBuffer,
          0,
          this.timestampResultBuffer,
          0,
          this.timestampResultBuffer.size,
        );
      }
    }

    const commandBuffer = encoder.finish();
    this.device.queue.submit([commandBuffer]);

    if (
      this.hasTimestampQuery &&
      this.timestampResultBuffer &&
      this.timestampResultBuffer.mapState === "unmapped"
    ) {
      this.timestampResultBuffer.mapAsync(GPUMapMode.READ).then(() => {
        const times = new BigUint64Array(
          this.timestampResultBuffer!.getMappedRange(),
        );
        const gpuFrameMs = Number(times[1]! - times[0]!) / 1_000_000; // Convert nanoseconds to milliseconds

        FrameStats.set(FrameStats.KEY.GPU_FRAME_MS, gpuFrameMs);

        this.timestampResultBuffer!.unmap();
      });
    }
  }

  destroy(): void {
    this.globalsBuffer.destroy();
    Logger.info("Renderer: destroyed");
  }
}
