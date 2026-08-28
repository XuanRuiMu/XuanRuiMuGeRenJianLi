#!/usr/bin/env python3
"""
总控制台 — 简历网站一键部署到 GitHub
仓库：XuanRuiMuResume
用法：
  set GITHUB_TOKEN=你的令牌
  python 总控制台.py
"""

import subprocess
import sys
import os

# ── 配置 ──────────────────────────────────────────────
REPO_NAME = "XuanRuiMuResume"
GITHUB_USER = "XuanRuiMu"

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

# 需要删除的过程性文件
CLEANUP_FILES = [
    ".browser-test",
    "PROGRESS.md",
    ".astro-dev.log",
    "spring.log",
    "uvicorn.log",
]


def run(cmd, cwd=None, check=True):
    """执行 shell 命令并实时输出"""
    print(f"  $ {cmd}")
    result = subprocess.run(
        cmd, shell=True, cwd=cwd or PROJECT_DIR,
        capture_output=False, text=True
    )
    if check and result.returncode != 0:
        print(f"  ❌ 命令失败 (exit code {result.returncode})")
        sys.exit(1)
    return result


def cleanup():
    """删除过程性文件"""
    print("\n🧹 清理过程性文件...")
    for item in CLEANUP_FILES:
        path = os.path.join(PROJECT_DIR, item)
        if os.path.exists(path):
            if os.path.isdir(path):
                import shutil
                shutil.rmtree(path)
            else:
                os.remove(path)
            print(f"  ✅ 已删除: {item}")
        else:
            print(f"  ⏭️  不存在，跳过: {item}")


def git_push():
    """配置 Git 并推送"""
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        print("  ❌ 缺少 GITHUB_TOKEN 环境变量")
        print("     用法: set GITHUB_TOKEN=<你的令牌> && python 总控制台.py")
        sys.exit(1)

    https_remote = f"https://{token}@github.com/{GITHUB_USER}/{REPO_NAME}.git"

    print("\n📦 推送到 GitHub...")

    # 配置用户信息
    run('git config user.name "于翔堃" || true', check=False)
    run('git config user.email "3062949899@qq.com" || true', check=False)

    # 设置远程仓库
    run(f"git remote remove origin 2>/dev/null || true", check=False)
    run(f"git remote add origin {https_remote}")

    # 暂存所有文件
    run("git add -A")

    # 检查是否有变更
    status = subprocess.run(
        "git status --porcelain", shell=True, cwd=PROJECT_DIR,
        capture_output=True, text=True
    )
    if not status.stdout.strip():
        print("  ℹ️  没有变更需要提交")
        return

    # 提交
    import datetime
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    commit_msg = f"deploy: {ts}"
    run(f'git commit -m "{commit_msg}"')

    # 推送
    print("\n  🚀 正在推送到 GitHub...")
    run("git push -u origin main --force", check=False)

    result = subprocess.run(
        "git push -u origin master --force", shell=True, cwd=PROJECT_DIR,
        capture_output=True, text=True
    )
    if result.returncode != 0:
        run("git push -u origin HEAD --force")


def main():
    print("=" * 60)
    print("  🎮 简历网站 — 总控制台")
    print(f"  目标仓库: https://github.com/{GITHUB_USER}/{REPO_NAME}")
    print("=" * 60)

    cleanup()
    git_push()

    print("\n" + "=" * 60)
    print("  ✅ 部署完成！")
    print(f"  🔗 https://github.com/{GITHUB_USER}/{REPO_NAME}")
    print("=" * 60)


if __name__ == "__main__":
    main()
