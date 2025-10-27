import type { LinguiConfigNormalized } from "@lingui/conf"
import type { RedirectBehavior } from "../config"

export type LinguiRouterPluginConfigFull = {
  /**
   * One or more root-level path prefixes that should NOT be treated as locales.
   * For example, ["api"].
   */
  exclude: string[]
  /**
   * Whether to detect locale from the Accept-Language header.
   * Defaults to true.
   */
  detectLocale: boolean
  /**
   * Redirect behavior for detected locales.
   *
   * - "auto": Redirect to detected locale only if it's not the default locale.
   * - "always": Always redirect to detected locale, even if it's the default locale.
   * - "never": Never redirect to detected locale.
   */
  redirect: RedirectBehavior
  /**
   * Mapping of locale codes to fallback locale codes, used for locale detection and redirection.
   *
   * For example, `{ "fr-CA": "fr", "es-MX": "es" }`,
   * where in lingui config are `["fr", "es"]` only.
   *
   * It's also possible to map to a different locale, e.g. `{ "de": "en" }`.
   */
  localeMapping: Record<string, string>
  /**
   * Name of the URL parameter used to specify the locale.
   * Defaults to "locale", e.g. `"/:locale?/*"`.
   */
  localeParamName: string
  /**
   * Explicit Lingui configuration to use.
   *
   * If not provided, the plugin will attempt to load the Lingui config from the project root.
   */
  linguiConfig: Readonly<LinguiConfigNormalized>
  /**
   * Default locale to use when no locale can be detected. Must be included in `locales`.
   *
   * By default, first locale from `locales` is used.
   */
  defaultLocale: string
  /**
   * Override locales list defined in Lingui config.
   *
   * Normally, you should not need to set this.
   */
  locales: string[]
  /**
   * Overrides the pseudo-locale defined in Lingui config.
   *
   * Normally, you should not need to set this.
   */
  pseudoLocale?: string
}

/**
 * Configuration passed from the consumer to wire up catalog loading and path exclusions.
 */
export type LinguiRouterPluginConfig = Partial<LinguiRouterPluginConfigFull>
