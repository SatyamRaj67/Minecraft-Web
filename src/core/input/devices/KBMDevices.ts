import { Logger } from "../../../debug/Logger";
import type { ControlId } from "../../game/Actions";
import { BROWSER_KEYS, type InputDevice } from "./Devices";

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

    Logger.info("Destroyed KBMDevice!")
  }
}
