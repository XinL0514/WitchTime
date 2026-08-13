# WitchTime

AI 驱动的 Android UI 自动化测试框架,基于 [Midscene.js](https://midscenejs.com/)(`@midscene/android`,adb 直连)+ [Vitest](https://vitest.dev/)。参考自 Web 版的姊妹项目 [Ultrahand](../Ultrahand),思路一致:用自然语言描述操作(`aiAct`)、查询(`aiQuery`)和断言(`aiAssert`),视觉模型直接理解截图完成元素定位,不依赖 resource-id/xpath 控件树,减少 UI 改版带来的用例维护成本。

被测应用是神笔马良的 Android App,用例覆盖登录、课程列表,以及教室内 AI 面板的文生图 / 图生图流程(和 Ultrahand 的 Web 端用例对应)。

## 和 Ultrahand 的关键差异

- **驱动方式**:没有 Appium,Midscene 直接用 adb 连设备(`agentFromAdbDevice`),没有浏览器 `page`,取而代之的是 `AndroidAgent`。
- **测试跑框架**:Midscene Android 官方没有 Playwright 集成,这里用 Vitest —— 每个 spec 文件在 `beforeAll` 里建一个 `AndroidAgent`,`afterAll` 里 `destroy()`,不是 Playwright 的 fixture 注入模式。注意 `AndroidAgent.terminate(pkg)` 是"按包名强制停止某个 App",不是关闭会话,别搞混。
- **登录态**:原生 App 的登录态本身留在设备上,不需要 Playwright 那种 `storageState` 复用文件;`e2e/agent.ts` 里的 `ensureLoggedIn` 会先判断是否已登录,没登录才走登录流程。

## 目录结构

```
├── vitest.config.ts          # 别名 @e2e/*、串行执行(单设备下不能并行)
├── tsconfig.json               # 配置了 @e2e/* 路径别名,指向 ./e2e/*
├── .env.example                 # 模型 API key + 设备/App 配置 + 测试账号占位,复制为 .env 后填真实值
└── e2e/
    ├── agent.ts                  # createAgent(cacheId):连 adb 设备、启动 App、按 cacheId 开缓存;ensureLoggedIn():按需登录
    ├── testdata/
    │   ├── environments.ts      # getEnvironment():设备 serial、被测 App 包名/启动目标
    │   ├── accounts.ts          # getTestAccount(role?):读取测试账号密码,支持多个命名角色
    │   └── scenarios/
    │       └── classroom.ts     # 业务用例数据,如文生图/图生图的 prompt
    └── testcase/
        ├── basic/
        │   └── login.spec.ts            # 登录用例
        └── classroom/
            ├── courses.spec.ts          # 课程列表用例
            ├── texttopictureBDT.spec.ts    # 文生图用例
            └── picturetopictureBDT.spec.ts # 文生图 → 引用生成图 → 图生图 的完整用例
```

按业务域分目录:`testcase/basic/` 放不依赖教室的通用流程(登录等),`testcase/classroom/` 放需要先进入教室上课的 AI 面板用例。

## 快速开始

1. 安装依赖:

   ```bash
   npm install
   ```

2. 准备 Android 设备:

   - 装好 adb(Android Studio 自带,或单独装 platform-tools),`ANDROID_HOME` 配好。
   - 真机开启"USB 调试",连接后在设备上确认授权这台电脑。
   - 用 `adb devices` 确认至少一台设备状态是 `device`(不是 `unauthorized`/`offline`)。

3. 配置环境变量:

   ```bash
   cp .env.example .env
   ```

   编辑 `.env`:
   - 选择 Gemini 或 GPT-5 其中一组,填入真实的 `MIDSCENE_MODEL_*`(参考 [Midscene 模型配置文档](https://midscenejs.com/model-common-config.md))
   - 填入 `MIABI_ANDROID_PACKAGE`(被测 App 的包名),需要时填 `MIABI_ANDROID_LAUNCH_TARGET`
   - 填入 `MIABI_TEST_PHONE` / `MIABI_TEST_PASSWORD`,一个可用于测试的账号密码
   - 多台设备时,填 `ANDROID_DEVICE_ID` 指定用哪台(留空则自动选第一台)

4. 运行测试:

   ```bash
   npm test                                                # 跑全部用例
   npm run test:watch                                       # watch 模式
   npx vitest run e2e/testcase/basic/login.spec.ts         # 只跑单个文件
   npx vitest run -t "可以文生图"                            # 按用例名跑单个用例
   ```

5. 查看报告:

   Midscene 会生成一份 HTML 报告(运行结束时终端会打印路径,默认在 `midscene_run/report/`),里面能看到每一步的截图和 AI 的决策过程,调试用例失败时优先看这个。

## 写新用例

参考 `e2e/testcase/classroom/courses.spec.ts`,通过 `@e2e/*` 别名引入 helper 和测试数据。新用例放到 `e2e/testcase/basic/` 或 `e2e/testcase/classroom/` 下(或按业务域新建子目录):

```ts
import { describe, it, beforeAll, afterAll } from 'vitest';
import type { AndroidAgent } from '@midscene/android';
import { createAgent, ensureLoggedIn } from '@e2e/agent';
import { getTestAccount } from '@e2e/testdata/accounts';

describe('用例组名', () => {
  let agent: AndroidAgent;

  beforeAll(async () => {
    agent = await createAgent('用例组名'); // 传一个跨用例唯一的 cacheId
    await ensureLoggedIn(agent, getTestAccount());
  }, 150_000);

  afterAll(async () => {
    await agent?.destroy();
  });

  it('用例名', async () => {
    await agent.aiAct('用自然语言描述一步操作,比如"点击搜索框,输入关键词,回车"');
    await agent.aiAssert('用自然语言描述预期看到的结果');
  }, 60_000);
});
```

可用方法参考 [Midscene Agent API](https://midscenejs.com/api)。

### 教室内 AI 面板用例的写法

`testcase/classroom/` 下的用例统一用 Midscene 的 `aiWaitFor` 等待任务完成:先用一段详细的自然语言描述目标状态(比如"对应图片已渲染完成、不再显示排队/生成中/进度百分比"),等待条件满足后再执行措辞类似的 `aiAssert`。新增用例时保持这套写法和现有的自然语言 prompt 措辞风格(这些描述是针对真实页面文案反复调整过的,来自 Ultrahand 的 Web 端用例,Android 端如果文案不同需要相应调整)。

`picturetopictureBDT.spec.ts` 是一个连续流程:先执行文生图,等图片生成后点击其下方的引用按钮,再基于这张图做图生图断言;不是两个独立场景,新增类似"基于已有结果继续操作"的用例可以参考它的结构。

## 缓存模式

`createAgent(cacheId)` 默认开启 Midscene 的缓存(`cache: true`):首次成功跑通一个 spec 后,之后如果页面/流程没变,`aiAct` 的规划结果和元素定位会直接从 `midscene_run/cache/<cacheId>.cache.yaml` 读取,不用每步都重新请求视觉模型,能明显加快重复跑同一个 spec 的速度(尤其是登录、导航这类固定步骤)。如果 UI 真的变了导致缓存失效,Midscene 会自动感知并重新请求模型、更新缓存,不需要手动清。

`cacheId` 按 spec 传,不同 spec 之间不共享缓存,避免"点击登录按钮"这类通用措辞在不同页面语境下互相污染。缓存文件默认不提交进 Git(见 `.gitignore` 的 `midscene_run/`),只在本机生效,换设备/删掉 `midscene_run/` 会导致缓存重建,第一次跑会变慢,属正常现象。

## 已知限制

- Midscene 目前不支持 Anthropic/Claude 作为视觉定位模型,本项目使用 Gemini/GPT-5。
- `aiHover` 在 Android(以及 iOS/HarmonyOS)上不可用,只有 web/desktop 支持;不要在 Android 用例里用。
- 非 ASCII/输入法文本输入可能需要 `imeStrategy: 'always-yadb'`(参考 Midscene Android 文档的 FAQ)。
- 有 `FLAG_SECURE` 标记的页面截图会黑屏,可能需要 `screenshotStrategy: 'always-yadb'`,成功与否依赖设备/ROM/是否 root。
- 测试目前是串行执行(`vitest.config.ts` 中 `fileParallelism: false`),因为多个用例共用同一台设备/账号/教室流程,并行跑容易互相冲突。
- 真机(尤其 Wi-Fi adb)+ 视觉模型的单步耗时比 Web 端明显更长,各 spec 的超时已经放宽(登录/课程列表 90~150s,教室内 AI 面板流程 360s),如果还不够按需再调,不代表卡死。
- 登录表单/教室内导航的真实文案、点击路径以 App 首次真实运行结果为准,如遇失败,优先调整 `e2e/agent.ts` 和各 spec 里的自然语言描述,而非底层架构。
