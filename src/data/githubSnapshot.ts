/**
 * GitHub 公开仓库快照 · 由 scripts/同步GitHub快照.js 自动生成，请勿手改。
 * 生成时间：2026-09-27T22:58:53.313Z
 * 数据来源：GitHub REST API（仓库列表 + 语言分布 + README）
 */
export interface GitHub快照元信息类型 {
  账号: string
  公开仓库总数: number
  纳入仓库数: number
  生成时间: string
}

export interface GitHub仓库快照条目 {
  全名: string
  名称: string
  简介: string
  主语言: string
  语言分布: Array<{ 语言: string; 字节: number }>
  星标数: number
  分叉数: number
  默认分支: string
  最近推送时间: string
  开源许可证: string
  主题: string[]
  地址: string
  README摘录: string
}

export const GitHub快照元信息: GitHub快照元信息类型 = {
  账号: 'XuanRuiMu',
  公开仓库总数: 7,
  纳入仓库数: 6,
  生成时间: '2026-09-27T22:58:53.313Z',
}

export const GitHub快照生成时间 = '2026-09-27T22:58:53.313Z'

export const GitHub仓库快照: GitHub仓库快照条目[] = [
  {
    全名: 'XuanRuiMu/YangLai',
    名称: 'YangLai',
    简介: '无厘头纯前端网页。全方面3D展示主播，双击点赞、拖拽道具整蛊、弹幕刷屏的无厘头互动舞台。Three.js+Vite+PWA。',
    主语言: 'JavaScript',
    语言分布: [
      {
        语言: 'JavaScript',
        字节: 480697,
      },
      {
        语言: 'CSS',
        字节: 45102,
      },
      {
        语言: 'HTML',
        字节: 19452,
      },
    ],
    星标数: 1,
    分叉数: 0,
    默认分支: 'main',
    最近推送时间: '2026-09-27T08:52:48Z',
    开源许可证: 'NOASSERTION',
    主题: [
      '3d',
      'animation',
      'entertainment',
      'github-pages',
      'interactive',
      'javascript',
      'pwa',
      'threejs',
      'vite',
      'webgl',
    ],
    地址: 'https://github.com/XuanRuiMu/YangLai',
    README摘录:
      '羊来 · YangLai 2026年动画电影《羊来》宣传直播间 —— 全方面3D展示主播，双击点赞、拖拽道具整蛊、弹幕刷屏的无厘头互动舞台。 🌐 简体中文 ｜ English在线体验 🚀 立即开整 → https://xuanruimu.github.io/YangLai/这是什么？ 《羊来》是一部2026年的动画电影，我们的主角是一只爱折腾的太羊主播。这个项目是它的 宣传直播间 ：一个跑在浏览器里的3D互动整蛊舞台——主播就站在你面前，双击点赞、拖道具砸他、发弹幕刷屏、把他惹毛看 暴怒糊屏 。 所有东西都是 气氛演出 ：人气值是假的、在线人数是换算的、送礼不花钱、模型本体不会受伤（大概）。 纯前端 ，无后端、无数据库、无需登录 所有昵称/战绩/成就/弹幕偏好只存在 你自己浏览器的localStorage支持PWA离线 ，装到手机桌面当应用用 开发者一行命令本地跑起 核心玩法 玩法 说明 🐑 3D主播 左键360° 旋转、滚轮缩放、右键平移；可切换灯光/机位/自动旋转 ❤️ 双击点赞 双击模型任意位置，点赞图标飘起来，连续双击触发连击 🎁 整蛊道具 从道具栏按住拖到模型身上：玫瑰是「献上」，西红柿鸡蛋是「砸过去」 😡 暴怒糊屏 把愤怒值刷满，主播当场发飙，然后糊你一脸 💬 弹幕刷屏 发「羊来」「下雨」「蹦迪」「反转」这类口令有彩蛋 ☄️ 道具轰炸 天降正义；🧽 一键清洗所有污渍 🍅 番茄雨30秒内扔够10个西红柿，全场天降西红柿 🕺 蹦迪模式 灯光+音乐+彩色频闪，主播跟着摇 🗣️ 台词语音 模型台词配音，出场有声音 📜 战报海报 一键生成你的本场作战战绩海报 🎭 动作栏 让主播走、跑、跳（切换到未上色分割模型） 🧩 多标签互通 同一个浏览器开两个标签，弹幕和点赞实时互通 🏅 成就系统 解锁各种整蛊成就，累积勋章墙 🎁 幸运观众 定时抽取发言/点赞观众，自动入围（气氛演出） 技术栈 层 技术 构建Vite（ES2020目标、gzip压缩、three.js单独chunk） 3D渲染Three.js+自研GLB模型管线（分割模型/lite低配模型） 语言 原生JavaScript（零框架） PWA自定义Service Worker（ tools/注入离线缓存.cjs注入）、manifest、离线缓存 部署GitHub Actions → GitHub Pages（ .github/workflows/deploy pages.yml ） 测试Vitest+Playwright（ tools/自检.cjs ） 值得一提的工程细节 画质自适应 ：按帧率自动切换画质等级，动态调整像素比/粒子数，低画质和省电模式自动关闭模型',
  },
  {
    全名: 'XuanRuiMu/XuanRuiMuGeRenJianLi',
    名称: 'XuanRuiMuGeRenJianLi',
    简介: 'AI-Native开发者的3D星际档案馆在线简历：Three.js沉浸式3D场景+Cmd+K命令面板+AI问答+技能雷达图+PWA。React19+Vite8+Tailwind4。',
    主语言: 'TypeScript',
    语言分布: [
      {
        语言: 'TypeScript',
        字节: 1100931,
      },
      {
        语言: 'CSS',
        字节: 64116,
      },
      {
        语言: 'JavaScript',
        字节: 48837,
      },
      {
        语言: 'Python',
        字节: 22741,
      },
      {
        语言: 'HTML',
        字节: 5878,
      },
    ],
    星标数: 1,
    分叉数: 0,
    默认分支: 'main',
    最近推送时间: '2026-09-26T21:19:27Z',
    开源许可证: 'MIT',
    主题: ['ai', 'cv', 'portfolio', 'pwa', 'r3f', 'react', 'resume', 'tailwindcss', 'threejs', 'vite'],
    地址: 'https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi',
    README摘录:
      '玄锐暮个人简历 · XuanRuiMuGeRenJianLi AI Native开发者的3D星际档案馆在线简历 —— 沉浸式3D场景+Cmd+K命令面板+AI问答+技能雷达图+PWA安装，把「简历」做成一款浏览体验。 🌐 简体中文 ｜ English在线预览 🚀 玄锐暮的3D简历档案馆 → https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi这是什么？ 一个 内容优先、技术炫技 的在线个人简历网站，把求职简历做成了「可浏览的沉浸式作品」： 🪐 3D星际档案馆界面 ：Three.js打造的沉浸3D场景，作品如展品般陈列； ⌘ Cmd+K命令面板 ：像IDE一样，按Cmd+K快速跳转任意板块； 🤖 AI问答 ：直接向「简历」提问，AI结合站内内容回答； 📡 技能雷达图 ：可视化展示技能熟练度分布； 🌐 双语i18n ：中/英文一键切换； 📱 PWA离线 ：可安装到桌面/手机，离线可看； ♿ 无障碍友好 ：字体排版测试、可访问性优化。 板块一览 板块 内容 👋 关于我（About） 个人介绍与价值观 🛠️ 技能（Skills） 技能雷达图/技术栈矩阵 🎨 作品集（Showcase） 学历、课程、设计、媒体、项目作品陈列 📂 项目（Projects） 开源项目：循环工程/和我恋爱吧/',
  },
  {
    全名: 'XuanRuiMu/HeWoLianAiBa',
    名称: 'HeWoLianAiBa',
    简介: '全栈AI恋爱模拟游戏：和一个有记忆、有性格、会成长的角色恋爱。实时聊天、好感度系统、AI军师支招、3D角色、语音通话。Vue3+Express5+PostgreSQL+Redis+Socket.IO。',
    主语言: 'TypeScript',
    语言分布: [
      {
        语言: 'TypeScript',
        字节: 5004600,
      },
      {
        语言: 'Vue',
        字节: 766112,
      },
      {
        语言: 'PLpgSQL',
        字节: 87265,
      },
      {
        语言: 'CSS',
        字节: 51116,
      },
      {
        语言: 'HTML',
        字节: 29526,
      },
    ],
    星标数: 1,
    分叉数: 0,
    默认分支: 'main',
    最近推送时间: '2026-09-26T09:27:23Z',
    开源许可证: 'MIT',
    主题: ['ai', 'chatbot', 'dating-sim', 'express', 'postgresql', 'redis', 'socket-io', 'typescript', 'vue3'],
    地址: 'https://github.com/XuanRuiMu/HeWoLianAiBa',
    README摘录:
      '和我恋爱吧 · HeWoLianAiBa全栈AI恋爱模拟游戏 —— 和一个有记忆、有性格、会成长的角色恋爱。实时聊天、好感度系统、AI军师支招、3D角色互动、语音通话，全栈TypeScript构建。 🌐 简体中文 ｜ English这是什么？ 和我恋爱吧 是一款跑在浏览器里的AI恋爱模拟游戏： 与一个 有长期记忆、有角色性格、会随好感度变化 的AI角色恋爱； 实时聊天 （Socket.IO），随时秒回； 聊得越好 好感度 越高，角色对你的态度与剧情随之改变； 可以把你AI角色的烦恼抛给AI军师 ，让它给你支招； 支持3D角色形象 与 语音 互动、 语音/视频通话 、 截图留念 、 挑战/战绩 玩法； 附带 专属管理后台 （',
  },
  {
    全名: 'XuanRuiMu/loop-engineering',
    名称: 'loop-engineering',
    简介: '让普通AI大模型用「更多token+更长时间+强制验证」换世界级产出：Orchestrator编排+Headless子代理+熔断+三轴审查+元循环自改进的元技能包，9个技能开箱即用。',
    主语言: 'Python',
    语言分布: [
      {
        语言: 'Python',
        字节: 71629,
      },
      {
        语言: 'PowerShell',
        字节: 12925,
      },
      {
        语言: 'Shell',
        字节: 9131,
      },
      {
        语言: 'Batchfile',
        字节: 264,
      },
    ],
    星标数: 1,
    分叉数: 0,
    默认分支: 'main',
    最近推送时间: '2026-09-26T04:04:06Z',
    开源许可证: 'MIT',
    主题: [
      'agent-skills',
      'ai-agent',
      'automation',
      'autonomous-agent',
      'claude-code',
      'code-review',
      'cursor',
      'llm',
      'meta-skill',
      'orchestrator',
      'prompt-engineering',
      'self-improving',
      'tdd',
      'trae',
      'workbuddy',
    ],
    地址: 'https://github.com/XuanRuiMu/loop-engineering',
    README摘录:
      '循环工程 面向中大型、多功能点和弱模型场景的高成本质量补偿编排器。它通过精简状态快照、跨宿主独立代理、局部验证、并行协作、熔断、恢复和最终门，降低上下文漂移、漏项和假完成。 核心能力 状态外置： PROGRESS.md只保存当前推进所需信息，完成项和失效信息立即删除。 跨宿主：只定义语义职责，不绑定任何宿主的工具名、参数名或代理类型。 权限策略：默认拥有当前项目所需权限；高危操作用通俗语言说明影响并确认。 Headless：独立代理和专项Skill不直接交互或替主代理交付，未决事项返回“待用户确认”。 质量门：局部测试、构建、lint、证据、独立审查和主代理最终门。 熔断：循环、代理实例、修复、stall、补位、墙钟和独立审查能力。 自我改进：只有新的、可复现且可跨任务复用的证据才触发Harness提案。 组合专项Skill代码需求实现器 、 软件测试 、 Bug修复 、 三轴审查 、 方案审查 、 生成PRD 、 纾困复盘 和 会话交接 均支持headless mode=true 。 文件 路径 用途skills/循环工程/SKILL.md主流程、跨宿主适配、权限、循环、恢复和Self Harness skills/循环工程/BUDGET.md预算字段、计数口径和熔断权威来源skills/循环工程/references/环境、Worker、状态、推理增强和前端验证协议skills/循环工程/references/harness test suite/固定manifest和10项回归任务 验证 本仓CI（ .github/workflows/ci.yml ）在每次推送与PR上跑三道独立门禁： 门禁 命令 作用 回归门禁python B skills/循环工程/references/harness test suite/run all.py 10项固定任务， verify.py按manifest.json的SHA 256锁定，防改脚本绕过与空集假绿 结构门禁python B tools/校验仓库结构.py全仓skills/ /SKILL.md齐备、文本严格UTF 8无乱码、文档相对链接指向真实路径 格式门禁npx markdownlint cli/ .md Markdown格式规范，规则集见仓库根 .markdownlint.json单独运行回归门禁（从发布源根目录）： 成功标准：输出 总计: 10/10通过 且退出码为0。离线测试不证明真实模型行为，也不证明弱模型经此达到高能力模型的推理效果；真实循环仍需隔离工作区并记录有/无Skill对照、实际写入和工具轨迹。 安装 安装脚本是独立发布工具。目标目录必须显式传入；脏源树默认拒绝安装，审阅后显式使用AllowDirty ；远程安装必须提供已审计的',
  },
  {
    全名: 'XuanRuiMu/XRMChaJian',
    名称: 'XRMChaJian',
    简介: '暮澜纪元Minecraft MMORPG服务端插件集：领域驱动设计的MMO玩法引擎（技能/属性/天赋/任务/乐器/驭空术/组队）+登录服插件+共享基础设施，全模块可测试。',
    主语言: 'Java',
    语言分布: [
      {
        语言: 'Java',
        字节: 3979190,
      },
      {
        语言: 'Python',
        字节: 59945,
      },
    ],
    星标数: 1,
    分叉数: 0,
    默认分支: 'main',
    最近推送时间: '2026-09-18T00:28:40Z',
    开源许可证: 'MIT',
    主题: ['ddd', 'gradle', 'guice', 'java', 'minecraft', 'mmorpg', 'paper', 'plugin', 'purpur', 'spigot'],
    地址: 'https://github.com/XuanRuiMu/XRMChaJian',
    README摘录:
      'XRMChaJian · 玄锐暮插件 暮澜纪元Minecraft MMORPG服务端插件集 —— 技能/属性/天赋/任务/乐器/驭空术/组队，领域驱动设计的完整MMO玩法引擎；配套登录服插件与共享基础设施模块，全模块高度可测试。 🌐 简体中文 ｜ English这是什么？ XRMChaJian（玄锐暮插件） 是国产MMORPG服务器「 暮澜纪元 」的整套插件代码库。它不是一个 小玩具插件 ，而是一套 领域驱动设计 的MMO玩法引擎： 核心设计理念： 领域层不依赖Bukkit API ，全部业务以纯Java领域模型+服务接口表达，基础设施层再通过Guice装配并适配到Minecraft——这让整个引擎可以被 单元测试直接测试 ，而不是只能 上线试错 。 XRM —— 核心玩法引擎 领域模型（ 领域层/ ） 子域 内容 ⚔️ 战斗 伤害管线（多阶段处理器）、伤害上下文、战斗状态、角色类型 🎯 技能 技能定义/上下文、参数注册表/读取器、按键绑定、施法类型 ✨ 效果 效果定义/实例/处理器（可叠加、可调度） 📊 属性 属性注册表、修饰器、派生属性计算、快照 🌟 天赋 天赋图/节点/选择/类型（树状成长体系） 📜 任务 任务定义/分类/目标/进度/奖励 🎵 乐器 完整音乐系统：音高方块映射、滑音/颤音、弯音调制、和弦预设、力度档、延音、量化、钢琴卷帘编辑器、MIDI/NBS导入导出 🦅 驭空术 飞行状态/配置（坐骑式飞行玩法） 👥 组队 队伍/组队操作结果 👤 玩家 玩家会话/快照/位置 💧 资源 资源类型/定义（血量、法力等派生资源） 业务与表现层 业务层 ：技能注册/释放/冷却、效果调度/注册、天赋管理、属性计算、组队、乐器、任务管理、目标选择、伤害计算、吸血、仇恨、驭空术、资源变更、公共冷却显示……接口+实现分离，方便替换； 表现层 ：命令处理器（技能/属性/天赋/任务/组队/乐器/驭空术/生命条缩放/战斗日志/总菜单/管理）、事件监听器（技能按键、装备切换、移动打断、效果生命周期、反伤、岩浆免疫、末影人/猪灵/蜘蛛控制等）、计分板、BossBar； 基础设施层 ：内存实现（测试友好）、YAML配置/翻译加载、Bukkit适配、数据库连接池（HikariCP+MySQL）、MIDI/NBS/mod输入通道、NoteBlockAPI适配、资源包管理器。 XRMdenglu —— 登录服插件 登录服独立成插件，负责玩家进场到进游戏前的全部环节： 🎭 职业选择GUI ：职业（角色类型/世界维度）选择界面，含职业描述颜色规则',
  },
  {
    全名: 'XuanRuiMu/MC_AI_Building_By_Bzhan_UP',
    名称: 'MC_AI_Building_By_Bzhan_UP',
    简介: '用AI生成Minecraft建筑：自然语言描述/参考图生成3D建筑，并导出WorldEdit/Litematica/Axiom/数据包等格式。Justcnds/mc-ai-builder个人修改版，额外支持即梦AI图生建筑。',
    主语言: 'JavaScript',
    语言分布: [
      {
        语言: 'JavaScript',
        字节: 1352974,
      },
      {
        语言: 'GLSL',
        字节: 51133,
      },
      {
        语言: 'Python',
        字节: 12124,
      },
      {
        语言: 'CSS',
        字节: 4954,
      },
      {
        语言: 'Batchfile',
        字节: 3565,
      },
    ],
    星标数: 1,
    分叉数: 1,
    默认分支: 'main',
    最近推送时间: '2026-09-18T00:23:25Z',
    开源许可证: 'GPL-3.0',
    主题: [
      'ai',
      'electron',
      'image-to-3d',
      'litematica',
      'minecraft',
      'minecraft-builder',
      'react',
      'threejs',
      'vite',
      'worldedit',
    ],
    地址: 'https://github.com/XuanRuiMu/MC_AI_Building_By_Bzhan_UP',
    README摘录:
      'MC AI Builder · AI建筑师（即梦版） 用AI生成Minecraft建筑的桌面工具 —— 自然语言描述/参考图生成3D建筑，并导出为Minecraft可用的多种格式。本仓库为Justcnds/mc ai builder的个人修改版， 额外支持即梦AI即时传输图片生成建筑 。 🌐 简体中文 ｜ English这是什么？ 《Minecraft AI创作工具》系列第一作（B站「MC AI创作工具」）—— 一个给MC玩家和建筑师的AI建筑生成器 ： 用 自然语言 描述你想要的建筑（中文/英文均可），AI直接生成建筑方案； 在浏览器里3D实时预览 ，边看边改； 一键导出成Minecraft可直接使用的 多种格式 ； 本修改版额外支持 即梦AI图生建筑 ：上传参考图，即时生成对应风格的建筑。 核心功能 功能 说明 🏗️ 自然语言生成 用一句话描述建筑（如「中世纪石制城堡，带4座塔楼」），AI出方案 🖼️ 即梦图生建筑（本版特色） 上传参考图，即梦AI即时生成图片对应建筑 📐 实时3D预览Three.js WebGL预览，生成后可继续修改 🎨 26种建筑风格 内置建筑风格知识库，中英文均可触发 🔀 并发生成多方案 同时生成多个方案对比挑选 ↩️ 撤销重做 交互过程可撤销/重做 🕘 历史会话 保留历史生成会话，随时回看 📦 多格式导出WorldEdit原理图/Litematica投影/Axiom蓝图/数据包/单指令方块 🧱 跨版本兼容1.8 – 1.21版本方块名自动转换 技术栈 层 技术 前端React 19+Vite 8+Tailwind CSS 4 3D预览react three fiber+drei+Three.js（WebGL） 状态zustand+lucide react后端Express 5（ server.js ，端口3001，CORS+100MB body） 即梦代理 火山引擎即梦视觉服务，HMAC SHA256签名（端口3002） 桌面打包Electron+electron builder快速开始Windows用户也可直接双击根目录的start.bat （自动检查Node、安装依赖、启动API与前端）。首次使用需配置AI API Key。 即梦图生建筑（可选） Agent技能系统（SKILL.md） 项目内置一套 声明式Agent技能系统 ： 官方内置6项技能： planning （规划）/construction （建造）/decoration （装饰）/inspection （质检）/quality （质量）/knowled',
  },
]
