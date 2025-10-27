// Assert this is included only on the server
if (globalThis.window) {
  throw new Error("lingui-react-router/server must be imported only on server")
}
