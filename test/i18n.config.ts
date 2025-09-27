import { defineConfig } from "lingui-react-router"
import linguiConfig from "./lingui.config"

export default defineConfig(linguiConfig, {
  exclude: "api",
  catalogModules: import.meta.glob("./app/**/*.po"),
})
