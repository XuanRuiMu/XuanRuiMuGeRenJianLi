from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import func, select

from app.agent.tools import 工具注册表
from app.core.database import 获取会话工厂
from app.models import 工具调用记录
from app.schemas import MCP请求体

路由 = APIRouter(prefix="/mcp", tags=["mcp"])

协议版本 = "2025-06-18"


@路由.post("")
async def MCP网关(载荷: MCP请求体) -> dict:
    try:
        结果 = await _分发(载荷)
        return {"jsonrpc": "2.0", "id": 载荷.id, "result": 结果}
    except Exception as 错误:
        return {
            "jsonrpc": "2.0",
            "id": 载荷.id,
            "error": {"code": -32603, "message": f"内部错误: {错误}"},
        }


async def _分发(载荷: MCP请求体) -> dict | list:
    方法 = 载荷.method
    参数 = 载荷.params or {}

    if 方法 == "initialize":
        return {
            "protocolVersion": 协议版本,
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {"name": "agentfoundry", "version": "1.0.0"},
        }
    if 方法 == "ping":
        return {}
    if 方法 == "tools/list":
        return {
            "tools": [
                {
                    "name": t.名称,
                    "description": t.描述,
                    "inputSchema": t.参数模式,
                }
                for t in 工具注册表.全部()
            ]
        }
    if 方法 == "tools/call":
        名称 = str(参数.get("name", ""))
        实参 = dict(参数.get("arguments") or {})
        结果 = await 工具注册表.调用(名称, 实参)
        内容 = [{"type": "text", "text": 结果.输出 or 结果.错误}]
        return {
            "content": 内容,
            "isError": not 结果.成功,
        }
    raise ValueError(f"未知方法: {方法}")


@路由.get("/stats")
async def MCP统计() -> dict:
    async with 获取会话工厂()() as 会话:
        总数 = (await 会话.execute(select(func.count()).select_from(工具调用记录))).scalar() or 0
    return {"total_invocations": 总数, "protocol": 协议版本}
