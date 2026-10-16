// The one version number of AgentLink: `version` in package.json. The plugin bundle gets it from the build (scripts/build-plugin.mjs
// defines __AGENTLINK_VERSION__ and writes it into plugin.json and marketplace.json); from source it is read from package.json.
import fs from 'node:fs'

declare const __AGENTLINK_VERSION__: string | undefined

export const VERSION: string =
  typeof __AGENTLINK_VERSION__ === 'string' ? __AGENTLINK_VERSION__ : (JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version

/** A sentence for the user when the running daemon is not the version of the client (an update that did not restart the daemon), else null. */
export function versionMismatchNote(daemonVersion: string, ownVersion: string = VERSION): string | null {
  if (daemonVersion === ownVersion) return null
  return (
    `the running AgentLink daemon is version ${daemonVersion} but this installation is ${ownVersion}. ` +
    'Run "agentctl stop" to replace it; the next command starts the new one. End idle watchers (agentctl wake) of version 0.2.0 or older first, they would restart the old daemon.'
  )
}
