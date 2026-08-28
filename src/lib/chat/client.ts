import { 界面文案 } from "./ui-text";

/**
 * 聊天页前端控制台。
 * 与首页 JD 分析器一样是纯 DOM 实现：不引入框架，靠 Astro 的 <script> 打包进页面。
 */

export interface 聊天元素 {
  对话容器: HTMLElement;
  表单: HTMLFormElement;
  输入框: HTMLTextAreaElement;
  发送按钮: HTMLButtonElement;
  停止按钮: HTMLButtonElement;
  提示条: HTMLParagraphElement;
  游客区: HTMLDivElement;
  用户区: HTMLDivElement;
  昵称输入: HTMLInputElement;
  密码输入: HTMLInputElement;
  登录按钮: HTMLButtonElement;
  注册按钮: HTMLButtonElement;
  退出按钮: HTMLButtonElement;
  清空按钮: HTMLButtonElement;
  账号名: HTMLSpanElement;
  账号错误: HTMLParagraphElement;
}

interface 会话 {
  令牌: string;
  安全令牌: string;
  昵称: string;
}

const 存储键 = {
  令牌: "chat_token",
  安全令牌: "chat_csrf",
  昵称: "chat_user",
};

const 类名 = {
  气泡: "bubble",
  内容: "content",
  情绪: "emotion-chip",
  输入中: "typing",
};

const 读取会话 = (): 会话 | null => {
  const 令牌 = localStorage.getItem(存储键.令牌);
  const 安全令牌 = localStorage.getItem(存储键.安全令牌);
  const 昵称 = localStorage.getItem(存储键.昵称);
  if (令牌 === null || 安全令牌 === null || 昵称 === null) return null;
  return { 令牌, 安全令牌, 昵称 };
};

const 保存会话 = (会话: 会话): void => {
  localStorage.setItem(存储键.令牌, 会话.令牌);
  localStorage.setItem(存储键.安全令牌, 会话.安全令牌);
  localStorage.setItem(存储键.昵称, 会话.昵称);
};

const 清除会话 = (): void => {
  for (const 键 of Object.values(存储键)) localStorage.removeItem(键);
};

