import type * as estree from "estree"
import type { AstNodeLocation, ProgramNode } from "rollup"
import { stringifyJsonToString } from "./json-helper"

type Messages = Record<string, unknown>

/**
 * Range of code positions.
 */
type Range = {
  /**
   * Start position of the range, inclusive.
   */
  start: number
  /**
   * End position of the range, exclusive.
   */
  end: number
}

/**
 * Catalog messages with its range in the source code.
 */
type Catalog = Range & {
  /**
   * Name of the catalog variable.
   */
  name: string
  /**
   * Catalog messages.
   */
  messages: Messages
}

/**
 * Parsed information about a locale module chunk.
 */
export type ParsedLocaleModule = {
  /**
   * Sorted list of catalog messages, ordered by hierarchy.
   */
  catalogs: Catalog[]
  /**
   * Range of the expression, which assigns the merged catalog. Use it to insert the merged catalog.
   */
  expressionRange: Range
}

type SimpleVariableDeclarator = estree.VariableDeclarator & AstNodeLocation & {
  id: estree.Identifier
}

type SimpleVariableDeclaration = estree.VariableDeclaration & AstNodeLocation & {
  declarations: [SimpleVariableDeclarator]
}

/**
 * Parse a locale module chunk AST and extract catalog variables.
 */
export function parseLocaleModuleChunk(ast: ProgramNode): ParsedLocaleModule | undefined {
  // Get all root-level declarations
  const variableDeclarations = ast.body.filter(isSimpleVariableDeclaration)

  // First find all supported catalog variables
  const catalogs = variableDeclarations
    .map(declaration => {
      return processJsonDeclaration(declaration.declarations[0], declaration)
    })
    .filter(c => c !== undefined)

  // Create a map for quick lookup
  const catalogMap = new Map<string, Catalog>(catalogs.map(c => [c.name, c]))

  // Find the expression that assigns the merged catalog
  const variableAssign = variableDeclarations
    .map(declaration => declaration.declarations[0].init)
    .filter(e => isObjectCallExpression(e, "Object", "assign"))
  const namedExports = ast.body
    .filter(n => n.type === "ExportNamedDeclaration")
    .map(n => n.declaration)
    .filter(isSimpleVariableDeclaration)
    .map(declaration => declaration.declarations[0].init)
    .filter(e => isObjectCallExpression(e, "Object", "assign"))
  const defaultExport = ast.body
    .filter(n => n.type === "ExportDefaultDeclaration")
    .filter(n => n.declaration) // Ensure declaration exists
    .map(n => n.declaration)
    .filter(e => e.type === "CallExpression")
    .filter(e => isObjectCallExpression(e, "Object", "assign"))

  const assignExpressions = [
    ...variableAssign,
    ...namedExports,
    ...defaultExport,
  ]
    .filter(c => c.arguments.length > 1)
    .filter(c =>
      c.arguments[0].type === "ObjectExpression" && c.arguments[0].properties.length === 0)
    .filter(c =>
      c.arguments.slice(1).every(arg => arg.type === "Identifier" && catalogMap.has(arg.name)))

  if (assignExpressions.length === 0) {
    return undefined
  }
  if (assignExpressions.length > 1) {
    throw new Error("Multiple Object.assign() calls found")
  }

  const assignExpression = assignExpressions[0]
  // First is {}, verified above
  const catalogNames = assignExpression.arguments.slice(1).map(a => a as estree.Identifier)
  return {
    // This sorts the catalogs in the order they are assigned
    catalogs: catalogNames.map(id => catalogMap.get(id.name)!),
    expressionRange: {
      start: assignExpression.start,
      end: assignExpression.end,
    },
  }
}

function isSimpleVariableDeclarator(declarator: estree.VariableDeclarator):
  declarator is SimpleVariableDeclarator {
  return declarator.type === "VariableDeclarator" && declarator.id.type === "Identifier"
}

function isSimpleVariableDeclaration(node: estree.Node | estree.Declaration | null | undefined):
  node is SimpleVariableDeclaration {
  return node?.type === "VariableDeclaration"
    // Only single declaration per const is supported (and generated)
    && node.declarations.length === 1
    && isSimpleVariableDeclarator(node.declarations[0])
}


function processJsonDeclaration(
  declarator: SimpleVariableDeclarator,
  location: AstNodeLocation): Catalog | undefined {
  if (!isObjectCallExpression(declarator.init, "JSON", "parse")) return undefined

  const jsonString = extractSingleArgumentLiteral(declarator.init)
  if (!jsonString) return undefined

  let messages: Messages
  try {
    messages = JSON.parse(jsonString)
  } catch (error) {
    throw new Error(`Failed to parse JSON for variable ${declarator.id.name}: ${error}`)
  }

  return {
    name: declarator.id.name,
    messages,
    start: location.start,
    end: location.end,
  }
}

function isObjectCallExpression(init: estree.Expression | null | undefined, objectName: string, methodName: string):
  init is estree.SimpleCallExpression & AstNodeLocation {
  return init?.type === "CallExpression"
    && init.callee.type === "MemberExpression"
    && init.callee.object.type === "Identifier"
    && init.callee.object.name === objectName
    && init.callee.property.type === "Identifier"
    && init.callee.property.name === methodName
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
  const mergedCatalog = Object.assign({}, ...moduleInfo.catalogs.map(c => c.messages))

  const jsonString = stringifyJsonToString(mergedCatalog)
  let result = code.slice(0, moduleInfo.expressionRange.start) + `JSON.parse(${jsonString})` + code.slice(moduleInfo.expressionRange.end)

  // Sort the ranges in descending order to avoid index shift
  const usedRanges: Range[] = [...moduleInfo.catalogs].sort((a, b) => b.start - a.start)

  for (const { start, end } of usedRanges) {
    result = result.slice(0, start) + result.slice(end)
  }

  return result
}

