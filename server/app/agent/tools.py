import ast
import operator
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from sqlalchemy import func, select

from app.core.database import 获取会话工厂
from app.models import 工具调用记录
from app.rag.retriever import 混合检索器

运算符白名单: dict[type, Any] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
}

岗位知识库: dict[str, dict] = {
    "python": {"名称": "Python 开发工程师", "核心技能": ["FastAPI", "异步编程", "SQLAlchemy", "MySQL", "Redis"], "需求热度": 0.95},
    "agent": {"名称": "AI Agent 研发工程师", "核心技能": ["RAG", "MCP", "Function Calling", "LangGraph", "Eval可观测性"], "需求热度": 0.99},
    "前端": {"名称": "Web 前端研发工程师", "核心技能": ["React18", "TypeScript", "Vite", "性能优化", "SSE流式"], "需求热度": 0.9},
    "后端": {"名称": "服务端研发工程师", "核心技能": ["FastAPI", "MySQL", "缓存", "消息队列", "Docker"], "需求热度": 0.92},
    "全栈": {"名称": "AI 全栈开发工程师", "核心技能": ["React", "FastAPI", "RAG", "MCP", "数据库设计"], "需求热度": 0.94},
}

技能图谱: list[dict] = [
    {"名称": "Python", "别名": ["python", "python3"], "掌握": True, "深度": "熟练", "佐证": "智能体工坊 FastAPI 异步后端"},
    {"名称": "FastAPI", "别名": ["fastapi"], "掌握": True, "深度": "熟练", "佐证": "智能体工坊全异步 API 与 SSE 流式"},
    {"名称": "SQLAlchemy", "别名": ["sqlalchemy", "orm"], "掌握": True, "深度": "熟练（2.0 async）", "佐证": "MySQL 六表建模与轨迹持久化"},
    {"名称": "MySQL", "别名": ["mysql", "关系数据库", "数据库"], "掌握": True, "深度": "熟练", "佐证": "智能体工坊 agentforge 库六表建模与轨迹持久化"},
    {"名称": "React", "别名": ["react", "react.js", "reactjs", "react18"], "掌握": True, "深度": "熟练", "佐证": "智能体工坊控制台"},
    {"名称": "TypeScript", "别名": ["typescript", " ts"], "掌握": True, "深度": "熟练（strict 模式）", "佐证": "Astro 简历站与 React 控制台"},
    {"名称": "Vite", "别名": ["vite"], "掌握": True, "深度": "熟练", "佐证": "React 控制台构建链"},
    {"名称": "Astro", "别名": ["astro"], "掌握": True, "深度": "熟练", "佐证": "本简历站（bento 布局/视图过渡/内嵌游戏），已上线公网可访问"},
    {"名称": "Node.js", "别名": ["node", "node.js", "nodejs"], "掌握": True, "深度": "熟练", "佐证": "前端工程化与脚本体系"},
    {"名称": "Vue 3", "别名": ["vue", "vue3", "pinia"], "掌握": True, "深度": "熟练", "佐证": "会解压的外星人：Vue 3 + Pinia，SSE 打字机流式、9 类情绪识别、游客模式"},
    {"名称": "原生 JavaScript / Canvas", "别名": ["javascript", "js", "原生js", "canvas", "游戏开发"], "掌握": True, "深度": "熟练（零引擎）", "佐证": "NEON CYBER 游戏平台 7 款游戏：递归回溯迷宫 + BFS 追逐 AI、对象池、离屏预渲染、16ms 节流/200ms 防抖、DPR 自适应"},
    {"名称": "SQLite", "别名": ["sqlite"], "掌握": True, "深度": "实战", "佐证": "会解压的外星人本地持久化"},
    {"名称": "RAG", "别名": ["rag", "检索增强", "向量检索", "知识库"], "掌握": True, "深度": "实战（BM25+向量+RRF）", "佐证": "智能体工坊混合检索管线"},
    {"名称": "MCP", "别名": ["mcp", "model context protocol"], "掌握": True, "深度": "实战（JSON-RPC 服务端）", "佐证": "自研 MCP JSON-RPC 网关（协议版本 2025-06-18），统一工具注册 schema 与调用入口"},
    {"名称": "Function Calling", "别名": ["function calling", "函数调用", "tool use", "工具调用"], "掌握": True, "深度": "实战", "佐证": "ReAct 工具系统与调用持久化"},
    {"名称": "AI Agent", "别名": ["ai agent", "agent", "智能体", "llm 应用"], "掌握": True, "深度": "核心能力", "佐证": "自研 ReAct 运行时与全部 AI Agent 构建的工作区项目"},
    {"名称": "SSE", "别名": ["sse", "server-sent events", "流式输出", "流式"], "掌握": True, "深度": "实战", "佐证": "对话流式接口与前端渲染"},
    {"名称": "Prompt 工程", "别名": ["prompt", "提示词工程", "提示词"], "掌握": True, "深度": "实战", "佐证": "ReAct 决策协议与 Skill 开发"},
    {"名称": "自动化测试", "别名": ["测试", "pytest", "junit", "playwright", "单元测试", "e2e"], "掌握": True, "深度": "实战", "佐证": "毕业设计 366 个 JUnit 5 + Mockito 用例；智能体工坊 pytest 用例；Playwright 浏览器级端到端验证（截图对比、SPA 导航往返稳定性、并发压力验证）"},
    {"名称": "Git", "别名": ["git", "版本控制"], "掌握": True, "深度": "日常使用", "佐证": "工作区全项目"},
    {"名称": "部署运维", "别名": ["部署", "运维", "服务器", "腾讯云", "守护", "上线"], "掌握": True, "深度": "实战", "佐证": "腾讯云 Windows Server 部署 + 进程守护自愈，站点已上线公网可访问"},
    {"名称": "Web 安全", "别名": ["安全", "jwt", "bcrypt", "csrf", "加密", "脱敏"], "掌握": True, "深度": "实战", "佐证": "毕业设计：BCrypt 密码加密、JWT 鉴权、HMAC-SHA256 CSRF 令牌，POI 流式导出并对证件号脱敏"},
    {"名称": "Docker", "别名": ["docker", "容器", "compose", "镜像"], "掌握": True, "深度": "入门实战（容器化打包）", "佐证": "AI 简历匹配平台：Dockerfile 多阶段构建（Maven 构建 → JRE 运行）+ docker-compose 编排 app/MySQL/Redis"},
    {"名称": "Java", "别名": ["java", "spring", "springboot", "spring boot", "jvm"], "掌握": True, "深度": "可独立交付业务系统", "佐证": "AI 简历匹配平台（Java 17 + Spring Boot 3.5 + Data JPA，JUnit 5 + MockMvc 覆盖参数校验/限流/降级）；毕业设计《网上村委会业务办理系统》Spring + MyBatis，8 模块 12 表 88 端点，366 个 JUnit 5 + Mockito 用例"},
    {"名称": "Spring", "别名": ["spring", "spring framework", "spring mvc"], "掌握": True, "深度": "毕设实战", "佐证": "毕业设计：全注解 Java Config（无 XML）、事务管理、拦截器、全局异常处理"},
    {"名称": "MyBatis", "别名": ["mybatis", "orm框架"], "掌握": True, "深度": "毕设实战", "佐证": "毕业设计：注解式数据访问，POI 结合数据库游标流式导出并脱敏"},
    {"名称": "Redis", "别名": ["redis", "缓存中间件", "缓存", "限流"], "掌握": True, "深度": "实战（缓存与限流，含降级）", "佐证": "AI 简历匹配平台：JD 内容哈希缓存 + 每 IP 固定窗口限流（429）；Redis 不可用时自动降级 Caffeine 内存缓存，接口语义一致"},
    {"名称": "微服务", "别名": ["微服务", "分布式", "消息队列", "kafka", "rocketmq"], "掌握": False, "深度": "", "佐证": ""},
    {"名称": "Solid", "别名": ["solid", "solidjs"], "掌握": False, "深度": "", "佐证": ""},
    {"名称": "Svelte", "别名": ["svelte", "sveltekit"], "掌握": False, "深度": "", "佐证": ""},
]


