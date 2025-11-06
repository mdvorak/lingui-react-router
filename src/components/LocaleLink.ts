import React from "react"
import { Link, type LinkProps, type To } from "react-router"
import { usePathLocale } from "../client-context"

/**
 * A drop-in replacement for react-router's Link that automatically prefixes the
 * current request locale to the target URL.
 *
 * If no locale is present in the current request (e.g., navigating from the
 * default root, "/"), it falls back to rendering a standard Link without
 * modification.
 *
 * - If `to` is a string, the component renders `/${locale}${to}`.
 * - If `to` is a location object, it prefixes `pathname` with `/${locale}`.
 */
export function LocaleLink(
  props: LinkProps & React.RefAttributes<HTMLAnchorElement>,
): React.ReactNode {
  const { requestLocale } = usePathLocale()
  if (!requestLocale) return React.createElement(Link, props)

  const { to } = props
  let overrideTo: To

  if (typeof to === "object") {
    overrideTo = {
      ...to,
      pathname: `/${requestLocale}${to.pathname}`,
    }
  } else {
    overrideTo = `/${requestLocale}${to}`
  }

  return React.createElement(Link, { ...props, to: overrideTo })
}
