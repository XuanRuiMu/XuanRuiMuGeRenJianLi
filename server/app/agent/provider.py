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
    """零依赖确定性推理引擎：本地演示、评测回归，以及远程 LLM 不可用时的兜底。

    设计要点（针对「答不出所有问题」的修复）：
    1. 先判定 JD 全文 / 算式 / 时间问答，命中则走专用工具；
    2. 再按关键词命中技能、项目、岗位、统计等专用工具；
    3. **任何未命中的问题都不会空手而归**——一律改用简历知识库检索
       （search_projects）后基于检索到的事实作答，而不是返回固定自我介绍；
    4. 检索确实无果时，给出诚实答复 + 可用能力清单，引导用户换问法。
    """

    名称 = "rule-engine"

    # 顺序敏感：越靠前优先级越高。
    # 注意「技能/优势」必须排在「岗位」之前——否则「他会什么技能」会被误判为
    # match_job，返回的是岗位市场要求而非他本人实际掌握的技能。
    _意图词典: list[tuple[tuple[str, ...], str]] = [
        (("技能", "优势", "擅长", "会什么", "掌握什么", "技术栈"), "query_skills"),
        (("统计", "调用记录", "调用次数", "工具调用"), "query_stats"),
        (("项目", "作品", "做过", "搭建", "开发过"), "search_projects"),
        (("岗位", "职位", "招聘", "市场需求", "适合什么"), "match_job"),
    ]

    _JD信号词: tuple[str, ...] = ("职位描述", "岗位描述", "任职要求", "岗位职责", "工作职责", "jd", "匹配分析", "匹配度")
    _JD结构标记: tuple[str, ...] = ("任职要求", "岗位职责", "职位描述", "工作职责", "岗位描述", "任职资格", "技能要求")
    _数字模式 = re.compile(r"\d")
    _运算符模式 = re.compile(r"[+\-*/×÷]")
    _时间关键词: tuple[str, ...] = ("几点", "现在时间", "当前时间", "今天几号", "今天是几号", "现在几点", "今天日期")

    async def 决策(self, 问题: str, 历史: list[dict], 观察: list[str]) -> 模型回复:
        if 观察:
            return self._汇总答案(问题, 观察[-1])

        if self._是JD全文(问题):
            return 模型回复(
                思考="检测到职位描述长文本，调用 JD 匹配分析器逐项评估",
                动作="analyze_jd",
                动作输入={"jd_text": 问题},
            )
        if self._像算式(问题):
            return 模型回复(
                思考="识别为数学表达式，调用安全计算器求值",
                动作="calculator",
                动作输入={"expression": 问题},
            )
        if self._问时间(问题):
            return 模型回复(
                思考="用户询问当前时间，调用时间工具",
                动作="current_time",
                动作输入={},
            )
        for 关键词组, 工具 in self._意图词典:
            if any(k in 问题 for k in 关键词组):
                return 模型回复(
                    思考=f"识别到与「{工具}」相关的意图，需要调用工具获取事实依据",
                    动作=工具,
                    动作输入=self._构造输入(工具, 问题),
                )
        # 兜底：未命中任何专用意图也绝不空手而归，先查简历知识库再作答
        return 模型回复(
            思考="未命中专用工具意图，改从简历知识库检索相关事实后作答",
            动作="search_projects",
            动作输入={"query": 问题},
        )

    @classmethod
    def _是JD全文(cls, 问题: str) -> bool:
        小写 = 问题.lower()
        if any(k in 小写 for k in cls._JD信号词):
            return True
        # 长文本需同时命中至少 2 个结构性标记，避免把「他有多少年经验」这类
        # 普通长句误判成 JD
        命中数 = sum(1 for k in cls._JD结构标记 if k in 问题)
        return len(问题) > 120 and 命中数 >= 2

    @classmethod
    def _像算式(cls, 问题: str) -> bool:
        # 必须同时含数字与运算符，否则「他有多少年经验」会被当成算式算出 0
        return bool(cls._数字模式.search(问题)) and bool(cls._运算符模式.search(问题))

    @classmethod
    def _问时间(cls, 问题: str) -> bool:
        return any(k in 问题 for k in cls._时间关键词)

    @staticmethod
    def _构造输入(工具: str, 问题: str) -> dict:
        映射 = {
            "search_projects": {"query": 问题},
            "match_job": {"role": 问题},
            "query_skills": {"query": 问题},
            "calculator": {"expression": 问题},
            "current_time": {},
            "query_stats": {},
        }
        return 映射.get(工具, {})

    @staticmethod
    def _汇总答案(问题: str, 最后观察: str) -> 模型回复:
        """把最后一次工具观察组织成完整答案。

        观察形如 ``[工具名] 输出内容``，先拆出工具名再决定如何包装：
        - 专用工具（技能/JD/岗位/时间/统计/计算）输出自带完整语义，直接作为答案；
        - 知识库检索结果则补一句贴合问题的引导语，并保留引用条目。
        """
        原始 = (最后观察 or "").strip()
        匹配 = re.match(r"^\[([^\]]+)\]\s*", 原始)
        工具名 = 匹配.group(1) if 匹配 else ""
        正文 = 原始[匹配.end():].strip() if 匹配 else 原始

        if not 正文 or 正文 in ("知识库中未找到相关内容。", "暂未检索到相关信息。"):
            return 模型回复(
                思考="知识库检索无结果，给出诚实答复与可用能力清单",
                完成=True,
                答案=规则引擎提供者._无结果答复(),
            )
        if 工具名 and 工具名 != "search_projects":
            return 模型回复(
                思考=f"「{工具名}」的输出已是完整结论，直接作为最终回答",
                完成=True,
                答案=正文,
            )
        return 模型回复(
            思考="已获得知识库检索结果，组织最终回答",
            完成=True,
            答案=f"关于「{问题.strip()}」，简历资料中的相关记录如下：\n\n{正文}",
        )

    @staticmethod
    def _无结果答复() -> str:
        return (
            "现有简历资料中没有关于这个问题的直接记录。\n\n"
            "基于已有资料，我可以回答这些方面：\n"
            "· 于翔堃是谁、核心差异化优势、求职状态与联系方式\n"
            "· 掌握的技能清单与掌握深度（试试问「他会什么技能」）\n"
            "· 做过的项目细节（试试问「有哪些项目」「智能体工坊是什么」）\n"
            "· 岗位方向与市场热度（试试问「他适合什么岗位」）\n"
            "· 粘贴一段职位描述（JD），我会输出逐项技能匹配度报告\n\n"
            "也可以换个更具体的说法再问我一次。"
        )