export function 创建聊天(元素: 聊天元素): void {
  let 会话 = 读取会话();
  /** 免登录模式下由前端维护最近若干轮，随请求一起带上 */
  const 客串上下文: { role: "user" | "assistant"; content: string }[] = [];
  let 流控制器: AbortController | null = null;
  let 清空待确认 = false;
  let 清空计时器: number | null = null;

  const 滚到底 = (): void => {
    元素.对话容器.scrollTop = 元素.对话容器.scrollHeight;
  };

  const 加气泡 = (
    角色: "user" | "assistant",
    文本: string,
  ): HTMLElement => {
    const 气泡 = document.createElement("div");
    气泡.className = `${类名.气泡} ${角色}`;
    const 内容 = document.createElement("div");
    内容.className = 类名.内容;
    内容.textContent = 文本;
    气泡.appendChild(内容);
    元素.对话容器.appendChild(气泡);
    滚到底();
    return 内容;
  };

  const 加输入中 = (): HTMLElement => {
    const 气泡 = document.createElement("div");
    气泡.className = `${类名.气泡} assistant ${类名.输入中}`;
    气泡.innerHTML = "<span></span><span></span><span></span>";
    元素.对话容器.appendChild(气泡);
    滚到底();
    return 气泡;
  };

  const 标情绪 = (气泡: HTMLElement, 情绪: string): void => {
    if (!情绪) return;
    const 芯片 = document.createElement("span");
    芯片.className = 类名.情绪;
    芯片.textContent = `${界面文案.情绪标签前缀} · ${情绪}`;
    气泡.appendChild(芯片);
  };

  const 显示提示 = (文本: string): void => {
    元素.提示条.textContent = 文本;
    元素.提示条.hidden = 文本.length === 0;
  };

  const 显示账号错误 = (文本: string): void => {
    元素.账号错误.textContent = 文本;
    元素.账号错误.hidden = 文本.length === 0;
  };

  const 刷新账号区 = (): void => {
    if (会话 === null) {
      元素.游客区.hidden = false;
      元素.用户区.hidden = true;
    } else {
      元素.游客区.hidden = true;
      元素.用户区.hidden = false;
      元素.账号名.textContent = `${界面文案.已登录前缀}${会话.昵称}`;
    }
  };

  const 设置生成中 = (生成中: boolean): void => {
    元素.发送按钮.hidden = 生成中;
    元素.停止按钮.hidden = !生成中;
    元素.输入框.disabled = 生成中;
  };

  const 自动增高 = (): void => {
    元素.输入框.style.height = "auto";
    元素.输入框.style.height = `${Math.min(元素.输入框.scrollHeight, 140)}px`;
  };

  /** 登录后从服务端拉回历史，覆盖当前视图 */
  const 载入历史 = async (): Promise<void> => {
    if (会话 === null) return;
    try {
      const 响应 = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${会话.令牌}` },
      });
      if (响应.status === 401) {
        清除会话();
        会话 = null;
        刷新账号区();
        return;
      }
      if (!响应.ok) return;

      const 数据 = (await 响应.json()) as {
        messages: { role: "user" | "assistant"; content: string; emotion: string | null }[];
      };

      元素.对话容器.replaceChildren();
      for (const 消息 of 数据.messages) {
        const 内容 = 加气泡(消息.role, 消息.content);
        if (消息.role === "assistant" && 消息.emotion) {
          标情绪(内容.parentElement as HTMLElement, 消息.emotion);
        }
      }
      if (数据.messages.length > 0) 滚到底();
    } catch {
      显示提示(界面文案.状态.历史加载失败);
    }
  };

  const 提交账号 = async (动作: "login" | "register"): Promise<void> => {
    const 昵称 = 元素.昵称输入.value.trim();
    const 口令 = 元素.密码输入.value;
    if (昵称.length < 2 || 口令.length < 6) {
      显示账号错误("昵称至少 2 个字符，密码至少 6 位。");
      return;
    }

    显示账号错误("");
    try {
      const 响应 = await fetch(`/api/auth/${动作}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: 昵称, password: 口令 }),
      });
      const 数据 = (await 响应.json()) as {
        token?: string;
        csrfToken?: string;
        username?: string;
        error?: string;
      };

      if (!响应.ok || !数据.token || !数据.csrfToken || !数据.username) {
        显示账号错误(数据.error ?? "操作失败，请稍后再试。");
        return;
      }

      会话 = {
        令牌: 数据.token,
        安全令牌: 数据.csrfToken,
        昵称: 数据.username,
      };
      保存会话(会话);
      元素.密码输入.value = "";
      刷新账号区();
      await 载入历史();
    } catch {
      显示账号错误("网络异常，请稍后再试。");
    }
  };

  const 发送消息 = async (): Promise<void> => {
    const 文本 = 元素.输入框.value.trim();
    if (文本.length === 0 || 流控制器 !== null) return;

    加气泡("user", 文本);
    客串上下文.push({ role: "user", content: 文本 });
    元素.输入框.value = "";
    自动增高();

    const 占位 = 加输入中();
    设置生成中(true);
    显示提示(界面文案.状态.思考中);

    流控制器 = new AbortController();
    let 回复 = "";
    let 回复内容节点: HTMLElement | null = null;
    let 情绪 = "";

    try {
      const 响应 = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(会话 === null
            ? {}
            : {
                Authorization: `Bearer ${会话.令牌}`,
                "X-CSRF-Token": 会话.安全令牌,
              }),
        },
        body: JSON.stringify({
          content: 文本,
          history: 会话 === null ? 客串上下文.slice(0, -1) : undefined,
        }),
        signal: 流控制器.signal,
      });

      if (!响应.ok || 响应.body === null) {
        const 数据 = (await 响应.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(数据.error ?? `服务返回 ${响应.status}`);
      }

      const 读取器 = 响应.body.getReader();
      const 解码器 = new TextDecoder();
      let 缓冲 = "";

      while (true) {
        const { done, value } = await 读取器.read();
        if (done) break;

        缓冲 += 解码器.decode(value, { stream: true });
        const 行集 = 缓冲.split("\n");
        缓冲 = 行集.pop() ?? "";

        for (const 行 of 行集) {
          const 修剪 = 行.trim();
          if (!修剪.startsWith("data:")) continue;

          let 数据: { chunk?: string; done?: boolean; emotion?: string; error?: string };
          try {
            数据 = JSON.parse(修剪.slice(5).trim());
          } catch {
            continue;
          }

          if (数据.chunk) {
            回复 += 数据.chunk;
            if (回复内容节点 === null) {
              占位.remove();
              回复内容节点 = 加气泡("assistant", 回复);
            } else {
              回复内容节点.textContent = 回复;
            }
            滚到底();
          }

          if (数据.error) {
            占位.remove();
            加气泡("assistant", `⚠️ ${数据.error}`);
            回复 = "";
            回复内容节点 = null;
            break;
          }

          if (数据.done) {
            情绪 = 数据.emotion ?? "";
          }
        }
      }
    } catch (错误) {
      占位.remove();
      // 用户主动点“停止”属于预期行为，不提示
      if ((错误 as Error).name !== "AbortError") {
        加气泡("assistant", `⚠️ ${(错误 as Error).message || 界面文案.状态.网络中断}`);
      }
      回复 = "";
      回复内容节点 = null;
    } finally {
      占位.remove();
      设置生成中(false);
      流控制器 = null;
      显示提示("");

      if (回复.length > 0) {
        客串上下文.push({ role: "assistant", content: 回复 });
        if (情绪.length > 0 && 回复内容节点 !== null) {
          标情绪(回复内容节点.parentElement as HTMLElement, 情绪);
        }
      }
      元素.输入框.focus();
    }
  };

  const 处理清空 = async (): Promise<void> => {
    if (会话 === null) return;

    if (!清空待确认) {
      清空待确认 = true;
      元素.清空按钮.textContent = 界面文案.确认清空;
      清空计时器 = window.setTimeout(() => {
        清空待确认 = false;
        元素.清空按钮.textContent = 界面文案.清空记录;
      }, 3000);
      return;
    }

    if (清空计时器 !== null) clearTimeout(清空计时器);
    清空待确认 = false;
    元素.清空按钮.textContent = 界面文案.清空记录;

    await fetch("/api/history", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${会话.令牌}` },
    }).catch(() => undefined);

    元素.对话容器.replaceChildren();
    显示提示(界面文案.状态.已清空);
    window.setTimeout(() => 显示提示(""), 2000);
  };

  // ---- 事件绑定 ----
  元素.表单.addEventListener("submit", (事件) => {
    事件.preventDefault();
    void 发送消息();
  });

  元素.输入框.addEventListener("keydown", (事件) => {
    // 输入法组字（拼音上屏）期间放行 Enter，避免把半句拼音发出去
    if ((事件 as KeyboardEvent).isComposing) return;
    if ((事件 as KeyboardEvent).key === "Enter" && !(事件 as KeyboardEvent).shiftKey) {
      事件.preventDefault();
      void 发送消息();
    }
  });

  元素.输入框.addEventListener("input", 自动增高);

  元素.停止按钮.addEventListener("click", () => 流控制器?.abort());

  元素.登录按钮.addEventListener("click", () => void 提交账号("login"));
  元素.注册按钮.addEventListener("click", () => void 提交账号("register"));

  元素.退出按钮.addEventListener("click", () => {
    清除会话();
    会话 = null;
    客串上下文.length = 0;
    刷新账号区();
    元素.对话容器.replaceChildren();
    加气泡("assistant", 界面文案.问候);
  });

  元素.清空按钮.addEventListener("click", () => void 处理清空());

  // ---- 启动 ----
  const 初始化 = async (): Promise<void> => {
    刷新账号区();

    try {
      const 响应 = await fetch("/api/health");
      const 数据 = (await 响应.json()) as { ok?: boolean; 提示?: string };
      if (数据.ok !== true) {
        显示提示(数据.提示 ?? 界面文案.状态.后端未配置);
        元素.发送按钮.disabled = true;
        元素.输入框.disabled = true;
        return;
      }
    } catch {
      显示提示(界面文案.状态.后端未配置);
      元素.发送按钮.disabled = true;
      元素.输入框.disabled = true;
      return;
    }

    await 载入历史();
    元素.输入框.focus();
  };

  void 初始化();
}
