import path from "node:path"

/**
 * Resolve an import path and normalize it for module imports.
 *
 * @param paths Path segments to resolve
 * @returns Normalized import path
 */
export function resolveImportPath(...paths: string[]): string {
  return normalizeImportPath(path.resolve(...paths))
}

export function normalizeImportPath(modulePath: string): string {
  // Never use Windows backslashes in module paths
  return modulePath.replaceAll("\\", "/")
}
