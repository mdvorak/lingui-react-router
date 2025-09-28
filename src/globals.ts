import type { I18n } from "@lingui/core"
import type { I18nContext } from "@lingui/react"
import { I18nAppConfig } from "./config"

type InitLinguiFn = (locale: string) => I18n

let globalRef: { initLingui: InitLinguiFn; config: I18nAppConfig }

export function getGlobalRef(): Readonly<typeof globalRef> {
  return globalRef
}

export function setGlobalRef(config: I18nAppConfig, initLinguiFn: InitLinguiFn) {
  globalRef = {
    config,
    initLingui: initLinguiFn,
  }
}

export function initI18n(locale: string, defaultComponent?: I18nContext["defaultComponent"]) {
  const i18n = getGlobalRef().initLingui(locale)

  if (!i18n) {
    throw new Error(`Unsupported locale: ${locale}`)
  }

  return i18n
}
