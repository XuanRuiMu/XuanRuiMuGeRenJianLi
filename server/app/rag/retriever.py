from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass
from typing import Pattern

_TOKEN_PATTERN: Pattern[str] = re.compile(r"[a-zA-Z0-9]+|[\u4e00-\u9fff]")

向量维度 = 256


def 切词(文本: str) -> list[str]:
    """中英混合轻量切词：英文按词、中文按字 bigram"""
    词列表: list[str] = []
    字缓冲: list[str] = []
    for 片段 in _TOKEN_PATTERN.findall(文本.lower()):
        if 片段[0].isascii():
            词列表.append(片段)
        else:
            字缓冲.append(片段)
    for i, 字 in enumerate(字缓冲):
        词列表.append(字)
        if i + 1 < len(字缓冲):
            词列表.append(字 + 字缓冲[i + 1])
    return 词列表


@dataclass
class 文档块:
    文档标识: str
    标题: str
    正文: str
    摘要: str = ""
    切词结果: list[str] | None = None

    def __post_init__(self) -> None:
        self.切词结果 = 切词(f"{self.标题} {self.正文}")
        if not self.摘要:
            self.摘要 = self.正文[:160]


@dataclass
class 引用结果:
    文档标识: str
    标题: str
    摘要: str
    得分: float


class BM25索引:
    k1 = 1.5
    b = 0.75

    def __init__(self, 块列表: list[文档块]) -> None:
        self.块列表 = 块列表
        self.文档数 = len(块列表)
        self.文档长度 = [len(b.切词结果) for b in 块列表]
        self.平均长度 = sum(self.文档长度) / max(self.文档数, 1)
        self.文档频率: dict[str, int] = {}
        for 块 in 块列表:
            for 词 in set(块.切词结果):
                self.文档频率[词] = self.文档频率.get(词, 0) + 1

    def 打分(self, 查询词: list[str], 索引: int) -> float:
        块 = self.块列表[索引]
        长度 = self.文档长度[索引]
        得分 = 0.0
        for 词 in 查询词:
            df = self.文档频率.get(词)
            if not df:
                continue
            idf = math.log((self.文档数 - df + 0.5) / (df + 0.5) + 1)
            tf = 块.切词结果.count(词)
            得分 += idf * tf * (self.k1 + 1) / (tf + self.k1 * (1 - self.b + self.b * 长度 / self.平均长度))
        return 得分


def 特征哈希向量(词列表: list[str]) -> list[float]:
    向量 = [0.0] * 向量维度
    for 词 in 词列表:
        摘要值 = hashlib.md5(词.encode("utf-8")).digest()
        桶 = int.from_bytes(摘要值[:4], "little") % 向量维度
        符号 = 1.0 if 摘要值[4] % 2 == 0 else -1.0
        向量[桶] += 符号
    范数 = math.sqrt(sum(v * v for v in 向量)) or 1.0
    return [v / 范数 for v in 向量]


def 余弦(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


class 混合检索器:
    def __init__(self, 块列表: list[文档块]) -> None:
        self.块列表 = 块列表
        self.bm25 = BM25索引(块列表)
        self.向量表 = [特征哈希向量(块.切词结果) for 块 in 块列表]

    async def 检索(self, 查询: str, 前k: int = 3) -> list[引用结果]:
        if not self.块列表:
            return []
        查询词 = 切词(查询)
        bm25得分 = sorted(
            ((self.bm25.打分(查询词, i), i) for i in range(len(self.块列表))),
            key=lambda x: x[0],
            reverse=True,
        )
        查询向量 = 特征哈希向量(查询词)
        向量得分 = sorted(
            ((余弦(查询向量, self.向量表[i]), i) for i in range(len(self.块列表))),
            key=lambda x: x[0],
            reverse=True,
        )

        def rrf(排名列表, 常数=60):
            融合: dict[int, float] = {}
            for 排名, (_, i) in enumerate(排名列表[:10]):
                融合[i] = 融合.get(i, 0.0) + 1.0 / (常数 + 排名 + 1)
            return 融合

        融合分 = rrf(bm25得分)
        for i, 分 in rrf(向量得分).items():
            融合分[i] = 融合分.get(i, 0.0) + 分
        排序后 = sorted(融合分.items(), key=lambda kv: kv[1], reverse=True)[:前k]
        return [
            引用结果(
                文档标识=self.块列表[i].文档标识,
                标题=self.块列表[i].标题,
                摘要=self.块列表[i].摘要,
                得分=round(分, 4),
            )
            for i, 分 in 排序后
            if 分 > 0
        ]
