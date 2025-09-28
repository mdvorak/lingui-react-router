import React from "react"
import { I18nAppConfig } from "./config"

export const I18nConfigContext = React.createContext<I18nAppConfig | null>(null)

export function useI18nConfig(): I18nAppConfig {
  const ctx = React.useContext(I18nConfigContext)
  if (!ctx) throw new Error("Please wrap your layout in I18nApp component")
  return ctx
}
