import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
  outDir: "dist",
  entries: [
    "src/index",
    "src/i18n.client",
    "src/i18n.server",
    "src/routes",
    "src/negotiate",
    "src/plugin/index",
  ],
  externals: [
    "virtual:lingui-router-loader",
    "virtual:lingui-router-manifest",
    /^virtual:lingui-router-locale-.*/,
  ],
  declaration: true,
  rollup: {
    emitCJS: true,
  },
})
