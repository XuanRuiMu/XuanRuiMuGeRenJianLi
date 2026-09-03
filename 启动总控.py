#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
启动总控 — 统一拉起简历网站所需全部环境

职责：
1. 前置检查：.env / 依赖 / MySQL 可达性 / DeepSeek 配置
2. 按需启动：MySQL（若未运行）→ Python AI 后端 → Astro 前端
3. 进程守护：任一子进程退出 / 启动失败 / Ctrl+C，立刻停止所有服务

用法：
  python 启动总控.py
  # 或双击 启动.bat
"""

from __future__ import annotations

import os
import shutil
import signal
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

# ── 路径常量 ──────────────────────────────────────────────
项目根 = Path(__file__).resolve().parent
服务目录 = 项目根 / "server"
环境文件 = 服务目录 / ".env"
虚拟环境 = 服务目录 / ".venv"
Python解释器 = 虚拟环境 / "Scripts" / "python.exe"
MySQL安装目录 = Path("C:/Program Files/MySQL/MySQL Server 26.7")
MySQL守护进程 = MySQL安装目录 / "bin" / "mysqld.exe"

# 端口
MYSQL端口 = 3306
后端端口 = 8000
前端端口 = 4321

# ── 工具函数 ──────────────────────────────────────────────

def 打印(*args, sep=" ", end="\n", flush=True):
    """带时间戳的输出，默认实时刷新到控制台"""
    now = time.strftime("%H:%M:%S", time.localtime())
    print(f"[{now}]", *args, sep=sep, end=end, flush=flush)


def 端口可达(host: str, port: int, timeout: float = 2.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def 等待端口打开(host: str, port: int, 进程: Optional[subprocess.Popen], 超时秒: int, 服务名: str) -> bool:
    for i in range(超时秒):
        if 进程 is not None and 进程.poll() is not None:
            打印(f"❌ {服务名} 尚未就绪就已退出（exit={进程.returncode}）")
            return False
        if 端口可达(host, port):
            打印(f"✅ {服务名} 已在 {host}:{port} 就绪（耗时 {i + 1}s）")
            return True
        time.sleep(1)
    打印(f"❌ {服务名} 启动超时：{host}:{port} 未在 {超时秒}s 内可达")
    return False


def 读取环境变量(键: str, 默认值: str = "") -> str:
    """读取 .env 中的中文键（优先），再读系统环境变量"""
    if 环境文件.exists():
        try:
            text = 环境文件.read_text(encoding="utf-8-sig")
            for line in text.splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    if k.strip() == 键:
                        return v.strip().strip('"').strip("'")
        except Exception as e:
            打印(f"⚠️ 读取 {环境文件} 失败：{e}")
    return os.environ.get(键, 默认值)


def 杀进程树(进程: Optional[subprocess.Popen], 名: str) -> None:
    if 进程 is None or 进程.poll() is not None:
        return
    try:
        # 优先尝试 taskkill /T /F 结束整个进程树（Windows）
        result = subprocess.run(
            ["taskkill", "/PID", str(进程.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        if result.returncode == 0:
            打印(f"🛑 已强制结束 {名} 进程树（PID={进程.pid}）")
        else:
            # 回退到 graceful terminate
            进程.terminate()
            try:
                进程.wait(timeout=5)
                打印(f"🛑 已优雅结束 {名}（PID={进程.pid}）")
            except subprocess.TimeoutExpired:
                进程.kill()
                打印(f"🛑 已强制结束 {名}（PID={进程.pid}）")
    except Exception as e:
        打印(f"⚠️ 结束 {名} 时出错：{e}")


# ── 前置检查 ──────────────────────────────────────────────

def 前置检查() -> None:
    错误列表: list[str] = []

    # Python 虚拟环境
    if not Python解释器.exists():
        错误列表.append(f"虚拟环境不存在：{Python解释器}\n   请先运行：\"{sys.executable}\" -m venv \"{虚拟环境}\"")

    # Node 依赖
    astro_mjs = 项目根 / "node_modules" / "astro" / "bin" / "astro.mjs"
    if not astro_mjs.exists():
        错误列表.append(f"前端依赖未安装：{astro_mjs} 不存在\n   请在项目根目录执行 pnpm install")

    # .env
    if not 环境文件.exists():
        错误列表.append(f"后端环境文件不存在：{环境文件}\n   请复制 server/.env.example 为 server/.env 并填写 DeepSeek 密钥与 MySQL 密码")

    # DeepSeek 配置
    if not 读取环境变量("DeepSeek密钥"):
        错误列表.append("缺少 DeepSeek 密钥（DeepSeek密钥），请在 server/.env 中配置")
    if not 读取环境变量("DeepSeek接口地址"):
        错误列表.append("缺少 DeepSeek 接口地址（DeepSeek接口地址），请在 server/.env 中配置")

    if 错误列表:
        打印("=" * 60)
        打印("❌ 启动失败：前置检查未通过")
        for i, msg in enumerate(错误列表, 1):
            打印(f"{i}. {msg}")
        打印("=" * 60)
        sys.exit(1)


# ── 服务启动 ──────────────────────────────────────────────

@dataclass
class 服务:
    名称: str
    进程: Optional[subprocess.Popen]
    端口: int
    是自启: bool = False  # True 表示本脚本发现它已在运行，没有创建新进程


def 查找MySQL服务名() -> Optional[str]:
    """在 Windows 服务列表中查找名字含 MySQL 的服务"""
    候选 = []
    # 注意：Windows `sc` 输出为系统 locale（GBK），必须用 gbk 解码，否则 text=True 会按 UTF-8 解码失败，
    # 导致后台读取线程抛 UnicodeDecodeError 并使 r.stdout 变为 None。
    r = subprocess.run(
        ["sc", "query", "state=", "all"],
        capture_output=True,
        text=True,
        encoding="gbk",
        errors="replace",
        check=False,
    )
    for line in (r.stdout or "").splitlines():
        if "SERVICE_NAME" in line:
            name = line.split(":", 1)[1].strip()
            if "MYSQL" in name.upper():
                候选.append(name)
    return 候选[0] if 候选 else None


def 启动MySQL() -> 服务:
    if 端口可达("127.0.0.1", MYSQL端口):
        打印(f"✅ MySQL 已在 127.0.0.1:{MYSQL端口} 运行，本脚本不再重复启动")
        return 服务("MySQL", None, MYSQL端口, 是自启=True)

    服务名 = 查找MySQL服务名()
    if 服务名:
        打印(f"⚠️ MySQL 未运行，尝试启动 Windows 服务 {服务名}...")
        subprocess.run(
            ["sc", "start", 服务名],
            capture_output=True,
            text=True,
            encoding="gbk",
            errors="replace",
            check=False,
        )
        if 等待端口打开("127.0.0.1", MYSQL端口, None, 60, "MySQL"):
            打印(f"✅ 已通过服务 {服务名} 拉起 MySQL")
            return 服务("MySQL", None, MYSQL端口, 是自启=True)

    # 回退：直接以进程方式启动 mysqld（由本脚本托管，可随项目停止）
    if MySQL守护进程.exists():
        打印(f"🚀 尝试直接拉起 mysqld（{MySQL守护进程} --console）...")
        proc = subprocess.Popen(
            [str(MySQL守护进程), "--console"],
            cwd=str(MySQL安装目录 / "bin"),
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )
        if 等待端口打开("127.0.0.1", MYSQL端口, proc, 60, "MySQL"):
            return 服务("MySQL", proc, MYSQL端口)
        杀进程树(proc, "MySQL")

    raise RuntimeError(
        f"MySQL 启动失败：127.0.0.1:{MYSQL端口} 未在 60s 内就绪。\n"
        "   请确认 MySQL 已安装、服务名正确，且 root 密码与 server/.env 中一致。"
    )


def 启动后端() -> 服务:
    打印("🚀 正在启动 Python AI 后端（uvicorn 127.0.0.1:8000）...")
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    # 工作目录必须是 server/，因为 uvicorn 用 app.main:app
    proc = subprocess.Popen(
        [str(Python解释器), "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(后端端口), "--reload"],
        cwd=str(服务目录),
        env=env,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    if not 等待端口打开("127.0.0.1", 后端端口, proc, 120, "Python AI 后端"):
        杀进程树(proc, "Python AI 后端")
        raise RuntimeError("Python AI 后端启动失败：8000 端口未就绪")
    return 服务("Python AI 后端", proc, 后端端口)


def 启动前端() -> 服务:
    打印("🚀 正在启动 Astro 前端（http://localhost:4321）...")
    astro_mjs = 项目根 / "node_modules" / "astro" / "bin" / "astro.mjs"
    if not astro_mjs.exists():
        raise RuntimeError(f"找不到 Astro 入口：{astro_mjs}")
    node = shutil.which("node")
    if not node:
        raise RuntimeError("找不到 node 可执行文件，请先安装 Node.js")
    proc = subprocess.Popen(
        [node, str(astro_mjs), "dev", "--host", "127.0.0.1", "--port", str(前端端口)],
        cwd=str(项目根),
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    if not 等待端口打开("127.0.0.1", 前端端口, proc, 120, "Astro 前端"):
        杀进程树(proc, "Astro 前端")
        raise RuntimeError("Astro 前端启动失败：4321 端口未就绪")
    return 服务("Astro 前端", proc, 前端端口)


# ── 主控循环 ──────────────────────────────────────────────

def 后端健康() -> bool:
    """调用后端 /api/health，3 秒超时"""
    try:
        import urllib.request
        with urllib.request.urlopen(
            f"http://127.0.0.1:{后端端口}/api/health", timeout=3
        ) as r:
            return r.status == 200
    except Exception:
        return False


def 主循环(服务列表: list[服务]) -> None:
    打印("=" * 60)
    打印("✅ 所有服务已启动，进入守护模式")
    打印("   访问地址：")
    打印(f"   • 简历首页  http://localhost:{前端端口}/")
    打印(f"   • AI 助手   http://localhost:{前端端口}/chat")
    打印("   按 Ctrl+C 或关闭本窗口可停止全部服务")
    打印("=" * 60)

    后端进程 = next((s for s in 服务列表 if s.名称 == "Python AI 后端"), None)
    健康失败次数 = 0

    while True:
        # 1) 任何子进程退出 -> 全停
        for svc in 服务列表:
            if svc.进程 is not None and svc.进程.poll() is not None:
                code = svc.进程.returncode
                打印(f"🚨 {svc.名称} 已退出（exit code={code}），触发全停机制...")
                return

        # 2) 后端健康检查：端口不可达或多次无响应，视为掉线 -> 全停
        if 后端进程 is not None and 后端进程.进程 is not None and 后端进程.进程.poll() is None:
            if not 后端健康():
                健康失败次数 += 1
                打印(f"⚠️ 后端健康检查失败（{健康失败次数}/3）...")
                if 健康失败次数 >= 3:
                    打印("🚨 后端连续 3 次健康检查失败，判定为掉线，触发全停机制...")
                    return
            else:
                if 健康失败次数 > 0:
                    打印("✅ 后端健康检查恢复")
                健康失败次数 = 0

        time.sleep(10)


def 停止全部(服务列表: list[服务]) -> None:
    打印("=" * 60)
    打印("🛑 正在停止所有服务...")
    for svc in 服务列表:
        if svc.是自启:
            打印(f"⏭️  {svc.名称} 由外部管理，本脚本不停止它")
            continue
        杀进程树(svc.进程, svc.名称)
    打印("👋 已停止所有由本脚本管理的服务")


def 主函数() -> int:
    前置检查()

    服务列表: list[服务] = []

    try:
        服务列表.append(启动MySQL())
        服务列表.append(启动后端())
        服务列表.append(启动前端())
        主循环(服务列表)
    except RuntimeError as e:
        打印(f"❌ {e}")
        停止全部(服务列表)
        return 1
    except KeyboardInterrupt:
        打印("\n收到 Ctrl+C")
    finally:
        停止全部(服务列表)

    return 0


if __name__ == "__main__":
    sys.exit(主函数())
