import type { Config } from "@react-router/dev/config"
import linguiConfig from "./lingui.config"

const { locales } = linguiConfig
const langPrerender = ["hello"]

export default {
  future: {
    v8_middleware: true,
  },
  prerender: [...langPrerender.flatMap(path => locales.map(lang => `/${lang}/${path}`))],
} satisfies Config
