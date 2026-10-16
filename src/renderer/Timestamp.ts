import { assert } from "../debug/Assert";
import { GPUContext } from "../gpu/gpuContext";

/** We track comman buffers so we can generate an error
 * if we try to read the result before the command buffer has been executed.
 */
const s_unsubmittedCommandBuffer = new Set<GPUCommandBuffer>();

/** Monkey-patch GPUQueue.submit to track unsubmitted command buffers. */
GPUQueue.prototype.submit = (function (origFn) {
  return function (this: GPUQueue, commandBuffers: GPUCommandBuffer[]) {
    origFn.call(this, commandBuffers);
    commandBuffers.forEach((cb) => s_unsubmittedCommandBuffer.delete(cb));
  };
})(GPUQueue.prototype.submit);

type TimestampState =
  | "free"
  | "need_resolve"
  | "wait_for_result"
  | "need_finish";

export default class Timestamp {
  private device: GPUDevice;
  private hasTimestampQuery: boolean = false;

  private querySet?: GPUQuerySet;
  private resolveBuffer?: GPUBuffer;
  private resultBuffer?: GPUBuffer;
  private resultBuffers: GPUBuffer[] = [];
  private commandBuffer: GPUCommandBuffer | undefined = undefined;

  private state: TimestampState = "free";

  constructor(device: GPUDevice) {
    this.device = device;
    this.hasTimestampQuery = GPUContext.hasTimestampQuery;

    if (!this.hasTimestampQuery) return;
    this.querySet = device.createQuerySet({
      type: "timestamp",
      count: 2,
    });
    this.resolveBuffer = device.createBuffer({
      size: this.querySet.count * 8,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
    });
  }

  private beginTimestampPass(
    encoder: GPUCommandEncoder,
    fnName: "beginRenderPass",
    descriptor: GPURenderPassDescriptor,
  ): GPURenderPassEncoder;
  private beginTimestampPass(
    encoder: GPUCommandEncoder,
    fnName: "beginComputePass",
    descriptor: GPUComputePassDescriptor,
  ): GPUComputePassEncoder;

  private beginTimestampPass(
    encoder: GPUCommandEncoder,
    fnName: "beginRenderPass" | "beginComputePass" = "beginRenderPass",
    descriptor: GPURenderPassDescriptor | GPUComputePassDescriptor,
  ): GPURenderPassEncoder | GPUComputePassEncoder {
    if (!this.hasTimestampQuery || !this.querySet) {
      return fnName === "beginRenderPass"
        ? encoder.beginRenderPass(descriptor as GPURenderPassDescriptor)
        : encoder.beginComputePass(descriptor as GPUComputePassDescriptor);
    }
    assert(
      this.state === "free",
      "Timestamp: beginTimestampPass called while not in free state",
    );
    this.state = "need_resolve";

    const timestampWrites = {
      querySet: this.querySet,
      beginningOfPassWriteIndex: 0,
      endOfPassWriteIndex: 1,
    };

    const pass =
      fnName === "beginRenderPass"
        ? encoder.beginRenderPass({
            ...(descriptor as GPURenderPassDescriptor),
            timestampWrites,
          })
        : encoder.beginComputePass({
            ...(descriptor as GPUComputePassDescriptor),
            timestampWrites,
          });

    const resolve = () => this.resolveTiming(encoder);
    const trackCommandBuffer = (cb: GPUCommandBuffer) =>
      this.trackCommandBuffer(cb);

    pass.end = (function (origFn) {
      return function (this: GPURenderPassEncoder | GPUComputePassEncoder) {
        origFn.call(this);
        resolve();
      };
    })(pass.end);

    encoder.finish = (function (origFn) {
      return function (this: GPUCommandEncoder) {
        const cb = origFn.call(this);
        trackCommandBuffer(cb);
        return cb;
      };
    })(encoder.finish);

    return pass;
  }

  beginRenderPass(
    encoder: GPUCommandEncoder,
    descriptor: GPURenderPassDescriptor,
  ): GPURenderPassEncoder {
    return this.beginTimestampPass(encoder, "beginRenderPass", descriptor);
  }

  beginComputePass(
    encoder: GPUCommandEncoder,
    descriptor: GPUComputePassDescriptor,
  ): GPUComputePassEncoder {
    return this.beginTimestampPass(encoder, "beginComputePass", descriptor);
  }

  //   === Private Methods ===
  private resolveTiming(encoder: GPUCommandEncoder): void {
    if (!this.hasTimestampQuery || !this.querySet || !this.resolveBuffer)
      return;
    assert(
      this.state === "need_resolve",
      "Timestamp: resolveTiming called while not in need_resolve state",
    );
    this.state = "need_finish";

    this.resultBuffer =
      this.resultBuffers.pop() ||
      this.device.createBuffer({
        size: this.resolveBuffer.size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

    encoder.resolveQuerySet(
      this.querySet,
      0,
      this.querySet.count,
      this.resolveBuffer,
      0,
    );
    encoder.copyBufferToBuffer(
      this.resolveBuffer,
      0,
      this.resultBuffer,
      0,
      this.resultBuffer.size,
    );
  }

  private trackCommandBuffer(cb: GPUCommandBuffer): void {
    if (!this.hasTimestampQuery) return;
    assert(
      this.state === "need_finish",
      "Timestamp: trackCommandBuffer called while not in need_finish state",
    );
    s_unsubmittedCommandBuffer.add(cb);
    this.commandBuffer = cb;
    this.state = "wait_for_result";
  }

  async getResult(): Promise<number> {
    if (!this.hasTimestampQuery || !this.resultBuffer) return 0;

    assert(
      this.state === "wait_for_result",
      "Timestamp: getResult called while not in wait_for_result state",
    );
    assert(
      !!this.commandBuffer,
      "Timestamp: getResult called before command buffer was submitted",
    );
    assert(
      !s_unsubmittedCommandBuffer.has(this.commandBuffer),
      "Timestamp: getResult called before command buffer was submitted",
    );

    const resultBuffer = this.resultBuffer;
    this.commandBuffer = undefined;
    delete this.resultBuffer;
    this.state = "free";

    await resultBuffer.mapAsync(GPUMapMode.READ);
    const times = new BigUint64Array(resultBuffer.getMappedRange());
    // WebGPU timestamp values are expressed in nanoseconds.
    const durationMs = Number(times[1]! - times[0]!) / 1_000_000; // ms
    resultBuffer.unmap();
    this.resultBuffers.push(resultBuffer);
    return durationMs;
  }
}
