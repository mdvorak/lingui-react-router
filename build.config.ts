import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
  outDir: "dist",
  entries: ["src/index", "src/lingui.client", "src/lingui.server"],
  declaration: true,
  rollup: {
    emitCJS: true,
  },
})
