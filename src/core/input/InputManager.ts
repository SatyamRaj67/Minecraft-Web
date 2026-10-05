import { Logger } from "../../debug/Logger";
import {
  ACTIONS,
  type Action,
  type ControlId,
  type InputContext,
} from "../game/Actions";
import { Bindings, deviceGroup } from "./Bindings";
import { type InputDevice } from "./devices/Devices";
import { GamepadDevice } from "./devices/GamepadDevice";
import { KeyboardMouseDevice } from "./devices/KBMDevices";

/** A control counts as pressed if its value is greater than or equal to this threshold. */
const PRESS_THRESHOLD = 0.5;

export interface ActionState {
  value: number;
  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
  activeControls: readonly ControlId[];
}

export type DeviceKind = "keyboard" | "gamepad";
interface Vec2 {
  x: number;
  y: number;
}

export class InputManager {
  readonly bindings = new Bindings();
  lastDevice: DeviceKind = "keyboard";
  onPointerLockLost: (() => void) | null = null;

  private readonly canvas: HTMLCanvasElement;
  private readonly kbm: KeyboardMouseDevice;
  private readonly devices: InputDevice[] = [];

  private readonly stack: InputContext[] = [];
  private readonly state = {} as Record<Action, ActionState>;

  private readonly consumed = new Set<ControlId>();
  private readonly seen = new Set<Action>();

  private readonly rawDelta: Vec2 = { x: 0, y: 0 };
  private readonly lookDelta: Vec2 = { x: 0, y: 0 };

  private readonly ac = new AbortController();

  private curr = new Map<ControlId, number>();
  private prev = new Map<ControlId, number>();
  private capture: {
    resolve: (c: ControlId | null) => void;
    armed: boolean;
  } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.kbm = new KeyboardMouseDevice(canvas);
    this.devices = [this.kbm, new GamepadDevice()];

    for (const action of ACTIONS)
      this.state[action] = {
        value: 0,
        pressed: false,
        justPressed: false,
        justReleased: false,
        activeControls: [],
      };

