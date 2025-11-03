// Assert this is included only on the server
// Skip this check in test environments (vitest, jest, etc.)
const isTestEnv = typeof process !== "undefined" && process.env.NODE_ENV === "test"

if (!isTestEnv && globalThis.window !== undefined) {
  throw new Error("lingui-react-router/server must be imported only on server")
}
