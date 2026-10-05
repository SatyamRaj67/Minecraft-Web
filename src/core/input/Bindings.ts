import { Logger } from "../../debug/Logger";
import {
  ACTIONS,
  DEFAULT_BINDINGS,
  type Action,
  type ControlId,
} from "../game/Actions";

const STORAGE_KEY = "MINECRAFT_WEB:keybind.v1";

export function deviceGroup(id: ControlId): "pad" | "kbm" {
  return id.startsWith("Pad:") ? "pad" : "kbm";
}

export class Bindings {
  private readonly current = {} as Record<Action, ControlId[]>;

  constructor() {
    this.applyDefaults();
    this.load();
  }

  get(action: Action): readonly ControlId[] {
    return this.current[action];
  }

  rebind(action: Action, control: ControlId): void {
    const others = this.current[action].filter(
      (c) => deviceGroup(c) !== deviceGroup(control),
    );
    this.current[action] = [control, ...others];
    Logger.info(`Rebound ${action} to ${control}.`);
    this.save();
  }

  unbind(action: Action, control: ControlId): void {
    this.current[action] = this.current[action].filter((c) => c !== control);
    Logger.info(`Unbound ${control} from action ${action}.`);
    this.save();
  }

  reset(): void {
    this.applyDefaults();
    Logger.info("Resetting key bindings to defaults.");
    this.save();
  }

  //   === Private Methods ===
  private applyDefaults(): void {
    for (const action of ACTIONS)
      this.current[action] = [...DEFAULT_BINDINGS[action]];
  }

  private save(): void {
    const overrides: Partial<Record<Action, ControlId[]>> = {};

    for (const action of ACTIONS) {
      const currentBindings = this.current[action];
      const defaultBindings = DEFAULT_BINDINGS[action];

      if (
        currentBindings.length !== defaultBindings.length ||
        currentBindings.some(
          (current, index) => current !== defaultBindings[index],
        )
      ) {
        overrides[action] = currentBindings;
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      Logger.info("Saved key bindings to localStorage successfully.");
    } catch (error) {
      Logger.warn("Failed to save key bindings to localStorage:", error);
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const data: unknown = JSON.parse(raw);
      if (typeof data !== "object" || data === null) return;

      for (const action of ACTIONS) {
        const value = (data as Record<string, unknown>)[action];
        if (!Array.isArray(value)) continue;
        if (!value.every((v) => typeof v === "string")) continue;

        this.current[action] = value as ControlId[];
      }
    } catch {
      Logger.warn(
        "Corrupted key bindings found in localStorage, What the fuck are you doing in life.",
      );
    }
  }
}
