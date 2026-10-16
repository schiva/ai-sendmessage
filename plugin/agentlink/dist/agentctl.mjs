import { createRequire as __agentlinkCreateRequire } from 'node:module'; const require = __agentlinkCreateRequire(import.meta.url);

// src/client/agentctl.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { parseArgs } from "node:util";

// src/client/client.ts
import net from "node:net";
import fs from "node:fs";
import path2 from "node:path";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";

// src/agentd/config.ts
import os from "node:os";
import path from "node:path";
function sanitize(s) {
  return s.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 64) || "user";
}
function homeDir() {
  if (process.env.AGENTLINK_HOME) return process.env.AGENTLINK_HOME;
  const base = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  return path.join(base, "AgentLink");
}
function pipePath() {
  if (process.env.AGENTLINK_PIPE) return process.env.AGENTLINK_PIPE;
  return `\\\\.\\pipe\\agentlink-${sanitize(os.userInfo().username)}`;
}

// src/client/client.ts
var ApiCallError = class extends Error {
  code;
  data;
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
};
var DAEMON_PATH = fileURLToPath(new URL(import.meta.url.endsWith(".mjs") ? "./agentd.mjs" : "../agentd/main.ts", import.meta.url));
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function tryConnect(pipe) {
  return new Promise((resolve, reject) => {
    const s = net.connect(pipe);
    s.once("connect", () => {
      s.off("error", reject);
      resolve(s);
    });
    s.once("error", reject);
  });
}
function startDaemon(env) {
  const child = spawn(process.execPath, ["--no-warnings", DAEMON_PATH], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env
  });
  child.unref();
}
async function connectWithAutostart(pipe, autostart, env, home) {
  try {
    return await tryConnect(pipe);
  } catch (e) {
    const code = e.code;
    if (!autostart || code !== "ENOENT" && code !== "ECONNREFUSED") throw e;
  }
  startDaemon(env);
  const deadline = Date.now() + 8e3;
  let last;
  while (Date.now() < deadline) {
    await sleep(100);
    try {
      return await tryConnect(pipe);
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`agentd did not start within 8s (${String(last?.message ?? last)}); see ${path2.join(home, "agentd.log")}`);
}
async function readToken(home) {
  const file = path2.join(home, "token");
  for (let i = 0; i < 30; i++) {
    try {
      const t = fs.readFileSync(file, "utf8").trim();
      if (t) return t;
    } catch {
    }
    await sleep(100);
  }
  throw new Error(`cannot read the agentd token at ${file}`);
}
var Client = class _Client extends EventEmitter {
  hello;
  socket;
  nextId = 1;
  pending = /* @__PURE__ */ new Map();
  buf = "";
  constructor(socket) {
    super();
    this.socket = socket;
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => this.onData(chunk));
    socket.on("close", () => {
      for (const p of this.pending.values()) p.reject(new Error("connection to agentd closed"));
      this.pending.clear();
      this.emit("close");
    });
    socket.on("error", () => {
    });
  }
  /**
   * By default this talks to the daemon of the current user. `pipe`, `home` and `env` address another daemon
   * (used to run several hosts on one PC for tests); `env` is also what an auto-started daemon receives.
   */
  static async connect(opts = {}) {
    const env = { ...process.env, ...opts.env };
    if (opts.pipe) env.AGENTLINK_PIPE = opts.pipe;
    if (opts.home) env.AGENTLINK_HOME = opts.home;
    const pipe = opts.pipe ?? opts.env?.AGENTLINK_PIPE ?? pipePath();
    const home = opts.home ?? opts.env?.AGENTLINK_HOME ?? homeDir();
    const socket = await connectWithAutostart(pipe, opts.autostart ?? true, env, home);
    const c = new _Client(socket);
    const token = await readToken(home);
    c.hello = await c.request("hello", { v: 1, client: "agentlink-client", token });
    return c;
  }
  onData(chunk) {
    this.buf += chunk;
    let nl;
    while ((nl = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, nl).trim();
      this.buf = this.buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.event) {
        this.emit("event", msg.event, msg.data);
        this.emit(msg.event, msg.data);
        continue;
      }
      const p = typeof msg.id === "number" ? this.pending.get(msg.id) : void 0;
      if (!p) continue;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new ApiCallError(msg.error.code, msg.error.message, msg.error.data));
      else p.resolve(msg.result);
    }
  }
  request(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.socket.write(JSON.stringify({ id, method, params }) + "\n", (err) => {
        if (err) {
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }
  close() {
    this.socket.destroy();
  }
};

// src/version.ts
var VERSION = true ? "0.2.3" : JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
function versionMismatchNote(daemonVersion, ownVersion = VERSION) {
  if (daemonVersion === ownVersion) return null;
  return `the running AgentLink daemon is version ${daemonVersion} but this installation is ${ownVersion}. Run "agentctl stop" to replace it; the next command starts the new one. End idle watchers (agentctl wake) of version 0.2.0 or older first, they would restart the old daemon.`;
}

// src/client/wake.ts
import fs2 from "node:fs";
import path3 from "node:path";
import { spawnSync } from "node:child_process";
var WAKE_KINDS = /* @__PURE__ */ new Set(["message", "idle_notice"]);
function stateFile(agent) {
  return path3.join(homeDir(), "hook-state", `${agent.replace(/[^A-Za-z0-9_-]/g, "_")}.wake.json`);
}
function readState(agent) {
  try {
    const s = JSON.parse(fs2.readFileSync(stateFile(agent), "utf8"));
    return { pid: Number(s.pid) || 0, ts: Number(s.ts) || 0, wakes: Array.isArray(s.wakes) ? s.wakes.filter((n) => typeof n === "number") : [], stop: s.stop === true };
  } catch {
    return { pid: 0, ts: 0, wakes: [] };
  }
}
function writeState(agent, s) {
  try {
    fs2.mkdirSync(path3.dirname(stateFile(agent)), { recursive: true });
    fs2.writeFileSync(stateFile(agent), JSON.stringify(s));
  } catch {
  }
}
function wakeOptionsFromEnv(agent) {
  const num = (name, def) => {
    const v = Number(process.env[name]);
    return Number.isFinite(v) && v > 0 ? v : def;
  };
  return {
    agent,
    pollMs: Math.min(num("AGENTLINK_WAKE_POLL_MS", 5e3), 3e4),
    maxMs: num("AGENTLINK_WAKE_MAX_MS", 12 * 60 * 60 * 1e3),
    maxWakes: num("AGENTLINK_WAKE_MAX_WAKES", 10),
    windowMs: num("AGENTLINK_WAKE_WINDOW_MS", 10 * 60 * 1e3),
    settleMs: process.env.AGENTLINK_WAKE_SETTLE_MS === void 0 ? 2e3 : Math.max(0, Number(process.env.AGENTLINK_WAKE_SETTLE_MS) || 0)
  };
}
function pidExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}
function findSessionPid() {
  const forced = process.env.AGENTLINK_WAKE_SESSION_PID;
  if (forced !== void 0) {
    const n2 = Number(forced);
    return Number.isInteger(n2) && n2 > 0 ? n2 : null;
  }
  if (process.platform !== "win32") return null;
  const script = `$id=${process.ppid}; for($i=0;$i -lt 12 -and $id;$i++){ $p=Get-CimInstance Win32_Process -Filter "ProcessId=$id"; if(-not $p){break}; if($p.Name -match '^claude(.exe)?$' -or ($p.Name -eq 'node.exe' -and $p.CommandLine -match '@anthropic-ai[\\/]claude-code')){ $p.ProcessId; break }; $id=$p.ParentProcessId }`;
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", timeout: 1e4, windowsHide: true });
  const n = Number(r.stdout?.trim());
  return r.status === 0 && Number.isInteger(n) && n > 0 ? n : null;
}
function sessionAliveCheck(pid) {
  return pid === null ? void 0 : () => pidExists(pid);
}
function wakeCommand(agentctlFile, agent) {
  return `node --no-warnings "${agentctlFile.replace(/\\/g, "/")}" wake --agent ${agent}`;
}
var sleep2 = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForWake(connect, o) {
  const deadline = Date.now() + o.maxMs;
  let client = null;
  writeState(o.agent, { ...readState(o.agent), stop: false });
  try {
    for (; ; ) {
      if (Date.now() > deadline) return { reason: "timeout" };
      if (o.isSessionAlive && !o.isSessionAlive()) return { reason: "session-gone" };
      try {
        client ??= await connect();
        const st = readState(o.agent);
        if (st.stop) return { reason: "stopped" };
        writeState(o.agent, { ...st, pid: process.pid, ts: Date.now() });
        const r = await client.request("inbox", { agent: o.agent, mode: "peek", state: "new", limit: 50, wait_ms: o.pollMs });
        let wakeable = r.messages.filter((m) => WAKE_KINDS.has(m.kind)).length;
        if (wakeable > 0 && o.settleMs > 0) {
          await sleep2(o.settleMs);
          const again = await client.request("inbox", { agent: o.agent, mode: "peek", state: "new", limit: 50 });
          wakeable = Math.max(wakeable, again.messages.filter((m) => WAKE_KINDS.has(m.kind)).length);
        }
        if (wakeable > 0) {
          const now = Date.now();
          const recent = readState(o.agent).wakes.filter((t) => now - t < o.windowMs);
          if (recent.length < o.maxWakes) {
            writeState(o.agent, { pid: 0, ts: 0, wakes: [...recent, now] });
            return { reason: "message", count: wakeable };
          }
          await sleep2(Math.min(3e4, o.pollMs));
        } else if (r.messages.length > 0) {
          await sleep2(Math.min(5e3, o.pollMs));
        }
      } catch (e) {
        if (e instanceof ApiCallError && e.code === "NOT_REGISTERED") throw e;
        client?.close();
        client = null;
        await sleep2(Math.min(2e3, o.pollMs));
      }
    }
  } finally {
    client?.close();
    const st = readState(o.agent);
    writeState(o.agent, { ...st, pid: 0, ts: 0, stop: false });
  }
}
function watcherAgents() {
  try {
    return fs2.readdirSync(path3.join(homeDir(), "hook-state")).map((f) => /^(.+)\.wake\.json$/.exec(f)?.[1]).filter((a) => typeof a === "string");
  } catch {
    return [];
  }
}
function isWatcherProcess(pid) {
  if (process.platform !== "win32") return false;
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`], {
    encoding: "utf8",
    timeout: 1e4,
    windowsHide: true
  });
  const line = r.status === 0 ? r.stdout ?? "" : "";
  return /agentctl\.(mjs|ts)/.test(line) && /\swake(\s|$)/.test(line);
}
async function gone(pid, ms) {
  const end = Date.now() + ms;
  while (pidExists(pid)) {
    if (Date.now() > end) return false;
    await sleep2(100);
  }
  return true;
}
async function stopWatchers(agent, graceMs = 8e3) {
  const reports = [];
  for (const a of agent ? [agent] : watcherAgents()) {
    const st = readState(a);
    if (st.pid === 0 || !pidExists(st.pid)) {
      if (st.pid !== 0) writeState(a, { ...st, pid: 0, ts: 0, stop: false });
      reports.push({ agent: a, pid: st.pid, how: "not-running" });
      continue;
    }
    writeState(a, { ...st, stop: true });
    if (await gone(st.pid, graceMs)) {
      reports.push({ agent: a, pid: st.pid, how: "requested" });
      continue;
    }
    if (!isWatcherProcess(st.pid)) {
      writeState(a, { ...readState(a), stop: false });
      reports.push({ agent: a, pid: st.pid, how: "refused", detail: "the recorded PID is not an agentctl watcher (not touched)" });
      continue;
    }
    try {
      process.kill(st.pid);
    } catch (e) {
      reports.push({ agent: a, pid: st.pid, how: "refused", detail: String(e instanceof Error ? e.message : e) });
      continue;
    }
    const ended = await gone(st.pid, 3e3);
    writeState(a, { ...readState(a), pid: ended ? 0 : st.pid, ts: 0, stop: false });
    reports.push(ended ? { agent: a, pid: st.pid, how: "killed" } : { agent: a, pid: st.pid, how: "refused", detail: "it did not end" });
  }
  return reports;
}

// src/client/agentctl.ts
var USAGE = `agentctl - AgentLink command line client

Usage: agentctl [options] <command> [args]

Identity (for every command except ping, stop, peers, pair and acl):
  --as <name>        act as the agent <name> (registered under the key "cli:<name>")
  --agent <id>       act as an already registered agent id (or set AGENTLINK_AGENT)

Commands:
  register           register the agent and print its id and address
  unregister         mark the agent offline
  send <to> <text\u2026>  send a message (to: name | name@host | name@host [ref])
  list [--local]     list other agents
  inbox              read new messages (marks them delivered); --peek keeps them new
  ack <id\u2026>          acknowledge messages
  status <busy|idle> set the agent status
  idle-notify <to>   ask for one notice when <to> becomes idle
  watch              stream incoming messages until interrupted
  wake               wait, without reading anything, until a message is waiting, then print one line and exit.
                     Run it as a background command in a Claude Code session so a message wakes the idle session.
  wake --stop        end the idle watcher of --agent <id>, or of every agent when none is given. Asks the watcher to end;
                     one that does not answer is ended by its recorded PID (checked to be a watcher). Needs no daemon.
  ping               start agentd if needed and print its info
  acl [reload]       show the ACL (who may send to whom); reload re-reads acl.json
  acl check <from> <to>  ask whether name@host may send to name@host
  peers [reload]     show LAN links, the certificate fingerprint of this host, and re-read peers.json
  pair               connect two PCs: prints a one-time code (valid 10 minutes), then waits for the other PC
  pair <code>        on the other PC: join with that code; both PCs then know each other
  stop               shut agentd down

Options:
  --json             print raw JSON
  --kind <kind>      agent kind for register (default "cli")
  --cwd <dir>        working directory shown in list (default: current directory)
  --summary <text>   short label for send
  --reply-to <id>    id of the message you are answering
  --limit <n>        max messages for inbox (default 20)
  --wait <ms>        for inbox: wait up to <ms> for a new message
  --state <s>        inbox state filter: new | delivered | acked | any
  --peek             inbox without changing message state
  --address <ip>     for pair: the IP of this PC that the other PC should use (default: detected)
  --port <n>         for pair: LAN port (default 7420)
  --ttl <seconds>    for pair: how long the code is valid (default 600)
`;
var { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    as: { type: "string" },
    agent: { type: "string" },
    json: { type: "boolean" },
    kind: { type: "string" },
    cwd: { type: "string" },
    summary: { type: "string" },
    "reply-to": { type: "string" },
    limit: { type: "string" },
    wait: { type: "string" },
    state: { type: "string" },
    peek: { type: "boolean" },
    stop: { type: "boolean" },
    local: { type: "boolean" },
    address: { type: "string" },
    port: { type: "string" },
    ttl: { type: "string" },
    help: { type: "boolean", short: "h" }
  }
});
var [command, ...rest] = positionals;
function out(obj, human) {
  console.log(values.json ? JSON.stringify(obj, null, 2) : human);
}
function fail(code, msg) {
  console.error(msg);
  process.exit(code);
}
async function main() {
  if (!command || values.help) {
    console.log(USAGE);
    return;
  }
  if (command === "wake" && values.stop) {
    const reports = await stopWatchers(values.agent ?? process.env.AGENTLINK_AGENT);
    const describe = (r) => {
      if (r.how === "not-running") return "no watcher running";
      if (r.how === "requested") return `watcher (pid ${r.pid}) stopped`;
      if (r.how === "killed") return `watcher (pid ${r.pid}) did not answer and was ended by its PID`;
      return `not stopped: ${r.detail ?? "unknown reason"}`;
    };
    out(reports, reports.length === 0 ? "no idle watcher found" : reports.map((r) => `${r.agent}: ${describe(r)}`).join("\n"));
    process.exit(reports.some((r) => r.how === "refused") ? 1 : 0);
  }
  const client = await Client.connect({ autostart: command !== "stop" });
  const mismatch = command === "stop" ? null : versionMismatchNote(client.hello.server_version);
  if (mismatch) console.error(`warning: ${mismatch}`);
  if (command === "ping") {
    out(client.hello, `agentd ${client.hello.server_version} host=${client.hello.host} pid=${client.hello.pid} lease=${client.hello.lease_ms}ms`);
    client.close();
    return;
  }
  if (command === "acl") {
    if (rest[0] === "check") {
      if (!rest[1] || !rest[2]) fail(2, "usage: agentctl acl check <from name@host> <to name@host>");
      const r2 = await client.request("acl_check", { from: rest[1], to: rest[2] });
      out(r2, `${r2.allowed ? "ALLOWED" : "DENIED"}: ${rest[1]} -> ${rest[2]} (${r2.reason})`);
      client.close();
      process.exit(r2.allowed ? 0 : 1);
    }
    const r = await client.request(rest[0] === "reload" ? "reload_acl" : "acl");
    const lines = [
      `default: ${r.default}${r.fail_closed ? "  (FAIL CLOSED: acl.json is unusable, all sending is blocked)" : ""}`,
      ...r.rules.length === 0 ? ["rules:   (none)"] : r.rules.map((x, i) => `rule ${i + 1}: ${x}`),
      ...r.errors.map((e) => `error:   ${e}`)
    ];
    out(r, lines.join("\n"));
    client.close();
    return;
  }
  if (command === "peers") {
    const r = await client.request(rest[0] === "reload" ? "reload_peers" : "peers");
    const lines = [
      `host:        ${r.host ?? client.hello.host}`,
      `fingerprint: ${r.fingerprint ?? "(starting)"}`,
      `listening:   ${r.listening ? `${r.listening.host}:${r.listening.port}` : "no"}${r.listen_error ? ` (error: ${r.listen_error})` : ""}`,
      ...(r.config_errors ?? []).map((e) => `config error: ${e}`),
      ...(r.peers ?? []).length === 0 ? ["peers:       (none configured; add peers.json to the AgentLink data folder)"] : (r.peers ?? []).map((p) => `peer ${p.host.padEnd(16)} ${p.link.padEnd(5)} queued=${p.queued}${p.error ? `  last error: ${p.error}` : ""}`)
    ];
    out(r, lines.join("\n"));
    client.close();
    return;
  }
  if (command === "pair") {
    const sleep3 = (ms) => new Promise((r2) => setTimeout(r2, ms));
    const linkUp = async (host) => {
      const s = await client.request("peers");
      return s.peers?.find((p) => p.host === host)?.link === "up";
    };
    if (rest[0]) {
      const r2 = await client.request("pair_join", { code: rest.join("") });
      console.log(`Paired with ${r2.host} (${r2.address}:${r2.port}). Waiting for the link...`);
      let up = false;
      for (let i = 0; i < 20 && !up; i++) {
        up = await linkUp(r2.host);
        if (!up) await sleep3(1e3);
      }
      console.log(up ? `Connected to ${r2.host}. Agents there are now visible as name@${r2.host}.` : `Paired, but the link to ${r2.host} is not up yet. Check "agentctl peers" in a moment.`);
      client.close();
      return;
    }
    const r = await client.request("pair_start", {
      address: values.address,
      port: values.port ? Number(values.port) : void 0,
      ttl_s: values.ttl ? Number(values.ttl) : void 0
    });
    console.log(`On the other PC run:

  agentctl pair ${r.code}
`);
    console.log(`This PC is "${r.host}" at ${r.address}:${r.port}. The code works once and expires in ${Math.round(r.expires_s / 60)} min.`);
    if (process.platform === "win32") {
      const fw = spawnSync2("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "(Get-NetFirewallRule -DisplayName 'AgentLink*' -ErrorAction SilentlyContinue | Measure-Object).Count"], { encoding: "utf8", timeout: 1e4 });
      if (fw.status === 0 && fw.stdout.trim() === "0") {
        console.log(`
No firewall rule for AgentLink found. If the other PC cannot connect, run this once in an administrator PowerShell:

  New-NetFirewallRule -DisplayName "AgentLink" -Direction Inbound -Protocol TCP -LocalPort ${r.port} -RemoteAddress LocalSubnet -Action Allow`);
      }
    }
    console.log("\nWaiting for the other PC (Ctrl+C to cancel)...");
    process.on("SIGINT", () => {
      client.request("pair_cancel").catch(() => {
      }).finally(() => process.exit(130));
    });
    for (; ; ) {
      await sleep3(1e3);
      const s = await client.request("pair_status");
      if (s.state === "waiting") continue;
      if (s.state === "paired" && s.host) {
        let up = false;
        for (let i = 0; i < 20 && !up; i++) {
          up = await linkUp(s.host);
          if (!up) await sleep3(1e3);
        }
        console.log(up ? `Paired with ${s.host} and connected.` : `Paired with ${s.host}. The link comes up as soon as that PC connects (see "agentctl peers").`);
        client.close();
        return;
      }
      fail(1, `Pairing ${s.state}${s.detail ? `: ${s.detail}` : ""}. Run "agentctl pair" again.`);
    }
  }
  if (command === "stop") {
    await client.request("shutdown");
    out({ stopped: true }, "agentd stopping");
    client.close();
    return;
  }
  let agent = values.agent ?? process.env.AGENTLINK_AGENT;
  if (!agent && values.as) {
    const r = await client.request("register", {
      name: values.as,
      kind: values.kind ?? "cli",
      cwd: values.cwd ?? process.cwd(),
      key: `cli:${values.as}`
    });
    agent = r.agent;
    if (command === "register") {
      out(r, `${r.agent}  ${r.address}`);
      client.close();
      return;
    }
  }
  if (!agent) fail(2, "no identity: pass --as <name> or --agent <id> (or set AGENTLINK_AGENT)");
  switch (command) {
    case "unregister": {
      await client.request("unregister", { agent });
      out({}, "unregistered");
      break;
    }
    case "send": {
      const [to, ...words] = rest;
      if (!to || words.length === 0) fail(2, "usage: agentctl send <to> <text\u2026>");
      const r = await client.request("send", {
        agent,
        to,
        message: words.join(" "),
        summary: values.summary,
        reply_to: values["reply-to"]
      });
      out(r, `${r.status}: ${r.id} -> ${r.to}`);
      break;
    }
    case "list": {
      const r = await client.request("list", { agent, scope: values.local ? "local" : "all" });
      const hostLines = (r.hosts ?? []).map((h) => `host ${h.host}: link ${h.link}${h.queued ? `, ${h.queued} queued` : ""}${h.error ? ` (${h.error})` : ""}`);
      const lines = [`self: ${r.self}`, ...hostLines, ...r.agents.map((a) => `${a.status.padEnd(7)} ${a.address} [${a.ref}]  kind=${a.kind} unread=${a.unread}${a.cwd ? ` cwd=${a.cwd}` : ""}`)];
      out(r, lines.join("\n"));
      break;
    }
    case "inbox": {
      const r = await client.request("inbox", {
        agent,
        mode: values.peek ? "peek" : "take",
        limit: values.limit ? Number(values.limit) : void 0,
        wait_ms: values.wait ? Number(values.wait) : void 0,
        state: values.state
      });
      if (r.messages.length === 0) out(r, "(no messages)");
      else out(r, r.messages.map((m) => `[${m.id}] from ${m.from} (${m.kind}, ${m.state})
${m.message}`).join("\n\n"));
      break;
    }
    case "ack": {
      if (rest.length === 0) fail(2, "usage: agentctl ack <id\u2026>");
      const r = await client.request("ack", { agent, ids: rest });
      out(r, `acked ${r.acked}`);
      break;
    }
    case "status": {
      const s = rest[0];
      if (s !== "busy" && s !== "idle") fail(2, "usage: agentctl status <busy|idle>");
      const r = await client.request("heartbeat", { agent, status: s });
      out(r, `status ${s}, unread ${r.unread}`);
      break;
    }
    case "idle-notify": {
      if (!rest[0]) fail(2, "usage: agentctl idle-notify <to>");
      const r = await client.request("notify_when_idle", { agent, target: rest[0] });
      out(r, r.immediate ? "target is already idle; notice queued" : "subscribed");
      break;
    }
    case "wake": {
      let first = client;
      const r = await waitForWake(async () => {
        const c = first ?? await Client.connect({ autostart: false });
        first = null;
        return c;
      }, { ...wakeOptionsFromEnv(agent), isSessionAlive: sessionAliveCheck(findSessionPid()) });
      if (r.reason === "session-gone") return;
      if (r.reason === "message") {
        const n = r.count;
        console.log(
          `AgentLink: ${n} new message${n === 1 ? "" : "s"} arrived while this session was idle. Call read_inbox to read ${n === 1 ? "it" : "them"}, then start the watcher again in the background: ${wakeCommand(fileURLToPath2(import.meta.url), agent)}`
        );
      } else if (r.reason === "stopped") {
        console.log(`AgentLink: the idle watcher was stopped on request (agentctl wake --stop). Start it again once you want to be woken by messages: ${wakeCommand(fileURLToPath2(import.meta.url), agent)}`);
      } else {
        console.log(`AgentLink: the watcher stopped after its time limit. Start it again if you still want to be woken: ${wakeCommand(fileURLToPath2(import.meta.url), agent)}`);
      }
      return;
    }
    case "watch": {
      await client.request("subscribe", { agent, events: ["message", "idle"] });
      client.on("event", (name, data) => {
        console.log(values.json ? JSON.stringify({ event: name, data }) : `[${name}] from ${data.from}: ${data.message}`);
      });
      await new Promise((resolve) => client.once("close", () => resolve()));
      return;
    }
    default:
      fail(2, `unknown command "${command}"

${USAGE}`);
  }
  client.close();
}
main().catch((e) => {
  if (e instanceof ApiCallError) fail(1, `${e.code}: ${e.message}`);
  fail(1, e instanceof Error ? e.message : String(e));
});
