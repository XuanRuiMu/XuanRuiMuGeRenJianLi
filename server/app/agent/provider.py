from abc import ABC, abstractmethod
from dataclasses import dataclass, field
import json
import re

import httpx

from app.core.config import 读取设置


def _解析工具入参(文本: str) -> dict:
    """把模型「输入:」行的文本解析为工具参数字典。

    兼容两种写法：直接 JSON 对象，或偶发的 {"query": "<json字符串>"} 双重包装。
    """
    原始 = 文本.strip()
    try:
        解析 = json.loads(原始)
    except Exception:
        return {"query": 原始}
    if isinstance(解析, dict) and set(解析.keys()) == {"query"} and isinstance(解析["query"], str):
        try:
            内层 = json.loads(解析["query"])
            if isinstance(内层, dict):
                return 内层
        except Exception:
            pass
    return 解析


@dataclass
class 模型回复:
    思考: str = ""
    动作: str | None = None
    动作输入: dict = field(default_factory=dict)
    完成: bool = False
    答案: str = ""


class LLM提供者(ABC):
    名称 = "abstract"

    @abstractmethod
    async def 决策(self, 问题: str, 历史: list[dict], 观察: list[str]) -> 模型回复:
        """基于用户问题与已有观察给出下一步 ReAct 决策"""


class 规则引擎提供者(LLM提供者):
    """零依赖确定性推理引擎：用于本地演示与评测回归"""

    名称 = "rule-engine"

    _意图词典: list[tuple[tuple[str, ...], str]] = [
        (("项目", "作品", "做过", "搭建", "开发过", "介绍"), "search_projects"),
        (("岗位", "职位", "技能", "要求", "匹配", "招聘"), "match_job"),
        (("计算", "多少", "求", "加", "减", "乘", "除"), "calculator"),
        (("时间", "几点", "日期", "今天"), "current_time"),
        (("统计", "调用记录", "次数", "日志"), "query_stats"),
    ]

    _JD信号词: tuple[str, ...] = ("职位描述", "岗位描述", "任职要求", "岗位职责", "工作职责", "jd", "匹配分析", "匹配度")

    async def 决策(self, 问题: str, 历史: list[dict], 观察: list[str]) -> 模型回复:
        if 观察:
            return self._汇总答案(问题, 观察[-1])
        小写 = 问题.lower()
        是JD全文 = any(k in 小写 for k in self._JD信号词) or (
            len(问题) > 80 and any(k in 问题 for k in ("要求", "职责", "经验"))
        )
        if 是JD全文:
            return 模型回复(
                思考="检测到职位描述长文本，调用 JD 匹配分析器逐项评估",
                动作="analyze_jd",
                动作输入={"jd_text": 问题},
            )
        for 关键词组, 工具 in self._意图词典:
            if any(k in 问题 for k in 关键词组):
                return 模型回复(
                    思考=f"识别到与「{工具}」相关的意图，需要调用工具获取事实依据",
                    动作=工具,
                    动作输入=self._构造输入(工具, 问题),
                )
        return 模型回复(
            思考="该问题属于自我介绍范畴，无需外部工具",
            完成=True,
            答案=(
                "我是内嵌于简历站的智能求职助手。你可以：\n"
                "· 问我「有哪些项目」「会什么技术」——基于知识库带引用回答\n"
                "· 粘贴一段职位描述（JD），我会输出技能匹配度报告\n"
                "· 让我做计算、查时间、统计工具调用"
            ),
        )

    @staticmethod
    def _构造输入(工具: str, 问题: str) -> dict:
        映射 = {
            "search_projects": {"query": 问题},
            "match_job": {"role": 问题},
            "calculator": {"expression": 问题},
            "current_time": {},
            "query_stats": {},
        }
        return 映射.get(工具, {})

    @staticmethod
    def _汇总答案(问题: str, 最后观察: str) -> 模型回复:
        引用块 = 最后观察.strip() or "暂未检索到相关信息。"
        return 模型回复(
            思考="已获得工具返回的事实依据，可以组织最终回答",
            完成=True,
            答案=f"根据查询结果：\n\n{引用块}",
        )


