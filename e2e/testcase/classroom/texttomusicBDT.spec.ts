import { describe, it, beforeAll, afterAll } from 'vitest';
import type { AndroidAgent } from '@midscene/android';
import { createAgent, ensureLoggedIn, withRetry } from '@e2e/agent';
import { getTestAccount } from '@e2e/testdata/accounts';
import { textToMusicScenario } from '@e2e/testdata/scenarios/classroom';

describe('文生音乐', () => {
  let agent: AndroidAgent;

  beforeAll(async () => {
    agent = await createAgent('texttomusic-bdt', '文生音乐');
    // await ensureLoggedIn(agent, getTestAccount());
  }, 150_000);

  afterAll(async () => {
    await agent?.destroy();
  });

  it('可以文生音乐', async () => {
    await agent.aiAct('点击底部导航栏中右边的 我的 按钮,进入我的页面');
    await agent.aiTap('点击带有 开始上课文本的 按钮');
    await agent.aiAct('点击第一个课程分类下的第一个课程封面');
    await agent.aiTap('点击 启动课件, 开始上课 按钮');
    await agent.aiTap('点击 自动生成房间号 按钮');
    await agent.aiAct('点击进入教室,等待教室加载完成');
    await agent.aiAct('点击顶部导航栏 中间 的按钮 进入神笔马良聊天页面');
    await agent.aiTap('点击 更多 按钮');
    await agent.aiTap('在AI功能弹窗里点击 文生音乐 选项');
    await agent.aiInput('聊天输入框', { value: textToMusicScenario.prompt, mode: 'append' });
    await agent.aiTap('输入框右侧的发送按钮');

    await agent.aiWaitFor(
      `右侧对话流中刚刚发送的“/文生音乐 ${textToMusicScenario.prompt}”已经完成:对应的最终音乐已经真实渲染出来并且清晰可见，不再显示排队、生成中、加载中、空白图片或进度百分比`,
      { timeoutMs: 180000 },
    );

    await withRetry(() =>
      agent.aiAssert(
        `只检查右侧对话流中刚刚发送的“/文生音乐 ${textToMusicScenario.prompt}”这条消息对应的最终的音乐卡片：卡片中有封面, 有时长, 有作者 并且该消息不能仍处于排队、生成中、加载中或显示进度百分比的状态`,
      ),
    );
    await agent.aiTap('点击左上角的 下课 按钮');
    await agent.aiTap('点击 结束课程 弹窗中的 继续 按钮');
  }, 360_000);
});
