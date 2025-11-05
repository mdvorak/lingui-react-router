declare module "virtual:lingui-router-manifest" {
  import type { LocaleManifest } from "./config"
  const manifest: LocaleManifest
  export default manifest
}

declare module "virtual:lingui-router-locale-*" {
  import type { Messages } from "@lingui/core"
  export const messages: Messages
}

declare module "virtual:lingui-router-loader" {
  import type { I18n, Messages } from "@lingui/core"
  import { I18nContext } from "@lingui/react"
  import type { LinguiRouterConfig } from "./config"

  export const config: LinguiRouterConfig
  export const localeLoaders: Record<string, () => Promise<{ messages: Messages }>>

  export function $getI18nInstance(locale: string): I18n

  export function $useLingui(): I18nContext

  export function $detectLocale(
    headers: Record<string, string | undefined>,
    locales: readonly string[],
  ): string | undefined

  export const localeMapping: Record<string, string> | undefined
}
