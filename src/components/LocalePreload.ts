import { useLingui } from "@lingui/react"
import React from "react"
import manifest from "virtual:lingui-router-manifest"

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
  const { i18n } = useLingui()

  if ((import.meta as any).env.SSR) {
    const locale = i18n.locale
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
