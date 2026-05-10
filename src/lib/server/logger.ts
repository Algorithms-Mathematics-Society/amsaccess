import { getSlowApiThresholdMs } from "@/lib/server/env";

type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, string | number | boolean | null | undefined>;

function writeLog(level: LogLevel, event: string, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    time: new Date().toISOString(),
    ...fields
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info(event: string, fields?: LogFields) {
    writeLog("info", event, fields);
  },
  warn(event: string, fields?: LogFields) {
    writeLog("warn", event, fields);
  },
  error(event: string, fields?: LogFields) {
    writeLog("error", event, fields);
  }
};

export async function withApiLogging<T>(
  name: string,
  fn: () => Promise<T>,
  fields: LogFields = {}
) {
  const started = Date.now();

  try {
    const result = await fn();
    const durationMs = Date.now() - started;
    if (durationMs >= getSlowApiThresholdMs()) {
      logger.warn("slow_api", { name, durationMs, ...fields });
    }
    return result;
  } catch (error) {
    const durationMs = Date.now() - started;
    logger.error("api_error", {
      name,
      durationMs,
      message: error instanceof Error ? error.message : "Unknown error",
      ...fields
    });
    throw error;
  }
}
