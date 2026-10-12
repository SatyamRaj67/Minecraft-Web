export class Textures {
  private device: GPUDevice;

  constructor(device: GPUDevice) {
    this.device = device;
  }

  async createTexture(
    url: string,
    format?: GPUTextureFormat,
  ): Promise<GPUTexture> {
    const source = await this.loadImageBitmap(url);
    const texture = this.device.createTexture({
      label: `Texture_${url}`,
      format: format ?? "rgba8unorm",
      size: {
        width: source.width,
        height: source.height,
      },
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    return texture;
  }

  //   === Private Methods ===
  private async loadImageBitmap(url: string): Promise<ImageBitmap> {
    const response = await fetch(url);
    const blob = await response.blob();
    return await createImageBitmap(blob);
  }
}
