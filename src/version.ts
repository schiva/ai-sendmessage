// The one version number of AgentLink: `version` in package.json. The plugin bundle gets it from the build (scripts/build-plugin.mjs
// defines __AGENTLINK_VERSION__ and writes it into plugin.json and marketplace.json); from source it is read from package.json.
import fs from 'node:fs'

declare const __AGENTLINK_VERSION__: string | undefined

export const VERSION: string =
  typeof __AGENTLINK_VERSION__ === 'string' ? __AGENTLINK_VERSION__ : (JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version
