import { type I18n } from "@lingui/core"
import {
  createContext,
  redirect,
  type RedirectFunction,
  type RouterContextProvider,
} from "react-router"
import type { PathLocale } from "../i18n"
import "./assert-server"

/**
 * A utility type for server-side i18n context.
 */
export type I18nRequestContext = PathLocale & {
  /** The internationalization processing object, which manages locale-specific content and configurations. */
  i18n: I18n
  /** The translation function bound to the current i18n instance. */
  _: I18n["_"]
  /** The URL object for the current request, representing its full path and query parameters. */
  url: URL
}

/**
 * Context to hold server-side i18n information.
 *
 * Note that this is react-router context, not a React context. Use `RouterContextProvider`
 * to access it.
 */
export const LocaleServerContext = createContext<I18nRequestContext>()

/**
 * Server-side i18n context with additional properties.
 */
export type I18nRouterContext = I18nRequestContext & {
  /**
   * Function to redirect to a different locale while preserving the current locale prefix.
   *
   * @param to The target URL or path to redirect to, without the locale prefix
   * @param init Optional redirect initialization options
   * @returns A redirect response to the specified URL with the current locale prefix
   */
  redirect: RedirectFunction
}

/**
 * Hook to access the server-side i18n context. Use only in loaders and actions.
 *
 * @throws {Error} If used outside a localeMiddleware context
 * @returns {I18nRouterContext} The server-side i18n context object containing:
 * - i18n: The internationalization processing object
 * - url: The URL object for the current request
 * - requestLocale: The locale explicitly requested by the client, if any
 * - requestPathname: The pathname of the current request
 * - pathnamePrefix: The pathname prefix for the current locale (e.g. "/en")
 * - _: The translation function bound to the current i18n instance
 * - redirect: Function to redirect to a different locale while preserving the current locale prefix
 */
export function useLinguiServer(context: Readonly<RouterContextProvider>): I18nRouterContext {
  try {
    const serverContext = context.get(LocaleServerContext)
    const pathnamePrefix = serverContext.requestLocale ? `/${serverContext.requestLocale}` : ""

    return {
      ...serverContext,
      redirect: (to, init) => redirect(`${pathnamePrefix}${to}`, init),
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "No value found for context") {
      throw new Error("useLinguiServer must be used within a localeMiddleware")
    }
    throw err
  }
}
