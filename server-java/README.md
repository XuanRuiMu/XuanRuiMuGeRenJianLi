# AI 简历匹配平台（resume-matcher）

Spring Boot 3 + MySQL + Redis 的 AI 应用后端：粘贴一段招聘 JD，服务调用大模型（DeepSeek）分析该岗位与候选人技能画像的匹配度——命中技能、缺失技能、总分与改进建议；LLM 不可用时自动降级为本地规则匹配引擎，保证服务永远可用。

## 技术栈

- **Java 17 / Spring Boot 3.5**（Web、Validation、Data JPA）
- **MySQL 8**（匹配记录持久化；本地开发默认 H2 内存库，零依赖即可运行）
- **Redis**（JD 分析结果缓存 + 固定窗口限流；无 Redis 时自动降级 Caffeine 内存缓存，接口语义一致）
- **LLM 集成**：DeepSeek Chat API，结构化 JSON 输出 + 容错解析 + 优雅降级
- **测试**：JUnit 5 单元测试 + MockMvc 集成测试（含限流、参数校验、降级路径）
- **部署**：Dockerfile 多阶段构建 + docker-compose 一键起 app/MySQL/Redis

## 快速开始（本地，零依赖）

```bash
cd server-java
mvn spring-boot:run
# 或
mvn package && java -jar target/resume-matcher-1.0.0.jar
```

默认使用 H2 + Caffeine 内存缓存，无需安装 MySQL/Redis。

## 启用完整生产栈（Docker）

```bash
DEEPSEEK_API_KEY=sk-xxx docker compose up -d --build
```

将启用 MySQL 8 持久化 + Redis 缓存/限流 + LLM 分析（无 key 时自动走规则引擎）。

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| POST | `/api/match` | JD 匹配分析，body: `{"jdText": "..."}` |
| GET | `/api/match/history` | 最近 20 条匹配记录 |

响应示例：

```json
{
  "id": 1,
  "totalScore": 72,
  "matchedSkills": ["Java", "Spring Boot", "MySQL", "Redis"],
  "missingSkills": ["微服务", "消息队列"],
  "summary": "后端核心栈匹配良好，建议补齐消息队列实战……",
  "engine": "llm",
  "cacheHit": false
}
```

`engine` 字段标识本次分析来源（`llm` / `rule`），是可观测性的降级标记。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 空 | LLM key，为空时走规则引擎 |
| `REDIS_ENABLED` | false | true 时启用 Redis 缓存/限流 |
| `MYSQL_HOST` 等 | - | 配合 `--spring.profiles.active=mysql` 启用 MySQL |
