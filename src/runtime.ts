import type { Messages } from "@lingui/core"
import * as loader from "virtual:lingui-router-loader"
import { type LinguiRouterConfig } from "./config"

export const config: LinguiRouterConfig = loader.config
export const defaultLocale: string = loader.config.defaultLocale
export const localeMapping: Record<string, string> | undefined = loader.localeMapping
export const localeLoaders: Record<string, () => Promise<{ messages: Messages }>> =
  loader.localeLoaders
/**
 * A set of all supported locales.
 */
export const supportedLocales = new Set<string>(loader.config.locales)

export async function loadLocaleCatalog(locale: string): Promise<Messages> {
  const loaderFunc = loader.localeLoaders[locale]
  if (!loaderFunc) {
    throw new Error(`Locale ${locale} is not supported`)
  }

  const mod = await loaderFunc()
  return mod.messages
}

