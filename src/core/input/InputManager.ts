import type { Player } from "../player/Player";

/** `Key:KeyW`, `Key:KeyA`, `Key:KeyS`, `Key:KeyD` */
export type ControlId = string;

const MOVE_SPEED = 5;
const MOUSE_SENSITIVITY = 0.15;
const MAX_PITCH = 89;

export class InputManager {
  private held: Set<string> = new Set();

  private readonly rawMouseDelta: { x: number; y: number } = { x: 0, y: 0 };

  private readonly ac = new AbortController();

  private canvas: HTMLCanvasElement;
  private player: Player;

  constructor(canvas: HTMLCanvasElement, player: Player) {
    this.canvas = canvas;
    this.player = player;

    const { signal } = this.ac;
    this.attach(signal);

    document.addEventListener(
      "pointerlockchange",
      () => {
        if (document.pointerLockElement == this.canvas) return;
        Promise.resolve(this.canvas.requestPointerLock());
      },
      { signal },
    );

    canvas.addEventListener(
      "click",
      () => Promise.resolve(this.canvas.requestPointerLock()),
      { signal },
    );
  }

  update(dt: number): void {
    if (document.pointerLockElement === this.canvas) {
      this.player.rotation[0] -= this.rawMouseDelta.x * MOUSE_SENSITIVITY;
      this.player.rotation[1] -= this.rawMouseDelta.y * MOUSE_SENSITIVITY;
      this.player.rotation[1] = Math.max(
        -MAX_PITCH,
        Math.min(MAX_PITCH, this.player.rotation[1]),
      );

      let localX = 0;
      let localY = 0;
      let localZ = 0;
      if (this.held.has("Key:KeyA")) localX -= 1;
      if (this.held.has("Key:KeyD")) localX += 1;
      if (this.held.has("Key:KeyW")) localZ -= 1;
      if (this.held.has("Key:KeyS")) localZ += 1;
      if (this.held.has("Key:Space")) localY += 1;
      if (this.held.has("Key:ShiftLeft")) localY -= 1;

      const length = Math.hypot(localX, localZ);
      if (length > 0) {
        localX /= length;
        localZ /= length;

        const yaw = (this.player.rotation[0] * Math.PI) / 180;
        const worldX = localX * Math.cos(yaw) + localZ * Math.sin(yaw);
        const worldZ = -localX * Math.sin(yaw) + localZ * Math.cos(yaw);

        this.player.position[0] += worldX * MOVE_SPEED * dt;
        this.player.position[2] += worldZ * MOVE_SPEED * dt;
      }

      this.player.position[1] += localY * MOVE_SPEED * dt;
    }
    this.rawMouseDelta.x = 0;
    this.rawMouseDelta.y = 0;
  }

  destroy(): void {
    this.detach();
  }

  //   === Debug ===
  get InputSnapshot() {
    return {
      player: this.player,
      held: Array.from(this.held),
      rawMouseDelta: this.rawMouseDelta,
    };
  }

  //   === Private Methods ===
  private press(controlId: ControlId): void {
    this.held.add(controlId);
  }

  private attach(signal: AbortSignal): void {
    // Keydown
    window.addEventListener(
      "keydown",
      (e) => {
        e.preventDefault();
        this.press(`Key:${e.code}`);
      },
      { signal },
    );

    // Keyup
    window.addEventListener(
      "keyup",
      (e) => {
        this.held.delete(`Key:${e.code}`);
      },
      { signal },
    );

    // Mousedown
    window.addEventListener(
      "mousedown",
      (e) => {
        this.press(`Mouse:${e.button}`);
      },
      { signal },
    );

    // Mouseup
    window.addEventListener(
      "mouseup",
      (e) => {
        this.held.delete(`Mouse:${e.button}`);
      },
      { signal },
    );

    // Mousemove
    window.addEventListener(
      "mousemove",
      (e) => {
        if (document.pointerLockElement !== this.canvas) return;
        this.rawMouseDelta.x += e.movementX;
        this.rawMouseDelta.y += e.movementY;
      },
      { signal },
    );

    // Blur
    window.addEventListener(
      "blur",
      () => {
        this.held.clear();
      },
      { signal },
    );

    // Contextmenu
    window.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
      },
      { signal },
    );
  }

  private detach(): void {
    this.ac.abort();
  }
}
