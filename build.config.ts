import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
  outDir: "dist",
  entries: [
    "src/index",
    "src/lingui.client",
    "src/lingui.server",
    "src/routes",
    "src/plugin/index",
  ],
  externals: ["virtual:lingui-router-loader", "virtual:lingui-router-manifest"],
  declaration: true,
  rollup: {
    emitCJS: true,
  },
})
