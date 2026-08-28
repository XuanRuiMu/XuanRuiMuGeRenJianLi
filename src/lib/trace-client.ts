import { 观测台文案 } from "./locales/trace";

/**
 * AI Agent 运行时观测台前端。
 * 事件流来自后端 SSE，轨迹来自后端 MySQL 落库数据，页面不做任何模拟。
 */

export interface 观测台元素 {
  输入框: HTMLTextAreaElement;
  运行按钮: HTMLButtonElement;
  停止按钮: HTMLButtonElement;
  状态: HTMLElement;
  离线提示: HTMLElement;
  事件容器: HTMLElement;
  时间线: HTMLElement;
  元信息: HTMLElement;
  运行面板: HTMLElement;
  示例按钮: HTMLButtonElement[];
}

type 事件 = {
  type: string;
  thought?: string;
  answer?: string;
  step?: number;
  tool?: string;
  input?: unknown;
  output?: string;
  message?: string;
  provider?: string;
};

interface 轨迹步 {
  id: number;
  step: number;
  thought: string;
  tool: string | null;
  input: string | null;
  observation: string;
  phase: string;
  latency_ms: number;
}

const 阶段名 = (阶段: string): string =>
  观测台文案.阶段名[阶段 as keyof typeof 观测台文案.阶段名] ?? 阶段;