class DeepSeek提供者(LLM提供者):
    名称 = "deepseek"

    def __init__(self) -> None:
        设置 = 读取设置()
        self.接口地址 = (设置.DeepSeek接口地址 or "https://api.deepseek.com").rstrip("/")
        self.密钥 = 设置.DeepSeek密钥
        self.模型 = 设置.DeepSeek模型

    _标记模式 = re.compile(r"^\*{0,2}(思考|行动|输入|完成)\*{0,2}\s*[：:]\s*(.*)$")

    @staticmethod
    def _解析文本(文本: str) -> 模型回复:
        """解析 ReAct 格式文本。

        支持多行内容：``完成:`` 后的换行列表/段落会全部归入 ``答案``，
        避免模型把答案写成 ``具体包括：`` 后换行列举时被截断。
        """
        回复 = 模型回复()
        缓冲行: list[str] = []
        当前标记: str | None = None

        def 刷新标记(新标记: str | None = None) -> None:
            nonlocal 当前标记
            if 当前标记 is None:
                # 第一个标记前的无关文本直接丢弃
                缓冲行.clear()
                当前标记 = 新标记
                return
            if not 缓冲行:
                当前标记 = 新标记
                return
            内容 = "\n".join(缓冲行).strip()
            缓冲行.clear()
            if 当前标记 == "思考":
                回复.思考 = 内容
            elif 当前标记 == "行动":
                回复.动作 = 内容
            elif 当前标记 == "输入":
                回复.动作输入 = _解析工具入参(内容)
            elif 当前标记 == "完成":
                回复.完成 = True
                回复.答案 = 内容
            当前标记 = 新标记

        for 原始行 in 文本.splitlines():
            行 = 原始行.strip()
            if not 行:
                continue
            匹配 = DeepSeek提供者._标记模式.match(行)
            if 匹配:
                标记, 内容 = 匹配.group(1), 匹配.group(2).strip()
                刷新标记(标记)
                if 内容:
                    缓冲行.append(内容)
            else:
                缓冲行.append(行)

        刷新标记()

        if not 回复.完成 and not 回复.动作:
            回复.完成 = True
            回复.答案 = 文本.strip()
        return 回复

    async def 决策(self, 问题: str, 历史: list[dict], 观察: list[str]) -> 模型回复:
        from app.agent.tools import 工具注册表

        # 规则前置：flash 模型对工具选择提示词遵循不稳定，对高频意图直接选定工具
        小写 = 问题.lower()
        if not 观察:
            if any(k in 小写 for k in ("技能", "优势", "擅长", "会什么", "掌握什么", "ai技能", "it优势")):
                return 模型回复(
                    思考="用户询问技能或优势，直接调用 query_skills 获取清单",
                    动作="query_skills",
                    动作输入={},
                )
            if any(k in 小写 for k in ("项目", "作品", "做过", "搭建过", "开发过", "介绍")):
                return 模型回复(
                    思考="用户询问项目经历，直接调用 search_projects 检索知识库",
                    动作="search_projects",
                    动作输入={"query": 问题},
                )

        工具说明 = "\n".join(f"- {t.名称}: {t.描述}" for t in 工具注册表.全部())
        if 观察:
            观察文本 = "\n".join(观察[-3:])
            提示词 = (
                "你是 ReAct 智能体。你此前调用了工具，并已获得以下观察结果:\n"
                f"{观察文本}\n"
                "观察已经足够。现在禁止再调用任何工具，必须立即基于以上观察向用户给出最终回答。\n"
                "严格按此格式回答:\n"
                "思考: <一句话总结依据>\n"
                "完成: <面向用户的完整、结构化中文回答>\n"
                "最终答案质量要求：\n"
                "- 必须完整、有实质内容，禁止以冒号、省略号或'等'字结尾而不展开\n"
                "- 若使用'具体包括'/'以下几点'/'如下'等引导词，必须在其后立即列出至少一项具体内容\n"
                "- 对于资料未明确记录的问题，直接回答'现有资料未明确记录'，不要追加无内容的引导词"
            )
        else:
            提示词 = (
                "你是 ReAct 智能体。可用工具:\n"
                f"{工具说明}\n"
                "工具选择规则:\n"
                "- 若用户询问于翔堃会什么技能、AI技能、IT优势、擅长什么，必须使用 query_skills 获取技能清单后再组织答案\n"
                "- 若用户消息本身是一段完整的职位描述（包含岗位职责/任职要求/技能清单等），必须使用 analyze_jd，并把 JD 全文原样放入 jd_text 参数\n"
                "- 若用户只是询问岗位方向（如「我适合什么岗位」），才使用 match_job\n"
                "- 若用户询问做过哪些项目、项目细节，使用 search_projects\n"
                "请严格按以下格式之一回答（注意：无论是否调用工具，都必须【先】输出 思考: 行）:\n"
                "思考: <分析>\n行动: <工具名>\n输入: <参数JSON>\n"
                "或\n思考: <分析>\n完成: <最终答案>\n"
                "输入参数必须是该工具对应的 JSON 对象，严禁嵌套：\n"
                "- query_skills: {\"query\": \"<可选方向关键词，如 AI/前端/后端>\"}\n"
                "- analyze_jd: {\"jd_text\": \"<职位描述全文>\"}\n"
                "- search_projects: {\"query\": \"<关键词>\"}\n"
                "- match_job: {\"role\": \"<岗位方向>\"}\n"
                "- calculator: {\"expression\": \"<表达式>\"}\n"
                "- current_time / query_stats: {}\n"
                "最终答案质量要求：\n"
                "- 必须完整、有实质内容，禁止以冒号、省略号或'等'字结尾而不展开\n"
                "- 若使用'具体包括'/'以下几点'/'如下'等引导词，必须在其后立即列出至少一项具体内容\n"
                "- 对于资料未明确记录的问题，直接回答'现有资料未明确记录'，不要追加无内容的引导词\n"
                "- 每次回答都必须先输出 思考: 行（即使是直接回答，也要写明判断依据），禁止只写 完成: 而省略 思考:"
            )
        消息体 = [{"role": "system", "content": 提示词}, *历史]
        if not any(m.get("role") == "user" for m in 历史[-1:]):
            消息体.append({"role": "user", "content": 问题})
        async with httpx.AsyncClient(timeout=读取设置().Agent单步超时秒) as 客户端:
            响应 = await 客户端.post(
                f"{self.接口地址}/chat/completions",
                headers={"Authorization": f"Bearer {self.密钥}"},
                json={
                    "model": self.模型,
                    "messages": 消息体,
                    "temperature": 0.2,
                },
            )
            响应.raise_for_status()
            内容 = 响应.json()["choices"][0]["message"]["content"]
        return self._解析文本(内容)


def 创建提供者() -> LLM提供者:
    设置 = 读取设置()
    if 设置.DeepSeek密钥:
        try:
            return DeepSeek提供者()
        except Exception:
            pass
    return 规则引擎提供者()