class OpenAI兼容提供者(LLM提供者):
    """OpenAI 兼容 /chat/completions 接口的实现。

    当前对接硅基流动（https://api.siliconflow.cn/v1），
    也可通过 .env 的 模型接口地址 / 模型密钥 / 模型名称 换成任意兼容服务。
    """

    名称 = "openai-compatible"

    def __init__(self) -> None:
        设置 = 读取设置()
        self.接口地址 = (设置.模型接口地址 or "https://api.siliconflow.cn/v1").rstrip("/")
        self.密钥 = 设置.模型密钥
        self.模型 = 设置.模型名称

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
            匹配 = OpenAI兼容提供者._标记模式.match(行)
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
                    "max_tokens": 2048,
                },
            )
            if 响应.status_code >= 400:
                # 带上响应体，方便定位余额不足(402)/鉴权失败(401)/模型不存在(404)等问题
                raise RuntimeError(f"LLM 接口返回 {响应.status_code}: {响应.text[:300]}")
            内容 = 响应.json()["choices"][0]["message"]["content"] or ""
            if not 内容.strip():
                # 部分推理模型只把内容放进 reasoning_content
                内容 = (响应.json()["choices"][0]["message"].get("reasoning_content") or "").strip()
        return self._解析文本(内容)


def 创建提供者() -> LLM提供者:
    设置 = 读取设置()
    if 设置.模型密钥 and 设置.模型接口地址:
        try:
            return OpenAI兼容提供者()
        except Exception:
            pass
    return 规则引擎提供者()
