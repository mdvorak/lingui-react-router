import type { I18n } from "@lingui/core"

// This code is needed in to both server-side and client-side rendering to work, each using
// its own mechanism for retrieving I18n instances
// It is initialized simply by importing lingui.client or lingui.server

type GetI18nFn = (locale: string) => I18n

let getI18nRef: GetI18nFn

export function _initGetI18nRef(getI18nFn: GetI18nFn) {
  getI18nRef = getI18nFn
}

export function _getI18n(locale: string) {
  const i18n = getI18nRef!(locale)
  if (!i18n) {
    throw new Error(`Unsupported locale: ${locale}`)
  }
  return i18n
}