    const { signal } = this.ac;
    this.attach(canvas, signal);
  }

  //   === Context Stack Methods ===
  get top(): InputContext | undefined {
    return this.stack[this.stack.length - 1];
  }

  push(ctx: InputContext): void {
    if (this.stack.includes(ctx)) return;
    this.stack.push(ctx);
    this.syncPointerLock();
  }

  remove(ctx: InputContext): void {
    const index = this.stack.indexOf(ctx);
    if (index < 0) return;
    this.stack.splice(index, 1);
    this.syncPointerLock();
  }

  //   === Update Methods ===
  update(): void {
    // * === Poll Devices ===
    // We poll all devices, then we check last frame for edge detection.
    [this.prev, this.curr] = [this.curr, this.prev];
    this.curr.clear();

    for (const device of this.devices) device.poll(this.curr);

    for (const [id, value] of this.curr) {
      if (value >= PRESS_THRESHOLD && !this.wasDown(id)) {
        this.lastDevice = deviceGroup(id) === "pad" ? "gamepad" : "keyboard";
      }
    }

    this.kbm.takeMouseDelta(this.rawDelta);

    const looking =
      this.cursorMode() === "locked" &&
      document.pointerLockElement === this.canvas;

    this.lookDelta.x = looking ? this.rawDelta.x : 0;
    this.lookDelta.y = looking ? this.rawDelta.y : 0;

    // * === Capture Mode ===
    // This is important when you are applying keybinds, you don't want to apply the keybinds to the game while you are rebinding them.
    if (this.capture) {
      this.updateCapture();
      for (const action of ACTIONS) this.apply(action, 0, false);
      return;
    }

    // * === Apply Bindings ===
    this.consumed.clear();
    this.seen.clear();

    for (let i = this.stack.length - 1; i >= 0; i--) {
      const ctx = this.stack[i]!;

      for (const action of ctx.actions) {
        if (this.seen.has(action)) continue;
        this.seen.add(action);

        let value = 0;
        let edge = false;
        const activeControls: ControlId[] = [];

        for (const control of this.bindings.get(action)) {
          if (this.consumed.has(control)) continue;

          const controlValue = this.curr.get(control) ?? 0;
          if (controlValue > value) value = controlValue;
          if (controlValue >= PRESS_THRESHOLD) activeControls.push(control);
          // * EDGES: We only want to trigger an edge if the control is not already down, otherwise it will trigger every frame while the control is held down.
          if (controlValue >= PRESS_THRESHOLD && !this.wasDown(control))
            edge = true;
        }
        this.apply(action, value, edge, activeControls);
      }
      //   Model: Block all inputs below the current context if "all" is set
      if (ctx.blocking === "all") break;

      for (const action of ctx.actions) {
        for (const control of this.bindings.get(action)) {
          this.consumed.add(control);
        }
      }
    }

    for (const action of ACTIONS) {
      if (!this.seen.has(action)) this.apply(action, 0, false); // inactive = released
    }
  }

  private wasDown(id: ControlId): boolean {
    return (this.prev.get(id) ?? 0) >= PRESS_THRESHOLD;
  }

  private apply(
    action: Action,
    value: number,
    edge: boolean,
    activeControls: readonly ControlId[] = [],
  ): void {
    const s = this.state[action];
    const pressed = value >= PRESS_THRESHOLD;

    s.justPressed = pressed && edge;
    s.justReleased = s.pressed && !pressed;
    s.pressed = pressed;
    s.value = value;
    s.activeControls = activeControls;
  }

  private attach(canvas: HTMLCanvasElement, signal: AbortSignal): void {
    // === Pointer Lock Lost ===
    document.addEventListener(
      "pointerlockchange",
      () => {
        const locked = document.pointerLockElement === canvas;

        if (!locked && this.cursorMode() === "locked") {
          this.onPointerLockLost?.();
        }
      },
      { signal },
    );

    // === Click to Lock Pointer ===
    canvas.addEventListener(
      "click",
      () => {
        this.requestPointerLock();
      },
      { signal },
    );
  }

  //   === Input State Methods ===
  pressed(action: Action): boolean {
    return this.state[action].pressed;
  }
  justPressed(action: Action): boolean {
    return this.state[action].justPressed;
  }
  justReleased(action: Action): boolean {
    return this.state[action].justReleased;
  }
  value(action: Action): number {
    return this.state[action].value;
  }

  /** Can be used for two opposing actions */
  axis(negative: Action, positive: Action): number {
    return this.state[positive].value - this.state[negative].value;
  }

  vector(
    forward: Action,
    backward: Action,
    left: Action,
    right: Action,
    out: Vec2,
  ): Vec2 {
    let x = this.axis(left, right);
    let y = this.axis(backward, forward);
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    out.x = x;
    out.y = y;
    return out;
  }

  look(
    out: Vec2,
    dt: number,
    mouseSensitivity = 0.0022,
    stickRadiansPerSecond = 3,
  ): Vec2 {
    const curve = (v: number) => Math.sign(v) * v * v; // finer control near the center of the stick
    out.x =
      this.lookDelta.x * mouseSensitivity +
      curve(this.axis("lookLeft", "lookRight")) * stickRadiansPerSecond * dt;
    out.y =
      this.lookDelta.y * mouseSensitivity +
      curve(this.axis("lookUp", "lookDown")) * stickRadiansPerSecond * dt;
    return out;
  }

  //   === Rebinding Methods ===
  private updateCapture(): void {
    const capture = this.capture;
    if (!capture) return;

    // Skip the first frame to avoid capturing the key that triggered the capture
    if (!capture.armed) {
      capture.armed = true;
      return;
    }

    for (const [id, value] of this.curr) {
      if (value >= PRESS_THRESHOLD && !this.wasDown(id)) {
        this.capture = null;
        capture.resolve(id === "Key:Escape" ? null : id);
        return;
      }
    }
  }

  //   === Pointer Lock Methods ===
  get pointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  requestPointerLock(): void {
    if (this.cursorMode() !== "locked" || this.pointerLocked) return;

    try {
      void Promise.resolve(this.canvas.requestPointerLock()).catch(() => {
        // User Escaped
      });
    } catch {
      // Older Browsers
      Logger.warn("Pointer Lock API is not supported in this browser.");
    }
  }

  private cursorMode(): "locked" | "free" {
    return this.top?.cursor ?? "free";
  }

  private syncPointerLock(): void {
    if (this.cursorMode() === "free" && this.pointerLocked)
      document.exitPointerLock();
  }

  // === Debug ===
  snapshot() {
    // Return active key press and the action caused by it
    const active: Array<{
      action: Action;
      value: number;
      pressed: boolean;
      bindings: readonly ControlId[];
      activeControls: readonly ControlId[];
    }> = [];
    for (const action of ACTIONS) {
      const state = this.state[action];
      if (state.pressed) {
        active.push({
          action,
          value: state.value,
          pressed: state.pressed,
          bindings: this.bindings.get(action),
          activeControls: state.activeControls,
        });
      }
    }
    return active;
  }

  // === Destroy ===
  destroy(): void {
    this.ac.abort();

    for (const device of this.devices) device.destroy();
  }
}
