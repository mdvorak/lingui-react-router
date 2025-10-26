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
   * Locale code of the source (authoring) language.
   */
  sourceLocale?: string
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
}

/**
 * Result of extracting locale information from a URL path.
 */
export type PathLocale = {
  /** Remainder of the path after removing the locale or excluded segment. */
  pathname: string
  /** Detected locale code, if present, in its canonical form. */
  locale?: string
  /** Detected raw locale segment from the URL, before normalization. */
  rawLocale?: string
  /** True if the first segment matched an excluded prefix, not a locale. */
  excluded: boolean
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
