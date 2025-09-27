import React from "react"
import { Link, type LinkProps, type To } from "react-router"
import { useLocale } from "./lingui"

export function LocaleLink(
  props: LinkProps & React.RefAttributes<HTMLAnchorElement>
): React.ReactNode {
  const { requestLocale } = useLocale()
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