def 安全求值(表达式: str) -> float:
    def 解析节点(节点) -> float:
        if isinstance(节点, ast.Constant) and isinstance(节点.value, (int, float)):
            return float(节点.value)
        if isinstance(节点, ast.BinOp) and type(节点.op) in 运算符白名单:
            return 运算符白名单[type(节点.op)](解析节点(节点.left), 解析节点(节点.right))
        if isinstance(节点, ast.UnaryOp) and type(节点.op) in 运算符白名单:
            return 运算符白名单[type(节点.op)](解析节点(节点.operand))
        raise ValueError(f"不允许的表达元素: {type(节点).__name__}")

    树 = ast.parse(表达式, mode="eval")
    return 解析节点(树.body)


@dataclass
class 工具定义:
    名称: str
    描述: str
    参数模式: dict
    执行函数: Any


@dataclass
class 工具结果:
    成功: bool
    输出: str = ""
    数据: dict = field(default_factory=dict)
    错误: str = ""
    耗时毫秒: float = 0.0


async def _执行并记录(工具: 工具定义, 参数: dict) -> 工具结果:
    开始 = time.perf_counter()
    try:
        结果 = await 工具.执行函数(**参数)
    except TypeError as 错误:
        结果 = 工具结果(成功=False, 错误=f"参数校验失败: {错误}")
    except Exception as 错误:
        结果 = 工具结果(成功=False, 错误=f"{type(错误).__name__}: {错误}")
    结果.耗时毫秒 = round((time.perf_counter() - 开始) * 1000, 2)
    try:
        async with 获取会话工厂()() as 会话:
            会话.add(
                工具调用记录(
                    工具名=工具.名称,
                    输入参数=参数,
                    输出结果={"输出": 结果.输出[:2000], "数据": 结果.数据} if 结果.成功 else None,
                    是否成功=结果.成功,
                    错误信息=结果.错误 or None,
                    耗时毫秒=结果.耗时毫秒,
                )
            )
            await 会话.commit()
    except Exception:
        pass
    return 结果


