import { route, RouteConfigEntry } from "@react-router/dev/routes"
import { I18nAppConfig } from "./config"

export function localeRoutes(config: I18nAppConfig) {
  const { locales } = config
  const routePrefixes = [""].concat(locales.map(loc => loc + "/"))

  return {
    /**
     * Create localized route entries for a given path and file.
     * For example, `route("products", "routes/products.tsx")` will generate entries
     * for each locale as `["en/products", "pseudo/products", ...]`
     */
    route(path: string, file: string, children?: RouteConfigEntry[]): RouteConfigEntry[] {
      return routePrefixes
        .filter(p => p + path)
        .map(p => route(p + path, file, { id: p + file }, children))
    },
    /**
     * Create index routes for every locale root ("/en", "/cs", etc.).
     */
    index(file: string, children?: RouteConfigEntry[]): RouteConfigEntry[] {
      return locales.map(loc => route(loc, file, { id: loc + file }, children))
    },
  }
}
