import { index, type RouteConfig } from "@react-router/dev/routes"
import { localeRoutes } from "lingui-react-router/routes"
import i18nConfig from "../i18n.config"

const locale = localeRoutes(i18nConfig)

export default [
  index("./routes/_index.tsx"),
  // Locale routes
  ...locale.index("./routes/_index.tsx"),
  ...locale.route("hello", "./routes/hello.tsx"),
] satisfies RouteConfig
