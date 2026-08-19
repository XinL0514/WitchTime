import { readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { getMidsceneRunSubDir } from '@midscene/shared/common';
import { mergeReportFiles } from '@midscene/core';

/**
 * Runs once per `vitest run` invocation (before any spec file/worker starts),
 * so every AndroidAgent created during this run can derive a report file
 * name that's unique per spec but traceable to this run. See createAgent()
 * in e2e/agent.ts, which reads MIABI_REPORT_FILE_NAME and combines it with
 * its own cacheId to name that spec's report `<runId>__<cacheId>`.
 *
 * The returned teardown runs once after all spec files finish, in this same
 * (main) process — unlike the per-file test workers, so it's the right place
 * to do run-wide filesystem work: find every `<runId>__*.html` report this
 * run produced and merge them into one filterable, statted report via
 * @midscene/core's mergeReportFiles (the same mechanism Midscene's own
 * Playwright fixture uses to combine per-test reports).
 */
export default function setup() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const rand = Math.random().toString(16).slice(2, 10);
  const runId = `run-${stamp}-${rand}`;
  process.env.MIABI_REPORT_FILE_NAME = runId;

  return async () => {
    const reportDir = getMidsceneRunSubDir('report');
    let entries: string[];
    try {
      entries = readdirSync(reportDir);
    } catch {
      return;
    }

    const prefix = `${runId}__`;
    const htmlPaths = entries
      .filter((name) => name.startsWith(prefix) && name.endsWith('.html'))
      .map((name) => join(reportDir, name));

    if (htmlPaths.length < 2) return;

    try {
      // mergeReportFiles() (unlike the lower-level ReportMergingTool it wraps)
      // doesn't expose an rmOriginalReports option, so the per-spec originals
      // are removed by hand below once the merge has succeeded.
      const { mergedReportPath } = mergeReportFiles({
        htmlPaths,
        outputName: runId,
        overwrite: true,
      });
      for (const htmlPath of htmlPaths) {
        try {
          unlinkSync(htmlPath);
        } catch {
          // best-effort cleanup; leftover per-spec files are harmless
        }
      }
      console.log(`Midscene - merged ${htmlPaths.length} spec reports into: ${mergedReportPath}`);
    } catch (error) {
      console.warn(`Midscene - failed to merge spec reports into one file:`, error);
    }
  };
}
