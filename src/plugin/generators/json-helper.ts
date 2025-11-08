/**
 * Stringify a JSON object to an escaped string.
 *
 * For example `{"key": "value"}` will be converted to `"{\"key\": \"value\"}"`
 *
 * @param manifestJson - The JSON object to stringify
 * @returns The escaped string representation of the JSON object
 */
export function stringifyJsonToString(manifestJson: object): string {
  // Use double stringify - the outer one will escape the inner JSON string properly
  return JSON.stringify(JSON.stringify(manifestJson))
}
