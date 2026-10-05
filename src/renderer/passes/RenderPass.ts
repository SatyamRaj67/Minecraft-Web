export interface RenderPass {
  onInit(device: GPUDevice, format: GPUTextureFormat): void;

  onResize?(width: number, height: number): void;

  execute(
    encoder: GPUCommandEncoder,
    swapView?: GPUTextureView,
  ): void;

  onDestroy(): void;
}
