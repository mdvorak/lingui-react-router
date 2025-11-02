/**
 * Runtime configuration for locale detection, routing, and fallbacks.
 */
export type LinguiRouterConfig = {
  /**
   * Supported locales in priority order (e.g., ["en", "it"]).
   * Uses BCP 47 codes or project-specific variants.
   */
  locales: string[]
  /**
   * Default locale used when no locale can be detected.
   * Should be included in `locales`.
   */
  defaultLocale: string
  /**
   * Locale code used for pseudo-localization during development.
   */
  pseudoLocale?: string
  /**
   * One or more top-level path segments that must not be treated as locales.
   * For example, ["api"].
   */
  exclude: string[]
  /**
   * Redirect policy when a locale is detected.
   */
  redirect: RedirectBehavior
  /**
   * Current execution environment.
   */
  runtimeEnv: "client" | "server"
  /**
   * Locale path parameter name (e.g., "locale" for `/:locale?/*`).
   */
  localeParamName: string
}

/**
 * Maps locale codes to message catalog locations.
 *
 * Keys are locale codes (e.g., "en", "it").
 * Values are URLs or import paths to catalogs (e.g., "/locales/en/messages.po").
 */
export type LocaleManifest = Record<string, string>

/**
 * Controls redirect behavior when a locale is detected.
 *
 * - "auto": Redirect only if the detected locale differs from the default.
 * - "always": Always redirect to the detected locale.
 * - "never": Never redirect based on the detected locale.
 */
export type RedirectBehavior = "auto" | "always" | "never"

/**
 * Normalizes a locale code by converting to lowercase and replacing underscores with hyphens.
 *
 * This is an internal function, it is not exposed in the public API.
 *
 * @param locale - The locale code to normalize (e.g., "en_US").
 * @returns The normalized locale code (e.g., "en-us").
 */
export function normalizeLocaleKey(locale: string): string {
  return locale.toLowerCase().replaceAll("_", "-")
}