const 转义 = (文本: string): string =>
  文本.replace(/[&<>"]/g, (字符) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[字符] as string,
  );

export function 创建观测台(元素: 观测台元素): void {
  let 会话id: number | null = null;
  let 控制器: AbortController | null = null;
  let 起始时刻 = 0;

  const 设置运行中 = (运行中: boolean): void => {
    元素.运行按钮.hidden = 运行中;
    元素.停止按钮.hidden = !运行中;
    元素.输入框.disabled = 运行中;
  };

  const 显示离线 = (离线: boolean): void => {
    元素.离线提示.hidden = !离线;
    元素.运行按钮.disabled = 离线;
    元素.输入框.disabled = 离线;
  };

  const 追加事件 = (事件: 事件): void => {
    const 卡片 = document.createElement("div");
    卡片.className = `tr-event tr-${事件.type ?? "unknown"}`;

    const 头 = document.createElement("div");
    头.className = "tr-event-head";
    头.innerHTML = `
      <span class="tr-event-phase">${转义(阶段名(事件.type ?? ""))}</span>
      ${事件.step ? `<span class="tr-event-step">${观测台文案.标签.步.replace("%s", String(事件.step))}</span>` : ""}
    `;
    卡片.appendChild(头);

    if (事件.type === "start" && 事件.provider) {
      卡片.appendChild(
        段落(`${观测台文案.标签.提供商}：${转义(事件.provider)}`),
      );
    }
    if (事件.thought) {
      卡片.appendChild(
        段落(`<b>${观测台文案.标签.思考}</b>：${转义(事件.thought)}`),
      );
    }
    if (事件.tool) {
      卡片.appendChild(
        段落(`<b>${观测台文案.标签.工具}</b>：<code>${转义(事件.tool)}</code>`),
      );
    }
    if (事件.input !== undefined && 事件.input !== null) {
      卡片.appendChild(
        段落(
          `<b>入参</b>：<code>${转义(
            typeof 事件.input === "string"
              ? 事件.input
              : JSON.stringify(事件.input),
          )}</code>`,
        ),
      );
    }
    if (事件.output) {
      卡片.appendChild(
        段落(`<b>${观测台文案.标签.观察}</b>：${转义(事件.output.slice(0, 600))}`),
      );
    }
    if (事件.answer) {
      卡片.appendChild(
        段落(`<b>${观测台文案.标签.答案}</b>：${转义(事件.answer)}`),
      );
    }
    if (事件.message) {
      卡片.appendChild(段落(转义(事件.message)));
    }

    元素.事件容器.appendChild(卡片);
    元素.事件容器.scrollTop = 元素.事件容器.scrollHeight;
  };

  const 段落 = (内容: string): HTMLElement => {
    const 段 = document.createElement("p");
    段.className = "tr-event-body";
    段.innerHTML = 内容;
    return 段;
  };

  const 渲染轨迹 = async (): Promise<void> => {
    if (会话id === null) return;

    const 响应 = await fetch(`/api/agent/api/traces/conversations/${会话id}`);
    if (!响应.ok) return;

    const 轨迹 = (await 响应.json()) as 轨迹步[];
    if (轨迹.length === 0) {
      元素.时间线.innerHTML = `<p class="tr-empty">${观测台文案.状态.无轨迹}</p>`;
      return;
    }

    元素.时间线.replaceChildren(
      ...轨迹.map((步) => {
        const 项 = document.createElement("div");
        项.className = `tr-step tr-phase-${步.phase}`;
        项.innerHTML = `
          <div class="tr-step-head">
            <span class="tr-step-no">#${步.step}</span>
            <span class="tr-step-phase">${转义(阶段名(步.phase))}</span>
            <span class="tr-step-latency">${观测台文案.标签.耗时.replace(
              "%s",
              String(Math.round(步.latency_ms)),
            )}</span>
          </div>
          ${步.tool ? `<p class="tr-step-tool">工具 <code>${转义(步.tool)}</code></p>` : ""}
          ${步.thought ? `<p class="tr-step-thought">${转义(步.thought)}</p>` : ""}
          ${
            步.observation
              ? `<p class="tr-step-obs">${转义(步.observation.slice(0, 400))}</p>`
              : ""
          }
        `;
        return 项;
      }),
    );
  };

  const 运行 = async (): Promise<void> => {
    const 问题 = 元素.输入框.value.trim();
    if (问题.length === 0 || 控制器 !== null) return;

    元素.事件容器.replaceChildren();
    元素.运行面板.hidden = false;
    元素.状态.textContent = 观测台文案.状态.运行中;
    设置运行中(true);
    起始时刻 = performance.now();

    控制器 = new AbortController();
    let 步数 = 0;

    try {
      // 每次运行开一个新会话，便于按会话回放完整轨迹
      const 建会话 = await fetch("/api/agent/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 标题: 问题.slice(0, 30) }),
      });

      if (建会话.status === 503) {
        显示离线(true);
        元素.状态.textContent = 观测台文案.状态.后端离线;
        return;
      }
      if (!建会话.ok) throw new Error(`建会话失败：${建会话.status}`);

      会话id = ((await 建会话.json()) as { id: number }).id;

      const 响应 = await fetch(
        `/api/agent/api/chat/conversations/${会话id}/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 内容: 问题 }),
          signal: 控制器.signal,
        },
      );

      if (!响应.ok || 响应.body === null) {
        throw new Error(`运行失败：${响应.status}`);
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
          try {
            const 事件 = JSON.parse(修剪.slice(5).trim()) as 事件;
            追加事件(事件);
            if (事件.step && 事件.step > 步数) 步数 = 事件.step;
          } catch {
            // 半行数据，等下一次拼接
          }
        }
      }

      await 渲染轨迹();
      元素.状态.textContent = 观测台文案.状态.完成(
        步数,
        performance.now() - 起始时刻,
      );
    } catch (错误) {
      if ((错误 as Error).name !== "AbortError") {
        console.error("[trace]", 错误);
        元素.状态.textContent = 观测台文案.状态.失败;
      } else {
        元素.状态.textContent = 观测台文案.重新提问;
      }
    } finally {
      设置运行中(false);
      控制器 = null;
    }
  };

  const 初始化 = async (): Promise<void> => {
    try {
      const 响应 = await fetch("/api/agent/api/chat/conversations?limit=1");
      显示离线(响应.status === 503);
      元素.状态.textContent =
        响应.status === 503 ? 观测台文案.状态.后端离线 : "";
    } catch {
      显示离线(true);
      元素.状态.textContent = 观测台文案.状态.后端离线;
    }
  };

  元素.运行按钮.addEventListener("click", () => void 运行());
  元素.停止按钮.addEventListener("click", () => 控制器?.abort());

  for (const 按钮 of 元素.示例按钮) {
    按钮.addEventListener("click", () => {
      元素.输入框.value = 按钮.dataset.question ?? "";
      void 运行();
    });
  }

  void 初始化();
}
