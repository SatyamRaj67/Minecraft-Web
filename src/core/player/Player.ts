import { mat4 } from "wgpu-matrix";
import type { InputManager } from "../input/InputManager";

const MOVE_SPEED = 5;
const MOUSE_SENSITIVITY = 0.15;
const MAX_PITCH = 89;

export class Player {
  position: [number, number, number];
  velocity: [number, number, number];
  rotation: [number, number];

  private inputManager: InputManager;

  constructor(inputManager: InputManager) {
    this.position = [0, 0, 0];
    this.velocity = [0, 0, 0];
    this.rotation = [0, 0];

    this.inputManager = inputManager;
  }

  update(dt: number): void {
    const rawMouseDelta = this.inputManager.consumeMouseDelta();
    this.rotation[0] -= rawMouseDelta.x * MOUSE_SENSITIVITY;
    this.rotation[1] -= rawMouseDelta.y * MOUSE_SENSITIVITY;
    this.rotation[1] = Math.max(
      -MAX_PITCH,
      Math.min(MAX_PITCH, this.rotation[1]),
    );

    if (this.inputManager.isHeld("Key:KeyA")) this.velocity[0] -= 1;
    if (this.inputManager.isHeld("Key:KeyD")) this.velocity[0] += 1;
    if (this.inputManager.isHeld("Key:KeyW")) this.velocity[2] -= 1;
    if (this.inputManager.isHeld("Key:KeyS")) this.velocity[2] += 1;
    if (this.inputManager.isHeld("Key:Space")) this.velocity[1] += 1;
    if (this.inputManager.isHeld("Key:ShiftLeft")) this.velocity[1] -= 1;

    const length = Math.hypot(this.velocity[0], this.velocity[2]);
    if (length > 0) {
      this.velocity[0] /= length;
      this.velocity[2] /= length;
    }

    const localX = this.velocity[0];
    const localZ = this.velocity[2];

    const yaw = (this.rotation[0] * Math.PI) / 180;
    const worldX = localX * Math.cos(yaw) + localZ * Math.sin(yaw);
    const worldZ = -localX * Math.sin(yaw) + localZ * Math.cos(yaw);

    this.position[0] += worldX * MOVE_SPEED * dt;
    this.position[2] += worldZ * MOVE_SPEED * dt;
    this.velocity[0] = 0;
    this.velocity[2] = 0;
  }

  getCameraMatrix(): Float32Array {
    const cameraMatrix = mat4.create();

    const yaw = (this.rotation[0] * Math.PI) / 180;
    const pitch = (this.rotation[1] * Math.PI) / 180;

    mat4.identity(cameraMatrix);
    mat4.rotateX(cameraMatrix, -pitch, cameraMatrix);
    mat4.rotateY(cameraMatrix, -yaw, cameraMatrix);

    mat4.translate(
      cameraMatrix,
      [-this.position[0], -this.position[1], -this.position[2]],
      cameraMatrix,
    );

    return cameraMatrix;
  }

  // === Debug ===
  get PlayerSnap(): {
    position: [number, number, number];
    rotation: [number, number];
  } {
    return {
      position: [...this.position] as [number, number, number],
      rotation: [...this.rotation] as [number, number],
    };
  }
}
