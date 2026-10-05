import {
  GameplayContext,
  InventoryContext,
  PauseContext,
} from "../input/Actions";
import type { InputManager } from "../input/InputManager";

const LOOK_LOCK = 0.02;

// === Player Movement Speeds ===
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 5.6;
const SNEAK_SPEED = 1.3;

// === Player Jumping ===
const JUMP_VELOCITY = 8;

const GRAVITY = 25;

export class Gameplay {
  readonly player = {
    x: 0,
    y: 0,
    z: 0,
    vy: 0,
    yaw: 0,
    pitch: 0,
    onGround: true,
  };

  private readonly input: InputManager;
  private mode: "gameplay" | "pause" | "inventory" = "gameplay";

  private readonly move = { x: 0, y: 0 };
  private readonly look = { x: 0, y: 0 };

  constructor(input: InputManager) {
    this.input = input;
  }

  //   === Update Methods ===
  update(dt: number): void {
    const { input, player: p } = this;

    if (this.mode === "pause") {
      if (input.justPressed("pause")) this.closeOverlay();
      return;
    }
    if (this.mode === "inventory") {
      if (input.justPressed("inventory")) this.closeOverlay();
      return;
    }

    if (input.justPressed("pause")) return this.openPause();
    if (input.justPressed("inventory")) return this.openInventory();

    // === Camera Movement ===
    input.look(this.look, dt);
    p.yaw += this.look.x;
    p.pitch = Math.max(
      -(Math.PI / 2) + LOOK_LOCK,
      Math.min(Math.PI / 2 - LOOK_LOCK),
      p.pitch - this.look.y,
    );

    // === Player Movement ===
    input.vector(
      "moveForward",
      "moveBackward",
      "moveLeft",
      "moveRight",
      this.move,
    );
    const speed = input.pressed("sprint")
      ? SPRINT_SPEED
      : input.pressed("sneak")
        ? SNEAK_SPEED
        : WALK_SPEED;

    const fx = Math.sin(p.yaw),
      fz = -Math.cos(p.yaw); // Forward vector
    const rx = Math.cos(p.yaw),
      rz = Math.sin(p.yaw); // Right vector

    p.x += (fx * this.move.y + rx * this.move.x) * speed * dt;
    p.z += (fz * this.move.y + rz * this.move.x) * speed * dt;

    // == Jumping ===
    if (input.justPressed("jump") && p.onGround) {
      p.vy = JUMP_VELOCITY;
      p.onGround = false;
    }
    p.vy -= GRAVITY * dt; // Gravity
    p.y += p.vy * dt;

    if (p.y <= 0) {
      // Ground collision
      p.y = 0;
      p.vy = 0;
      p.onGround = true;
    }

    // === Hotbar Switching ===
    // if (input.justPressed("hotbarNext"))
    //   this.hotbarIndex = (this.hotbarIndex + 1) % 9;
    // if (input.justPressed("hotbarPrev"))
    //   this.hotbarIndex = (this.hotbarIndex + 8) % 9;

    // === Action Handling ===
    if (input.pressed("attack")) {
      // this.attack();
    }
    if (input.justPressed("use")) {
      // this.use();
    }

  }

  //   === Gameplay Actions ===
  openPause(): void {
    if (this.mode === "pause") return;
    this.input.remove(GameplayContext);
    this.input.remove(InventoryContext);
    this.input.push(PauseContext);
    this.mode = "pause";
  }

  openInventory(): void {
    if (this.mode === "inventory") return;
    this.input.remove(GameplayContext);
    this.input.remove(PauseContext);
    this.input.push(InventoryContext);
    this.mode = "inventory";
  }

  private closeOverlay(): void {
    this.input.remove(PauseContext);
    this.input.remove(InventoryContext);
    this.input.push(GameplayContext);
    this.mode = "gameplay";
  }

  //   === Camera Methods ===
}
