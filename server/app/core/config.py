from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class 应用设置(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    应用名称: str = "智能体工坊"
    调试模式: bool = False

    数据库主机: str = "127.0.0.1"
    数据库端口: int = 3306
    数据库用户: str = "root"
    数据库密码: str = ""
    数据库名: str = "agentforge"

    DeepSeek接口地址: str = "https://api.deepseek.com"
    DeepSeek密钥: str = ""
    DeepSeek模型: str = "DeepSeek-V4-Flash-Vision-Exp"
    思考强度: str = "max"

    Agent最大步数: int = 8
    Agent单步超时秒: float = 20.0
    检索引用数量: int = 3

    @property
    def 数据库连接串(self) -> str:
        return (
            f"mysql+aiomysql://{self.数据库用户}:{self.数据库密码}"
            f"@{self.数据库主机}:{self.数据库端口}/{self.数据库名}?charset=utf8mb4"
        )


@lru_cache
def 读取设置() -> 应用设置:
    return 应用设置()
