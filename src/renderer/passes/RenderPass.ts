export interface RenderPass {
  readonly name: string;

  init(): void;

  resize?(width: number, height: number): void;

  update(
    encoder: GPUCommandEncoder,
    resources: ReadonlyMap<string, GPUTextureView>,
  ): void;

  destroy(): void;

  lastDrawCallCount?: number;
}
