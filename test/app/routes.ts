import { index, type RouteConfig } from "@react-router/dev/routes"
import i18nConfig from "../i18n.config"

export default [
  index("./routes/_index.tsx"),
  // Locale routes
  ...i18nConfig.route("hello", "./routes/hello.tsx"),
] satisfies RouteConfig