class 工具箱:
    @staticmethod
    def 注册表() -> list[工具定义]:
        return [
            工具定义(
                名称="query_skills",
                描述="查询于翔堃掌握的技能清单、掌握深度及佐证项目；适用于'会什么技能/AI技能/IT优势/擅长什么'类问题",
                参数模式={
                    "type": "object",
                    "properties": {"query": {"type": "string", "description": "可选方向关键词，如 AI/前端/后端"}},
                    "required": [],
                },
                执行函数=_查技能,
            ),
            工具定义(
                名称="search_projects",
                描述="在项目知识库中混合检索（BM25+向量），返回带引用来源的项目事实",
                参数模式={
                    "type": "object",
                    "properties": {"query": {"type": "string", "description": "检索关键词"}},
                    "required": ["query"],
                },
                执行函数=_查项目,
            ),
            工具定义(
                名称="match_job",
                描述="根据岗位方向匹配市场需求技能与热度",
                参数模式={
                    "type": "object",
                    "properties": {"role": {"type": "string", "description": "岗位方向，如 agent/python/前端/后端/全栈"}},
                    "required": ["role"],
                },
                执行函数=_匹配岗位,
            ),
            工具定义(
                名称="analyze_jd",
                描述="粘贴职位描述（JD）全文，逐项分析于翔堃与该岗位的技能匹配度：命中技能、佐证项目、差距项与匹配率",
                参数模式={
                    "type": "object",
                    "properties": {
                        "jd_text": {"type": "string", "description": "职位描述全文"},
                    },
                    "required": ["jd_text"],
                },
                执行函数=_分析JD,
            ),
            工具定义(
                名称="calculator",
                描述="安全的四则运算计算器",
                参数模式={
                    "type": "object",
                    "properties": {"expression": {"type": "string", "description": "数学表达式，如 1+2*3"}},
                    "required": ["expression"],
                },
                执行函数=_计算,
            ),
            工具定义(
                名称="current_time",
                描述="获取当前服务器时间",
                参数模式={"type": "object", "properties": {}},
                执行函数=_当前时间,
            ),
            工具定义(
                名称="query_stats",
                描述="从 MySQL 统计各工具的历史调用次数与成功率",
                参数模式={"type": "object", "properties": {}},
                执行函数=_查询统计,
            ),
        ]


