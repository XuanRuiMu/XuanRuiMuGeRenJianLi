import { 助手文案 } from "./assistant-text";

/**
 * 小堃のAi助手 前端客户端。
 * 通过 /api/agent 代理对接 Python RAG 智能体：
 *   1) 建会话 POST /api/agent/api/chat/conversations
 *   2) 流式对话 POST /api/agent/api/chat/conversations/{id}/stream
 * 解析 SSE 事件（thinking / action / observation / answer / error），
 * 把助手的思考过程折叠展示，并把最终答案与来源引用渲染出来。
 * 不依赖任何已删除的 lib/chat 模块。
 */

const 代理基址 = "/api/agent";

interface 元素集合 {
  对话容器: HTMLElement;
  表单: HTMLFormElement;
  输入框: HTMLTextAreaElement;
  发送按钮: HTMLButtonElement;
  停止按钮: HTMLButtonElement;
  清空按钮: HTMLButtonElement;
  提示条: HTMLParagraphElement;
  示例问题按钮?: NodeListOf<Element>;
}

const 工具中文名: Record<string, string> = {
  search_projects: "检索项目",
  match_job: "岗位匹配",
  analyze_jd: "JD 匹配分析",
  calculator: "计算",
  current_time: "当前时间",
  query_stats: "调用统计",
};

