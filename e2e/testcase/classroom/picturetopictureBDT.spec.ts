import { describe, it, beforeAll, afterAll } from 'vitest';
import type { AndroidAgent } from '@midscene/android';
import { createAgent, ensureLoggedIn, withRetry } from '@e2e/agent';
import { getTestAccount } from '@e2e/testdata/accounts';
import { textToImageScenario, imageToImageScenario } from '@e2e/testdata/scenarios/classroom';

describe('图生图', () => {
  let agent: AndroidAgent;

  beforeAll(async () => {
    agent = await createAgent('picturetopicture-bdt', '图生图');
    // await ensureLoggedIn(agent, getTestAccount());
  }, 150_000);

  afterAll(async () => {
    await agent?.destroy();
  });

  it('可以图生图', async () => {
    await agent.aiAct('点击底部导航栏中右边的 我的 按钮,进入我的页面');
    await agent.aiTap('点击带有 开始上课文本的 按钮');
    await agent.aiTap('点击第一个课程分类下的第一个课程封面');
    await agent.aiTap('点击 启动课件, 开始上课 按钮');
    await agent.aiTap('点击 自动生成房间号 按钮');
    await agent.aiAct('点击进入教室,等待教室加载完成');
    await agent.aiAct('点击顶部导航栏 中间 的按钮 进入神笔马良聊天页面');
    await agent.aiTap('点击 更多 按钮');
    await agent.aiAct('在AI功能弹窗里点击 文生图 选项');
    await agent.aiInput('聊天输入框', { value: textToImageScenario.prompt, mode: 'append' });
    await agent.aiTap('输入框右侧的发送按钮');

    await agent.aiWaitFor(
      `右侧对话流中刚刚发送的“/文生图 ${textToImageScenario.prompt}”已经完成:对应的最终图片已经真实渲染出来并且清晰可见,不再显示排队、生成中、加载中、空白图片或进度百分比;不要根据左侧已有图片判断完成`,
      { timeoutMs: 180000 },
    );

    await agent.aiTap('点击生成图片下方的 一对蓝色双引号 按钮');
    await agent.aiTap('点击 更多 按钮');
    await agent.aiTap('在AI功能弹窗里点击 图生图 选项');
    await agent.aiInput('聊天输入框', { value: imageToImageScenario.prompt, mode: 'append' });
    await agent.aiTap('输入框右侧的发送按钮');

    await agent.aiWaitFor(
      `只检查右侧对话流中最新的“/图生图 ${imageToImageScenario.prompt}”消息卡片,左侧课件、上方或下方历史消息一律忽略。仅当这条消息卡片内的最终图片完整、清晰、稳定渲染,且图片内容是一只黑色的老虎时,才视为通过;同一张图片及同一消息卡片内必须完全不含“正在排队中～”、排队、生成中、加载中、加载图标、旋转图标、进度百分比、生成提示“小马良正在挥动他的魔法画笔!”或“中止任务”。任一条件不满足时必须继续等待,不得将其他消息中的已完成图片归属给该命令。`,
      { timeoutMs: 180_000, checkIntervalMs: 1000 },
    );

    await withRetry(() =>
      agent.aiAssert(
        `只检查右侧对话流中最新的“/图生图 ${imageToImageScenario.prompt}”消息卡片,左侧课件、上方或下方历史消息一律忽略。仅当这条消息卡片内的最终图片完整、清晰、稳定渲染,且图片内容是一只黑色的老虎时,才视为通过;同一张图片及同一消息卡片内必须完全不含“正在排队中～”、排队、生成中、加载中、加载图标、旋转图标、进度百分比、生成提示“小马良正在挥动他的魔法画笔!”或“中止任务”。任一条件不满足时必须继续等待,不得将其他消息中的已完成图片归属给该命令。`,
      ),
    );
    await agent.aiTap('点击左上角的 下课 按钮');
    await agent.aiTap('点击 结束课程 弹窗中的 继续 按钮');
  }, 360_000);
});
