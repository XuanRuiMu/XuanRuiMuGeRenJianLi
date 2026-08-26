import pytest

from app.agent.provider import DeepSeek提供者, 规则引擎提供者, 模型回复
from app.agent.tools import 安全求值, 工具注册表


@pytest.mark.asyncio
async def test_规则引擎_项目意图():
    回复 = await 规则引擎提供者().决策("你做过哪些项目？", [], [])
    assert not 回复.完成
    assert 回复.动作 == "search_projects"


@pytest.mark.asyncio
async def test_规则引擎_JD分析意图():
    回复 = await 规则引擎提供者().决策("岗位职责：负责RAG系统开发，任职要求熟悉Python和MySQL", [], [])
    assert 回复.动作 == "analyze_jd"


@pytest.mark.asyncio
async def test_分析JD_匹配报告():
    结果 = await 工具注册表.调用("analyze_jd", {"jd_text": "岗位职责：开发AI Agent应用，要求熟悉Python、FastAPI、MySQL、React、RAG；任职要求：了解Docker容器化部署"})
    assert 结果.成功
    assert "匹配度" in 结果.输出 and "%" in 结果.输出
    assert "FastAPI" in 结果.输出 and "Docker" in 结果.输出


@pytest.mark.asyncio
async def test_分析JD_过短拒绝():
    结果 = await 工具注册表.调用("analyze_jd", {"jd_text": "太短"})
    assert not 结果.成功
    assert "过短" in 结果.错误


@pytest.mark.asyncio
async def test_规则引擎_岗位意图():
    回复 = await 规则引擎提供者().决策("我适合什么岗位", [], [])
    assert 回复.动作 == "match_job"


@pytest.mark.asyncio
async def test_规则引擎_有观察后收尾():
    回复 = await 规则引擎提供者().决策("有哪些项目？", [], ["[search_projects] 检索到智能体工坊"])
    assert 回复.完成
    assert "检索到" in 回复.答案


@pytest.mark.asyncio
async def test_规则引擎_闲聊():
    回复 = await 规则引擎提供者().决策("你是谁？", [], [])
    assert 回复.完成
    assert "智能求职助手" in 回复.答案


def test_DeepSeek解析_行动格式():
    回复 = DeepSeek提供者._解析文本("思考: 需要检索\n行动: search_projects\n输入: query=游戏")
    assert 回复.动作 == "search_projects"
    assert 回复.动作输入 == {"query": "query=游戏"}


def test_DeepSeek解析_完成格式():
    回复 = DeepSeek提供者._解析文本("思考: 可以回答\n完成: 这是最终答案")
    assert 回复.完成
    assert 回复.答案 == "这是最终答案"


def test_DeepSeek解析_纯文本兜底():
    回复 = DeepSeek提供者._解析文本("直接回答内容")
    assert 回复.完成
    assert 回复.答案 == "直接回答内容"


def test_安全求值_四则():
    assert 安全求值("1+2*3") == 7
    assert 安全求值("(1+2)*3") == 9
    assert 安全求值("10/4") == 2.5


def test_安全求值_拒绝危险表达式():
    for 危险 in ["__import__('os')", "1;2", "'a'+1"]:
        with pytest.raises(Exception):
            安全求值(危险)


def test_工具注册表_完整():
    名称列表 = [t.名称 for t in 工具注册表.全部()]
    assert set(["search_projects", "match_job", "analyze_jd", "calculator", "current_time", "query_stats"]) == set(名称列表)


def test_工具注册表_schema():
    for t in 工具注册表.全部():
        assert t.参数模式.get("type") == "object"


@pytest.mark.asyncio
async def test_工具调用_未知工具():
    结果 = await 工具注册表.调用("不存在", {})
    assert not 结果.成功


@pytest.mark.asyncio
async def test_工具调用_缺参数():
    结果 = await 工具注册表.调用("calculator", {})
    assert not 结果.成功
    assert "缺少必需参数" in 结果.错误


@pytest.mark.asyncio
async def test_工具调用_计算器(初始化库):
    结果 = await 工具注册表.调用("calculator", {"expression": "6*7"})
    assert 结果.成功
    assert "42" in 结果.输出


@pytest.mark.asyncio
async def test_工具调用_时间(初始化库):
    结果 = await 工具注册表.调用("current_time", {})
    assert 结果.成功
    assert "当前服务器时间" in 结果.输出
