import { assert } from "../debug/Assert";
import { Logger } from "../debug/Logger";

export interface GPUContextOptions {
  canvas: HTMLCanvasElement;
  powerPreference: GPUPowerPreference;
  // GPU Validation in DEV mode
  validation: boolean;
}

export interface GPUContextResult {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  adapterInfo: GPUAdapterInfo;
  limits: GPUSupportedLimits;
  features: GPUSupportedFeatures;
}

export class GPUContext {
  static adapterInfo: GPUAdapterInfo | null = null;
  static hasTimestampQuery: boolean = false;

  static async create(opts: GPUContextOptions): Promise<GPUContextResult> {
    // === Check for WebGPU support ===
    if (!navigator.gpu) {
      Logger.fatal(
        "WebGPU is not supported in this browser. " +
          "Please use Chrome 113+, Edge 113+, or Firefow Nightly with webgpu.enable=true.",
        {
          userAgent: navigator.userAgent,
        },
      );
    }

    // === Request GPU Adapter ===
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: opts.powerPreference,
    });

    if (!adapter) {
      Logger.fatal(
        "WebGPU: no suitable GPU adapter found. " +
          "This may indicate the GPU is blacklisted or the broswer flag is not set.",
      );
    }
    this.adapterInfo = adapter.info;
    this.hasTimestampQuery = adapter.features.has("timestamp-query");
    Logger.info(
      `GPU Adapter: ${this.adapterInfo.vendor} / ${this.adapterInfo.device}`,
    );

    // === Request GPU Device ===
    const device = await adapter.requestDevice({
      label: "Minecraft Web Device",
    });

    // === Get Canvas Context ===
    const context = opts.canvas.getContext("webgpu") as GPUCanvasContext;
    assert(context !== null, "Failed to get WebGPU canvas context");

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: "premultiplied",
    });

    return {
      device,
      context,
      format,
      adapterInfo: this.adapterInfo!,
      limits: adapter.limits,
      features: adapter.features,
    };
  }

  static destroy(device: GPUDevice): void {
    Logger.info("GPUContext: Signing Off GPU Device - DESTROYED!!");
    device.destroy();
  }
}
