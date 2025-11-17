import { setI18n } from "@lingui/react/server"
import type { RouterContextProvider } from "react-router"
import { $detectLocale, $getI18nInstance } from "virtual:lingui-router-loader"
import { findLocale, stripPathnameLocalePrefix } from "../client-context"
import { config, loadLocaleCatalog } from "../runtime"
import "./assert-server"
import { changeLocaleRedirect, createRequestContext, LocaleServerContext } from "./server-context"

export type MiddlewareFunctionArgs = {
  request: Request
  context: Readonly<RouterContextProvider>
  params: unknown
}

/**
 * Locale middleware implementation. Determines the locale from the URL or the
 * Accept-Language header, initializes i18n, and runs the request with a LocaleServerContext.
 *
 * Use `useLinguiServer` in loaders and actions to access the server-side i18n context.
 *
 * @param request The request object
 * @param context The router context
 * @param params The route parameters
 * @param next The next middleware function
 * @returns The response from the next middleware or route handler
 */
export async function localeMiddleware<T>(
  { request, context, params }: MiddlewareFunctionArgs,
  next: () => Promise<T>,
): Promise<T> {
  const url = Object.freeze(new URL(request.url))
  const paramsMap = params as Record<string, string | undefined>
  const localeParam = paramsMap[config.localeParamName]
  const requestPathname = localeParam
    ? stripPathnameLocalePrefix(url.pathname, localeParam)
    : url.pathname
  const foundLocale = findLocale(localeParam)

  let requestLocale: string | undefined = foundLocale.locale

  if (requestLocale) {
    if (requestLocale !== localeParam) {
      // Redirect to normalized locale URL
      // Note that this intentionally ignores redirect config, but we might add a new option later
      // Without this, pre-rendered URLs would not match
      throw changeLocaleRedirect(requestLocale, requestPathname, url)
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
  context.set(LocaleServerContext, createRequestContext({
    locale: resolvedLocale,
    i18n,
    url,
    requestLocale,
    requestPathname,
  }))

  setI18n(i18n)

  // Run the next middleware / route handler
  const response = await next()
  const headers = (response as any).headers

  if (headers instanceof Headers) {
    headers.set("Content-Language", resolvedLocale)
    headers.append("Vary", "Accept-Language")
  }

  return response
}

/**
 * Handles the request locale based on the Accept-Language header and the excluded flag.
 *
 * Performs locale detection from the Accept-Language header and returns the preferred locale.
 * If the redirect option is configured, it will throw a redirect response.
 */
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
    throw changeLocaleRedirect(preferredLocale, requestPathname, url)
  }
}

/**
 * Extracts request headers into a record.
 * @param headers The request headers.
 * @returns A record of header names and their values.
 */
function getRequestHeaders(headers: Headers): Record<string, string | undefined> {
  return {
    "accept-language": headers.get("accept-language") ?? undefined,
  }
}
