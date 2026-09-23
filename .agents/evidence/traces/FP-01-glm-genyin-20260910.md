# FP-01 GLM根因探针与修复证据 2026-09-10

## 探针结论（密钥已打码）

- 直连地址：https://open.bigmodel.cn/api/anthropic/v1/messages
- 模型：glm-4.7-flash，KEY_LEN=49，KEY_PREFIX=8970…
- A enabled无budget：status=529，ms=2751，体=overloaded_error code 1305 访问量过大
- B disabled：status=529，ms=510，同上过载
- C enabled+budget1024：status=529，ms=728，同上过载
- 判定：三载荷均未返回400，缺budget不非法假设被证伪；当前跑不通主因是服务端过载529，非载荷非法；端点可达、路径正确。

## 文档结论

- Anthropic官方：enabled必须带budget_tokens≥1024且<max_tokens。
- 智谱Claude兼容：base为https://open.bigmodel.cn/api/anthropic，示例curl为/v1/messages，路径与本地代理rewrite一致。
- 智谱思考：GLM-4.7默认开启思考，关闭用disabled；OpenAI风格示例仅用type enabled/disabled，无budget字段；5.2+才支持reasoning_effort。
- 决策：GLM侧保持无budget开关体，复用Anthropic规范加budget反而偏离GLM文档；探针双向接受，故不加budget。

## 根因清单

1. fetch无超时：4处请求均无超时，网络停滞或长思考即无限转圈。
2. GLM复用DeepSeek 8192：过长加剧体感无限。
3. vite代理读env错误：process.env读不到VITE_变量，自定义BASE在dev被静默忽略。
4. compact Anthropic缺thinking字段：与主链路不一致，压缩走默认思考变慢。
5. 错误吞没：catch-all回退丢失状态码与分类，UI仅通用失败。

## 修复要点

- 超时30s可配，中断保留Esc语义，TimeoutError与AbortError严格区分。
- GLM独立2048可配，compact统一disabled。
- vite改loadEnv。
- 回退meta新增分类与http状态，UI轨迹透出翻译文案，错误体截断300且不记密钥。
- 同类清理：提取Anthropic文本解析，统一响应错误抛法，删除重复分支。

## 验证

- 相关单测41过，AIChat 66过，全量468过。
- lint零错，build成功。
