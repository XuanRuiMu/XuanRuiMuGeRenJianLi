# AI 简历匹配平台（resume-matcher）

## 项目定位

用 Java 生态实现的全栈 AI 应用后端，是「简历 × JD 匹配」业务的生产级工程化版本：粘贴招聘 JD，服务调用大模型分析岗位与候选人技能画像的匹配度（命中技能、缺失技能、总分、改进建议）。

## 技术栈与架构

- Java 17 + Spring Boot 3.5（Web、Validation、Data JPA）
- MySQL 8：匹配记录持久化（本地开发默认 H2 内存库，零依赖运行；docker-compose 启用真 MySQL）
- Redis：JD 内容哈希缓存 + 每 IP 固定窗口限流；无 Redis 时自动降级 Caffeine 内存缓存，接口语义一致
- LLM 集成：DeepSeek Chat API，要求结构化 JSON 输出并容错解析；无 key / 超时 / 报错时自动降级本地规则匹配引擎，响应中 engine 字段标记本次分析来源（llm/rule）
- 测试：JUnit 5 单元测试 + MockMvc 集成测试，覆盖参数校验、限流（429）、降级路径
- 部署：Dockerfile 多阶段构建（Maven 构建 → JRE 运行）+ docker-compose 一键编排 app/MySQL/Redis

## 请求流水线

请求 → 限流检查（Redis/内存计数器）→ 缓存查询（按 JD 内容 SHA-256 哈希）→ LLM 结构化分析（或规则引擎降级）→ MySQL 持久化 → 返回。

## API

- GET /api/health 健康检查
- POST /api/match 提交 JD 分析，body: {"jdText": "..."}
- GET /api/match/history 最近 20 条匹配记录

## 与其他项目的关系

与简历站内纯前端版「简历 × JD 匹配分析器」（/agent 页）互为印证：同一业务的零依赖浏览器实现与完整生产栈实现。前端入口在简历站 /matcher 页面。代码位于简历网页仓库 server-java/ 目录。
