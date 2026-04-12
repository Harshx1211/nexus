/**
 * @file lib/logger.ts
 * @description Centralised logging utility for the NEXUS platform.
 *
 * All internal debug / info / warn / error messages must go through this
 * module rather than calling `console.*` directly in component files.
 * In production builds the logger is completely silent, keeping the
 * browser console free of internal diagnostics for end-users.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("Auth", "User signed in", { userId });
 *   logger.error("Sessions", "Fetch failed", error);
 */

/** Whether the application is running in development mode. */
const IS_DEV = process.env.NODE_ENV === "development";

/** Colour prefixes for each log level (terminal ANSI — no-op in browser). */
const PREFIX = {
    info:  "[INFO ]",
    warn:  "[WARN ]",
    error: "[ERROR]",
    debug: "[DEBUG]",
} as const;

type LogLevel = keyof typeof PREFIX;

/**
 * Outputs a formatted log line only when in development mode.
 *
 * @param level   - Severity level.
 * @param context - The feature or component producing this log (e.g. "Auth").
 * @param message - Human-readable description of the event.
 * @param data    - Optional additional data to attach to the log entry.
 */
function log(
    level: LogLevel,
    context: string,
    message: string,
    data?: unknown,
): void {
    if (!IS_DEV) return;

    const tag = `${PREFIX[level]} [${context}]`;

    switch (level) {
        case "error":
             
            if (data !== undefined) console.error(tag, message, data);
            else console.error(tag, message);
            break;
        case "warn":
             
            if (data !== undefined) console.warn(tag, message, data);
            else console.warn(tag, message);
            break;
        case "debug":
             
            if (data !== undefined) console.debug(tag, message, data);
            else console.debug(tag, message);
            break;
        default:
             
            if (data !== undefined) console.log(tag, message, data);
            else console.log(tag, message);
    }
}

/** Public logger interface exposed to the rest of the application. */
export const logger = {
    /** Logs a general informational message. */
    info:  (context: string, message: string, data?: unknown) => log("info",  context, message, data),
    /** Logs a recoverable warning — something unexpected but not fatal. */
    warn:  (context: string, message: string, data?: unknown) => log("warn",  context, message, data),
    /** Logs an error — operation could not complete successfully. */
    error: (context: string, message: string, data?: unknown) => log("error", context, message, data),
    /** Logs verbose debug information, useful during active development. */
    debug: (context: string, message: string, data?: unknown) => log("debug", context, message, data),
} as const;
