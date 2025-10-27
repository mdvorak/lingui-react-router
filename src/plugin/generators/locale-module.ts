import fg from "fast-glob"
import path from "node:path"
import { normalizeLocaleKey } from "../../config"
import type { LinguiRouterPluginConfigFull } from "../plugin-config"

export async function generateLocaleModule(
  locale: string,
  pluginConfig: Readonly<LinguiRouterPluginConfigFull>
): Promise<string> {
  const linguiConfig = pluginConfig.linguiConfig
  const catalogs: { varName: string; path: string }[] = []
  let importIndex = 0

  // Use original lingui format for import
  const linguiLocale = resolveLocale(locale, linguiConfig.locales)

  // Note: catalogs are never empty in the normalized parsed config
  for (const catalogConfig of linguiConfig.catalogs!) {
    let catalogPath = catalogConfig.path
      .replace(/<rootDir>/g, linguiConfig.rootDir || process.cwd())
      .replace(/\{locale}/g, linguiLocale)
      .replace(/\{name}/g, "*")

    // Add .po extension for glob pattern
    const globPattern = `${catalogPath}.po`

    const poFiles = await fg(globPattern, {
      cwd: linguiConfig.rootDir || process.cwd(),
    })

    for (const poFile of poFiles) {
      const varName = `catalog${importIndex++}`
      // Resolve to an absolute path for import
      const absolutePath = path.resolve(linguiConfig.rootDir || process.cwd(), poFile)
      catalogs.push({ varName, path: absolutePath })
    }
  }

  if (catalogs.length > 1) {
    const imports = catalogs.map(c => `import {messages as ${c.varName}} from '${c.path}'`)
    const catalogVars = catalogs.map(c => c.varName)

    return `${imports.join("\n")}
export const messages = Object.assign({}, ${catalogVars.join(", ")})`
  } else if (catalogs.length === 1) {
    return `export * from '${catalogs[0].path}'`
  } else {
    return ""
  }
}

function resolveLocale(locale: string, locales: string[]): string {
  const resolved = locales.find(l => normalizeLocaleKey(l) === locale)
  if (!resolved) {
    throw new Error(`Locale '${locale}' not found in Lingui configuration locales: ${locales}`)
  }
  return resolved
}
