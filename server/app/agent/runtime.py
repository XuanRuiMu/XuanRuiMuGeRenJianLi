from __future__ import annotations

import asyncio
import json
import re
import time
from dataclasses import dataclass
from typing import Any, AsyncGenerator

from app.agent.provider import 创建提供者, 规则引擎提供者, 模型回复
from app.agent.tools import 工具注册表
from app.core.config import 读取设置


# 用于识别"只写引导词却不展开"的残缺答案
_不完整答案模式 = re.compile(
    r"(?:具体包括|以下几点|如下|核心能力|主要方面|主要技能|优势|内容|条目|项目)[：:]\s*$|…$|\.\.\.$|等$"
)


def _答案是否完整(答案: str) -> bool:
    return not _不完整答案模式.search(答案.strip())


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
        # 远程 LLM 一旦失败（典型：DeepSeek 402 余额不足）就记住，
        # 后续步骤直接走规则引擎，避免每步都重发必然失败的网络请求（单步最长 20s）。
        self._降级引擎: 规则引擎提供者 | None = None
        self._远程已失败 = False

    def _降级(self) -> 规则引擎提供者:
        if self._降级引擎 is None:
            self._降级引擎 = 规则引擎提供者()
        return self._降级引擎

    async def _决策一步(
        self, 问题: str, 对话历史: list[dict], 观察: list[str]
    ) -> 模型回复:
        """优先用配置的远程 LLM；若已确认其不可用，则直接用内置规则引擎。"""
        if self._远程已失败:
            return await self._降级().决策(问题, 对话历史, 观察)
        try:
            return await self.提供者.决策(问题, 对话历史, 观察)
        except Exception:
            self._远程已失败 = True
            return await self._降级().决策(问题, 对话历史, 观察)

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
                    self._决策一步(问题, 对话历史, 观察),
                    timeout=self.设置.Agent单步超时秒,
                )
            except asyncio.TimeoutError:
                # 超时同样视为远程 LLM 不可用：标记后用规则引擎再试一次，仍失败才终止。
                # 避免把 402/网络异常等原始错误抛给用户。
                self._远程已失败 = True
                try:
                    回复 = await asyncio.wait_for(
                        self._降级().决策(问题, 对话历史, 观察),
                        timeout=self.设置.Agent单步超时秒,
                    )
                except Exception:
                    yield 步骤事件("error", {"message": f"第 {步} 步决策超时，已终止"})
                    await 落盘(步, "决策超时", None, None, "", "error", (time.perf_counter() - 开始) * 1000)
                    return
            except Exception as 错误:
                # 能走到这里说明规则引擎自身也出错，此时才向用户报错
                yield 步骤事件("error", {"message": f"提供者异常降级: {错误}"})
                await 落盘(步, "提供者异常", None, None, str(错误), "error", (time.perf_counter() - 开始) * 1000)
                return

            if 回复.完成 or not 回复.动作:
                耗时 = round((time.perf_counter() - 开始) * 1000, 2)
                总步数 = 步
                # 兜底：若模型只写了"具体包括："等引导词却不展开，把最近一次工具观察追加进答案
                if 观察 and not _答案是否完整(回复.答案):
                    回复.答案 = f"{回复.答案.rstrip(' ：:\n')}\n\n{观察[-1]}"
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
