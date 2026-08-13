/**
 * Runs once per `vitest run` invocation (before any spec file/worker starts),
 * so every AndroidAgent created during this run can share the same Midscene
 * report file instead of each getting its own randomly-named one. See
 * createAgent() in e2e/agent.ts, which reads MIABI_REPORT_FILE_NAME.
 */
export default function setup() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const rand = Math.random().toString(16).slice(2, 10);
  process.env.MIABI_REPORT_FILE_NAME = `run-${stamp}-${rand}`;
}
