import type * as estree from "estree"
import type { AstNodeLocation, ProgramNode } from "rollup"
import { stringifyJsonToString } from "./json-helper"

type Range = [number, number]

type CatalogVariable = {
  name: string
  json: Record<string, string>
}

export type ParsedLocaleModule = {
  usedRanges: Range[]
  mergedCatalog: { json: Record<string, string>; range: Range }
}

export function parseLocaleModuleChunk(ast: ProgramNode): ParsedLocaleModule | undefined {
  const catalogVariables = new Map<string, object>()
  const usedRanges: Range[] = []
  let completeCatalog: { json: Record<string, string>; range: Range } | undefined

  // Get all root-level declarations
  const declarations = ast.body.filter(isVariableDeclaration)

  for (const declarationNode of declarations) {
    const list: CatalogVariable[] = []

    for (const declarator of declarationNode.declarations) {
      if (declarator.id.type !== "Identifier") continue

      if (isObjectCallExpression(declarator.init, "JSON", "parse")) {
        const varName = declarator.id.name
        const jsonString = extractSingleArgumentLiteral(declarator.init)
        if (!jsonString) continue

        let json: Record<string, string>
        try {
          json = JSON.parse(jsonString)
        } catch (error) {
          throw new Error(`Failed to parse JSON for variable ${varName}: ${error}`)
        }

        if (json) {
          list.push({
            name: varName,
            json,
          })
        }
      } else if (isObjectCallExpression(declarator.init, "Object", "assign")) {
        const mergedCatalog = processObjectAssign(declarator.init.arguments, catalogVariables)

        if (mergedCatalog) {
          if (completeCatalog) {
            throw new Error(`Multiple Object.assign calls found: ${declarator.id.name} at ${declarationNode.start}-${declarationNode.end}`)
          }
          completeCatalog = {
            json: mergedCatalog,
            range: [declarator.init.start, declarator.init.end],
          }
        }
      }
    }

    // Only if all declarations are valid
    if (list.length === declarationNode.declarations.length) {
      for (const item of list) {
        catalogVariables.set(item.name, item.json)
      }
      usedRanges.push([declarationNode.start, declarationNode.end])
    }
  }

  const exportExpressions = ast.body.filter(isExportDeclaration)
  for (const exportNode of exportExpressions) {
    if (exportNode.declaration?.type === "VariableDeclaration" && isVariableDeclaration(exportNode.declaration)
      && exportNode.declaration.declarations.length === 1
      && exportNode.declaration.declarations[0].id.type === "Identifier") {
      const declarator = exportNode.declaration.declarations[0]
      if (isObjectCallExpression(declarator.init, "Object", "assign")) {
        const mergedCatalog = processObjectAssign(declarator.init.arguments, catalogVariables)
        if (mergedCatalog) {
          if (completeCatalog) {
            throw new Error(`Multiple Object.assign calls found: ${exportNode.type} at ${exportNode.start}-${exportNode.end}`)
          }
          completeCatalog = {
            json: mergedCatalog,
            range: [declarator.init.start, declarator.init.end],
          }
        }
      }
    }

    if (exportNode.declaration?.type === "CallExpression"
      && isObjectCallExpression(exportNode.declaration, "Object", "assign")) {
      const mergedCatalog = processObjectAssign(exportNode.declaration.arguments, catalogVariables)
      if (mergedCatalog) {
        if (completeCatalog) {
          throw new Error(`Multiple Object.assign calls found: ${exportNode.type} at ${exportNode.start}-${exportNode.end}`)
        }
        completeCatalog = {
          json: mergedCatalog,
          range: [exportNode.declaration.start, exportNode.declaration.end],
        }
      }
    }
  }

  // Only if everything is valid
  return completeCatalog ? {
    usedRanges: usedRanges.reverse(),
    mergedCatalog: completeCatalog,
  } : undefined
}

function isVariableDeclaration(node: estree.Node): node is estree.VariableDeclaration & AstNodeLocation {
  return node.type === "VariableDeclaration"
}

function isExportDeclaration(node: estree.Node):
  node is (estree.ExportNamedDeclaration | estree.ExportDefaultDeclaration) & AstNodeLocation {
  return node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration"
}

function isObjectCallExpression(init: estree.Expression | null | undefined, objectName: string, methodName: string):
  init is estree.CallExpression & AstNodeLocation {
  return init?.type === "CallExpression"
    && init.callee.type === "MemberExpression"
    && init.callee.object.type === "Identifier"
    && init.callee.object.name === objectName
    && init.callee.property.type === "Identifier"
    && init.callee.property.name === methodName
}

function processObjectAssign(initArgs: (estree.Expression | estree.SpreadElement)[],
                             catalogVariables: Map<string, object>): Record<string, string> | undefined {
  if (initArgs.length <= 1
    || initArgs[0].type !== "ObjectExpression"
    || initArgs[0].properties.length !== 0) {
    return undefined
  }

  let mergedCatalog: Record<string, string> = {}

  for (const arg of initArgs.slice(1)) {
    if (arg.type === "Identifier" && catalogVariables.has(arg.name)) {
      const catalog = catalogVariables.get(arg.name) as Record<string, string>
      mergedCatalog = { ...mergedCatalog, ...catalog }
    } else {
      // Invalid argument
      return undefined
    }
  }

  return mergedCatalog
}

function extractSingleArgumentLiteral(init: estree.CallExpression): string | undefined {
  if (init.arguments.length === 1
    && init.arguments[0]?.type === "Literal"
    && typeof init.arguments[0].value === "string") {
    // Return the string
    return init.arguments[0].value
  }
}

export function replaceCatalogVariables(code: string, moduleInfo: ParsedLocaleModule): string | undefined {
  const jsonString = stringifyJsonToString(moduleInfo.mergedCatalog.json)
  let result = code.slice(0, moduleInfo.mergedCatalog.range[0]) + `JSON.parse(${jsonString});` + code.slice(moduleInfo.mergedCatalog.range[1])

  for (const [start, end] of moduleInfo.usedRanges) {
    result = result.slice(0, start) + result.slice(end)
  }

  return result
}

