# Installing AgentLink

AgentLink lets AI agents on one PC, and on other PCs of a LAN, exchange messages. This file is written so that an AI agent
(or a person) can install the **Claude Code plugin** from this repository without any other help.

> **If you are an AI agent:** follow the steps in order. Step 3 changes the user's Claude Code configuration, so **ask the user
> before running it** and tell them what it does (listed below). Do not edit `~/.claude/settings.json` by hand; the commands
> below do it correctly.

## 1. What you need

| Requirement | Check | Notes |
|---|---|---|
| Windows 11 | | The local API uses Windows named pipes. Other systems are not supported yet. |
| Node.js 22.13 or newer, on `PATH` | `node --version` | The plugin's hooks and servers run `node`; the daemon uses the built-in `node:sqlite`. |
| Claude Code with plugin support | `claude --version`, `claude plugin --help` | The `claude` command must be on `PATH` (or set `CLAUDE_BIN` to the path of `claude.exe`). |

The installer script in step 2 checks all of this and tells you what is missing. Nothing else has to be installed: the plugin
ships as a self-contained bundle (no `npm install`, no build).

## 2. Look at the plan (changes nothing)

Pick one way to get the installer.

**A. Clone the repository** (recommended; it also gives you the docs and the source):

```
git clone https://github.com/schiva/ai-sendmessage.git
cd ai-sendmessage
node scripts/install.mjs
```

**B. Without cloning** (the script then registers the marketplace from GitHub):

```
curl -fsSL https://raw.githubusercontent.com/schiva/ai-sendmessage/main/scripts/install.mjs -o install-agentlink.mjs
node install-agentlink.mjs
```

Read the script before you run a downloaded file; it is short and has no dependencies.

Without `--yes` the script only prints the plan and exits with code **3**. Example:

```
Plan (install):
  - register the marketplace "agentlink-marketplace" from <this clone, or schiva/ai-sendmessage>
  - install agentlink@agentlink-marketplace (scope user)
NOT CHANGED. ...
```

## 3. Ask the user, then install

Tell the user, in your own words:

- It registers this repository as a Claude Code plugin marketplace and installs the plugin `agentlink@agentlink-marketplace`.
- It changes the user's Claude Code configuration: the plugin registry and plugin cache under `~/.claude`, and the settings
  file of the chosen scope.
- Afterwards **every Claude Code session in that scope** runs the AgentLink hooks (small `node` processes at session start, on
  each prompt, after each tool call, and at the end) and an MCP server, and a background daemon starts on first use.
- It can be undone with one command (step 7).

Scope: `user` (default) means every project of this user; `project` writes to the project's `.claude/settings.json` (shared
with the team through git); `local` is this project and this user only. When in doubt use `user`.

After the user agrees:

```
node scripts/install.mjs --yes                    # or: --yes --scope project
```

The script is safe to run twice, never prompts, and verifies the result. Add `--json` for machine-readable output.

**Without the script** (equivalent, no checks):

```
claude plugin marketplace add schiva/ai-sendmessage
claude plugin install agentlink@agentlink-marketplace
```

## 4. Verify

```
claude plugin list
```

must show `agentlink@agentlink-marketplace` with `Status: enabled` (the script already checks this).

The plugin is loaded by **new** Claude Code sessions. In a session that is already open, run `/reload-plugins`. In the new
session the MCP server `plugin:agentlink:agentlink` is connected and these tools exist:

`mcp__plugin_agentlink_agentlink__send_message`, `__list_agents`, `__read_inbox`, `__ack_messages`

Optional check without starting a session (does not use the model): after cloning, `node plugin/agentlink/dist/agentctl.mjs ping`
starts the daemon and prints its host name.

## 5. Using it

- Each session registers as an agent. Name it with the environment variable `AGENTLINK_NAME` (otherwise
  `<folder name>-<first 4 characters of the session id>`).
- Ask Claude to message another agent ("send build finished to reviewer"), or use `list_agents` first.
- Messages that arrive are shown to Claude with the next prompt, right after a tool call, or when a turn ends. They are
  always labelled as untrusted input from another agent.