async def _查技能(query: str = "") -> 工具结果:
    """返回于翔堃的技能清单；query 仅作可选过滤提示，目前返回全量。"""
    关键词 = query.lower().strip() if isinstance(query, str) else ""
    已掌握 = [s for s in 技能图谱 if s["掌握"]]
    未掌握 = [s for s in 技能图谱 if not s["掌握"]]
    if 关键词:
        已掌握 = [s for s in 已掌握 if any(关键词 in str(v).lower() for v in [s["名称"], *s["别名"], s["深度"], s["佐证"]])]
        未掌握 = [s for s in 未掌握 if any(关键词 in str(v).lower() for v in [s["名称"], *s["别名"]])]

    行: list[str] = []
    if 已掌握:
        行.append("于翔堃已掌握的技能：")
        for s in 已掌握:
            行.append(f"  · {s['名称']}（{s['深度']}）— {s['佐证']}")
    else:
        行.append("资料中未检索到相关技能记录。")

    if 未掌握:
        行.append("")
        行.append("暂未掌握但可快速学习的技能：")
        for s in 未掌握:
            行.append(f"  · {s['名称']}")

    return 工具结果(成功=True, 输出="\n".join(行), 数据={"已掌握": 已掌握, "未掌握": 未掌握})


async def _查项目(query: str) -> 工具结果:
    from app.rag.knowledge import 获取检索器

    检索器: 混合检索器 = await 获取检索器()
    引用结果 = await 检索器.检索(query, 前k=3)
    if not 引用结果:
        return 工具结果(成功=True, 输出="知识库中未找到相关内容。")
    行 = [f"[{i + 1}] {r.标题}（相关度 {r.得分:.3f}）: {r.摘要}" for i, r in enumerate(引用结果)]
    来源列表 = [{"引用": f"[{i + 1}]", "标题": r.标题, "文档标识": r.文档标识} for i, r in enumerate(引用结果)]
    return 工具结果(成功=True, 输出="\n".join(行), 数据={"引用": 来源列表})


async def _匹配岗位(role: str) -> 工具结果:
    文本 = role.lower()
    最佳 = max(岗位知识库.items(), key=lambda kv: (kv[0] in 文本, kv[1]["需求热度"]))
    信息 = 最佳[1]
    行 = (
        f"匹配岗位：{信息['名称']}\n"
        f"市场热度：{int(信息['需求热度'] * 100)}%\n"
        f"核心技能：{'、'.join(信息['核心技能'])}\n"
        f"依据：2026年8月招聘平台 AI 相关岗位月均增速 74%+ 的公开统计"
    )
    return 工具结果(成功=True, 输出=行, 数据=信息)


