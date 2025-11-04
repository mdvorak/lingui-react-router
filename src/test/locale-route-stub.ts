import React from "react"
import {
  createRoutesStub,
  type LoaderFunction,
  type LoaderFunctionArgs,
  Outlet,
  RouterContextProvider,
} from "react-router"
import * as loader from "virtual:lingui-router-loader"
import { I18nApp } from "../components/I18nApp"
import { localeMiddleware } from "../server"

export type StubRouteObject = Parameters<typeof createRoutesStub>[0][0]

export const createLocaleRouteStub = (
  route: StubRouteObject,
  context: RouterContextProvider = new RouterContextProvider(),
) =>
  createRoutesStub(
    [
      {
        path: `:${loader.config.localeParamName}?`,
        Component: () =>
          React.createElement(I18nApp, null, React.createElement(Outlet)),
        children: [route].map(r => ({
          ...r,
          loader: r.loader ? wrapLoader(r.loader) : undefined,
        })),
      },
    ],
    context,
  )

/**
 * Wrap a loader function with locale middleware
 */
function wrapLoader(
  loader: LoaderFunction,
): LoaderFunction {
  const original = async (args: LoaderFunctionArgs) => {
    const result = await loader(args)
    return ensureResponse(result)
  }

  return async (args: LoaderFunctionArgs) => {
    const response = await localeMiddleware(args, () => original(args))
    return await response.json()
  }
}

/**
 * Ensure the result is a Response object.
 * If it's already a Response, return it as-is.
 * Otherwise, wrap it in Response.json().
 */
function ensureResponse(result: unknown): Response {
  return result instanceof Response ? result : Response.json(result)
}
