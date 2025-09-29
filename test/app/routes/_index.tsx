import { Trans } from "@lingui/react/macro"
import { LocaleLink } from "lingui-react-router"

export default function Index() {
  return (
    <div>
      <LocaleLink to="/hello">
        <Trans>Continue</Trans>
      </LocaleLink>
    </div>
  )
}
