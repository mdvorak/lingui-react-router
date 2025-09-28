import { I18nProvider } from "@lingui/react"
import React from "react"
import { initLingui } from "./lingui"

export function I18nApp({ children }: { children: React.ReactNode }) {
  const i18n = initLingui()
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>
}
