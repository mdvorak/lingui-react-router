import { parseAst } from "rollup/parseAst"
import { describe, expect, it } from "vitest"
import { parseLocaleModuleChunk, replaceCatalogVariables } from "./locale-module-parser"

describe("locale-module-parser", () => {
  it("should parse and transform locale module", () => {
    const chunk = `const m$1 = JSON.parse('{"hello": "world"}')
    const m$2 = JSON.parse('{"goodbye": "world"}')
    const messages = Object.assign({}, m$1, m$2)
    export { messages }
    `.replaceAll(/^\s+/mg, "")

    const ast = parseAst(chunk)
    const result = parseLocaleModuleChunk(ast)

    expect(result).toBeDefined()
    expect(result?.catalogs).toHaveLength(2)
    expect(result?.catalogs[0].messages).toEqual({
      hello: "world",
    })
    expect(result?.catalogs[1].messages).toEqual({
      goodbye: "world",
    })
    expect(result?.expressionRange).toEqual({
      start: 109,
      end: 136,
    })

    const transformed = replaceCatalogVariables(chunk, result!)
    expect(transformed?.trimEnd().split("\n")).toEqual([
      ``, ``,
      `const messages = JSON.parse("{\\"hello\\":\\"world\\",\\"goodbye\\":\\"world\\"}")`,
      `export { messages }`,
    ])
  })

  it("should handle invalid JSON", () => {
    const chunk = `const m$1 = JSON.parse('{"hello": "world"}')
    const m$2 = JSON.parse('{"goodbye": "world"')
    const messages = Object.assign({}, m$1, m$2)
    export default messages
    `.replaceAll(/^\s+/mg, "")

    const ast = parseAst(chunk)

    expect(() => parseLocaleModuleChunk(ast)).toThrowError(
      /Failed to parse JSON for variable m\$2/,
    )
  })

  it("should retain other declarations and comments", () => {
    const chunk = `
    // This is foo module
    import { foo } from "./foo.js"
    const x = foo()

    /* This is a comment */const m$1 = JSON.parse('{"hello": "world"}')
    const m$2 = JSON.parse('{"goodbye": "world"}') // This is a comment
    const messages = Object.assign({}, m$1, m$2) // And this too
    export const otherVar = 42
    export default messages
    export { x }
    `.replaceAll(/^\s+/mg, "")
    const ast = parseAst(chunk)
    const result = parseLocaleModuleChunk(ast)

    expect(result).toBeDefined()
    expect(result?.catalogs).toHaveLength(2)
    expect(result?.catalogs[0].messages).toEqual({
      hello: "world",
    })
    expect(result?.catalogs[1].messages).toEqual({
      goodbye: "world",
    })
    expect(result?.expressionRange).toBeDefined()

    const transformed = replaceCatalogVariables(chunk, result!)
    expect(transformed?.trimEnd().split("\n")).toEqual([
      `// This is foo module`,
      `import { foo } from "./foo.js"`,
      `const x = foo()`,
      `/* This is a comment */`,
      ` // This is a comment`,
      `const messages = JSON.parse("{\\"hello\\":\\"world\\",\\"goodbye\\":\\"world\\"}") // And this too`,
      `export const otherVar = 42`,
      `export default messages`,
      `export { x }`,
    ])
  })

  it("should handle direct const export", () => {
    const chunk = `const m$1 = JSON.parse('{"hello": "world"}')
    const m$2 = JSON.parse('{"goodbye": "world"}')
    export const messages = Object.assign({}, m$1, m$2)
    `.replaceAll(/^\s+/mg, "")
    const ast = parseAst(chunk)

    const result = parseLocaleModuleChunk(ast)

    expect(result).toBeDefined()
    expect(result?.catalogs).toHaveLength(2)
    expect(result?.catalogs[0].messages).toEqual({
      hello: "world",
    })
    expect(result?.catalogs[1].messages).toEqual({
      goodbye: "world",
    })
    expect(result?.expressionRange).toBeDefined()

    const transformed = replaceCatalogVariables(chunk, result!)
    expect(transformed).toBeDefined()
    expect(transformed?.split("\n").filter(Boolean)).toEqual([
      `export const messages = JSON.parse("{\\"hello\\":\\"world\\",\\"goodbye\\":\\"world\\"}")`,
    ])
  })

  it("should handle direct default export", () => {
    const chunk = `const m$1 = JSON.parse('{"hello": "world"}')
    const m$2 = JSON.parse('{"goodbye": "world"}')
    export default Object.assign({}, m$1, m$2)
    `.replaceAll(/^\s+/mg, "")
    const ast = parseAst(chunk)
    const result = parseLocaleModuleChunk(ast)

    expect(result).toBeDefined()
    expect(result?.catalogs).toHaveLength(2)
    expect(result?.catalogs[0].messages).toEqual({
      hello: "world",
    })
    expect(result?.catalogs[1].messages).toEqual({
      goodbye: "world",
    })
    expect(result?.expressionRange).toBeDefined()

    const transformed = replaceCatalogVariables(chunk, result!)
    expect(transformed?.split("\n").filter(Boolean)).toEqual([
      `export default JSON.parse("{\\"hello\\":\\"world\\",\\"goodbye\\":\\"world\\"}")`,
    ])
  })

  it("should not transform single catalog", () => {
    const chunk = `const messages = JSON.parse('{"hello": "world"}')
    export { messages }
    `.replaceAll(/^\s+/mg, "")

    const ast = parseAst(chunk)
    const result = parseLocaleModuleChunk(ast)

    expect(result).toBeUndefined()
  })

  it("should handle many catalog variables", () => {
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7]
    const catalogs = numbers.map(i => `const m$${i} = JSON.parse('{"hello${i}": "${i}"}')`).join("\n")

    const chunk = `${catalogs}
    const messages = Object.assign({}, ${numbers.map(i => `m$${i}`).join(", ")})
    export { messages }
    `.replaceAll(/^\s+/mg, "")

    const ast = parseAst(chunk)
    const result = parseLocaleModuleChunk(ast)

    expect(result).toBeDefined()
    expect(result?.catalogs).toHaveLength(numbers.length)
    numbers.forEach(i => {
      expect(result?.catalogs[i].messages).toHaveProperty(`hello${i}`, `${i}`)
    })
    expect(result?.expressionRange).toBeDefined()
  })

  it("should ignore assign without default object", () => {
    const chunk = `const m$1 = JSON.parse('{"hello": "world"}')
    const m$2 = JSON.parse('{"goodbye": "world"}')
    const messages = Object.assign(m$1, m$2)
    export { messages }
    `.replaceAll(/^\s+/mg, "")

    const ast = parseAst(chunk)
    const result = parseLocaleModuleChunk(ast)

    expect(result).toBeUndefined()
  })

  it("should transform real example", () => {
    // noinspection SpellCheckingInspection
    const chunk = `/*eslint-disable*/const messages$2=JSON.parse("{\\"50W5Aa\\":[\\"Šedě zbarvený text s proměnnou: \\",[\\"0\\"]],\\"5yIPLp\\":[\\"Jejda!\\"],\\"6H4Yw+\\":[\\"Pokračovat\\"],\\"EkLV1t\\":[\\"Také z loaderu!\\"],\\"HWi8gx\\":[\\"Příklad integrace Lingui React Router\\"],\\"NlhLzM\\":[\\"Požadovaná stránka nebyla nalezena.\\"],\\"W5A0Ly\\":[\\"Nastala neočekávaná chyba.\\"],\\"j3MwdC\\":[\\"Speciální znaky: \\\\\\"'$.*+@!\`\\"],\\"prQVd8\\":[\\"Lingui React Router Aplikace\\"],\\"pw0gj9\\":[\\"Hlavní stránka\\"],\\"uBHlUy\\":[\\"Ahoj světe!\\"]}");

/*eslint-disable*/const messages$1=JSON.parse("{\\"vXIe7J\\":[\\"Jazyk\\"]}");

const messages = Object.assign({}, messages$2, messages$1);

export { messages };`

    const ast = parseAst(chunk)
    const result = parseLocaleModuleChunk(ast)

    expect(result).toBeDefined()
    expect(result?.catalogs).toHaveLength(2)
    // noinspection SpellCheckingInspection
    expect(result?.catalogs[0].messages).toMatchObject({
      "5yIPLp": ["Jejda!"],
      "50W5Aa": ["Šedě zbarvený text s proměnnou: ", ["0"]],
    })
    expect(result?.catalogs[1].messages).toMatchObject({
      "vXIe7J": ["Jazyk"],
    })
    expect(result?.expressionRange).toBeDefined()

    const transformed = replaceCatalogVariables(chunk, result!)
    expect(transformed).toBeDefined()
    // noinspection SpellCheckingInspection
    expect(transformed?.split("\n").filter(Boolean)).toEqual([
      `/*eslint-disable*/`,
      `/*eslint-disable*/`,
      `const messages = JSON.parse("{\\"50W5Aa\\":[\\"Šedě zbarvený text s proměnnou: \\",[\\"0\\"]],\\"5yIPLp\\":[\\"Jejda!\\"],\\"6H4Yw+\\":[\\"Pokračovat\\"],\\"EkLV1t\\":[\\"Také z loaderu!\\"],\\"HWi8gx\\":[\\"Příklad integrace Lingui React Router\\"],\\"NlhLzM\\":[\\"Požadovaná stránka nebyla nalezena.\\"],\\"W5A0Ly\\":[\\"Nastala neočekávaná chyba.\\"],\\"j3MwdC\\":[\\"Speciální znaky: \\\\\\"'$.*+@!\`\\"],\\"prQVd8\\":[\\"Lingui React Router Aplikace\\"],\\"pw0gj9\\":[\\"Hlavní stránka\\"],\\"uBHlUy\\":[\\"Ahoj světe!\\"],\\"vXIe7J\\":[\\"Jazyk\\"]}");`,
      `export { messages };`,
    ])
  })

  it("should throw if multiple Object.assign() calls", () => {
    const chunk = `const m$1 = JSON.parse('{"hello": "world"}')
    const m$2 = JSON.parse('{"goodbye": "world"}')
    const messages = Object.assign({}, m$1, m$2)
    const messages2 = Object.assign({}, m$1, m$2)
    export { messages, messages2 }
    `.replaceAll(/^\s+/mg, "")

    const ast = parseAst(chunk)

    expect(() => parseLocaleModuleChunk(ast)).toThrowError(
      /Multiple Object.assign\(\) calls found/,
    )
  })
})
