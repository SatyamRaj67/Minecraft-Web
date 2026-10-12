const EMA_ALPHA = 0.1;

enum MetricKey {
  CPU_FRAME_MS = "cpuFrameMs",
  GPU_FRAME_MS = "gpuFrameMs",
  TRIANGLES = "triangles",
  VRAM_BYTES = "vramBytes",
  JS_HEAP_BYTES = "jsHeapBytes",
  GC_PAUSES = "gcPauses",
}

type MetricName = string;

export interface FrameSnapshot {
  frameNumber: number;
  time: number; // performance.now() at endFrame
  raw: Readonly<Record<MetricName, number>>;
  smooth: Readonly<Record<MetricName, number>>;
}

export class FrameStats {
  static frameNumber: number = 0;

  private static frameStart: number = 0;
  private static raw: Record<MetricName, number> = {};
  private static smooth: Record<MetricName, number> = {};

  private static readonly COUNTERS: readonly MetricName[] = [
    MetricKey.CPU_FRAME_MS,
    MetricKey.GPU_FRAME_MS,
    MetricKey.TRIANGLES,
    MetricKey.GC_PAUSES,
  ];

  static readonly KEY = MetricKey;

  static beginFrame(): void {
    this.frameNumber++;
    this.frameStart = performance.now();

    for (const key of this.COUNTERS) {
      this.raw[key] = 0;
    }
  }

  static endFrame(): void {
    const cpuMs = performance.now() - this.frameStart;
    this.set(MetricKey.CPU_FRAME_MS, cpuMs);

    // Sample JS heap (async API — best effort)
    if ("measureUserAgentSpecificMemory" in performance) {
      (
        performance as unknown as {
          measureUserAgentSpecificMemory(): Promise<{ bytes: number }>;
        }
      )
        .measureUserAgentSpecificMemory()
        .then((r) => this.setGauge(MetricKey.JS_HEAP_BYTES, r.bytes))
        .catch(() => {
          /* not available in this context */
        });
    }
  }

  /** Increments a per-frame counter (draw calls, triangles, etc.) */
  static increment(key: MetricName, amount: number = 1): void {
    this.raw[key] = (this.raw[key] ?? 0) + amount;
    this.updateSmooth(key);
  }

  /** Sets an instantaneous value (replaces previous). Also smoothed */
  static set(key: MetricName, value: number): void {
    this.raw[key] = value;
    this.updateSmooth(key);
  }

  /** Set a gauge value WITHOUT resetting it each frame (memory sizes, etc.) */
  static setGauge(key: MetricName, value: number): void {
    this.raw[key] = value;
    this.updateSmooth(key);
  }

  static get(key: MetricName): number {
    return this.raw[key] ?? 0;
  }

  static getSmooth(key: MetricName): number {
    return this.smooth[key] ?? 0;
  }

  static snapshot(): FrameSnapshot {
    return {
      frameNumber: this.frameNumber,
      time: performance.now(),
      raw: { ...this.raw },
      smooth: { ...this.smooth },
    };
  }

  private static updateSmooth(key: MetricName): void {
    const prev = this.smooth[key] ?? this.raw[key] ?? 0;
    const cur = this.raw[key] ?? 0;
    this.smooth[key] = prev * (1 - EMA_ALPHA) + cur * EMA_ALPHA;
  }
}
