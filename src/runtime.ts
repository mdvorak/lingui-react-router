import type { Messages } from "@lingui/core"
import * as loader from "virtual:lingui-router-loader"
import { type LinguiRouterConfig } from "./config"

/**
 * Runtime configuration and utilities for Lingui React Router.
 */
export const config: LinguiRouterConfig = loader.config
/**
 * The default locale used when no locale can be detected.
 */
export const defaultLocale: string = loader.config.defaultLocale
/**
 * Mapping of locale codes to message catalog locations.
 */
export const localeMapping: Record<string, string> | undefined = loader.localeMapping
/**
 * Functions to load message catalogs for each supported locale.
 */
export const localeLoaders: Record<string, () => Promise<{ messages: Messages }>> =
  loader.localeLoaders
/**
 * A set of all supported locales.
 */
export const supportedLocales = new Set<string>(loader.config.locales)

/**
 * Loads the message catalog for the specified locale.
 *
 * Calling this makes sense only on the client, on the server it returns preloaded catalogs.
 *
 * @param locale - The locale code to load the catalog for.
 * @returns A promise that resolves to the message catalog.
 * @throws An error if the locale is not supported.
 */
export async function loadLocaleCatalog(locale: string): Promise<Messages> {
  const loaderFunc = loader.localeLoaders[locale]
  if (!loaderFunc) {
    throw new Error(`Locale ${locale} is not supported`)
  }

  const mod = await loaderFunc()
  return mod.messages
}
