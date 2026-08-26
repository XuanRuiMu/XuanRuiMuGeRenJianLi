# 技能详解

## AI Agent（核心能力，全部项目均由此构建）
- Skill 开发：为 AI Agent 编写结构化技能包（SKILL.md 规范），包含触发条件、执行流程、约束规则与引用脚本，已在真实工作区沉淀 30+ 个技能。
- Agent 工作流编排：Orchestrator+Headless 模式——主代理只做编排与状态持久化，子代理在全新上下文中执行单一功能点，配合熔断机制（单问题修复上限、总循环上限、阻塞即停）防止死循环与上下文膨胀。
- 工具系统设计：JSON Schema 结构化工具定义、参数校验、调用记录持久化、失败降级。
- Prompt 工程：ReAct 决策协议设计（思考→行动→观察→完成四段式）、上下文工程、评测驱动的提示词回归。

## 后端
- Python FastAPI：全异步 API 设计、应用工厂模式、生命周期管理（lifespan）、中间件（CORS）、SSE 流式响应。
- SQLAlchemy 2.0 async：异步 ORM 建模六张表（会话/消息/轨迹/工具调用/评测运行/知识文档）、async_sessionmaker 连接池管理。
- MySQL 8+：库表设计、utf8mb4 字符集、外键级联、聚合统计查询；本地维护着 已删除的经历的真实 MySQL 26.7 实例（// 等多库并存）。

## 前端
- React 18 + TypeScript（strict）：函数组件、Hooks 状态机、SSE 流式渲染、AbortController 取消控制。
- Astro：静态生成（prerender）、ClientRouter 视图过渡、is:inline 与打包脚本的差异处理、bento grid 响应式布局。
- 原生 JavaScript/Canvas：零框架游戏引擎（对象池、粒子系统、requestAnimationFrame 渲染循环、WebAudio 程序化音效合成）。
- UnoCSS/Tailwind 原子化样式体系。

## 数据库与工程化
- MySQL 真实运维经验（非玩具项目）：服务启停、凭据管理、多数据库共存的连接隔离。
- 测试：pytest 异步全链路测试（ASGITransport 直连 app、SSE 流断言、MySQL 持久化断言）；Playwright 浏览器级 E2E（截图对比、SPA 导航往返稳定性、并发压力验证）。
- Git 版本控制、Vite 构建优化（gzip 产物 48KB 级别）。
