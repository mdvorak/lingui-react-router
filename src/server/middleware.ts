import { setI18n } from "@lingui/react/server"
import { redirect, type RouterContextProvider } from "react-router"
import { $detectLocale, $getI18nInstance } from "virtual:lingui-router-loader"
import { findLocale, stripPathnameLocalePrefix } from "../i18n"
import { config } from "../runtime"
import "./assert-server"
import { LocaleContext } from "./context"

/**
 * Locale middleware implementation. Determines the locale from the URL or the
 * Accept-Language header, initializes i18n, and runs the request within an
 * AsyncLocalStorage context containing i18n and request metadata.
 */
export async function localeMiddleware(
  {
    request,
    context,
    params,
  }: { request: Request; context: Readonly<RouterContextProvider>; params: unknown },
  next: () => Promise<Response>
): Promise<Response> {
  const url = new URL(request.url)
  const paramsMap = params as Record<string, string | undefined>
  const localeParam = paramsMap[config.localeParamName]
  const { locale, excluded } = findLocale(localeParam)
  const requestPathname = locale
    ? stripPathnameLocalePrefix(url.pathname, localeParam)
    : url.pathname

  let requestLocale = locale

  if (requestLocale) {
    if (requestLocale !== localeParam) {
      // Redirect to normalized locale URL
      // Note that this intentionally ignores redirect config, but we might add a new option later
      // Without this, pre-rendered URLs would not match
      throw redirect(`/${requestLocale}${requestPathname}${url.search}${url.hash}`)
    }
  } else {
    // Detect locale from request headers
    requestLocale = handleRequestLocale(request, url, requestPathname, excluded)
  }

  const i18n = $getI18nInstance(requestLocale || config.defaultLocale)
  if (!i18n) {
    throw new Error(`Missing i18n instance for ${requestLocale}`)
  }

  // Run the handler in the storage context
  context.set(LocaleContext, {
    locale: i18n.locale,
    i18n,
    _: i18n._.bind(i18n),
    url,
    requestLocale,
    requestPathname,
  })

  setI18n(i18n)
  const response = await next()
  response.headers.set("Content-Language", i18n.locale)
  response.headers.append("Vary", "Accept-Language")
  return response
}

function handleRequestLocale(
  request: Request,
  url: URL,
  pathname: string,
  excluded: boolean
): string | undefined {
  const detectedLocale = $detectLocale(getRequestHeaders(request.headers), config.locales)
  const preferredLocale = detectedLocale || config.defaultLocale

  if (excluded) {
    // Always use preferred locale for API requests
    return preferredLocale
  } else if (
    config.redirect === "always" ||
    (config.redirect === "auto" && preferredLocale !== config.defaultLocale)
  ) {
    // Redirect to a page with the preferred locale
    throw redirect(`/${preferredLocale}${pathname}${url.search}${url.hash}`)
  }
}

function getRequestHeaders(headers: Headers): Record<string, string | undefined> {
  return {
    "accept-language": headers.get("accept-language") ?? undefined,
  }
}
