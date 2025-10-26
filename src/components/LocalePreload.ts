import React from "react"
import { useLocation } from "react-router"
import manifest from "virtual:lingui-router-manifest"
import { parseUrlLocale } from "../i18n"
import { defaultLocale } from "../runtime"

/**
 * Preloads the locale script on the client. Add to your HTML `<head>` section.
 *
 * @example
 * <head>
 *   <Meta />
 *   <Links />
 *   <LocalePreload />
 * </head>
 */
export function LocalePreload() {
  if ((import.meta as any).env.SSR) {
    const { pathname } = useLocation()
    const locale = parseUrlLocale(pathname).locale ?? defaultLocale

    if (locale && locale in manifest) {
      const href = ((import.meta as any).env.BASE_URL ?? "") + manifest[locale].replace(/^\//, "")
      return React.createElement("link", {
        rel: "modulepreload",
        href,
        as: "script",
      })
    }
  }

  return null
}
