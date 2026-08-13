import { describe, it, beforeAll, afterAll } from 'vitest';
import type { AndroidAgent } from '@midscene/android';
import { createAgent, ensureLoggedOut } from '@e2e/agent';
import { getTestAccount } from '@e2e/testdata/accounts';

describe('登录', () => {
  let agent: AndroidAgent;

  beforeAll(async () => {
    agent = await createAgent('login', '登录');
  }, 90_000);

  afterAll(async () => {
    await agent?.destroy();
  });

  it('可以正常登录', async () => {
    const { phone, password } = getTestAccount();

    await ensureLoggedOut(agent);
    await agent.aiAct('点击页面中央黄色的"立即登录"按钮,进入登录表单');
    await agent.aiAct(`输入工号 ${phone}`);
    await agent.aiAct(`在 请输入密码 输入框中 输入密码 ${password}`);
    await agent.aiAct('点击登录表单的登录提交按钮');
    await agent.aiWaitFor('登录成功,并且点击到我的页面能看到老师的工号', {
      timeoutMs: 30000,
    });
    await agent.aiAssert('能看到老师的工号');
  }, 150_000);
});
