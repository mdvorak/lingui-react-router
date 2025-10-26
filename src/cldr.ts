import * as availableLocalesData from "cldr-core/availableLocales.json"
import * as defaultContentData from "cldr-core/defaultContent.json"

const availableLocales = availableLocalesData.availableLocales.full
const defaultContent = defaultContentData.defaultContent

export const allLocales = [...availableLocales, ...defaultContent]
