import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { describe, expect, it } from "vitest"
import { fileURLToPath } from "url"

const projectDir = join(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * Integration test for validating prerendered HTML files
 * These tests ensure that the prerendering process generates correct HTML
 * with proper lang attributes and localized content
 */
describe("Prerendered HTML validation", () => {
  const buildDir = join(projectDir, "build", "client")

  describe("HTML lang attribute", () => {
    it.each([
      { path: "hello", lang: "en" },
      { path: "en/hello", lang: "en" },
      { path: "en-gb/hello", lang: "en-gb" },
      { path: "cs/hello", lang: "cs" },
      { path: "it/hello", lang: "it" },
      { path: "pseudo/hello", lang: "pseudo" },
    ])("should have lang='$lang' for $path", async ({ path, lang }) => {
      const htmlPath = join(buildDir, path, "index.html")
      const html = await readFile(htmlPath, "utf-8")

      expect(html).toContain(`<html lang="${lang}">`)
    })
  })

  describe("Localized content validation", () => {
    it("should contain English content in /hello/index.html", async () => {
      const htmlPath = join(buildDir, "hello", "index.html")
      const html = await readFile(htmlPath, "utf-8")

      expect(html).toContain("Hello, World!")
      expect(html).toContain("From loader too!")
      expect(html).toContain("Language")
    })

    it("should contain Czech content in /cs/hello/index.html", async () => {
      const htmlPath = join(buildDir, "cs", "hello", "index.html")
      const html = await readFile(htmlPath, "utf-8")

      expect(html).toContain("Ahoj světe!")
      expect(html).toContain("Také z loaderu!")
      expect(html).toContain("Jazyk")
    })

    it("should contain British English content in /en-gb/hello/index.html", async () => {
      const htmlPath = join(buildDir, "en-gb", "hello", "index.html")
      const html = await readFile(htmlPath, "utf-8")

      // British spelling: "Grey-coloured" vs American "Gray-colored"
      expect(html).toContain("Grey-coloured")
    })
  })

  describe("Locale-specific metadata", () => {
    it("should have English title in /hello/index.html", async () => {
      const htmlPath = join(buildDir, "hello", "index.html")
      const html = await readFile(htmlPath, "utf-8")

      expect(html).toContain("<title>Lingui React Router App</title>")
    })

    it("should have Czech title in /cs/hello/index.html", async () => {
      const htmlPath = join(buildDir, "cs", "hello", "index.html")
      const html = await readFile(htmlPath, "utf-8")

      expect(html).toContain("<title>Lingui React Router Aplikace</title>")
    })

    it("should have locale-specific modulepreload for locale bundle", async () => {
      const csHtmlPath = join(buildDir, "cs", "hello", "index.html")
      const csHtml = await readFile(csHtmlPath, "utf-8")

      // Should preload the Czech locale module
      expect(csHtml).toMatch(/\/assets\/locale-cs-\w+\.js/)

      const enHtmlPath = join(buildDir, "en", "hello", "index.html")
      const enHtml = await readFile(enHtmlPath, "utf-8")

      // Should preload the English locale module
      expect(enHtml).toMatch(/\/assets\/locale-en-\w+\.js/)
    })
  })

  describe("Locale-specific navigation", () => {
    it.each([
      { path: "hello", href: "/" },
      { path: "cs/hello", href: "/cs/" },
      { path: "en-gb/hello", href: "/en-gb/" },
    ])("should have correct home link '$href' for $path", async ({ path, href }) => {
      const htmlPath = join(buildDir, path, "index.html")
      const html = await readFile(htmlPath, "utf-8")

      expect(html).toContain(`href="${href}"`)
    })
  })

  describe("Static prerendered route", () => {
    it("should generate /static/hello/index.html without locale prefix", async () => {
      const htmlPath = join(buildDir, "static", "hello", "index.html")
      const html = await readFile(htmlPath, "utf-8")

      // Should exist and be valid HTML
      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain('<html lang="en">')
    })
  })
})
