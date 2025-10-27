import { describe, expect, it } from "vitest"
import { getAllLocales } from "./cldr"

describe("cldr", () => {
  describe("getAllLocales", () => {
    it("should return a Set of locale strings", async () => {
      const locales = await getAllLocales()

      expect(locales).toBeInstanceOf(Set)
      expect(locales.size).toBeGreaterThan(0)
    })

    it("should include common locales like en, es, fr, de", async () => {
      const locales = await getAllLocales()

      // These are common locales that should definitely be in CLDR
      expect(locales.has("en")).toBe(true)
      expect(locales.has("es")).toBe(true)
      expect(locales.has("fr")).toBe(true)
      expect(locales.has("de")).toBe(true)
    })

    it("should include both simple and complex locale codes", async () => {
      const locales = await getAllLocales()

      // Simple locale codes (language only)
      expect(locales.has("en")).toBe(true)
      expect(locales.has("ja")).toBe(true)

      // Complex locale codes (language-region)
      expect(locales.has("en-US")).toBe(true)
      expect(locales.has("pt-BR")).toBe(true)
      expect(locales.has("zh-Hans")).toBe(true)
    })

    it("should cache the result and return the same Promise on multiple calls", async () => {
      // Call getAllLocales multiple times
      const promise1 = getAllLocales()
      const promise2 = getAllLocales()
      const promise3 = getAllLocales()

      // All calls should return the same Promise instance (due to caching)
      expect(promise1).toBe(promise2)
      expect(promise2).toBe(promise3)

      // Wait for all promises and verify they resolve to the same Set
      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3])

      expect(result1).toBe(result2)
      expect(result2).toBe(result3)
    })

    it("should return a Set with a reasonable number of locales", async () => {
      const locales = await getAllLocales()

      // CLDR contains hundreds of locales, so we expect at least 100
      // but less than 10000 (reasonable upper bound)
      expect(locales.size).toBeGreaterThanOrEqual(100)
      expect(locales.size).toBeLessThan(10000)
    })

    it("should contain only string values", async () => {
      const locales = await getAllLocales()

      for (const locale of locales) {
        expect(typeof locale).toBe("string")
        expect(locale.length).toBeGreaterThan(0)
      }
    })

    it("should include locales from both availableLocales.full and defaultContent", async () => {
      const locales = await getAllLocales()

      // These locales should come from availableLocales.full
      expect(locales.has("en")).toBe(true)
      expect(locales.has("fr")).toBe(true)

      // These locales typically come from defaultContent (inherited locales)
      // They may or may not be present depending on CLDR version, but at least one should exist
      const defaultContentLocales = ["en-US", "es-419", "pt-BR", "zh-Hans", "zh-Hant"]
      const hasAtLeastOneDefaultContent = defaultContentLocales.some(locale => locales.has(locale))
      expect(hasAtLeastOneDefaultContent).toBe(true)
    })

    it("should handle concurrent calls efficiently", async () => {
      // Create multiple concurrent calls
      const calls = Array.from({ length: 10 }, () => getAllLocales())

      // All should resolve successfully
      const results = await Promise.all(calls)

      // All should return the same Set instance
      const firstResult = results[0]
      for (const result of results) {
        expect(result).toBe(firstResult)
      }
    })
  })
})
