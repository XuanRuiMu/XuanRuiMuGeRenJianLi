from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class 会话创建(BaseModel):
    标题: str = Field(default="新会话", max_length=200)


class 消息创建(BaseModel):
    内容: str = Field(min_length=1, max_length=4000)


class 消息视图(BaseModel):
    id: int
    角色: str
    内容: str
    创建时间: datetime


class 轨迹视图(BaseModel):
    id: int
    步骤: int
    思考: str
    动作工具: str | None
    动作输入: dict | None
    观察: str
    阶段: str
    耗时毫秒: float


class 评测请求(BaseModel):
    数据集版本: str = "v1"


class MCP调用请求(BaseModel):
    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class MCP请求体(BaseModel):
    jsonrpc: str = "2.0"
    id: int | str = 1
    method: str
    params: dict[str, Any] = Field(default_factory=dict)
