/** A unique identifier for a control.
 * * "Key:KeyW", "Mouse:0", "Pad:Button5", "Pad:Axis1+"
 */
export type ControlId = string;

export const ACTIONS = [
  // === Movement ===
  "moveForward",
  "moveBackward",
  "moveLeft",
  "moveRight",
  "jump",
  "sprint",
  "sneak",
  // === Camera ===
  "lookUp",
  "lookDown",
  "lookLeft",
  "lookRight",
  // === Actions ===
  "attack",
  "use",
  "drop",
  "inventory",
  "chat",
  "pause",
  // === Hotbar ===
  "hotbarPrev",
  "hotbarNext",
  // === Menu ===
  "uiUp",
  "uiDown",
  "uiLeft",
  "uiRight",
  "uiConfirm",
  "uiCancel",
  // == Debug ===
  "debug",
  "screenshot",
] as const;

export type Action = (typeof ACTIONS)[number];

/**
 * Default bindings for actions. Each action can have multiple bindings, and the first binding that is pressed will trigger the action.
 * 0=A 1=B 2=X 3=Y 4=LB 5=RB 6=LT 7=RT 8=View 9=Menu 10=L3 11=R3 12-15=D-pad U/D/L/R
 * Pad axes: 0/1 = left stick X/Y, 2/3 = right stick X/Y ("-" = left/up, "+" = right/down).
 */
export const DEFAULT_BINDINGS: Record<Action, readonly ControlId[]> = {
  // === Movement ===
  moveForward: ["Key:KeyW", "Key:ArrowUp", "Pad:Axis1-"],
  moveBackward: ["Key:KeyS", "Key:ArrowDown", "Pad:Axis1+"],
  moveLeft: ["Key:KeyA", "Key:ArrowLeft", "Pad:Axis0-"],
  moveRight: ["Key:KeyD", "Key:ArrowRight", "Pad:Axis0+"],
  jump: ["Key:Space", "Pad:Button0"],
  sprint: ["Key:ControlLeft", "Pad:Button10"],
  sneak: ["Key:ShiftLeft", "Pad:Button11"],
  //   === Camera ===
  lookUp: ["Pad:Axis3-"],
  lookDown: ["Pad:Axis3+"],
  lookLeft: ["Pad:Axis2-"],
  lookRight: ["Pad:Axis2+"],
  //   === Actions ===
  attack: ["Mouse:0", "Pad:Button7"],
  use: ["Mouse:2", "Pad:Button6"],
  drop: ["Key:KeyQ", "Pad:Button2"],
  inventory: ["Key:KeyE", "Pad:Button3"],
  chat: ["Key:KeyT", "Pad:Button8"],
  pause: ["Key:Escape", "Pad:Button9"],
  //   === Hotbar ===
  hotbarPrev: ["Mouse:WheelUp", "Pad:Button4"],
  hotbarNext: ["Mouse:WheelDown", "Pad:Button5"],
  //   === Menu ===
  uiUp: ["Key:ArrowUp", "Pad:Button12", "Pad:Axis1-"],
  uiDown: ["Key:ArrowDown", "Pad:Button13", "Pad:Axis1+"],
  uiLeft: ["Key:ArrowLeft", "Pad:Button14", "Pad:Axis0-"],
  uiRight: ["Key:ArrowRight", "Pad:Button15", "Pad:Axis0+"],
  uiConfirm: ["Key:Enter", "Pad:Button0"],
  uiCancel: ["Key:Escape", "Pad:Button1"],
  //   === Debug ===
  debug: ["Key:F3"],
  screenshot: ["Key:F2"],
};

export interface InputContext {
  readonly id: string;
  readonly actions: readonly Action[];

  /**
   * 'all' - Blocks all input from lower contexts.
   * 'bound' - Blocks only input that is bound to an action in this context.
   */
  readonly blocking: "all" | "bound";

  readonly cursor: "locked" | "free";
}

export const GameplayContext: InputContext = {
  id: "gameplay",
  blocking: "all",
  cursor: "locked",
  actions: [
    "moveForward",
    "moveBackward",
    "moveLeft",
    "moveRight",
    "lookLeft",
    "lookRight",
    "lookUp",
    "lookDown",
    "jump",
    "sneak",
    "sprint",
    "attack",
    "use",
    "hotbarPrev",
    "hotbarNext",
    "inventory",
    "pause",
    "debug",
    "screenshot",
  ],
};

export const InventoryContext: InputContext = {
  id: "inventory",
  blocking: "all",
  cursor: "free",
  actions: [
    "uiUp",
    "uiDown",
    "uiLeft",
    "uiRight",
    "uiConfirm",
    "uiCancel",
    "inventory",
  ],
};

export const PauseContext: InputContext = {
  id: "pause",
  blocking: "all",
  cursor: "free",
  actions: ["uiUp", "uiDown", "uiConfirm", "uiCancel", "pause"],
};
