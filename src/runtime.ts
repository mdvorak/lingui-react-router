import type { Messages } from "@lingui/core"
import * as loader from "virtual:lingui-router-loader"
import type { LinguiRouterConfig, PathLocale } from "./config"

export const config: LinguiRouterConfig = loader.config
export const defaultLocale = loader.config.defaultLocale
export const localeLoaders: Record<string, () => Promise<{ messages: Messages }>> =
  loader.localeLoaders
export const parseUrlLocale: (url: string) => PathLocale = loader.parseUrlLocale

export async function loadLocaleCatalog(locale: string): Promise<Messages> {
  const loaderFunc = loader.localeLoaders[locale]
  if (!loaderFunc) {
    throw new Error(`Locale ${locale} is not supported`)
  }

  const mod = await loaderFunc()
  return mod.messages
}
