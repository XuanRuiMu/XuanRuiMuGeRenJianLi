from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import 基类


class 会话(基类):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    标题: Mapped[str] = mapped_column(String(200), default="新会话")
    创建时间: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    消息列表: Mapped[list["消息"]] = relationship(back_populates="所属会话", cascade="all, delete-orphan")


class 消息(基类):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    会话id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    角色: Mapped[str] = mapped_column(String(20))
    内容: Mapped[str] = mapped_column(Text)
    创建时间: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    所属会话: Mapped["会话"] = relationship(back_populates="消息列表")


class 执行轨迹(基类):
    __tablename__ = "traces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    会话id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    步骤: Mapped[int] = mapped_column(Integer)
    思考: Mapped[str] = mapped_column(Text, default="")
    动作工具: Mapped[str | None] = mapped_column(String(100), nullable=True)
    动作输入: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    观察: Mapped[str] = mapped_column(Text, default="")
    阶段: Mapped[str] = mapped_column(String(30), default="act")
    耗时毫秒: Mapped[float] = mapped_column(Float, default=0.0)
    创建时间: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class 工具调用记录(基类):
    __tablename__ = "tool_invocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    工具名: Mapped[str] = mapped_column(String(100), index=True)
    输入参数: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    输出结果: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    是否成功: Mapped[bool] = mapped_column(Boolean, default=True)
    错误信息: Mapped[str | None] = mapped_column(Text, nullable=True)
    耗时毫秒: Mapped[float] = mapped_column(Float, default=0.0)
    创建时间: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class 评测运行(基类):
    __tablename__ = "eval_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    数据集版本: Mapped[str] = mapped_column(String(50))
    总用例数: Mapped[int] = mapped_column(Integer)
    通过数: Mapped[int] = mapped_column(Integer)
    成功率: Mapped[float] = mapped_column(Float)
    平均耗时毫秒: Mapped[float] = mapped_column(Float)
    平均步数: Mapped[float] = mapped_column(Float)
    明细: Mapped[list | None] = mapped_column(JSON, nullable=True)
    创建时间: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class 知识文档(基类):
    __tablename__ = "knowledge_docs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    文档标识: Mapped[str] = mapped_column(String(120), unique=True)
    标题: Mapped[str] = mapped_column(String(200))
    正文: Mapped[str] = mapped_column(Text)
    来源: Mapped[str] = mapped_column(String(200), default="")
    创建时间: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
