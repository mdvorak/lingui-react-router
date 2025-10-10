import React from "react"
import { useLocation } from "react-router"
import manifest from "virtual:lingui-router-manifest"
import { defaultLocale, parseUrlLocale } from "./runtime"

export function LocalePreload() {
  if ((import.meta as any).env.SSR) {
    const { pathname } = useLocation()
    const locale = parseUrlLocale(pathname).locale ?? defaultLocale

    if (locale && locale in manifest) {
      const href = ((import.meta as any).env.BASE_URL ?? "") + manifest[locale].replace(/^\//, "")
      return React.createElement("link", {
        href,
        rel: "modulepreload",
        as: "script",
      })
    }
  }

  return null
}