- A session that is completely idle is woken by the **idle watcher**: at session start Claude is told to run
  `agentctl wake --agent <id>` as a background command. It waits without reading anything (it never prints message text) and
  exits when a message arrives, which starts a new turn; Claude then calls `read_inbox` and starts the watcher again. Messages
  that arrive together are counted once (the watcher settles for 2 s). At most 10 wake-ups per 10 minutes, the rest wait for the next
  prompt. If Claude forgets to start the watcher, the Stop hook asks for it before the session goes idle (at most twice in a row).
  The watcher ends silently when its Claude process is gone and after 12 hours. Without the watcher an idle session receives messages with its next
  input. Set `AGENTLINK_NO_WAKE=1` to turn the instruction off.
- `agentctl` (from the plugin's `bin/`) is on the PATH of Claude's Bash tool: `agentctl list`, `agentctl peers`.
- To connect another PC, run `agentctl pair` on one PC and `agentctl pair <code>` on the other (see [docs/LAN.md](docs/LAN.md)). To restrict who may message whom, see
  [docs/ACL.md](docs/ACL.md).

## 6. Update

```
claude plugin marketplace update agentlink-marketplace
claude plugin update agentlink@agentlink-marketplace
```

Then, **in this order**:

1. In every open Claude Code session run `/reload-plugins` (or end the session and start a new one). This replaces the session's
   hooks and its MCP server, which are still the old version.
2. Run `agentctl stop`. It ends the daemon, which still has the old code; the next command starts the new one.
3. Check `agentctl ping` (it prints `agentd <version>`) and `claude plugin list`. If the daemon is not the installed version,
   `agentctl` prints a warning that names both versions.

Why the order matters: a daemon that is stopped while an old-version component is still running comes back as the old version,
because that component starts it again. This happens with the MCP server of a session that was not reloaded, and with idle
watchers (`agentctl wake`) of version 0.2.0 and older (they end when their session ends, or kill the `agentctl.mjs wake`
process). Watchers of 0.2.1 and later never start a daemon.

If `plugin update` says "already at the latest version" although the repository has newer commits, those commits did not change
the version number: uninstall and install the plugin again (step 7, then step 3).

## 7. Uninstall

```
node scripts/install.mjs --uninstall --yes [--remove-marketplace]
```

(or `claude plugin uninstall agentlink@agentlink-marketplace`). A running daemon is not stopped by this; stop it with
`node plugin/agentlink/dist/agentctl.mjs stop`, or `agentctl stop` inside a Claude session. Its data stays in
`%LOCALAPPDATA%\AgentLink` (delete the folder to remove it).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Script exits **3** | It is waiting for the user's consent. Ask, then rerun with `--yes`. |
| Script exits **2**: Node too old / not found | Install Node.js 22.13 or newer and make sure `node` is on `PATH`. |
| Script exits **2**: Claude Code not found | Install Claude Code, put `claude` on `PATH`, or set `CLAUDE_BIN`. |
| `claude plugin marketplace` is missing | This Claude Code is too old for plugins. Update it. |
| Marketplace "already registered" from another source | The script keeps the existing registration. To switch, run `node scripts/install.mjs --uninstall --yes --remove-marketplace`, then install again. |
| Installed, but the tools are not there | Start a new session or run `/reload-plugins`. Check `claude plugin list` for errors. |
| Old behaviour after a plugin update | A daemon from the previous version is still running: `agentctl stop`, then use it again. |
| Hooks run twice | The manual setup from `npm run claude:config` is also active. Remove it when using the plugin. |
| Organisation policy blocks plugins or marketplaces | An administrator must allow the `agentlink-marketplace` source (`strictKnownMarketplaces` / `blockedMarketplaces`). |

## For other AI tools (not Claude Code)

The plugin format is specific to Claude Code. Any MCP-capable agent can use the same message tools by registering the bundled
MCP server (from a clone, the path of the `plugin/agentlink/dist` folder must stay intact because the server starts the daemon
that sits next to it):

```
command: node
args:    --no-warnings  <clone>/plugin/agentlink/dist/mcp-server.mjs
env:     AGENTLINK_NAME=<name of this agent>   AGENTLINK_KIND=<kind, e.g. codex>
```

This works with a generic MCP client and is covered by the tests, but it has **not** been tried with specific tools such as
Codex CLI or Gemini CLI. Programs you write yourself can use the SDK; see [docs/SDK.md](docs/SDK.md).
