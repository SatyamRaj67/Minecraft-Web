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

const REQUIRED_FEATURES: GPUFeatureName[] = [];

const OPTIONAL_FEATURES: GPUFeatureName[] = ["timestamp-query"];

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
    Logger.info(
      `GPU Adapter: ${this.adapterInfo.vendor} / ${this.adapterInfo.device}`,
    );

    // === Features supported by GPU Device ===
    const enabledFeatures: GPUFeatureName[] = [...REQUIRED_FEATURES];
    for (const feature of OPTIONAL_FEATURES) {
      if (adapter.features.has(feature)) {
        enabledFeatures.push(feature);
        Logger.verbose("GPUContext", `Optional Feature Enabled: ${feature}`);
      }
    }
    this.hasTimestampQuery = enabledFeatures.includes("timestamp-query");

    // === GPU Device ===
    const device = await adapter.requestDevice({
      requiredFeatures: enabledFeatures,
      label: "Minecraft Web Device",
    });

    // === Canvas Context ===
    const context = opts.canvas.getContext("webgpu") as GPUCanvasContext;
    assert(context !== null, "Failed to get WebGPU canvas context");

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
    });

    Logger.info(`GPUContext: Initialized. Format: ${format}`);

    return {
      device,
      context,
      format,
      adapterInfo: this.adapterInfo,
      limits: adapter.limits,
      features: adapter.features,
    };
  }

  static destroy(device: GPUDevice): void {
    Logger.info("GPUContext: Signing Off GPU Device - DESTROYED!!");
    device.destroy();
  }
}
