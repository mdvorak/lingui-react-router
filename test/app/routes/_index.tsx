import { LocaleLink } from "lingui-react-router"
import { Trans } from "@lingui/react/macro"

export default function Index() {
  return (
    <div>
      <LocaleLink to="/hello" className="border-foreground border-1 rounded-md p-2 hover:bg-gray-400">
        <Trans context="nav">Continue</Trans>
      </LocaleLink>
    </div>
  )
}
