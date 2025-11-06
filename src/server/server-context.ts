import { type I18n } from "@lingui/core"
import {
  createContext,
  redirect,
  type RedirectFunction,
  type RouterContextProvider,
} from "react-router"
import type { PathLocale } from "../client-context"
import "./assert-server"
import { logger } from "../logger"

type ChangeLocaleServerFunction = (locale: string | undefined) => Response

/**
 * Server-side i18n context.
 */
export type I18nRequestContext = PathLocale & {
  /** The internationalization processing object, which manages locale-specific content and configurations. */
  i18n: I18n
  /** The translation function bound to the current i18n instance. */
  _: I18n["_"]
  /** The URL object for the current request, representing its full path and query parameters. */
  url: URL
  /**
   * Function to redirect to a different locale while preserving the current locale prefix.
   *
   * @param to The target URL or path to redirect to, without the locale prefix
   * @param init Optional redirect initialization options
   * @returns A redirect response to the specified URL with the current locale prefix
   */
  redirect: RedirectFunction
  /**
   * Change the locale and redirect to the same path.
   *
   * @param locale The new locale code
   * @returns A redirect response to the same path with the new locale prefix
   */
  changeLocale: ChangeLocaleServerFunction
}

/**
 * @deprecated Use I18nRequestContext instead. Will be removed in 2.0.0
 */
export type I18nRouterContext = I18nRequestContext

/**
 * Context to hold server-side i18n information.
 *
 * Note that this is react-router context, not a React context. Use `RouterContextProvider`
 * to access it.
 */
export const LocaleServerContext = createContext<I18nRequestContext>()

/**
 * Hook to access the server-side i18n context. Use only in loaders and actions.
 *
 * @throws {Error} If used outside a localeMiddleware context
 * @returns {I18nRequestContext} The server-side i18n context object containing:
 * - i18n: The internationalization processing object
 * - url: The URL object for the current request
 * - requestLocale: The locale explicitly requested by the client, if any
 * - requestPathname: The pathname of the current request
 * - pathnamePrefix: The pathname prefix for the current locale (e.g. "/en")
 * - _: The translation function bound to the current i18n instance
 * - redirect: Function to redirect to a different locale while preserving the current locale prefix
 */
export function useLinguiServer(context: Readonly<RouterContextProvider>): I18nRequestContext {
  try {
    return context.get(LocaleServerContext)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "No value found for context") {
      throw new Error("useLinguiServer must be used within a localeMiddleware")
    }
    throw err
  }
}

/**
 * Creates a server-side i18n context instance.
 *
 * @param value The request context object parameters.
 * @returns The server-side i18n context object.
 */
export function createRequestContext(value: {
  locale: string
  i18n: I18n
  url: URL
  requestLocale: string | undefined
  requestPathname: string
}): I18nRequestContext {
  return {
    ...value,
    _: value.i18n._.bind(value.i18n),
    redirect: (targetPath, init) => localeAwareRedirect(value.requestLocale, targetPath, init),
    changeLocale: locale => changeLocaleRedirect(locale, value.requestPathname, value.url),
  }
}

/**
 * Redirects to a path with the current locale prefix.
 *
 * @param requestLocale The locale explicitly requested by the client, if any
 * @param targetPath The target path to redirect to, without the locale prefix
 * @param init Optional redirect initialization options
 * @returns A redirect response to the specified URL with the current locale prefix
 */
function localeAwareRedirect(requestLocale: string | undefined,
                             targetPath: string,
                             init?: number | ResponseInit) {
  if (!targetPath.startsWith("/")) {
    throw new Error(`target path must start with a '/': '${targetPath}'`)
  }

  logger?.log("Redirecting to", targetPath, "with locale", requestLocale)
  const pathnamePrefix = requestLocale ? `/${requestLocale}` : ""
  return redirect(`${pathnamePrefix}${targetPath}`, init)
}

/**
 * Changes the current locale in the URL.
 *
 * @param targetLocale The locale to change to, or undefined to remove the locale prefix.
 * @param requestPathname Request pathname without the locale prefix.
 * @param url The URL object for the current request.
 * @returns A redirect response to the same path with the new locale prefix or without a locale prefix if targetLocale is undefined.
 */
export function changeLocaleRedirect(targetLocale: string | undefined, requestPathname: string, url: URL) {
  const targetLocalePath = targetLocale ? `/${targetLocale}` : ""
  logger?.log("Redirecting path", requestPathname, "to locale", targetLocale)
  return redirect(`${targetLocalePath}${requestPathname}${url.search}${url.hash}`)
}