async def _分析JD(jd_text: str) -> 工具结果:
    文本 = jd_text.lower()
    if len(文本.strip()) < 10:
        return 工具结果(成功=False, 错误="职位描述过短，请粘贴完整的 JD 全文")

    命中: list[dict] = []
    未命中要求: list[dict] = []
    for 技能 in 技能图谱:
        关键词组 = [技能["名称"].lower(), *技能["别名"]]
        if any(k in 文本 for k in 关键词组 if k.strip()):
            (命中 if 技能["掌握"] else 未命中要求).append(技能)

    总要求 = len(命中) + len(未命中要求)
    if 总要求 == 0:
        return 工具结果(
            成功=True,
            输出="未能从该 JD 中识别出可评估的技术要求，建议粘贴包含「任职要求」的完整段落。",
        )

    匹配率 = round(len(命中) / 总要求 * 100)
    行 = [f"岗位匹配度：{匹配率}%（{len(命中)}/{总要求} 项已具备）", "", "✅ 具备的技能："]
    行 += [f"  · {s['名称']}（{s['深度']}）— {s['佐证']}" for s in 命中] or ["  · （无）"]
    行.append("")
    行.append("⚠️ 该岗位要求但暂未覆盖：")
    行 += [f"  · {s['名称']}" for s in 未命中要求] or ["  · 无"]
    行.append("")
    结论 = (
        "综合结论：核心要求高度契合，建议投递并重点展示佐证项目。"
        if 匹配率 >= 70
        else "综合结论：部分契合，投递时需突出可迁移能力与 AI Agent 提效的学习路径。"
        if 匹配率 >= 40
        else "综合结论：匹配度偏低，可作为保底选项谨慎投递。"
    )
    行.append(结论)
    return 工具结果(
        成功=True,
        输出="\n".join(行),
        数据={
            "匹配率": 匹配率,
            "命中": [s["名称"] for s in 命中],
            "差距": [s["名称"] for s in 未命中要求],
        },
    )


async def _计算(expression: str) -> 工具结果:
    import re

    清理后 = re.sub(r"[^0-9+\-*/(). ]", "", expression).strip() or "0"
    值 = 安全求值(清理后)
    return 工具结果(成功=True, 输出=f"{expression.strip()} = {值:g}", 数据={"值": 值})


async def _当前时间() -> 工具结果:
    现在 = datetime.now()
    return 工具结果(成功=True, 输出=f"当前服务器时间：{现在:%Y-%m-%d %H:%M:%S}")


async def _查询统计() -> 工具结果:
    try:
        async with 获取会话工厂()() as 会话:
            查询 = select(
                工具调用记录.工具名,
                func.count().label("次数"),
                func.sum(func.if_(工具调用记录.是否成功, 1, 0)).label("成功数"),
            ).group_by(工具调用记录.工具名)
            行集 = (await 会话.execute(查询)).all()
        if not 行集:
            return 工具结果(成功=True, 输出="暂无工具调用记录。")
        行文本 = [f"- {r.工具名}: {r.次数} 次，成功率 {int(r.成功数) / r.次数:.0%}" for r in 行集]
        return 工具结果(成功=True, 输出="\n".join(行文本), 数据={"明细": [tuple(r) for r in 行集]})
    except Exception as 错误:
        return 工具结果(成功=False, 错误=f"统计查询失败: {错误}")


class _工具注册表单例:
    def __init__(self) -> None:
        self._映射: dict[str, 工具定义] = {t.名称: t for t in 工具箱.注册表()}

    def 全部(self) -> list[工具定义]:
        return list(self._映射.values())

    def 取(self, 名称: str) -> 工具定义 | None:
        return self._映射.get(名称)

    async def 调用(self, 名称: str, 参数: dict) -> 工具结果:
        工具 = self._映射.get(名称)
        if 工具 is None:
            return 工具结果(成功=False, 错误=f"未知工具: {名称}")
        缺失 = [k for k in 工具.参数模式.get("required", []) if k not in 参数]
        if 缺失:
            return 工具结果(成功=False, 错误=f"缺少必需参数: {缺失}")
        return await _执行并记录(工具, 参数)


工具注册表 = _工具注册表单例()
