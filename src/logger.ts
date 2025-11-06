import * as loader from "virtual:lingui-router-loader"

/**
 * Logger interface for this library.
 */
export type Logger = {
  debug: (...args: any[]) => void
  log: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
}

/**
 * Logger instance to be used by the library.
 *
 * If undefined, no logging will be performed. Use `logger?.log` instead of `logger.log`.
 */
export const logger: Logger | undefined = loader.$logger
