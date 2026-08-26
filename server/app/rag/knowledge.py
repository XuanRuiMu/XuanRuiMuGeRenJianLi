from __future__ import annotations

from pathlib import Path

from sqlalchemy import select

from app.core.database import 获取会话工厂
from app.models import 知识文档
from app.rag.retriever import 文档块, 混合检索器

知识目录 = Path(__file__).resolve().parent.parent.parent / "data" / "knowledge"

_检索器: 混合检索器 | None = None


async def 同步知识库() -> int:
    """把 data/knowledge/*.md 载入 MySQL 并返回文档数（幂等）"""
    if not 知识目录.exists():
        return 0
    文档数 = 0
    async with 获取会话工厂()() as 会话:
        for 文件 in sorted(知识目录.glob("*.md")):
            标识 = 文件.stem
            正文 = 文件.read_text(encoding="utf-8")
            标题 = 正文.splitlines()[0].lstrip("# ").strip() if 正文 else 标识
            已有 = (
                await 会话.execute(select(知识文档).where(知识文档.文档标识 == 标识))
            ).scalar_one_or_none()
            if 已有:
                已有.标题 = 标题
                已有.正文 = 正文
            else:
                会话.add(知识文档(文档标识=标识, 标题=标题, 正文=正文, 来源=str(文件.name)))
            文档数 += 1
        await 会话.commit()
    return 文档数


async def 加载检索器() -> 混合检索器:
    块列表: list[文档块] = []
    try:
        async with 获取会话工厂()() as 会话:
            行集 = (await 会话.execute(select(知识文档))).scalars().all()
        for doc in 行集:
            块列表.append(文档块(文档标识=doc.文档标识, 标题=doc.标题, 正文=doc.正文))
    except Exception:
        pass
    return 混合检索器(块列表)


async def 获取检索器() -> 混合检索器:
    global _检索器
    if _检索器 is None:
        await 同步知识库()
        _检索器 = await 加载检索器()
    return _检索器


def 重置检索器缓存() -> None:
    global _检索器
    _检索器 = None
