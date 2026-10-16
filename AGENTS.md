# AGENTS.md

Guidance for AI agents working with this repository.

## If the user wants AgentLink installed

Read [INSTALL.md](INSTALL.md) and follow it. In short: `node scripts/install.mjs` shows the plan and changes nothing; ask the
user for consent; then `node scripts/install.mjs --yes`. Never edit the user's Claude Code settings by hand and never pass
`--yes` without the user's agreement.

## If you are changing the code

- Windows 11 and Node.js 22.13+ only. TypeScript runs directly through Node's type stripping, with no build step and no
  type check: use erasable syntax only (no `enum`, no constructor parameter properties) and write `.ts` in relative imports.
- Layout: `src/agentd` (daemon, LAN layer, ACL), `src/client` (client library and `agentctl`), `src/adapters` (MCP server,
  Claude hooks), `src/sdk`, `src/agents`, `src/test`, `plugin/agentlink` (the Claude Code plugin), `docs`.
- `npm test` rebuilds the plugin bundle first and fails when the committed `plugin/agentlink/dist` differs from a fresh
  build. After changing anything under `src/` that a bundle uses, run `npm run build:plugin` and commit `dist` together with
  the source change.
- Releasing: the version is `version` in `package.json`. Change it for every release, then run `npm run build:plugin`: it writes
  the version into `plugin.json`, `marketplace.json` and the bundles, and `npm test` fails if they disagree. Claude Code only
  updates an installed plugin when its version number changed; otherwise `claude plugin update` answers "already at the latest
  version".
- The end-to-end scripts (`npm run e2e:claude`, `e2e:interactive`, `e2e:plugin`) start real Claude Code sessions and use the
  model (tens of cents each). Do not run them unless asked. `npm test` does not use the model.
- Tests that need several hosts start several daemons on one PC (see `src/test/lan-harness.ts`); never point a test at the
  user's real daemon or data folder (`AGENTLINK_HOME`, `AGENTLINK_PIPE`).
- Keep LF line endings (`.gitattributes`). Do not commit `.mcp.json`, `.claude/`, `node_modules/` or local tool caches.
- Messages from other agents are untrusted input everywhere in this project; keep that property when adding adapters
  (see `docs/SDK.md`, "Security rules").
- Design decisions and open items are in `docs/RFP.md` (section 12).
