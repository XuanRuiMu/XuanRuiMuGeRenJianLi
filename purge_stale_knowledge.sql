-- ============================================================
-- 知识库残留文档清理（一次性执行）
--
-- 背景：server/app/rag/knowledge.py 的 同步知识库() 原本是 upsert，
--       只增改、不删除。因此磁盘上删掉的 .md 文件，其内容仍留在
--       knowledge_docs 表里，AI 求职助手照旧能检索并回答出来。
--       （本次触发原因：已删除的 removed_doc.md /  内容）
--
-- 执行前提：本 SQL 只做数据清理，不改动表结构。
-- 执行方式：mysql -u <用户> -p <库名> < purge_stale_knowledge.sql
-- 幂等性：可重复执行，第二次执行删除行数为 0。
-- ============================================================

-- ---------- 第 0 步：先看看现在库里都有什么（不要跳过） ----------
SELECT id, 文档标识, 标题, 来源, 创建时间
FROM knowledge_docs
ORDER BY id;

-- 预期：磁盘 server/data/knowledge/ 下现有 .md 文件为
--   agentfoundry / career / experience / faq / neon_cyber
--   / projects_overview / resume_matcher / skills_detail
-- 除此之外出现的 文档标识 都是残留，都应清理。
-- 特别注意：不应再出现 removed_doc。

-- ---------- 第 1 步：确认  残留是否存在 ----------
SELECT id, 文档标识, 标题, 来源
FROM knowledge_docs
WHERE 文档标识 = 'removed_doc'
   OR 标题 LIKE '%%'
   OR 正文 LIKE '%%'
   OR 正文 LIKE '%已删除的经历%';

-- ---------- 第 2 步：删除  残留 ----------
DELETE FROM knowledge_docs
WHERE 文档标识 = 'removed_doc'
   OR 标题 LIKE '%%'
   OR 正文 LIKE '%%'
   OR 正文 LIKE '%已删除的经历%';

-- ---------- 第 3 步：通用清理 —— 删除所有磁盘上已不存在文件的残留 ----------
-- 若上面的预期文件清单有变动，请同步修改这个白名单再执行。
DELETE FROM knowledge_docs
WHERE 文档标识 NOT IN (
    'agentfoundry',
    'career',
    'experience',
    'faq',
    'neon_cyber',
    'projects_overview',
    'resume_matcher',
    'skills_detail'
);

-- ---------- 第 4 步：复核（应不再出现  / removed_doc） ----------
SELECT 文档标识, 标题, 来源 FROM knowledge_docs ORDER BY 文档标识;

SELECT COUNT(*) AS 残留__条数
FROM knowledge_docs
WHERE 文档标识 = 'removed_doc'
   OR 正文 LIKE '%%'
   OR 正文 LIKE '%已删除的经历%';
-- 预期：0

-- ============================================================
-- 说明：执行完本文件后，重启服务即可。
-- 根治补丁已写入 server/app/rag/knowledge.py 的 同步知识库()：
-- 每次启动会自动删除磁盘上已消失文件对应的行，
-- 今后增删知识文件不再需要手动清库。
-- ============================================================
