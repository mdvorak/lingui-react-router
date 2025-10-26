import type { Messages } from "@lingui/core"
import * as loader from "virtual:lingui-router-loader"
import type { LinguiRouterConfig } from "./config"

export const config: LinguiRouterConfig = loader.config
export const defaultLocale = loader.config.defaultLocale
export const localeLoaders: Record<string, () => Promise<{ messages: Messages }>> =
  loader.localeLoaders
/**
 * A set of all supported locales (primary and secondary).
 */
export const allLocales = new Set<string>([
  ...loader.config.locales,
  ...Object.keys(loader.config.secondaryLocales),
])

export async function loadLocaleCatalog(locale: string): Promise<Messages> {
  const loaderFunc = loader.localeLoaders[locale]
  if (!loaderFunc) {
    throw new Error(`Locale ${locale} is not supported`)
  }

  const mod = await loaderFunc()
  return mod.messages
}

const localeNamesMap = new Map<string, string>(
  Array.from(allLocales).map(locale => [normalizationKey(locale), locale])
)

function normalizationKey(locale: string): string {
  return locale.toLowerCase().replace(/_/g, "-")
}

/**
 * Normalize a locale code to its canonical form.
 * Only defined locales are supported, others are returned as-is.
 *
 * @example
 * normalizeLocale("en-US") // "en-US"
 * normalizeLocale("EN_us") // "en-US"
 * normalizeLocale("unknown-LOCALE") // "unknown-LOCALE"
 *
 * @param locale - The locale code to normalize.
 * @returns The normalized locale code.
 */
export function normalizeLocale(locale: string): string {
  return localeNamesMap.get(normalizationKey(locale)) ?? locale
}
