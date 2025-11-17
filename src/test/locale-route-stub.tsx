import React from "react"
import { createRoutesStub, Outlet, RouterContextProvider } from "react-router"
import * as loader from "virtual:lingui-router-loader"
import { I18nApp } from "../components/I18nApp"
import { localeMiddleware } from "../server"

export type StubRouteObject = Parameters<typeof createRoutesStub>[0][0]

function StubComponent() {
  return (
    <I18nApp>
      <Outlet />
    </I18nApp>
  )
}


export function createLocaleRouteStub(
  route: StubRouteObject,
  context: Readonly<RouterContextProvider> = new RouterContextProvider(),
  config: Readonly<{ localeParamName: string }> = loader.config,
): ReturnType<typeof createRoutesStub> {
  const StubRoot = createRoutesStub(
    [
      {
        path: `:${config.localeParamName}?`,
        Component: StubComponent,
        children: [route],
        middleware: [localeMiddleware],
      },
    ],
    context,
  )

  return (props: React.ComponentProps<typeof StubRoot>) => (
    <StubRoot {...props} future={{ v8_middleware: true }} />
  )
}