export function 创建助手对话(元素: 元素集合): void {
  let 会话id: number | null = null;
  let 控制器: AbortController | null = null;
  let 正在生成 = false;
  let 确认清空 = false;

  const 滚动到底部 = (): void => {
    元素.对话容器.scrollTop = 元素.对话容器.scrollHeight;
  };

  const 添加气泡 = (角色: "user" | "assistant"): { 气泡: HTMLElement; 内容: HTMLElement } => {
    const 气泡 = document.createElement("div");
    气泡.className = `bubble ${角色}`;
    const 内容 = document.createElement("div");
    内容.className = "content";
    气泡.appendChild(内容);
    元素.对话容器.appendChild(气泡);
    滚动到底部();
    return { 气泡, 内容 };
  };

  const 添加思考过程 = (): HTMLElement => {
    const 详情 = document.createElement("details");
    详情.className = "trace-group";
    const 摘要 = document.createElement("summary");
    摘要.textContent = 助手文案.思考过程标题;
    详情.appendChild(摘要);
    return 详情;
  };

  const 添加过程行 = (详情: HTMLElement, 文本: string): void => {
    const 行 = document.createElement("div");
    行.className = "trace-line";
    行.textContent = 文本;
    详情.appendChild(行);
    滚动到底部();
  };

  const 添加引用 = (容器: HTMLElement, 引用: unknown[]): void => {
    if (!Array.isArray(引用) || 引用.length === 0) return;
    容器.appendChild(document.createTextNode(""));
    const 组 = document.createElement("div");
    组.className = "citations";
    for (const c of 引用 as Array<Record<string, string>>) {
      const 芯片 = document.createElement("span");
      芯片.className = "cite-chip";
      芯片.textContent = `${c.引用 ?? ""} ${c.标题 ?? ""}`.trim();
      组.appendChild(芯片);
    }
    容器.appendChild(组);
  };

  const 设生成中 = (中: boolean): void => {
    正在生成 = 中;
    元素.发送按钮.disabled = 中;
    元素.停止按钮.hidden = !中;
    if (中) 元素.输入框.focus();
  };

  const 建会话 = async (): Promise<number | null> => {
    try {
      const 响应 = await fetch(`${代理基址}/api/chat/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 标题: "小堃のAi助手会话" }),
      });
      if (!响应.ok) return null;
      const 数据 = (await 响应.json()) as { id?: number };
      return 数据.id ?? null;
    } catch {
      return null;
    }
  };

  const 读取流 = async (响应: Response, 处理: (事件: Record<string, unknown>) => void): Promise<void> => {
    const 读取器 = 响应.body!.getReader();
    const 解码器 = new TextDecoder();
    let 缓冲 = "";
    while (true) {
      const { done, value } = await 读取器.read();
      if (done) break;
      缓冲 += 解码器.decode(value, { stream: true });
      let 分隔: number;
      while ((分隔 = 缓冲.indexOf("\n\n")) !== -1) {
        const 块 = 缓冲.slice(0, 分隔);
        缓冲 = 缓冲.slice(分隔 + 2);
        const 行 = 块.split("\n").find((l) => l.startsWith("data:"));
        if (!行) continue;
        const 载荷 = 行.slice(5).trim();
        if (!载荷) continue;
        try {
          处理(JSON.parse(载荷) as Record<string, unknown>);
        } catch {
          /* 忽略坏帧 */
        }
      }
    }
  };

  const 发送 = async (文本: string): Promise<void> => {
    if (正在生成) return;
    const 提问 = 文本.trim();
    if (!提问) return;
    元素.输入框.value = "";
    自动增高();
    添加气泡("user").内容.textContent = 提问;

    if (会话id === null) 会话id = await 建会话();
    if (会话id === null) {
      添加气泡("assistant").内容.textContent = 助手文案.状态.后端离线;
      return;
    }

    设生成中(true);
    元素.提示条.hidden = true;

    const { 气泡, 内容 } = 添加气泡("assistant");
    const 过程 = 添加思考过程();
    气泡.appendChild(过程);
    let 首字 = true;
    let 过程已有内容 = false;

    控制器 = new AbortController();
    try {
      const 响应 = await fetch(`${代理基址}/api/chat/conversations/${会话id}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 内容: 提问 }),
        signal: 控制器.signal,
      });
      if (!响应.ok || !响应.body) throw new Error("stream-failed");

      await 读取流(响应, (事件) => {
        switch (事件.type) {
          case "thinking":
            添加过程行(过程, `💡 思考：${事件.thought ?? ""}`);
            过程已有内容 = true;
            break;
          case "action": {
            const 名 = 工具中文名[String(事件.tool)] ?? String(事件.tool);
            添加过程行(过程, `🔧 调用：${名}`);
            过程已有内容 = true;
            break;
          }
          case "observation": {
            const 输出 = typeof 事件.output === "string" ? 事件.output : "";
            添加过程行(过程, `👀 观察：${输出.slice(0, 200)}${输出.length > 200 ? "…" : ""}`);
            if (Array.isArray(事件.citations)) 添加引用(过程, 事件.citations as unknown[]);
            过程已有内容 = true;
            break;
          }
          case "answer":
            if (首字) {
              内容.textContent = "";
              首字 = false;
            }
            内容.textContent += String(事件.answer ?? "");
            // 每轮都保证"助手的思考过程"面板非空：有推理则显示推理，纯直答无推理则注明未调工具
            if (!过程已有内容) {
              if (事件.thought) {
                添加过程行(过程, `💡 思考：${String(事件.thought)}`);
              } else {
                添加过程行(过程, "（本次为模型直接回答，未调用工具）");
              }
              过程已有内容 = true;
            }
            滚动到底部();
            break;
          case "error":
            内容.textContent = String(事件.message ?? 助手文案.状态.网络中断);
            break;
        }
      });
    } catch (错误) {
      if (错误 instanceof DOMException && 错误.name === "AbortError") {
        内容.textContent += "\n（已停止）";
      } else {
        内容.textContent = 助手文案.状态.网络中断;
      }
    } finally {
      控制器 = null;
      设生成中(false);
      滚动到底部();
    }
  };

  const 自动增高 = (): void => {
    元素.输入框.style.height = "auto";
    元素.输入框.style.height = `${Math.min(元素.输入框.scrollHeight, 140)}px`;
  };

  元素.表单.addEventListener("submit", (e) => {
    e.preventDefault();
    void 发送(元素.输入框.value);
  });
  元素.输入框.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void 发送(元素.输入框.value);
    }
  });
  元素.输入框.addEventListener("input", 自动增高);
  元素.停止按钮.addEventListener("click", () => 控制器?.abort());
  元素.清空按钮.addEventListener("click", () => {
    if (!确认清空) {
      元素.清空按钮.textContent = 助手文案.确认清空;
      确认清空 = true;
      window.setTimeout(() => {
        元素.清空按钮.textContent = 助手文案.清空记录;
        确认清空 = false;
      }, 2000);
      return;
    }
    元素.对话容器.innerHTML = "";
    const 初始 = 添加气泡("assistant");
    初始.内容.textContent = 助手文案.问候;
    会话id = null;
    确认清空 = false;
    元素.清空按钮.textContent = 助手文案.清空记录;
  });

  元素.示例问题按钮?.forEach((btn) => {
    btn.addEventListener("click", () => {
      const 问题 = (btn as HTMLElement).dataset.question ?? "";
      if (!问题) return;
      元素.输入框.value = 问题;
      元素.输入框.focus();
      自动增高();
    });
  });
}
