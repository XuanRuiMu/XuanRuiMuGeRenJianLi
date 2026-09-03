from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api import chat, eval, trace
from app.core.config import 读取设置
from app.core.database import 获取引擎, 建表, 关闭引擎
from app.mcp_server import 路由 as MCP路由
from app.rag.knowledge import 获取检索器

前端目录 = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


async def 环境自检() -> None:
    """启动前强制自检：环境差一点点都不要启动，并给出清晰报错。"""
    设置 = 读取设置()

    if not 设置.DeepSeek密钥:
        raise RuntimeError(
            "❌ 启动中止：缺少 DeepSeek 密钥。\n"
            "   请在 server/.env 中配置  DeepSeek密钥=sk-xxxx  后重试。"
        )
    if not 设置.DeepSeek接口地址:
        raise RuntimeError(
            "❌ 启动中止：缺少 DeepSeek 接口地址。\n"
            "   请在 server/.env 中配置  DeepSeek接口地址=https://api.deepseek.com  后重试。"
        )

    引擎 = 获取引擎()
    try:
        async with 引擎.connect() as 连接:
            await 连接.execute(text("SELECT 1"))
    except Exception as 错误:
        raise RuntimeError(
            f"❌ 启动中止：无法连接 MySQL（{设置.数据库连接串}）。\n"
            "   请先启动 MySQL 服务，并确认 数据库主机 / 端口 / 用户 / 密码 / 数据库名 配置正确。\n"
            f"   原始错误：{错误}"
        ) from 错误

    print("✅ 环境自检通过：DeepSeek 密钥 / 接口 / MySQL 均就绪。")


@asynccontextmanager
async def 生命周期(_: FastAPI):
    设置 = 读取设置()
    await 环境自检()
    await 建表()
    await 获取检索器()
    yield
    await 关闭引擎()


def 创建应用() -> FastAPI:
    应用 = FastAPI(title=读取设置().应用名称, version="1.0.0", lifespan=生命周期)

    应用.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    应用.include_router(chat.路由)
    应用.include_router(trace.路由)
    应用.include_router(eval.路由)
    应用.include_router(MCP路由)

    @应用.get("/api/health")
    async def 健康():
        引擎 = 获取引擎()
        try:
            async with 引擎.connect() as 连接:
                await 连接.execute(text("SELECT 1"))
        except Exception as 错误:
            raise HTTPException(
                status_code=503,
                detail=f"数据库连接异常：{错误}",
            ) from 错误
        return {"status": "ok", "app": 读取设置().应用名称}

    if (前端目录 / "index.html").exists():
        应用.mount("/assets", StaticFiles(directory=前端目录 / "assets"), name="assets")

        @应用.get("/{static_path:path}", include_in_schema=False)
        async def SPA回退(static_path: str):
            目标 = 前端目录 / static_path
            if static_path and 目标.is_file():
                return FileResponse(目标)
            return FileResponse(前端目录 / "index.html")

    return 应用


app = 创建应用()
