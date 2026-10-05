import type { ControlId } from "./Actions";

export interface InputDevice {
  poll(out: Map<ControlId, number>): void;
}

/** Keys that can be problematic because of browser being an asshole */
const BROWSER_KEYS = new Set([
  "Tab",
  "Space",
  "Enter",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "F2",
  "F3",
  "F4",
  "F5",
  "F11",
  "F12",
  "Escape",
]);

// TODO: Implement Typing Inputs to ignore browser keys and handle text input properly. For now, we just ignore them.

// === KeyboardMouseDevice ===
export class KeyboardMouseDevice implements InputDevice {
  private readonly held = new Set<ControlId>();
  private readonly pending = new Set<ControlId>();

  private readonly ac = new AbortController();

  private readonly canvas: HTMLCanvasElement;

  private mouseWheel = 0;
  private mouseDX = 0;
  private mouseDY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const { signal } = this.ac;

    this.attach(signal);
  }

  poll(out: Map<ControlId, number>): void {
    for (const key of this.held) out.set(key, 1);
    for (const key of this.pending) out.set(key, 1);
    this.pending.clear();

    if (this.mouseWheel < 0) out.set("Mouse:WheelUp", 1);
    else if (this.mouseWheel > 0) out.set("Mouse:WheelDown", 1);
    this.mouseWheel = 0;
  }

  private attach(signal: AbortSignal): void {
    // === KeyDown ===
    window.addEventListener(
      "keydown",
      (e) => {
        if (BROWSER_KEYS.has(e.code)) e.preventDefault();
        this.press(`Key:${e.code}`);
      },
      { signal },
    );

    // === KeyUp ===
    window.addEventListener(
      "keyup",
      (e) => {
        this.held.delete(`Key:${e.code}`);
      },
      { signal },
    );

    // === MouseDown ===
    window.addEventListener(
      "mousedown",
      (e) => {
        this.press(`Mouse:${e.button}`);
      },
      { signal },
    );

    // === MouseUp ===
    window.addEventListener(
      "mouseup",
      (e) => {
        this.held.delete(`Mouse:${e.button}`);
      },
      { signal },
    );

    // === MouseMove ===
    window.addEventListener(
      "mousemove",
      (e) => {
        if (document.pointerLockElement !== this.canvas) return;
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      },
      { signal },
    );

    // === MouseWheel ===
    window.addEventListener(
      "wheel",
      (e) => {
        this.mouseWheel += e.deltaY;
      },
      { signal, passive: true },
    );

    // === Blur ===
    window.addEventListener(
      "blur",
      () => {
        this.held.clear();
        this.pending.clear();
      },
      { signal },
    );

    // === Context Menu ===
    window.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
      },
      { signal },
    );
  }

  private press(id: ControlId): void {
    this.held.add(id);
    this.pending.add(id);
  }

  takeMouseDelta(out: { x: number; y: number }): void {
    out.x = this.mouseDX;
    out.y = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  destroy(): void {
    this.ac.abort();
  }
}

// === GamepadDevice ===
const STICK_DEADZONE = 0.2;

/** Keep the strongest value for each control */
function put(out: Map<ControlId, number>, id: ControlId, value: number): void {
  if (value > (out.get(id) ?? 0)) out.set(id, value);
}

function putStick(
  out: Map<ControlId, number>,
  axisX: number,
  axisY: number,
  x: number,
  y: number,
): void {
  const mag = Math.hypot(x, y);
  if (mag < STICK_DEADZONE) return;

  const scale =
    (Math.min(mag, 1) - STICK_DEADZONE) / (1 - STICK_DEADZONE) / mag;
  const sx = x * scale;
  const sy = y * scale;

  put(out, `Pad:Axis${axisX}${sx < 0 ? "-" : "+"}`, Math.abs(sx));
  put(out, `Pad:Axis${axisY}${sy < 0 ? "-" : "+"}`, Math.abs(sy));
}

export class GamepadDevice implements InputDevice {
  poll(out: Map<ControlId, number>): void {
    for (const pad of navigator.getGamepads()) {
      if (!pad || !pad.connected) continue;

      pad.buttons.forEach((btn, i) => {
        put(out, `Pad:Button${i}`, btn.value || (btn.pressed ? 1 : 0));
      });

      putStick(out, 0, pad.axes[0] ?? 0, 1, pad.axes[1] ?? 0);
      putStick(out, 2, pad.axes[2] ?? 0, 3, pad.axes[3] ?? 0);
    }
  }
}
