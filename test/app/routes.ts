import { index, type RouteConfig } from "@react-router/dev/routes"
import { localeRoutes } from "lingui-react-router/routes"
import linguiConfig from "../lingui.config"

const locale = localeRoutes(linguiConfig)

export default [
  index("./routes/_index.tsx"),
  // Locale routes
  ...locale.index("./routes/_index.tsx"),
  ...locale.route("hello", "./routes/hello.tsx"),
] satisfies RouteConfig
