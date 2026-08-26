# 智能体工坊 AgentFoundry

全栈 AI Agent 平台，对标 2026 年 AI Agent 研发岗位作品集硬标准构建。后端 Python FastAPI 异步架构 + SQLAlchemy 2.0 async ORM 直连 MySQL 8+；自研 ReAct 智能体运行时（思考→行动→观察→反思循环，带最大步数/单步超时/异常降级三重防护）；5 个结构化 JSON Schema 工具（RAG 项目检索、岗位匹配、安全计算器、时间、调用统计）；混合检索 RAG 管线（BM25 + 特征哈希向量 + RRF 融合排序，引用可溯源）；MCP 协议端点（JSON-RPC 2.0 tools/list 与 tools/call）；SSE 流式输出；执行轨迹与工具调用全量持久化 MySQL，可观测可回放；内置确定性规则引擎提供者保证零 API Key 可演示，支持 DeepSeek 官方 API 一键切换。前端 React 18 + TypeScript + Vite 控制台：对话流式渲染、工具调用时间线、引用面板、评测面板。
