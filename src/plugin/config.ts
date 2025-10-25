import type { RedirectBehavior } from "../config"

export type LinguiRouterPluginConfigFull = {
  /**
   * One or more root-level path prefixes that should NOT be treated as locales.
   * For example, ["api"].
   */
  exclude: string | string[]
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
}

/**
 * Configuration passed from the consumer to wire up catalog loading and path exclusions.
 */
export type LinguiRouterPluginConfig = Partial<LinguiRouterPluginConfigFull>
