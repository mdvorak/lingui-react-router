import { msg } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { useLinguiServer } from "lingui-react-router/server"
import { data, type LoaderFunctionArgs, useLoaderData } from "react-router"

export function loader({ context }: LoaderFunctionArgs) {
  const { _ } = useLinguiServer(context)
  return data({ msg: _(msg`From loader too!`) })
}

export default function Hello() {
  const loaderData = useLoaderData<typeof loader>()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div>
        <h1 className="text-4xl font-bold">
          <Trans>Hello, World!</Trans>
        </h1>
        <p>{loaderData.msg}</p>
        <p>
          <Trans>Special chars: "'$.*+@!</Trans>
        </p>
        <p>
          <Trans>Gray-colored text with a variable: {new Date().toLocaleDateString()}</Trans>
        </p>
      </div>
    </div>
  )
}
