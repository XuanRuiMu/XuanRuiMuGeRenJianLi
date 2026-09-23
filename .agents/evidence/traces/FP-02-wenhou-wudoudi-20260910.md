# FP-02 问候误兜底根因修复证据 2026-09-10

## 根因清单

1. sendChatMessage catch硬置命中数0：检索在try内，失败丢弃真实命中，UI误报命中0段。
2. retrieveChunks无阈值恒返topK：你好最高0.24仍硬塞8段，命中数无意义。
3. getLocalAnswer缺问候意图：你好落入fallback没准备答案。
4. PATTERN_RULES暮澜重复：暮澜纪元双规则叠加0.6分。
5. RAG与local双映射：关键词各说各话，local项目含经验错位，大小写不一致。

## 修复要点

- 检索前移try外，失败保留真实命中并复用FP-01回退原因/http状态。
- 检索加VITE_RAG_MIN_SCORE阈值（默认0.3）+纯问候早退空上下文；空输入返回空。
- local补问候/感谢/告别（chat.answers.greeting/thanks/farewell翻译文件）。
- 删重复暮澜规则；抽src/ai/intentTable.ts公共意图表，双方同源。
- 新增RAG检索最低分（deepseekConfig）与retrieve第三参数。

## 验证

- 相关63过（rag11/local12/chat36/intent4），全量481过（53文件）。
- lint零错（5历史警告），build成功。
- 你好失败终态问候语非fallback，命中0诚实；暮澜失败命中>0诚实。
