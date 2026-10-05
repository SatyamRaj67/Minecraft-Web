import type { ControlId } from "../../game/Actions";

/** Keys that can be problematic because of browser being an asshole */
export const BROWSER_KEYS = new Set([
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

export interface InputDevice {
  poll(out: Map<ControlId, number>): void;
  destroy(): void;
}
// TODO: Implement Typing Inputs to ignore browser keys and handle text input properly. For now, we just ignore them.
