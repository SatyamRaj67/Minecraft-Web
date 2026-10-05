import { Logger } from "../../../debug/Logger";
import type { ControlId } from "../../game/Actions";
import type { InputDevice } from "./Devices";

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

  destroy(): void {
    Logger.info("Destroyed Gamepad Device!")
  }
}
