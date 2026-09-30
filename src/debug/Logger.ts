export const enum LogLevel {
  VERBOSE = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
};

export interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  timestamp: number; // performance.now()
  data?: unknown;
}

export interface LogSink {
  write(entry: LogEntry): void;
}

// === Fatal Engine Error ===

export class FatalEngineError extends Error {
  constructor(message: string) {
    super(`[FATAL] ${message}`);
    this.name = "FatalEngineError";
  }
}

// === Crash Reporter ===

const CRASH_LOG_SIZE = 200;
export const crashLogBuffer: LogEntry[] = [];

function appendToCrashLog(entry: LogEntry): void {
  if (crashLogBuffer.length >= CRASH_LOG_SIZE) crashLogBuffer.shift();
  crashLogBuffer.push(entry);
}

// === SINKS ===

export class ConsoleLogSink implements LogSink {
  write(entry: LogEntry): void {
    const prefix = `[${entry.tag}][${entry.timestamp.toFixed(1)}ms]`;

    switch (entry.level) {
      case LogLevel.VERBOSE:
        console.debug(prefix, entry.message, entry.data ?? "");
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data ?? "");
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data ?? "");
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data ?? "");
        break;
      case LogLevel.FATAL:
        console.error(
          "%c" + prefix,
          "color:red;font-weight:bold",
          entry.message,
          entry.data ?? "",
        );
        break;
    }
  }
}

// === Logger ===

export class Logger {
  private static _level: LogLevel = __DEV__ ? LogLevel.VERBOSE : LogLevel.WARN;
  private static _sinks: LogSink[] = [new ConsoleLogSink()];

  static get level(): LogLevel {
    return this._level;
  }
  static setLevel(l: LogLevel): void {
    this._level = l;
  }

  static addSink(sink: LogSink): void {
    this._sinks.push(sink);
  }
  static removeSink(sink: LogSink): void {
    const i = this._sinks.indexOf(sink);
    if (i !== -1) this._sinks.splice(i, 1);
  }

  static verbose(tag: string, message: string, data?: unknown): void {
    if (this._level <= LogLevel.VERBOSE)
      this._emit(LogLevel.VERBOSE, tag, message, data);
  }

  static info(message: string, data?: unknown): void {
    if (this._level <= LogLevel.INFO)
      this._emit(LogLevel.INFO, "INFO", message, data);
  }

  static warn(message: string, data?: unknown): void {
    if (this._level <= LogLevel.WARN)
      this._emit(LogLevel.WARN, "WARN", message, data);
  }

  static error(message: string, data?: unknown): void {
    if (this._level <= LogLevel.ERROR)
      this._emit(LogLevel.ERROR, "ERROR", message, data);
  }

  static fatal(message: string, data?: unknown): never {
    this._emit(LogLevel.FATAL, "FATAL", message, data);
    (
      globalThis as unknown as {
        __CrashCapture?: (m: string, d?: unknown) => void;
      }
    ).__CrashCapture?.(message, data);
    throw new FatalEngineError(message);
  }

  private static _emit(
    level: LogLevel,
    tag: string,
    message: string,
    data?: unknown,
  ): void {
    const entry: LogEntry = {
      level,
      tag,
      message,
      timestamp: performance.now(),
      data,
    };
    appendToCrashLog(entry);
    for (const sink of this._sinks) {
      try {
        sink.write(entry);
      } catch {
        /* Sink failures must not recursively crash the logger */
      }
    }
  }
}