from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import chat, eval, trace
from app.core.config import 读取设置
from app.core.database import 建表, 关闭引擎
from app.mcp_server import 路由 as MCP路由
from app.rag.knowledge import 获取检索器

前端目录 = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def 生命周期(_: FastAPI):
    设置 = 读取设置()
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
