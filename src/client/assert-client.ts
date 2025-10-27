// Assert this is included only on the client
if (globalThis.window === undefined) {
  throw new Error("lingui-react-router/client must be imported only on client")
}
