from __future__ import annotations

import time

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.runtime import Agent运行时
from app.core.config import 读取设置
from app.core.database import 获取会话, 获取会话工厂
from app.models import 评测运行
from app.schemas import 评测请求

路由 = APIRouter(prefix="/api/eval", tags=["eval"])

评测数据集: list[dict] = [
    {"id": "e1", "question": "有哪些项目？", "expect_tool": "search_projects"},
    {"id": "e2", "question": "介绍一下你搭建过的作品", "expect_tool": "search_projects"},
    {"id": "e3", "question": "我适合什么岗位？", "expect_tool": "match_job"},
    {"id": "e4", "question": "计算 12*8+40 等于多少", "expect_tool": "calculator"},
    {"id": "e5", "question": "现在几点了？", "expect_tool": "current_time"},
    {"id": "e6", "question": "统计一下工具调用记录", "expect_tool": "query_stats"},
    {"id": "e7", "question": "你是谁？", "expect_tool": None},
    {"id": "e8", "question": "帮我查查项目里和游戏相关的内容", "expect_tool": "search_projects"},
    {
        "id": "e9",
        "question": (
            "岗位职责：负责AI Agent应用与RAG系统的开发与维护，构建知识库问答能力；"
            "任职要求：熟悉Python编程，掌握FastAPI或类似异步框架，熟悉MySQL数据库设计与优化，"
            "了解React前端开发，有Function Calling或MCP协议实践经验者优先。"
        ),
        "expect_tool": "analyze_jd",
    },
]


@路由.post("/run")
async def 运行评测(载荷: 评测请求, 会话库: AsyncSession = Depends(获取会话)):
    设置 = 读取设置()
    运行时 = Agent运行时()
    明细: list[dict] = []
    通过数 = 0

    for 用例 in 评测数据集:
        观察: list[str] = []
        首个工具: str | None = None
        步数 = 0
        开始 = time.perf_counter()
        错误 = ""

        async def 空落盘(*_参数) -> None:
            return None

        try:
            async for 事件 in 运行时.流式运行(0, 用例["question"], [], 空落盘):
                if 事件.类型 == "action" and 首个工具 is None:
                    首个工具 = str(事件.数据.get("tool"))
                elif 事件.类型 == "observation":
                    步数 += 1
                elif 事件.类型 == "error":
                    错误 = str(事件.数据.get("message"))
            通过 = (首个工具 == 用例["expect_tool"]) and not 错误
        except Exception as 异常:
            通过 = False
            错误 = f"{type(异常).__name__}: {异常}"
        耗时 = round((time.perf_counter() - 开始) * 1000, 2)
        通过数 += int(通过)
        明细.append(
            {
                "id": 用例["id"],
                "question": 用例["question"],
                "expect_tool": 用例["expect_tool"],
                "actual_tool": 首个工具,
                "steps": 步数,
                "latency_ms": 耗时,
                "passed": 通过,
                "error": 错误,
            }
        )

    总数 = len(评测数据集)
    记录 = 评测运行(
        数据集版本=载荷.数据集版本 or "v1",
        总用例数=总数,
        通过数=通过数,
        成功率=round(通过数 / 总数, 4),
        平均耗时毫秒=round(sum(m["latency_ms"] for m in 明细) / 总数, 2),
        平均步数=round(sum(m["steps"] for m in 明细) / 总数, 2),
        明细=明细,
    )
    async with 获取会话工厂()() as 写库:
        写库.add(记录)
        await 写库.commit()
        await 写库.refresh(记录)

    return {
        "run_id": 记录.id,
        "dataset_version": 记录.数据集版本,
        "total": 总数,
        "passed": 通过数,
        "success_rate": 记录.成功率,
        "avg_latency_ms": 记录.平均耗时毫秒,
        "avg_steps": 记录.平均步数,
        "detail": 明细,
    }


@路由.get("/runs")
async def 历史评测(会话库: AsyncSession = Depends(获取会话), limit: int = 10):
    行集 = (
        (await 会话库.execute(select(评测运行).order_by(desc(评测运行.id)).limit(min(limit, 50))))
        .scalars()
        .all()
    )
    return [
        {
            "id": r.id,
            "dataset_version": r.数据集版本,
            "total": r.总用例数,
            "passed": r.通过数,
            "success_rate": r.成功率,
            "avg_latency_ms": r.平均耗时毫秒,
            "avg_steps": r.平均步数,
            "created_at": str(r.创建时间),
        }
        for r in 行集
    ]
