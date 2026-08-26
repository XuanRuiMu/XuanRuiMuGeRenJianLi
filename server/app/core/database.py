from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import 读取设置

_engine = None
_session工厂: async_sessionmaker[AsyncSession] | None = None


class 基类(DeclarativeBase):
    pass


def 获取引擎():
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            读取设置().数据库连接串,
            pool_pre_ping=True,
            pool_recycle=1800,
            max_overflow=10,
            echo=读取设置().调试模式,
        )
    return _engine


def 获取会话工厂() -> async_sessionmaker[AsyncSession]:
    global _session工厂
    if _session工厂 is None:
        _session工厂 = async_sessionmaker(
            获取引擎(), expire_on_commit=False, class_=AsyncSession
        )
    return _session工厂


async def 获取会话() -> AsyncGenerator[AsyncSession, None]:
    async with 获取会话工厂()() as 会话:
        try:
            yield 会话
            await 会话.commit()
        except Exception:
            await 会话.rollback()
            raise


async def 关闭引擎() -> None:
    global _engine, _session工厂
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session工厂 = None


async def 建表() -> None:
    from app import models

    async with 获取引擎().begin() as 连接:
        await 连接.run_sync(基类.metadata.create_all)
