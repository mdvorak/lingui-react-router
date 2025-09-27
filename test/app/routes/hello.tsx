import { Trans } from "@lingui/react/macro"

export default function Hello() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">
        <Trans>Hello, World!</Trans>
      </h1>
    </div>
  )
}
