import { Logger } from "./Logger";

export function assert(
  condition: boolean,
  message: string,
  context?: Record<string, unknown>,
): asserts condition {
  if (!condition) {
    const err = new Error(message);
    Logger.fatal(`ASSERT FAILED: ${message}`, {
      context,
      stack: err.stack,
    });
  }
}

export function assertWarn(
  condition: boolean,
  message: string,
  context?: Record<string, unknown>,
): void {
  if (!condition) {
    const err = new Error(message);
    Logger.warn(`ASSERT_WARN: ${message}`, {
      context,
      stack: err.stack,
    });
  }
}

export function assertDefined<T>(
  value: T | undefined | null,
  message: string,
  context?: Record<string, unknown>,
): T {
  if (value == null) {
    const err = new Error(message);
    Logger.fatal(`ASSERT_DEFINED FAILED: ${message}`, {
      context,
      stack: err.stack,
    });
  }
  return value as T;
}

/**
 * assertUnreachable  — exhaustive switch/union check.
 *
 *  * Usage:
 *   switch (event.type) {
 *     case 'A': ...; break;
 *     case 'B': ...; break;
 *     default:  assertUnreachable(event.type);
 *   }
 *
 * TypeScript will error at compile time if a case is unhandled.
 */
export function assertUnreachable(value: never): never {
  Logger.fatal("assertUnreachable: unexpected value", { value });
}

/**
 * GPU-specific assertion: assert that a GPUBuffer / GPUTexture / pipeline
 * was successfully created (not null/destroyed).
 */
export function assertGpu<T extends object>(
  resource: T | null | undefined,
  label: string,
): T {
  if (!resource) {
    Logger.fatal(`GPU resource creation failed: ${label}`);
  }
  return resource as T;
}
