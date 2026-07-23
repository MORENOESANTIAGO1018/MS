import { redact } from "./redact";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

/**
 * Logger estruturado com redacao automatica (regra inegociavel #7).
 * Nunca usar console.log diretamente em codigo que manipule dados de cliente —
 * usar sempre logger.info/warn/error/debug daqui.
 */
function emit(level: LogLevel, message: string, fields?: LogFields): void {
  const safeFields = fields ? redact(fields) : undefined;
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(safeFields && typeof safeFields === "object" ? safeFields : {}),
  };

  const serialized = JSON.stringify(entry);

  switch (level) {
    case "error":
      // eslint-disable-next-line no-console -- unico ponto autorizado de escrita
      console.error(serialized);
      break;
    case "warn":
      // eslint-disable-next-line no-console
      console.warn(serialized);
      break;
    default:
      // eslint-disable-next-line no-console
      console.log(serialized);
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};
