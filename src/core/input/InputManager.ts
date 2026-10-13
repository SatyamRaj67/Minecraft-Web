/** `Key:KeyW`, `Key:KeyA`, `Key:KeyS`, `Key:KeyD` */
export type ControlId = string;

export class InputManager {
  private held: Set<string> = new Set();

  private readonly rawMouseDelta: { x: number; y: number } = { x: 0, y: 0 };

  private readonly ac = new AbortController();

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

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

  consumeMouseDelta(): { x: number; y: number } {
    const delta = { x: this.rawMouseDelta.x, y: this.rawMouseDelta.y };
    this.rawMouseDelta.x = 0;
    this.rawMouseDelta.y = 0;
    return delta;
  }

  destroy(): void {
    this.detach();
  }

  // === Public API ===
  isHeld(controlId: ControlId): boolean {
    return this.held.has(controlId);
  }

  //   === Debug ===
  get InputSnapshot() {
    return {
      held: Array.from(this.held),
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
