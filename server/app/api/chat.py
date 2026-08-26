from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.runtime import Agent运行时
from app.core.database import 获取会话
from app.models import 会话, 消息, 执行轨迹
from app.schemas import 消息创建, 会话创建

路由 = APIRouter(prefix="/api/chat", tags=["chat"])


@路由.post("/conversations")
async def 创建会话(载荷: 会话创建, 会话库: AsyncSession = Depends(获取会话)):
    新会话 = 会话(标题=载荷.标题)
    会话库.add(新会话)
    await 会话库.commit()
    await 会话库.refresh(新会话)
    return {"id": 新会话.id, "title": 新会话.标题}


@路由.get("/conversations")
async def 列出会话(会话库: AsyncSession = Depends(获取会话)):
    行集 = (await 会话库.execute(select(会话).order_by(会话.id.desc()).limit(50))).scalars().all()
    return [{"id": c.id, "title": c.标题} for c in 行集]


@路由.get("/conversations/{conversation_id}/messages")
async def 会话消息(conversation_id: int, 会话库: AsyncSession = Depends(获取会话)):
    会话id = conversation_id
    行集 = (
        (await 会话库.execute(select(消息).where(消息.会话id == 会话id).order_by(消息.id)))
        .scalars()
        .all()
    )
    return [
        {"id": m.id, "role": m.角色, "content": m.内容, "created_at": str(m.创建时间)}
        for m in 行集
    ]


async def _落轨迹(会话库: AsyncSession, 会话id: int):
    async def 落盘(步骤, 思考, 工具, 输入, 观察, 阶段, 耗时):
        会话库.add(
            执行轨迹(
                会话id=会话id,
                步骤=步骤,
                思考=思考 or "",
                动作工具=工具,
                动作输入=输入,
                观察=观察 or "",
                阶段=阶段,
                耗时毫秒=耗时,
            )
        )
        await 会话库.commit()

    return 落盘


@路由.post("/conversations/{conversation_id}/stream")
async def 对话流(conversation_id: int, 载荷: 消息创建, 会话库: AsyncSession = Depends(获取会话)):
    会话id = conversation_id
    目标会话 = (await 会话库.execute(select(会话).where(会话.id == 会话id))).scalar_one_or_none()
    if 目标会话 is None:
        raise HTTPException(status_code=404, detail="会话不存在")

    历史行集 = (
        (await 会话库.execute(select(消息).where(消息.会话id == 会话id).order_by(消息.id).limit(20)))
        .scalars()
        .all()
    )
    历史 = [{"role": m.角色, "content": m.内容} for m in 历史行集]

    用户消息 = 消息(会话id=会话id, 角色="user", 内容=载荷.内容)
    会话库.add(用户消息)
    await 会话库.commit()

    运行时 = Agent运行时()

    async def 事件流():
        回复全文: list[str] = []
        落盘 = await _落轨迹(会话库, 会话id)
        try:
            async for 事件 in 运行时.流式运行(会话id, 载荷.内容, 历史, 落盘):
                if 事件.类型 == "answer":
                    回复全文.append(str(事件.数据.get("answer", "")))
                yield 事件.sse()
        finally:
            答案 = "\n".join(回复全文)
            if 答案:
                会话库.add(消息(会话id=会话id, 角色="assistant", 内容=答案))
                await 会话库.commit()

    return StreamingResponse(
        事件流(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
