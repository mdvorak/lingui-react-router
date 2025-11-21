import Negotiator from "negotiator"
import "../server/assert-server"

/**
 * Parse the Accept-Language header and return the best language match.
 *
 * Uses the `negotiator` library.
 *
 * @param headers - HTTP request headers.
 * @param locales - List of supported locales.
 * @returns The best matching locale or undefined if no match is found.
 */
export function negotiateClientLocale(
  headers: Record<string, string | undefined>,
  locales: readonly string[],
): string | undefined {
  const accept = new Negotiator({ headers }).languages(locales.slice())
  return accept[0]
}
