import type { FallbackLocales } from "@lingui/conf"

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
   * Mapping of locales to their fallback locales used for message resolution.
   */
  fallbackLocales: FallbackLocales
  /**
   * Locales that are in defined in the fallbackLocales but not in the primary locales list.
   */
  secondaryLocales: Record<string, string>
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
  /** Detected locale code, if present. */
  locale?: string
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

/**
 * Generate a mapping of secondary locales to their primary fallback locales.
 *
 * @param locales - Primary supported locales in priority order.
 * @param fallbackLocales - Optional mapping of locales to their fallbacks. Only its keys are considered; `"default"` is ignored.
 * @returns A mapping of virtual locales to their primary fallback locales.
 *
 * @example
 * // returns { fr: "en" }
 * getSecondaryLocales(["en", "it"], { default: "en", fr: ["en"] })
 */
export function getSecondaryLocales(
  locales: string[],
  fallbackLocales?: FallbackLocales | false
): Record<string, string> {
  if (!fallbackLocales) {
    return {}
  }

  // Build a map of secondary locales, mapping to their primary fallback
  const primarySet = new Set(locales)
  const secondaryLocales: Record<string, string> = {}
  const defaultLocale = fallbackLocales.default as string | undefined // Can never be an array

  for (const [locale, fb] of Object.entries(fallbackLocales)) {
    if (locale === "default" || primarySet.has(locale)) continue

    const fallbacks = Array.isArray(fb) ? fb : [fb]
    const primary = fallbacks.find(f => primarySet.has(f)) || defaultLocale
    if (primary) {
      secondaryLocales[locale] = primary
    }
  }

  return secondaryLocales
}
