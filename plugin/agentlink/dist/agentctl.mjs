import { createRequire as __agentlinkCreateRequire } from 'node:module'; const require = __agentlinkCreateRequire(import.meta.url);

// src/client/agentctl.ts
import { spawnSync as spawnSync3 } from "node:child_process";
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
var DEFAULT_START_TIMEOUT_MS = 8e3;
var TOKEN_WAIT_MS = 3e3;
async function connectWithAutostart(pipe, autostart, env, home, startTimeoutMs) {
  try {
    return await tryConnect(pipe);
  } catch (e) {
    const code = e.code;
    if (!autostart || code !== "ENOENT" && code !== "ECONNREFUSED") throw e;
  }
  startDaemon(env);
  const deadline = Date.now() + startTimeoutMs;
  let last;
  while (Date.now() < deadline) {
    await sleep(100);
    try {
      return await tryConnect(pipe);
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`agentd did not start within ${Math.round(startTimeoutMs / 100) / 10}s (${String(last?.message ?? last)}); see ${path2.join(home, "agentd.log")}`);
}
async function readToken(home) {
  const file = path2.join(home, "token");
  for (let i = 0; i < TOKEN_WAIT_MS / 100; i++) {
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
    const socket = await connectWithAutostart(pipe, opts.autostart ?? true, env, home, opts.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS);
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

// src/agentd/acl-init.ts
import fs2 from "node:fs";
import path3 from "node:path";
function aclStarter(selfHost, peerHosts) {
  const rules = [{ from: `*@${selfHost}`, to: `*@${selfHost}`, action: "allow" }];
  for (const host of [...new Set(peerHosts)].filter((h) => h !== selfHost).sort()) {
    rules.push({ from: `*@${host}`, to: `*@${selfHost}`, action: "allow" });
    rules.push({ from: `*@${selfHost}`, to: `*@${host}`, action: "allow" });
  }
  return { default: "deny", rules };
}
function aclFile(home) {
  return path3.join(home, "acl.json");
}
function writeAclStarter(home, starter, force) {
  const file = aclFile(home);
  let backup = null;
  if (fs2.existsSync(file)) {
    if (!force) throw Object.assign(new Error(`${file} already exists`), { code: "EEXIST" });
    backup = `${file}.bak`;
    fs2.copyFileSync(file, backup);
  }
  fs2.mkdirSync(home, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs2.writeFileSync(tmp, JSON.stringify(starter, null, 2) + "\n");
  fs2.renameSync(tmp, file);
  return { file, backup };
}

// src/version.ts
var VERSION = true ? "0.4.0" : JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
function versionMismatchNote(daemonVersion, ownVersion = VERSION) {
  if (daemonVersion === ownVersion) return null;
  return `the running AgentLink daemon is version ${daemonVersion} but this installation is ${ownVersion}. Run "agentctl stop" to replace it; the next command starts the new one. End idle watchers (agentctl wake) of version 0.2.0 or older first, they would restart the old daemon.`;
}

// src/client/wake.ts
import fs4 from "node:fs";
import path4 from "node:path";
import { execFile, spawnSync } from "node:child_process";

// src/client/atomic-file.ts
import fs3 from "node:fs";
import { randomBytes } from "node:crypto";
var sleepSync = (ms) => void Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function writeFileAtomic(file, data) {
  const tmp = `${file}.${process.pid}.${randomBytes(3).toString("hex")}.tmp`;
  try {
    fs3.writeFileSync(tmp, data);
    for (let attempt = 0; ; attempt++) {
      try {
        fs3.renameSync(tmp, file);
        return;
      } catch (e) {
        const code = e.code;
        if (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES") throw e;
        if (attempt >= 8) break;
        sleepSync(3);
      }
    }
    fs3.writeFileSync(file, data);
  } finally {
    try {
      fs3.rmSync(tmp, { force: true });
    } catch {
    }
  }
}
function readJsonStable(file, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    let text;
    try {
      text = fs3.readFileSync(file, "utf8");
    } catch (e) {
      if (e.code === "ENOENT") return null;
      sleepSync(5);
      continue;
    }
    try {
      return JSON.parse(text);
    } catch {
      sleepSync(5);
    }
  }
  return null;
}

// src/client/wake.ts
var WAKE_KINDS = /* @__PURE__ */ new Set(["message", "idle_notice"]);
function stateFile(agent) {
  return path4.join(homeDir(), "hook-state", `${agent.replace(/[^A-Za-z0-9_-]/g, "_")}.wake.json`);
}
function stopFile(agent) {
  return path4.join(homeDir(), "hook-state", `${agent.replace(/[^A-Za-z0-9_-]/g, "_")}.wake.stop`);
}
var stopRequested = (agent) => fs4.existsSync(stopFile(agent));
function clearStopRequest(agent) {
  try {
    fs4.rmSync(stopFile(agent), { force: true });
  } catch {
  }
}
function readState(agent) {
  const s = readJsonStable(stateFile(agent));
  if (s === null || typeof s !== "object") return { pid: 0, ts: 0, wakes: [] };
  return { pid: Number(s.pid) || 0, ts: Number(s.ts) || 0, wakes: Array.isArray(s.wakes) ? s.wakes.filter((n) => typeof n === "number") : [], stop: s.stop === true };
}
function writeState(agent, s) {
  try {
    fs4.mkdirSync(path4.dirname(stateFile(agent)), { recursive: true });
    writeFileAtomic(stateFile(agent), JSON.stringify(s));
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
  clearStopRequest(o.agent);
  writeState(o.agent, { ...readState(o.agent), stop: false });
  try {
    for (; ; ) {
      if (Date.now() > deadline) return { reason: "timeout" };
      if (o.isSessionAlive && !o.isSessionAlive()) return { reason: "session-gone" };
      try {
        client ??= await connect();
        const st = readState(o.agent);
        if (stopRequested(o.agent) || st.stop) return { reason: "stopped" };
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
    clearStopRequest(o.agent);
    const st = readState(o.agent);
    writeState(o.agent, { ...st, pid: 0, ts: 0, stop: false });
  }
}
function watcherAgents() {
  try {
    return fs4.readdirSync(path4.join(homeDir(), "hook-state")).map((f) => /^(.+)\.wake\.json$/.exec(f)?.[1]).filter((a) => typeof a === "string");
  } catch {
    return [];
  }
}
function isWatcherProcess(pid) {
  if (process.platform !== "win32") return Promise.resolve(false);
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`],
      { encoding: "utf8", timeout: 1e4, windowsHide: true },
      (err, stdout) => {
        const line = err ? "" : stdout ?? "";
        resolve(/agentctl\.(mjs|ts)/.test(line) && /\swake(\s|$)/.test(line));
      }
    );
  });
}
async function gone(pid, ms) {
  const end = Date.now() + ms;
  while (pidExists(pid)) {
    if (Date.now() > end) return false;
    await sleep2(100);
  }
  return true;
}
async function stopOne(a, graceMs) {
  const st = readState(a);
  if (st.pid === 0 || !pidExists(st.pid) || !await isWatcherProcess(st.pid)) {
    if (st.pid !== 0) writeState(a, { ...st, pid: 0, ts: 0, stop: false });
    clearStopRequest(a);
    return { agent: a, pid: st.pid, how: "not-running" };
  }
  try {
    fs4.writeFileSync(stopFile(a), "");
  } catch {
  }
  writeState(a, { ...st, stop: true });
  if (await gone(st.pid, graceMs)) {
    clearStopRequest(a);
    return { agent: a, pid: st.pid, how: "requested" };
  }
  if (!await isWatcherProcess(st.pid)) {
    clearStopRequest(a);
    writeState(a, { ...readState(a), stop: false });
    return { agent: a, pid: st.pid, how: "refused", detail: "the recorded PID is not an agentctl watcher (not touched)" };
  }
  try {
    process.kill(st.pid);
  } catch (e) {
    clearStopRequest(a);
    return { agent: a, pid: st.pid, how: "refused", detail: String(e instanceof Error ? e.message : e) };
  }
  const ended = await gone(st.pid, 3e3);
  clearStopRequest(a);
  writeState(a, { ...readState(a), pid: ended ? 0 : st.pid, ts: 0, stop: false });
  return ended ? { agent: a, pid: st.pid, how: "killed" } : { agent: a, pid: st.pid, how: "refused", detail: "it did not end" };
}
async function stopWatchers(agent, graceMs = 8e3) {
  return Promise.all((agent ? [agent] : watcherAgents()).map((a) => stopOne(a, graceMs)));
}

// src/client/join-cli.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import readline from "node:readline";
var POLL_MS = 1e3;
var LINK_WAIT_S = 15;
var DEFAULT_JOIN_TIMEOUT_S = 300;
var MAX_DIGIT_TRIES = 3;
var HOST_RE = /^[a-z0-9._-]{1,63}$/;
var ADDRESS_RE = /^(\d{1,3}(\.\d{1,3}){3}|[0-9a-fA-F:.%]{2,64})$/;
var ID_RE = /^[0-9a-f]{4}$/;
var INVALID = "<invalid>";
var safeHost = (v) => typeof v === "string" && HOST_RE.test(v) ? v : INVALID;
var safeAddress = (v) => typeof v === "string" && ADDRESS_RE.test(v) ? v : INVALID;
var safeId = (v) => typeof v === "string" && ID_RE.test(v) ? v : INVALID;
var safeText = (v, max = 200) => typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f-\u009f\s]+/g, " ").trim().slice(0, max) : "";
var safeInt = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
function formatSas(sas) {
  if (!/^\d{6}$/.test(sas)) throw new TypeError("a confirmation number has 6 digits");
  return `${sas.slice(0, 3)} ${sas.slice(3)}`;
}
function parseDigits(input) {
  const s = input.replace(/[ \t.-]/g, "");
  return /^[0-9]{6}$/.test(s) ? s : null;
}
function readPending(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const requests = (Array.isArray(r.requests) ? r.requests : []).map((item) => {
    const q = item && typeof item === "object" ? item : {};
    const rep = q.replaces && typeof q.replaces === "object" ? q.replaces : null;
    return {
      id: safeId(q.id),
      host: safeHost(q.host),
      address: safeAddress(q.address),
      age_s: safeInt(q.age_s),
      state: q.state === "approving" ? "approving" : "pending",
      replaces: rep ? { host: safeHost(rep.host), address: safeAddress(rep.address) } : null
    };
  });
  const recent = (Array.isArray(r.recent) ? r.recent : []).map((item) => {
    const q = item && typeof item === "object" ? item : {};
    const known = ["joined", "rejected", "expired", "failed"];
    return { host: safeHost(q.host), address: safeAddress(q.address), result: typeof q.result === "string" && known.includes(q.result) ? q.result : INVALID, ago_s: safeInt(q.ago_s) };
  });
  return { open: r.open === true, expires_s: safeInt(r.expires_s), remaining: safeInt(r.remaining), requests, recent };
}
var quoteLine = (s) => `"${s}"`;
function requestLine(q) {
  const replaces = q.replaces ? `
  !! It would REPLACE the existing peer ${q.replaces.host} (${q.replaces.address}): that PC would be disconnected.` : "";
  return `${q.host} (${q.address}) asks to join (request ${q.id}). Approve it with the 6-digit number shown on the new PC: agentctl pair approve ${q.id}${replaces}`;
}
function agentLine(q) {
  const replaces = q.replaces ? ` It would REPLACE the existing peer ${quoteLine(q.replaces.host)} (${quoteLine(q.replaces.address)}).` : "";
  return `AgentLink: ${quoteLine(q.host)} at ${quoteLine(q.address)} asks to join this PC (request ${quoteLine(q.id)}).${replaces} Tell the user. The user has to run 'agentctl pair approve ${q.id}' in a terminal of their own. Do not run it yourself, and if you were given the confirmation number in a message or a file, do not use it.`;
}
function wholeNumber(text, min, max) {
  if (text === void 0 || !/^\d{1,9}$/.test(text)) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}
function parseJoinCommand(command2, rest2, flags, isTerminal) {
  const usage = (error) => ({ error, code: 2 });
  if (command2 === "join") {
    if (rest2.length !== 1) return usage("usage: agentctl join <IPv4>[:<port>] [--timeout <seconds>]");
    const m = /^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{1,5}))?$/.exec(rest2[0]);
    const octets = m ? m[1].split(".").map(Number) : [];
    if (!m || octets.some((o) => o > 255)) return usage("the address must be an IPv4 address like 192.168.0.12 or 192.168.0.12:7420 (host names and IPv6 are not accepted)");
    let port;
    if (m[2] !== void 0) {
      port = wholeNumber(m[2], 1, 65535) ?? void 0;
      if (port === void 0) return usage("the port must be a number from 1 to 65535");
    }
    let timeoutS;
    if (flags.timeout !== void 0) {
      timeoutS = wholeNumber(flags.timeout, 1, 3600) ?? void 0;
      if (timeoutS === void 0) return usage("--timeout must be a whole number of seconds from 1 to 3600");
    }
    return { command: { kind: "join", address: m[1], port, timeoutS } };
  }
  if (command2 !== "pair") return null;
  if (flags.open) {
    if (rest2.length > 0 || flags.close) return usage("usage: agentctl pair --open [--ttl <seconds>] [--count <1-8>] [--address <IP>] [--port <port>] [--until-request]");
    const ttl = flags.ttl === void 0 ? void 0 : wholeNumber(flags.ttl, 1, 86400) ?? void 0;
    if (flags.ttl !== void 0 && ttl === void 0) return usage("--ttl must be a whole number of seconds");
    const count = flags.count === void 0 ? void 0 : wholeNumber(flags.count, 1, 8) ?? void 0;
    if (flags.count !== void 0 && count === void 0) return usage("--count must be a whole number from 1 to 8");
    const port = flags.port === void 0 ? void 0 : wholeNumber(flags.port, 1, 65535) ?? void 0;
    if (flags.port !== void 0 && port === void 0) return usage("--port must be a number from 1 to 65535");
    if (flags.address !== void 0 && !ADDRESS_RE.test(flags.address)) return usage("--address must be an IP address of this PC");
    return { command: { kind: "open", ttl, count, address: flags.address, port, untilRequest: flags.untilRequest === true } };
  }
  if (flags.close) {
    if (rest2.length > 0) return usage("usage: agentctl pair --close");
    return { command: { kind: "close" } };
  }
  if (rest2[0] === "pending") {
    if (rest2.length > 1) return usage("usage: agentctl pair pending [--json]");
    return { command: { kind: "pending", json: flags.json === true } };
  }
  if (rest2[0] === "approve") {
    if (rest2.length > 2) {
      return usage("The confirmation number is asked for in the terminal: do not give it on the command line. usage: agentctl pair approve [<request id>]");
    }
    if (!isTerminal) {
      return usage("pair approve must be run by a person in a terminal window of their own (standard input is not a terminal here). Open a terminal, then run: agentctl pair approve [<request id>]");
    }
    if (rest2[1] !== void 0 && !ID_RE.test(rest2[1])) {
      return /^\s*\d[\d .-]*$/.test(rest2[1]) ? usage("The confirmation number is asked for in the terminal: do not give it on the command line. usage: agentctl pair approve [<request id>]") : usage('the request id has 4 characters (0-9, a-f): see "agentctl pair pending"');
    }
    return { command: { kind: "approve", id: rest2[1] } };
  }
  return null;
}
async function runJoinCommand(cmd, cli) {
  switch (cmd.kind) {
    case "open":
      return pairOpen(cmd, cli);
    case "close":
      return pairClose(cli);
    case "pending":
      return pairPending(cmd.json, cli);
    case "approve":
      return pairApprove(cmd.id, cli);
    case "join":
      return join(cmd, cli);
  }
}
function apiProblem(e) {
  if (e instanceof ApiCallError) {
    const data = e.data && typeof e.data === "object" ? e.data : {};
    return { code: e.code, reason: typeof data.reason === "string" ? data.reason : null, message: safeText(e.message), data };
  }
  return { code: "LOCAL", reason: null, message: safeText(e instanceof Error ? e.message : String(e)), data: {} };
}
async function waitForLink(cli, host) {
  for (let i = 0; i < LINK_WAIT_S; i++) {
    try {
      const s = await cli.request("peers");
      if (s.peers?.some((p) => p.host === host && p.link === "up")) return true;
    } catch {
      return false;
    }
    await cli.sleep(POLL_MS);
  }
  return false;
}
async function withInterrupt(cli, onInterrupt, step) {
  let pressed = false;
  let wake = null;
  const off = cli.onInterrupt(() => {
    pressed = true;
    wake?.();
  });
  const isPressed = () => pressed;
  const stepRun = step(isPressed);
  const interrupt = new Promise((resolve) => {
    wake = () => resolve("interrupt");
    if (pressed) resolve("interrupt");
  });
  try {
    const first = await Promise.race([stepRun, interrupt]);
    if (first === "interrupt") {
      await onInterrupt().catch(() => {
      });
      return 130;
    }
    return first;
  } finally {
    off();
  }
}
var tick = (cli, ms) => cli.sleep(ms);
async function pairOpen(cmd, cli) {
  let opened;
  try {
    opened = await cli.request("join_open", { ttl_s: cmd.ttl, count: cmd.count, address: cmd.address, port: cmd.port });
  } catch (e) {
    const p = apiProblem(e);
    cli.err(`Could not open the join window: ${p.message || p.code}`);
    return 1;
  }
  const host = safeHost(opened.host);
  const address = safeAddress(opened.address);
  const port = safeInt(opened.port);
  const count = Math.max(1, safeInt(opened.count));
  const minutes = Math.max(1, Math.round(safeInt(opened.expires_s) / 60));
  const command2 = typeof opened.command === "string" && /^agentctl join \d{1,3}(\.\d{1,3}){3}:\d{1,5}$/.test(opened.command) ? opened.command : `agentctl join ${address}:${port}`;
  cli.out(`On the new PC run:

  ${command2}
`);
  cli.out(`This PC is "${host}" at ${address}:${port}. The window is open for ${minutes} min and admits ${count} PC${count === 1 ? "" : "s"}. Each PC needs your approval here.`);
  const note = port > 0 ? cli.firewallNote?.(port) : null;
  if (note) cli.out(`
${note}`);
  let closedByUs = false;
  const closeWindow = async () => {
    closedByUs = true;
    await cli.request("join_close");
    cli.out("Join window closed.");
  };
  return withInterrupt(cli, closeWindow, async (interrupted) => {
    cli.out(cmd.untilRequest ? "\nWaiting for the first join request (Ctrl+C to close the window)..." : "\nWaiting for join requests (Ctrl+C to close the window)...");
    const announced = /* @__PURE__ */ new Set();
    const resultCounts = /* @__PURE__ */ new Map();
    let joined = 0;
    let baseline = true;
    for (; ; ) {
      if (interrupted()) return 130;
      let view;
      try {
        view = readPending(await cli.request("join_pending"));
      } catch (e) {
        if (closedByUs) return 130;
        cli.err(`Lost the connection to the daemon: ${apiProblem(e).message}`);
        return 1;
      }
      for (const q of view.requests) {
        if (announced.has(q.id)) continue;
        announced.add(q.id);
        if (cmd.untilRequest) {
          cli.out(agentLine(q));
          return 0;
        }
        cli.out(requestLine(q));
      }
      if (!cmd.untilRequest) {
        for (const r of view.recent) {
          const key = `${r.host}|${r.address}|${r.result}`;
          const seen = resultCounts.get(key) ?? 0;
          const now = view.recent.filter((x) => `${x.host}|${x.address}|${x.result}` === key).length;
          if (now <= seen) continue;
          resultCounts.set(key, now);
          if (baseline) continue;
          if (r.result === "joined") {
            joined++;
            cli.out(`${r.host} (${r.address}) joined.`);
          } else {
            cli.out(`The request of ${r.host} (${r.address}) ended: ${r.result}.`);
          }
        }
      }
      baseline = false;
      if (!view.open) {
        if (cmd.untilRequest) {
          cli.err("The join window closed before any request arrived.");
          return 1;
        }
        cli.out(joined > 0 ? `Join window closed: ${joined} PC${joined === 1 ? "" : "s"} joined.` : "Join window closed: no PC joined.");
        return joined > 0 ? 0 : 1;
      }
      await tick(cli, POLL_MS);
    }
  });
}
async function pairClose(cli) {
  try {
    await cli.request("join_close");
  } catch (e) {
    cli.err(`Could not close the join window: ${apiProblem(e).message}`);
    return 1;
  }
  cli.out("Join window closed. Requests that were waiting are gone.");
  return 0;
}
async function pairPending(json, cli) {
  let view;
  try {
    view = readPending(await cli.request("join_pending"));
  } catch (e) {
    cli.err(`Could not read the join requests: ${apiProblem(e).message}`);
    return 1;
  }
  if (json) {
    cli.out(JSON.stringify(view, null, 2));
    return 0;
  }
  cli.out(view.open ? `Join window: open, ${Math.max(1, Math.round(view.expires_s / 60))} min left, ${view.remaining} PC${view.remaining === 1 ? "" : "s"} still to admit.` : "Join window: closed. Open one with: agentctl pair --open");
  if (view.requests.length > 0) {
    cli.out("");
    cli.out(["ID  ", "HOST".padEnd(20), "ADDRESS".padEnd(18), "WAITING".padEnd(9), "STATE".padEnd(10), "NOTE"].join(" "));
    for (const q of view.requests) {
      const note = q.replaces ? `REPLACES peer ${q.replaces.host} (${q.replaces.address})` : "";
      cli.out([q.id.padEnd(4), q.host.padEnd(20), q.address.padEnd(18), `${q.age_s} s`.padEnd(9), q.state.padEnd(10), note].join(" ").trimEnd());
    }
  } else if (view.open) {
    cli.out("No request is waiting.");
  }
  if (view.recent.length > 0) {
    cli.out("");
    cli.out("Recent:");
    for (const r of view.recent) cli.out(`  ${r.result.padEnd(9)} ${r.host} (${r.address}) ${r.ago_s} s ago`);
  }
  return 0;
}
var YES = /^(y|yes|예)$/i;
async function pairApprove(idArg, cli) {
  if (!cli.isTerminal) {
    cli.err("pair approve must be run by a person in a terminal window of their own (standard input is not a terminal here).");
    return 2;
  }
  let view;
  try {
    view = readPending(await cli.request("join_pending"));
  } catch (e) {
    cli.err(`Could not read the join requests: ${apiProblem(e).message}`);
    return 1;
  }
  const waiting = view.requests.filter((q) => q.id !== INVALID);
  if (waiting.length === 0) {
    cli.err(view.open ? "No request is waiting." : "No join window is open, so nothing can be approved. Open one with: agentctl pair --open");
    return 1;
  }
  let chosen;
  if (idArg !== void 0) {
    chosen = waiting.find((q) => q.id === idArg);
    if (!chosen) {
      cli.err(`No waiting request has the id ${idArg} (it may have expired). See: agentctl pair pending`);
      return 1;
    }
  } else {
    waiting.forEach((q, i) => cli.out(`  ${i + 1}) request ${q.id}: ${q.host} (${q.address}), waiting ${q.age_s} s${q.replaces ? `  !! REPLACES peer ${q.replaces.host}` : ""}`));
    const answer = await cli.ask(`Approve which request? Type its position (1-${waiting.length}), or q to quit: `);
    if (answer === null || /^\s*q/i.test(answer)) {
      cli.err("Cancelled. Nothing was approved.");
      return 1;
    }
    const index = /^\s*\d{1,2}\s*$/.test(answer) ? Number(answer) : 0;
    chosen = waiting[index - 1];
    if (!chosen) {
      cli.err("That is not one of the listed positions. Nothing was approved.");
      return 1;
    }
  }
  cli.out(`Request ${chosen.id}: "${chosen.host}" at ${chosen.address}, waiting ${chosen.age_s} s.`);
  if (chosen.replaces) {
    cli.out(`
!! This REPLACES the existing peer "${chosen.replaces.host}" (${chosen.replaces.address}). That PC is disconnected and its old credentials stop working.`);
    const sure = await cli.ask('Type "yes" to replace it: ');
    if (sure === null || !YES.test(sure.trim())) {
      cli.err("Not confirmed. Nothing was changed.");
      return 1;
    }
  }
  let formatTries = 0;
  for (; ; ) {
    const line = await cli.ask("6-digit number shown on the new PC: ");
    if (line === null) {
      cli.err("Cancelled. Nothing was approved.");
      return 1;
    }
    const digits = parseDigits(line);
    if (digits === null) {
      if (++formatTries >= MAX_DIGIT_TRIES) {
        cli.err("That was not a 6-digit number three times. Nothing was approved.");
        return 1;
      }
      cli.err("That is not a 6-digit number. Type the six digits shown on the new PC.");
      continue;
    }
    try {
      const r = await cli.request("join_approve", { id: chosen.id, digits });
      const host = safeHost(r.host);
      cli.out(`Approved "${host}" (${safeAddress(r.address)}). Waiting for the link...`);
      const up = await waitForLink(cli, host);
      cli.out(up ? `Connected to ${host}. Agents there are now visible as name@${host}.` : `The link to ${host} comes up as soon as that PC connects (see "agentctl peers").`);
      return 0;
    } catch (e) {
      const p = apiProblem(e);
      const scrub = (text) => text.split(digits).join("<number>");
      if (p.code === "FORBIDDEN" && p.reason === "wrong_digits") {
        const left = safeInt(p.data.attempts_left);
        if (left > 0) {
          cli.err(`Wrong number. ${left} attempt${left === 1 ? "" : "s"} left for this request.`);
          continue;
        }
        cli.err("Wrong number, and that was the last attempt: the request was removed. Nothing was approved.");
        return 1;
      }
      if (p.code === "BAD_REQUEST" && p.reason === "bad_digits") {
        if (++formatTries >= MAX_DIGIT_TRIES) {
          cli.err("The daemon did not accept the number. Nothing was approved.");
          return 1;
        }
        cli.err("The daemon did not accept that as a 6-digit number. Try again.");
        continue;
      }
      if (p.code === "FORBIDDEN" && p.reason === "window_closed") cli.err("The join window has closed (too many wrong numbers, or its time ran out). Nothing was approved.");
      else if (p.reason === "request_gone" || p.reason === "unknown_request") cli.err("The request is gone (it expired, or the new PC gave up). Nothing was approved.");
      else cli.err(`Could not approve: ${scrub(p.message) || p.code}`);
      return 1;
    }
  }
}
function explainJoinStart(e) {
  const p = apiProblem(e);
  if (p.code === "FORBIDDEN") {
    switch (p.reason) {
      case "window_closed":
        return "That PC is not accepting join requests. On that PC run: agentctl pair --open";
      case "busy":
        return "That PC has too many requests waiting. Try again in a minute.";
      case "bad_name":
        return "That PC refused this PC's host name. A host name is lowercase letters, digits, '.', '_' or '-' (up to 63 characters); set AGENTLINK_HOST to one.";
      case "rate_limited":
        return "That PC is limiting join attempts from this address. Wait a few minutes and try again.";
    }
  }
  return `Could not join: ${p.message || p.code}`;
}
async function join(cmd, cli) {
  const timeoutS = cmd.timeoutS ?? DEFAULT_JOIN_TIMEOUT_S;
  let started;
  try {
    started = await cli.request("join_start", { address: cmd.address, port: cmd.port, wait_s: cmd.timeoutS });
  } catch (e) {
    cli.err(explainJoinStart(e));
    return 1;
  }
  const request = typeof started.request === "string" && /^[\w-]{1,64}$/.test(started.request) ? started.request : null;
  const sas = typeof started.sas === "string" && /^\d{6}$/.test(started.sas) ? started.sas : null;
  if (request === null || sas === null) {
    if (request !== null) await cli.request("join_cancel", { request }).catch(() => {
    });
    cli.err("The daemon did not return a confirmation number. Nothing was joined.");
    return 1;
  }
  cli.out(`Confirmation number: ${formatSas(sas)}`);
  cli.out("Tell the person at the receiving PC to approve this request with this number there (agentctl pair approve).");
  cli.out(`Waiting for approval, up to ${timeoutS} s (Ctrl+C to cancel)...`);
  const cancel = async () => {
    await cli.request("join_cancel", { request });
    cli.out("Cancelled.");
  };
  return withInterrupt(cli, cancel, async (interrupted) => {
    const deadline = cli.now() + (timeoutS + 15) * 1e3;
    for (; ; ) {
      if (interrupted()) return 130;
      let status;
      try {
        status = await cli.request("join_status", { request });
      } catch (e) {
        cli.err(`Lost the connection to the daemon: ${apiProblem(e).message}`);
        return 1;
      }
      switch (status.state) {
        case "joined": {
          const host = safeHost(status.host);
          cli.out(`Approved by "${host}". Waiting for the link...`);
          const up = await waitForLink(cli, host);
          cli.out(up ? `Connected to ${host}. Agents there are now visible as name@${host}.` : `Joined ${host}, but the link is not up yet. Check "agentctl peers" in a moment.`);
          return 0;
        }
        case "failed": {
          const detail = safeText(status.detail);
          cli.err(`The join failed${detail ? `: ${detail}` : ""}. Nothing was saved.`);
          return 1;
        }
        case "expired":
          cli.err("The request expired before it was approved. Nothing was saved. Run agentctl join again.");
          return 1;
        case "cancelled":
          cli.err("The request was cancelled. Nothing was saved.");
          return 1;
        case "waiting":
          break;
        default:
          cli.err("The daemon reported a state this agentctl does not know. Nothing was saved.");
          await cli.request("join_cancel", { request }).catch(() => {
          });
          return 1;
      }
      if (cli.now() > deadline) {
        await cli.request("join_cancel", { request }).catch(() => {
        });
        cli.err("No answer in time. The request was cancelled and nothing was saved.");
        return 1;
      }
      await tick(cli, POLL_MS);
    }
  });
}
function askAtTerminal(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let answered = false;
    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      resolve(answer);
    });
    rl.once("SIGINT", () => {
      rl.close();
      if (!answered) resolve(null);
    });
    rl.once("close", () => {
      if (!answered) resolve(null);
    });
  });
}
function firewallNote(port) {
  if (process.platform !== "win32") return null;
  const fw = spawnSync2("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "(Get-NetFirewallRule -DisplayName 'AgentLink*' -ErrorAction SilentlyContinue | Measure-Object).Count"], { encoding: "utf8", timeout: 1e4 });
  if (fw.status === 0 && fw.stdout.trim() === "0") {
    return `No firewall rule for AgentLink found. If the other PC cannot connect, run this once in an administrator PowerShell:

  New-NetFirewallRule -DisplayName "AgentLink" -Direction Inbound -Protocol TCP -LocalPort ${port} -RemoteAddress LocalSubnet -Action Allow`;
  }
  return null;
}

// src/client/agentctl.ts
var USAGE = `agentctl - AgentLink command line client

Usage: agentctl [options] <command> [args]

Identity (for every command except ping, stop, peers, pair, join and acl):
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
  acl init [--force] [--print]  write a starting acl.json: default deny, allow this PC and the hosts of peers.json
                     (--print only shows it; an existing acl.json is replaced only with --force, a backup is kept)
  peers [reload]     show LAN links, the certificate fingerprint of this host, and re-read peers.json
  pair               connect two PCs: prints a one-time code (valid 10 minutes), then waits for the other PC
  pair <code>        on the other PC: join with that code; both PCs then know each other
  pair --open [--ttl <seconds>] [--count <1-8>] [--address <IP>] [--port <port>] [--until-request]
                     open a window for new PCs to ask to join (no code to copy): prints the command to run on the new PC,
                     then reports each request. Each one has to be approved with "pair approve". --until-request is for an
                     agent: it prints one line (no number) when the first request arrives and ends, the window stays open.
  pair --close       close the join window and drop the requests that are waiting
  pair pending [--json]  list the requests that wait for approval (never shows a confirmation number)
  pair approve [<request id>]  approve a request. Run it yourself in a terminal window: it refuses to run without one, and
                     asks for the 6-digit number shown on the new PC (the number is never taken from the command line)
  join <IPv4>[:<port>] [--timeout <seconds>]  on the new PC: ask a PC that ran "pair --open" to let this PC in. Prints a
                     6-digit number; the person at that PC approves with it
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
  --ttl <seconds>    for pair: how long the code (or, with --open, the window) is valid (default 600)
  --count <n>        for pair --open: how many PCs the window admits before it closes (default 1, at most 8)
  --until-request    for pair --open: end when the first request arrives (the window stays open)
  --timeout <seconds>  for join: how long to wait for approval (default 300)
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
    force: { type: "boolean" },
    print: { type: "boolean" },
    local: { type: "boolean" },
    address: { type: "string" },
    port: { type: "string" },
    ttl: { type: "string" },
    open: { type: "boolean" },
    close: { type: "boolean" },
    count: { type: "string" },
    "until-request": { type: "boolean" },
    timeout: { type: "string" },
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
  const joinParsed = parseJoinCommand(
    command,
    rest,
    { open: values.open, close: values.close, json: values.json, untilRequest: values["until-request"], ttl: values.ttl, count: values.count, address: values.address, port: values.port, timeout: values.timeout },
    process.stdin.isTTY === true
  );
  if (joinParsed && "error" in joinParsed) fail(joinParsed.code, joinParsed.error);
  const client = await Client.connect({ autostart: command !== "stop" });
  const mismatch = command === "stop" ? null : versionMismatchNote(client.hello.server_version);
  if (mismatch) console.error(`warning: ${mismatch}`);
  if (joinParsed && "command" in joinParsed) {
    const code = await runJoinCommand(joinParsed.command, {
      request: (method, params) => client.request(method, params),
      out: (line) => console.log(line),
      err: (line) => console.error(line),
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      now: () => Date.now(),
      onInterrupt: (fn) => {
        process.on("SIGINT", fn);
        return () => void process.off("SIGINT", fn);
      },
      isTerminal: process.stdin.isTTY === true,
      ask: askAtTerminal,
      firewallNote
    });
    client.close();
    process.exit(code);
  }
  if (command === "ping") {
    out(client.hello, `agentd ${client.hello.server_version} host=${client.hello.host} pid=${client.hello.pid} lease=${client.hello.lease_ms}ms`);
    client.close();
    return;
  }
  if (command === "acl") {
    if (rest[0] === "init") {
      const known = await client.request("peers");
      const starter = aclStarter(client.hello.host, (known.peers ?? []).map((h) => h.host));
      if (values.print) {
        out(starter, JSON.stringify(starter, null, 2));
        client.close();
        return;
      }
      let written;
      try {
        written = writeAclStarter(homeDir(), starter, values.force === true);
      } catch (e) {
        if (e.code === "EEXIST") fail(1, `${e.message}. Use --print to see the starter, or --force to replace it (the old file is kept as acl.json.bak).`);
        throw e;
      }
      await client.request("reload_acl");
      const hosts = starter.rules.filter((r2) => r2.from.endsWith(`@${client.hello.host}`) && !r2.to.endsWith(`@${client.hello.host}`)).map((r2) => r2.to.slice(2));
      out(
        { file: written.file, backup: written.backup, hosts },
        [
          `Wrote ${written.file}${written.backup ? ` (the old file is now ${written.backup})` : ""} and reloaded it.`,
          `Default: deny. Allowed: the agents of this PC with each other${hosts.length > 0 ? `, and with the agents of ${hosts.join(", ")} in both directions` : ""}.`,
          'A PC you pair later is not allowed until you add rules for it (run "agentctl acl init --force" again, or edit acl.json and run "agentctl acl reload").'
        ].join("\n")
      );
      client.close();
      return;
    }
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
      `listening:   ${r.listening ? `${r.listening.host}:${r.listening.port}` : "no"}${r.listen_error ? ` (error: ${r.listen_error}${r.listen_retry_s != null ? `; trying again in ${r.listen_retry_s}s` : ""})` : ""}`,
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
    if (!values.address && (r.other_addresses?.length ?? 0) > 0) {
      console.log(`This PC also has: ${r.other_addresses?.join(", ")}. If the other PC cannot reach ${r.address}, run again with --address <one of these>.`);
    }
    if (process.platform === "win32") {
      const fw = spawnSync3("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "(Get-NetFirewallRule -DisplayName 'AgentLink*' -ErrorAction SilentlyContinue | Measure-Object).Count"], { encoding: "utf8", timeout: 1e4 });
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
