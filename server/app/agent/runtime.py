from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass
from typing import Any, AsyncGenerator

from app.agent.provider import 创建提供者
from app.agent.tools import 工具注册表
from app.core.config import 读取设置


@dataclass
class 步骤事件:
    类型: str
    数据: dict[str, Any]

    def sse(self) -> str:
        return f"data: {json.dumps({'type': self.类型, **self.数据}, ensure_ascii=False)}\n\n"


class Agent运行时:
    def __init__(self) -> None:
        self.设置 = 读取设置()
        self.提供者 = 创建提供者()

    async def 流式运行(
        self, 会话id: int, 问题: str, 历史: list[dict], 落盘
    ) -> AsyncGenerator[步骤事件, None]:
        """落盘: async callable(步骤, 思考, 工具, 输入, 观察, 阶段, 耗时) -> None"""
        观察: list[str] = []
        对话历史 = [*历史, {"role": "user", "content": 问题}]
        总步数 = 0
        yield 步骤事件("start", {"provider": self.提供者.名称, "max_steps": self.设置.Agent最大步数})

        for 步 in range(1, self.设置.Agent最大步数 + 1):
            开始 = time.perf_counter()
            try:
                回复 = await asyncio.wait_for(
                    self.提供者.决策(问题, 对话历史, 观察),
                    timeout=self.设置.Agent单步超时秒,
                )
            except asyncio.TimeoutError:
                yield 步骤事件("error", {"message": f"第 {步} 步决策超时，已终止"})
                await 落盘(步, "决策超时", None, None, "", "error", (time.perf_counter() - 开始) * 1000)
                return
            except Exception as 错误:
                yield 步骤事件("error", {"message": f"提供者异常降级: {错误}"})
                await 落盘(步, "提供者异常", None, None, str(错误), "error", (time.perf_counter() - 开始) * 1000)
                return

            if 回复.完成 or not 回复.动作:
                耗时 = round((time.perf_counter() - 开始) * 1000, 2)
                await 落盘(步, 回复.思考, None, None, 回复.答案, "finish", 耗时)
                yield 步骤事件("answer", {"answer": 回复.答案, "thought": 回复.思考, "step": 步})
                break

            工具名 = 回复.动作
            yield 步骤事件("thinking", {"thought": 回复.思考, "step": 步})
            yield 步骤事件("action", {"tool": 工具名, "input": 回复.动作输入, "step": 步})

            结果 = await 工具注册表.调用(工具名, 回复.动作输入)
            观察文本 = 结果.输出 if 结果.成功 else f"工具执行失败：{结果.错误}"
            引用 = 结果.数据.get("引用") if isinstance(结果.数据, dict) else None
            观察.append(f"[{工具名}] {观察文本}")
            耗时 = round((time.perf_counter() - 开始) * 1000, 2)

            await 落盘(步, 回复.思考, 工具名, 回复.动作输入, 观察文本, "act", 耗时)
            yield 步骤事件(
                "observation",
                {"tool": 工具名, "output": 观察文本, "citations": 引用 or [], "latency_ms": 结果.耗时毫秒, "step": 步},
            )
            总步数 = 步
        else:
            yield 步骤事件("answer", {"answer": "已达最大推理步数，未能得出结论。", "step": 总步数})

        yield 步骤事件("done", {"steps": 总步数})
