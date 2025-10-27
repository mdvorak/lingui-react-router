import type { Config } from "@react-router/dev/config"
import { localePaths } from "lingui-react-router/routes"
import linguiConfig from "./lingui.config"

export default {
  future: {
    v8_middleware: true,
  },
  prerender: [...["/hello"].flatMap(path => localePaths(linguiConfig, path)), "/static/hello"],
} satisfies Config
