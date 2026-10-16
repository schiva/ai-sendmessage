// Time budgets of the Claude Code hooks. Claude Code kills a hook that runs longer than its `timeout` in plugin.json, and a killed
// hook delivers nothing, so the worst case of everything a hook can wait for must stay below that timeout (a test checks it).

/** How long a hook waits for a daemon it has to start (cold start). The clients' default of 8 s is too long for a hook. */
export const HOOK_START_TIMEOUT_MS = 5_000
/** How long the Stop hook waits for a watcher that was just started to check in. */
export const STOP_WAKE_WAIT_MS = 2_000

/**
 * The wait above, or less: AGENTLINK_STOP_WAKE_WAIT_MS can only lower it (tests that run many Stop hooks would otherwise spend two
 * seconds on each), so the worst case that the hook timeout is checked against never grows.
 */
export function stopWakeWaitMs(env: Record<string, string | undefined> = process.env): number {
  const v = Number(env.AGENTLINK_STOP_WAKE_WAIT_MS)
  return env.AGENTLINK_STOP_WAKE_WAIT_MS !== undefined && Number.isFinite(v) && v >= 0 ? Math.min(v, STOP_WAKE_WAIT_MS) : STOP_WAKE_WAIT_MS
}
/** The `timeout` (seconds) of every hook in plugin/agentlink/.claude-plugin/plugin.json. */
export const HOOK_TIMEOUT_S = 15
