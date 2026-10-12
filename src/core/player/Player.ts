import { mat4 } from "wgpu-matrix";

export class Player {
  position: [number, number, number];
  rotation: [number, number];

  constructor() {
    this.position = [0, 0, 0];
    this.rotation = [0, 0];
  }
  
  getCameraMatrix(): Float32Array {
    const cameraMatrix = mat4.create();

    const yaw = (this.rotation[0] * Math.PI) / 180;
    const pitch = (this.rotation[1] * Math.PI) / 180;

    mat4.identity(cameraMatrix);
    mat4.rotateX(cameraMatrix, -pitch, cameraMatrix);
    mat4.rotateY(cameraMatrix, -yaw, cameraMatrix);

    mat4.translate(cameraMatrix, [
      -this.position[0],
      -this.position[1],
      -this.position[2],
    ], cameraMatrix);

    return cameraMatrix;
  }
}
