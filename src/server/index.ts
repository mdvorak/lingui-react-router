import type { I18nRequestContext } from "./server-context"

export { useLinguiServer, type I18nRequestContext } from "./server-context"
export { localeMiddleware } from "./middleware"


/**
 * @deprecated Use I18nRequestContext instead. Will be removed in 2.0.0
 */
export type I18nRouterContext = I18nRequestContext
