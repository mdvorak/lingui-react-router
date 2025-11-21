import { dirname, join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { vi } from "vitest"

/**
 * Helper function to run React Router CLI commands inside vitest.
 *
 * @param projectDir - The project directory where the React Router CLI is executed.
 * @param command - The React Router CLI command to run.
 */
export async function runReactRouter(projectDir: string, command: string) {
  const packageJson = await import("@react-router/dev/package.json")
  const reactRouterDevPath = dirname(fileURLToPath(import.meta.resolve("@react-router/dev/package.json")))
  const reactRouterDevBinPath = join(reactRouterDevPath, packageJson.bin["react-router"])
  const testCwd = process.cwd()

  return new Promise<void>((resolve, reject) => {
    process.chdir(projectDir)
    vi.stubGlobal("document", undefined)
    vi.stubGlobal("window", undefined)
    vi.stubGlobal("process", {
      ...process,
      argv: [process.argv[0], reactRouterDevBinPath, command, projectDir],
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
      once: process.once.bind(process),
      off: process.off.bind(process),
      exit(code: number) {
        if (code === 0) {
          resolve()
        } else {
          const error = new Error(`Process exited with code ${code}`)
          reject(error)
          throw error
        }
      },
    })

    // Run
    import(reactRouterDevBinPath).then(() => {
      console.log("React Router binary executed")
    }, reject)
  }).finally(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
    process.chdir(testCwd)
  })
}
