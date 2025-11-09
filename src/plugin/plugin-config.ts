import type { LinguiConfigNormalized } from "@lingui/conf"
import type { RedirectBehavior } from "../config"

export const PLUGIN_NAME = "lingui-react-router"
export const VIRTUAL_LOCALE_PREFIX = "virtual:lingui-router-locale-"
export const VIRTUAL_MANIFEST = "virtual:lingui-router-manifest"
export const VIRTUAL_LOADER = "virtual:lingui-router-loader"

/**
 * Full configuration for the Lingui React Router plugin.
 */
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
   * - "auto": Redirect to a detected locale only if it's not the default locale.
   * - "always": Always redirect to a detected locale, even if it's the default locale.
   * - "never": Never redirect to a detected locale.
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
   * Whether to enable default locale mapping according to CLDR data.
   *
   * When set to false, only identity mappings and custom localeMapping entries will be included,
   * without automatic CLDR fallbacks.
   *
   * For example, mapping "en-GB" to "en", "pt-BR" to "pt", etc.
   * Defaults to true.
   */
  defaultLocaleMapping: boolean
  /**
   * Name of the URL parameter used to specify the locale.
   * Defaults to "locale", e.g. `"/:locale?/*"`.
   */
  localeParamName: string
  /**
   * Explicit Lingui configuration to use. When not set,
   * the plugin will load the Lingui config itself.
   *
   * Set this only if you want to override the Lingui config loaded by the plugin.
   */
  linguiConfig: Readonly<LinguiConfigNormalized>
  /**
   * Default locale to use when no locale can be detected. Must be included in `locales`.
   *
   * By default, the first locale from `locales` is used.
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
  /**
   * Whether to optimize client-side locale bundles by replacing `Object.assign` calls
   * with direct catalog objects in generated code. This reduces runtime overhead and
   * bundle size by inlining catalog data instead of merging at runtime.
   *
   * This affects only client-side generated catalog files. Defaults to true.
   */
  optimizeLocaleBundles: boolean
}

/**
 * Configuration passed from the consumer to wire up catalog loading and path exclusions.
 */
export type LinguiRouterPluginConfig = Partial<LinguiRouterPluginConfigFull>

/**
 * Convenience function to define the Lingui React Router plugin configuration.
 *
 * This function is not needed when passing config to the `linguiRouterPlugin` function directly.
 *
 * @param config - Partial configuration for the Lingui React Router plugin.
 * @returns The provided configuration object.
 * @example
 * ```ts
 * import { defineLinguiRouterConfig } from "lingui-react-router/plugin"
 *
 * export default defineLinguiRouterConfig({
 *   exclude: ["api"],
 *   redirect: "auto",
 * })
 * ```
 */
export function defineLinguiRouterConfig(
  config: LinguiRouterPluginConfig,
): LinguiRouterPluginConfig {
  return config
}

/**
 * Default configuration for the Lingui React Router plugin.
 *
 * Missing `linguiConfig`. `locales` and `pseudoLocale` will be loaded from the Lingui config.
 */
export const pluginConfigDefaults = {
  defaultLocale: "und",
  exclude: [],
  detectLocale: true,
  redirect: "auto" as RedirectBehavior,
  localeMapping: {} as Record<string, string>,
  defaultLocaleMapping: true,
  localeParamName: "locale",
  optimizeLocaleBundles: true,
}
