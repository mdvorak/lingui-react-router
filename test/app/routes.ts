import { index, prefix, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./routes/_index.tsx"),
  ...prefix(":locale?", [
    index("./routes/_index.tsx", { id: "locale-index" }),
    route("hello", "./routes/hello.tsx"),
  ]),
  route("static/hello", "./routes/static-hello.tsx"),
] satisfies RouteConfig
