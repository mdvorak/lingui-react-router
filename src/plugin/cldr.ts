import * as fs from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

const availableLocales: string[] = JSON.parse(
  fs.readFileSync(require.resolve("cldr-core/availableLocales.json"), "utf-8")
).availableLocales.full
const defaultContent: string[] = JSON.parse(
  fs.readFileSync(require.resolve("cldr-core/defaultContent.json"), "utf-8")
).defaultContent

export const allLocales: string[] = [...availableLocales, ...defaultContent]
