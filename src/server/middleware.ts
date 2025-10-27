import { setI18n } from "@lingui/react/server"
import { redirect, type RouterContextProvider, } from "react-router"
import { $detectLocale, $getI18nInstance } from "virtual:lingui-router-loader"
import { parseUrlLocale } from "../i18n" // Assert this is included only on server
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
  const { locale, rawLocale, pathname, excluded } = parseUrlLocale(url.pathname)
  let selectedLocale: string | undefined = locale ?? (params as any)[config.localeParamName]

  // TODO normalize and fallback?

  if (selectedLocale) {
    if (selectedLocale !== rawLocale) {
      // Redirect to normalized locale URL
      // Note that this intentionally ignores redirect config, but we might add a new option later
      // Without this, pre-rendered URLs would not match
      throw redirect(`/${selectedLocale}${pathname}${url.search}${url.hash}`)
    }
  } else {
    // Detect locale from request headers
    selectedLocale = handleRequestLocale(request, url, pathname, excluded)
  }

  const i18n = $getI18nInstance(selectedLocale || config.defaultLocale)
  if (!i18n) {
    throw new Error(`Missing i18n instance for ${selectedLocale}`)
  }

  // Run the handler in the storage context
  context.set(LocaleContext, {
    i18n,
    url,
    requestLocale: selectedLocale,
    requestPathname: pathname,
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
