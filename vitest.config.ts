import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ['e2e/testcase/**/*.spec.ts'],
    // Specs share one physical device / account / classroom flow, so they
    // can't run concurrently (mirrors Ultrahand's fullyParallel:false, workers:1).
    fileParallelism: false,
    testTimeout: 90_000,
    hookTimeout: 60_000,
    // Runs once per `vitest run` so all specs in this run share one Midscene
    // report file (see e2e/globalSetup.ts + createAgent() in e2e/agent.ts).
    globalSetup: ['./e2e/globalSetup.ts'],
  },
  resolve: {
    alias: {
      '@e2e': path.resolve(rootDir, './e2e'),
    },
  },
});
