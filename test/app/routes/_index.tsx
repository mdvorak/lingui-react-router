import { LocaleLink } from "lingui-react-router"
import { Trans } from "@lingui/react/macro"

export default function Index() {
  return (
    <div>
      <LocaleLink to="/hello">
        <Trans>Continue</Trans>
      </LocaleLink>
    </div>
  )
}
