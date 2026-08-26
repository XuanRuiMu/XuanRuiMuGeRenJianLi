import asyncio
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("数据库主机", "127.0.0.1")
os.environ.setdefault("数据库端口", "3306")
os.environ.setdefault("数据库用户", "root")
os.environ.setdefault("数据库密码", "BXYXblupz542284")
os.environ.setdefault("数据库名", "agentforge")


@pytest.fixture(scope="session")
def 事件循环():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def 初始化库():
    from app.core.database import 建表, 关闭引擎

    await 建表()
    yield
    await 关闭引擎()
