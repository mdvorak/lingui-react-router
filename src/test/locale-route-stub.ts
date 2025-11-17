import React from "react"
import {
  createRoutesStub,
  Outlet,
  RouterContextProvider,
} from "react-router"
import * as loader from "virtual:lingui-router-loader"
import { I18nApp } from "../components/I18nApp"
import { localeMiddleware } from "../server"

export type StubRouteObject = Parameters<typeof createRoutesStub>[0][0]

export const createLocaleRouteStub = (
  route: StubRouteObject,
  context: Readonly<RouterContextProvider> = new RouterContextProvider(),
) =>
  createRoutesStub(
    [
      {
        path: `:${loader.config.localeParamName}?`,
        Component: () =>
          React.createElement(I18nApp, null, React.createElement(Outlet)),
        children: [route],
        middleware: [localeMiddleware],
      },
    ],
    context,
  )
