import { I18nProvider } from "@lingui/react"
import React, { useEffect } from "react"
import { useLocation } from "react-router"
import { I18nAppConfig } from "./config"
import { I18nConfigContext } from "./context"
import { _getI18n } from "./globals"
import { useLocale } from "./lingui"

export function I18nApp({
  config,
  children,
}: {
  config: I18nAppConfig
  children: React.ReactNode
}) {
  const location = useLocation()
  const { locale } = useLocale(location, config) // context is not set up yet, so we provide it
  const i18n = _getI18n(locale)

  useEffect(() => {
    // This is executed only client-side
    const localeDidChange = locale !== i18n.locale
    if (localeDidChange) {
      if (locale in i18n.messages) {
        i18n.activate(locale)
      } else {
        config.loadCatalog(locale).then(messages => i18n.loadAndActivate({ locale, messages }))
      }
    }
  }, [locale])

  // @ts-ignore
  const childrenRender = typeof children === "function" ? children(i18n) : children

  return (
    <I18nConfigContext.Provider value={config}>
      <I18nProvider i18n={i18n}>{childrenRender}</I18nProvider>
    </I18nConfigContext.Provider>
  )
}
