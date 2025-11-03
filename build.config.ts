import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
  outDir: "dist",
  entries: [
    "src/index",
    "src/client/index",
    "src/server/index",
    "src/server/negotiate",
    "src/plugin/routes",
    "src/plugin/index",
    "src/test/index",
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
