import pytest

from app.rag.retriever import BM25索引, 切词, 余弦, 特征哈希向量, 文档块, 混合检索器


def test_切词_中英混合():
    词 = 切词("FastAPI 项目实战")
    assert "fastapi" in 词
    assert "项" in 词 and "项目" in 词


def test_切词_空串():
    assert 切词("") == []


def test_特征哈希向量_归一化():
    v = 特征哈希向量(["hello", "world"])
    assert len(v) == 256
    assert abs(sum(x * x for x in v) - 1.0) < 1e-6


def test_余弦_相同向量():
    v = 特征哈希向量(["abc"])
    assert abs(余弦(v, v) - 1.0) < 1e-6


def test_bm25_索引构建():
    块 = [文档块("a", "标题A", "内容文字"), 文档块("b", "标题B", "另外的内容")]
    索引 = BM25索引(块)
    assert 索引.文档数 == 2
    得分 = 索引.打分(切词("内容"), 0)
    assert 得分 > 0


@pytest.mark.asyncio
async def test_混合检索_相关度排序():
    块列表 = [
        文档块("mc", " 服务端集群", "已删除的经历 MMORPG 服务端，MySQL 存储，多服互联"),
        文档块("web", "NEON CYBER 游戏世界", "纯 JavaScript 游戏平台，7 款小游戏与粒子系统"),
        文档块("agent", "智能体工坊", "FastAPI + MySQL 的 ReAct 智能体平台，含 RAG 与 MCP"),
    ]
    检索器 = 混合检索器(块列表)
    结果 = await 检索器.检索("智能体 RAG 平台", 前k=3)
    assert 结果, "应返回至少一条结果"
    assert 结果[0].文档标识 == "agent"


@pytest.mark.asyncio
async def test_混合检索_无匹配():
    检索器 = 混合检索器([文档块("a", "标题", "正文内容")])
    结果 = await 检索器.检索("完全无关的查询词组xyz")
    assert isinstance(结果, list)


@pytest.mark.asyncio
async def test_空库检索():
    检索器 = 混合检索器([])
    assert await 检索器.检索("任意") == []
