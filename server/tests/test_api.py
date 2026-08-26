import httpx
import pytest

from app.core.config import 读取设置


@pytest.fixture
async def 客户端():
    from app.main import app

    传输 = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=传输, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_健康检查(初始化库, 客户端: httpx.AsyncClient):
    r = await 客户端.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_MCP_initialize(初始化库, 客户端: httpx.AsyncClient):
    r = await 客户端.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "initialize"})
    assert r.status_code == 200
    体 = r.json()
    assert 体["result"]["serverInfo"]["name"] == "agentfoundry"


@pytest.mark.asyncio
async def test_MCP_tools_list(初始化库, 客户端: httpx.AsyncClient):
    r = await 客户端.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    工具列表 = r.json()["result"]["tools"]
    assert len(工具列表) == 6
    assert all("inputSchema" in t for t in 工具列表)


@pytest.mark.asyncio
async def test_MCP_tools_call_计算器(初始化库, 客户端: httpx.AsyncClient):
    r = await 客户端.post(
        "/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "calculator", "arguments": {"expression": "21*2"}},
        },
    )
    结果 = r.json()["result"]
    assert not 结果["isError"]
    assert "42" in 结果["content"][0]["text"]


@pytest.mark.asyncio
async def test_MCP未知方法(初始化库, 客户端: httpx.AsyncClient):
    r = await 客户端.post("/mcp", json={"jsonrpc": "2.0", "id": 4, "method": "bad/method"})
    assert "error" in r.json()


@pytest.mark.asyncio
async def test_SSE对话全流程(初始化库, 客户端: httpx.AsyncClient, monkeypatch):
    from app.agent import runtime as 运行时模块
    from app.agent.provider import 规则引擎提供者

    monkeypatch.setattr(运行时模块, "创建提供者", lambda: 规则引擎提供者())
    建会话 = await 客户端.post("/api/chat/conversations", json={"标题": "测试会话"})
    会话id = 建会话.json()["id"]

    事件类型列表 = []
    async with 客户端.stream("POST", f"/api/chat/conversations/{会话id}/stream", json={"内容": "你做过哪些项目？"}) as 响应:
        assert 响应.status_code == 200
        async for 行 in 响应.aiter_lines():
            if 行.startswith("data: "):
                import json

                事件 = json.loads(行[6:])
                事件类型列表.append(事件["type"])

    assert "start" in 事件类型列表
    assert "action" in 事件类型列表 or "answer" in 事件类型列表
    assert "done" in 事件类型列表

    消息列表 = (await 客户端.get(f"/api/chat/conversations/{会话id}/messages")).json()
    角色 = [m["role"] for m in 消息列表]
    assert "user" in 角色 and "assistant" in 角色

    轨迹 = (await 客户端.get(f"/api/traces/conversations/{会话id}")).json()
    assert len(轨迹) >= 2


@pytest.mark.asyncio
async def test_评测运行(初始化库, 客户端: httpx.AsyncClient, monkeypatch):
    from app.agent import runtime as 运行时模块
    from app.agent.provider import 规则引擎提供者

    monkeypatch.setattr(运行时模块, "创建提供者", lambda: 规则引擎提供者())
    r = await 客户端.post("/api/eval/run", json={"数据集版本": "pytest-v1"})
    体 = r.json()
    assert 体["total"] == 9
    assert 体["passed"] == 体["total"], f"评测未全过: {[(d['id'], d['expect_tool'], d['actual_tool'], d['error']) for d in 体['detail'] if not d['passed']]}"
    assert 体["success_rate"] == 1.0

    历史 = (await 客户端.get("/api/eval/runs")).json()
    assert any(h["id"] == 体["run_id"] for h in 历史)
