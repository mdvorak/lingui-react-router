import { Trans } from "@lingui/react/macro"
import { data, useLoaderData } from "react-router"

export function loader() {
  return data({ msg: `From loader too!` })
}

export default function Hello() {
  const loaderData = useLoaderData()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">
        <Trans>Hello, World!</Trans>
      </h1>
      <p>{loaderData?.msg}</p>
    </div>
  )
}
