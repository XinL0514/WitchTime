import 'dotenv/config';
import { agentFromAdbDevice, type AndroidAgent } from '@midscene/android';
import { getEnvironment } from './testdata/environments';
import type { TestAccount } from './testdata/accounts';

/**
 * Connects to the configured (or first available) adb device and launches
 * the app under test. One agent per spec file — create in beforeAll,
 * destroy() in afterAll (see e2e/testcase/basic/login.spec.ts). Note:
 * AndroidAgent.terminate(pkg) force-stops an app by package name — it's not
 * the session teardown method, destroy() (inherited from the base Agent) is.
 *
 * `cacheId` scopes Midscene's plan/locate cache (midscene_run/cache/<cacheId>.cache.yaml):
 * once a spec has run successfully once, unchanged aiAct/locate steps are
 * replayed from cache instead of round-tripping to the vision model, which is
 * the main lever for making repeated real-device runs faster. Pass a name
 * unique per spec (e.g. the describe() block's name) so specs don't share/
 * clobber each other's cached prompts.
 *
 * `groupName` labels this spec's steps within the Midscene HTML report so
 * they're distinguishable once merged with other specs (see reportFileName
 * below) — pass something readable like the describe() block's name.
 *
 * All specs run in the same `vitest run` invocation share one report file:
 * e2e/globalSetup.ts generates one reportFileName per process and exposes it
 * via MIABI_REPORT_FILE_NAME, so every agent created during that run appends
 * its own execution trace into the same HTML report instead of each spec
 * producing its own file. Running a single spec file still works the same
 * way, just with one group in the report.
 *
 * NOTE: agentFromAdbDevice's exact signature/options should be double-checked
 * against the installed @midscene/android version on the first real run.
 */
export async function createAgent(cacheId: string, groupName?: string): Promise<AndroidAgent> {
  const { deviceId, appLaunchTarget } = getEnvironment();
  const reportFileName = process.env.MIABI_REPORT_FILE_NAME;

  const agent = await agentFromAdbDevice(deviceId, {
    generateReport: true,
    cache: { id: cacheId },
    ...(reportFileName ? { reportFileName } : {}),
    ...(groupName ? { groupName } : {}),
  });

  await agent.launch(appLaunchTarget);
  // launch() returns once the intent is sent, not once the app has finished
  // its cold-start splash screen — wait for real UI (bottom nav) before
  // handing the agent back, so callers don't have to deal with this timing.
  await agent.aiWaitFor('App 已经启动完成,离开了启动页/闪屏页,页面上出现了底部导航栏', {
    timeoutMs: 20000,
  });

  return agent;
}

/**
 * Native app login state persists on-device between runs (no Playwright
 * storageState equivalent), so this only logs in if we're not already.
 * The natural-language checks/steps below are placeholders — tune them
 * against the real app's screens on the first true run, same as Ultrahand's
 * global-setup.ts.
 */
export async function ensureLoggedIn(agent: AndroidAgent, account: TestAccount): Promise<void> {
  await agent.aiTap('底部导航栏的 我的 按钮');

  const loggedIn = await agent.aiBoolean(
    '当前页面已经登录,不是登录页或"立即登录"占位状态',
  );
  if (loggedIn) return;

  await agent.aiTap('立即登录按钮');
  await agent.aiWaitFor('登录表单已经出现,包含工号和密码输入框', {
    timeoutMs: 10000,
  });
  await agent.aiInput('工号输入框', { value: account.phone });
  await agent.aiInput('密码输入框', { value: account.password });
  await agent.aiTap('登录按钮');
  await agent.aiWaitFor('登录成功,页面已经离开登录表单', { timeoutMs: 15000 });
}

/**
 * Forces a logged-out starting state. Needed because login state persists
 * on-device across runs (see ensureLoggedIn above) — login.spec.ts's own
 * "can log in" test would otherwise find itself already logged in on any
 * run after the first and fail looking for a nonexistent login button.
 *
 * TODO (verify on first real run): the actual logout entry point/copy below
 * is a placeholder. Adjust the aiAct wording once the real logout flow
 * (likely nested under a settings screen) is known.
 */
export async function ensureLoggedOut(agent: AndroidAgent): Promise<void> {
  await agent.aiTap('底部导航栏的 我的 按钮');

  const loggedIn = await agent.aiBoolean(
    '当前页面已经登录,不是登录页或"立即登录"占位状态',
  );
  if (loggedIn) {
    await agent.aiAct(
      '退出登录(可能需要先进入设置页面,再找到退出登录/注销按钮,并确认弹窗)',
    );
  }

  await agent.aiWaitFor('页面上出现了"未登录"提示和"立即登录"按钮', {
    timeoutMs: 15000,
  });
}
