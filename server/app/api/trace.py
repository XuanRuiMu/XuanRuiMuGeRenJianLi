from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import 获取会话
from app.models import 执行轨迹, 工具调用记录

路由 = APIRouter(prefix="/api/traces", tags=["traces"])


@路由.get("/conversations/{conversation_id}")
async def 会话轨迹(conversation_id: int, 会话库: AsyncSession = Depends(获取会话)):
    行集 = (
        (
            await 会话库.execute(
                select(执行轨迹).where(执行轨迹.会话id == conversation_id).order_by(执行轨迹.id)
            )
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": t.id,
            "step": t.步骤,
            "thought": t.思考,
            "tool": t.动作工具,
            "input": t.动作输入,
            "observation": t.观察,
            "phase": t.阶段,
            "latency_ms": t.耗时毫秒,
        }
        for t in 行集
    ]


@路由.get("/tools")
async def 工具调用历史(会话库: AsyncSession = Depends(获取会话)):
    行集 = (
        (await 会话库.execute(select(工具调用记录).order_by(desc(工具调用记录.id)).limit(50)))
        .scalars()
        .all()
    )
    return [
        {
            "id": t.id,
            "tool": t.工具名,
            "input": t.输入参数,
            "success": t.是否成功,
            "error": t.错误信息,
            "latency_ms": t.耗时毫秒,
            "created_at": str(t.创建时间),
        }
        for t in 行集
    ]
