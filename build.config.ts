import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
  outDir: 'dist',
  rollup: {
    emitCJS: true,
    cjsBridge: true,
  },
  externals: ['react', 'react-dom', 'react-router-dom', '@lingui/react']
})