import { setI18n } from "@lingui/react/server"
import { redirect, type RouterContextProvider } from "react-router"
import { $detectLocale, $getI18nInstance } from "virtual:lingui-router-loader"
import { findLocale, stripPathnameLocalePrefix } from "../i18n"
import { config, loadLocaleCatalog } from "../runtime"
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
  next: () => Promise<Response>,
): Promise<Response> {
  const url = new URL(request.url)
  const paramsMap = params as Record<string, string | undefined>
  const localeParam = paramsMap[config.localeParamName]
  const requestPathname = localeParam
    ? stripPathnameLocalePrefix(url.pathname, localeParam)
    : url.pathname
  const foundLocale = findLocale(localeParam)

  let requestLocale = foundLocale.locale

  if (requestLocale) {
    if (requestLocale !== localeParam) {
      // Redirect to normalized locale URL
      // Note that this intentionally ignores redirect config, but we might add a new option later
      // Without this, pre-rendered URLs would not match
      throw redirectToLocale(requestLocale, requestPathname, url)
    }
  } else {
    // Detect locale from request headers
    requestLocale = handleRequestLocale(request, url, requestPathname, foundLocale.excluded)
  }

  // Unsupported locale in the URL, redirect to default locale
  if (!requestLocale && localeParam) {
    throw new Response(null, { status: 404, statusText: "Locale Not Found" })
  }

  // Get or create the i18n instance for the resolved locale
  const resolvedLocale = requestLocale || config.defaultLocale
  const i18n = $getI18nInstance(resolvedLocale)
  if (!i18n) {
    throw new Error(`Missing i18n instance for ${resolvedLocale}`)
  }

  // This is needed only during testing, on the server it is a no-op
  if (i18n.locale !== resolvedLocale) {
    const messages = await loadLocaleCatalog(resolvedLocale)
    i18n.loadAndActivate({ locale: resolvedLocale, messages })
  }

  // Set the locale context
  context.set(LocaleContext, {
    locale: resolvedLocale,
    i18n,
    _: i18n._.bind(i18n),
    url,
    requestLocale,
    requestPathname,
  })

  setI18n(i18n)

  // Run the next middleware / route handler
  const response = await next()

  response.headers.set("Content-Language", resolvedLocale)
  response.headers.append("Vary", "Accept-Language")

  return response
}

function handleRequestLocale(
  request: Request,
  url: URL,
  requestPathname: string,
  excluded: boolean,
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
    throw redirectToLocale(preferredLocale, requestPathname, url)
  }
}

function getRequestHeaders(headers: Headers): Record<string, string | undefined> {
  return {
    "accept-language": headers.get("accept-language") ?? undefined,
  }
}

function redirectToLocale(requestLocale: string, requestPathname: string, url: URL) {
  return redirect(`/${requestLocale}${requestPathname}${url.search}${url.hash}`)
}
