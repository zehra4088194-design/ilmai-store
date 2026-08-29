/**
 * Single logging entry point. See SECURITY.md §7 for what must never be
 * logged (secrets, tokens, raw payment payloads, full customer PII).
 *
 * This is a minimal console-based implementation. Codex can swap the
 * transport (e.g. structured JSON to stdout for Coolify log aggregation)
 * without changing call sites, since everything goes through `logger`.
 */

type LogFields = Record<string, string | number | boolean | null | undefined>;

function format(level: string, message: string, fields?: LogFields) {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  };
}

export const logger = {
  info(message: string, fields?: LogFields) {
    console.log(JSON.stringify(format("info", message, fields)));
  },
  warn(message: string, fields?: LogFields) {
    console.warn(JSON.stringify(format("warn", message, fields)));
  },
  error(message: string, fields?: LogFields) {
    console.error(JSON.stringify(format("error", message, fields)));
  },
  /** For payment/webhook events — log identifiers and outcomes, never raw payloads. */
  event(eventName: string, fields?: LogFields) {
    console.log(JSON.stringify(format("event", eventName, fields)));
  },
};
