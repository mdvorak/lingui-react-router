import type { I18n } from "@lingui/core"
import type { I18nContext } from "@lingui/react"
import { useEffect, useMemo } from "react"
import { useLocation } from "react-router"
import { I18nAppConfig } from "./config"
import { getGlobalRef, initI18n } from "./globals"

/**
 * Initialize a lingui instance within a page component for both client and server rendering.
 *
 * Use it in your root layout to initialize lingui for all pages.
 *
 * @param defaultComponent Optional component to use as default for translation components.
 */
export function initLingui(defaultComponent?: I18nContext["defaultComponent"]): I18n {
  const locale = useLocale()
  const i18n = useMemo(() => initI18n(locale, defaultComponent), [locale])

  useEffect(() => {
    const localeDidChange = locale !== i18n.locale
    if (localeDidChange) {
      const { config } = getGlobalRef()
      config.loadCatalog(locale).then(messages => i18n.loadAndActivate({ locale, messages }))
    }
  }, [i18n, locale])

  return i18n
}

export function useI18nConfig(): Omit<I18nAppConfig, "loadCatalog"> {
  return getGlobalRef().config
}

export function useLocale(): string {
  const location = useLocation()
  const { config } = getGlobalRef()
  return useMemo(() => config.parseUrlLocale(location.pathname).locale || config.defaultLocale, [location.pathname])
}
