// 简历 × JD 匹配分析器 · 前端控制台
// 纯本地实现：调用 jd-matcher 做匹配，快捷提问基于候选人画像本地应答。
// 无任何 fetch / XMLHttpRequest / 外部 API 调用。

import { 分析JD, 候选人画像摘要, type 匹配结果 } from "./jd-matcher";

export interface 控制台元素 {
  对话容器: HTMLElement;
  表单: HTMLFormElement;
  输入框: HTMLInputElement;
  发送按钮: HTMLButtonElement;
  JD输入: HTMLTextAreaElement;
  JD按钮: HTMLButtonElement;
}

const 转义 = (文本: string): string =>
  // 仅用于保险；报告数据均来自本地词库，不含用户输入
  文本.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );

const 追加气泡 = (角色: "user" | "assistant", 文本 = ""): HTMLElement => {
  const 气泡 = document.createElement("div");
  气泡.className = `bubble ${角色}`;
  const 内容 = document.createElement("div");
  内容.className = "content";
  内容.textContent = 文本;
  气泡.appendChild(内容);
  元素.对话容器.appendChild(气泡);
  元素.对话容器.scrollTop = 元素.对话容器.scrollHeight;
  return 内容;
};

let 元素: 控制台元素;

/** 构建 JD 匹配报告 HTML（数据来自本地算法，安全插入） */
function 报告HTML(结果: 匹配结果): string {
  const 匹配块 = 结果.matched.length
    ? `<div class="jd-section"><h4>✅ 已匹配技能（${结果.matched.length}）</h4>
        <div class="jd-chips">${结果.matched
          .map(
            (s) =>
              `<span class="jd-chip matched" title="熟练度 ${s.proficiency}%">${转义(s.name)}<i>${s.proficiency}</i></span>`,
          )
          .join("")}</div></div>`
    : "";

  const 差距块 = 结果.gaps.length
    ? `<div class="jd-section"><h4>⚠️ 差距技能 · JD 要求但暂缺（${结果.gaps.length}）</h4>
        <div class="jd-chips">${结果.gaps
          .map((s) => `<span class="jd-chip gap">${转义(s.name)}</span>`)
          .join("")}</div></div>`
    : "";

  const 建议块 = `<div class="jd-section"><h4>💡 针对性建议</h4>
      <ul class="jd-suggest">${结果.suggestions
        .map((s) => `<li>${转义(s)}</li>`)
        .join("")}</ul></div>`;

  return `
    <div class="jd-report">
      <div class="jd-score">
        <span class="jd-score-num">${结果.score}<span class="jd-pct">%</span></span>
        <span class="jd-score-level">${转义(结果.level)}</span>
      </div>
      ${匹配块}
      ${差距块}
      ${建议块}
      <p class="jd-foot">本地离线分析 · 纯前端实现 · 无需后端</p>
    </div>`;
}

/** JD 分析入口（带轻量「分析中」占位，纯本地计算） */
async function 运行分析(原始文本: string): Promise<void> {
  const 文本 = 原始文本.trim();
  if (!文本) return;
  追加气泡("user", 文本);
  const 占位 = 追加气泡("assistant", "本地匹配中…");
  // 极短延时，营造分析观感（仍为同步本地计算）
  await new Promise((r) => setTimeout(r, 140));
  占位.innerHTML = 报告HTML(分析JD(文本));
  元素.对话容器.scrollTop = 元素.对话容器.scrollHeight;
}

/** 基于关键词的本地快捷应答（不调后端） */
function 快捷应答(文本: string): string {
  const t = 文本.toLowerCase();
  const 命中 = (...词: string[]) => 词.some((w) => t.includes(w));

  if (命中("项目", "做过", "作品", "project")) {
    return "我做过这些可演示的真实项目：\n① 真实 React 技能矩阵组件（useState / useMemo / useEffect 真交互）；\n② 7 款原生 Canvas 游戏（Reaction / NeonArena / LightningShooter / StarOcean / MechBattle / DimensionMaze / NeonDefense，含 Canvas 渲染与 Web Audio 音频）；\n③ 本页面——纯前端 JD 匹配分析器（技能关键词抽取 + 匹配度评分，无需后端）；\n④ FastAPI + RAG + MCP 后端服务（用于 AI Agent 场景，详见 /projects）。";
  }
  if (命中("技术", "技能", "会什么", "stack", "tech")) {
    const 分组 = 候选人画像摘要()
      .map((g) => `· ${g.分类}：${g.技能.join("、")}`)
      .join("\n");
    return `我的核心技术栈（每一项都有对应项目）：\n${分组}\n技术专有名词保持原文：React / TypeScript / Astro / FastAPI / RAG / MCP / MySQL 等。`;
  }
  if (命中("真的会", "会写代码", "会不会", "造假", "placeholder", "占位")) {
    return "会。本简历站本身就是证据：React 组件、Astro 孤岛集成、7 款手写 Canvas 游戏引擎，以及本页的纯前端匹配算法，都是真实代码而非占位。技术栈每一项都有落地项目。";
  }
  if (命中("差异化", "优势", "独特", "为什么选", "difference")) {
    return "最大差异化优势：AI Agent 全栈能力——既能用 React / TypeScript 写前端，也能用 Python / FastAPI 搭 RAG / MCP 后端，并把能力落到真实项目。相比纯前端或纯算法，我能独立打通「前端交互 → 后端服务 → Agent 工作流」的完整链路。";
  }
  if (命中("适合", "岗位", "求职", "方向", "投", "role", "fit")) {
    return "契合度高的方向：\n① 前端工程师（React 为主）；\n② AI Agent 应用开发；\n③ 全栈工程师（Python + 前端）；\n④ 交互 / 游戏化方向（Canvas / Web Audio）。\n若岗位强依赖 Java / 云原生 / Go，则契合度偏低，建议谨慎投递或先补强对应方向。";
  }
  return "我是纯前端离线助手，无需联网。你可以：① 在右侧粘贴 JD 并点「分析匹配度」；② 点击上方快捷提问（项目 / 技术 / 是否真会写代码 / 差异化优势 / 适合岗位）。";
}

function 发送自由文本(文本: string): void {
  const 清洗 = 文本.trim();
  if (!清洗) return;
  // 判定是否像 JD：含岗位关键词或较长文本
  const 像JD = 清洗.length > 80 || /任职|职责|要求|jd|岗位|招聘|qualif|responsibilit/i.test(清洗);
  if (像JD) {
    void 运行分析(清洗);
    return;
  }
  追加气泡("user", 清洗);
  追加气泡("assistant", 快捷应答(清洗));
}

export function 创建控制台(传入元素: 控制台元素): void {
  元素 = 传入元素;
  let 运行中 = false;

  元素.表单.addEventListener("submit", (e) => {
    e.preventDefault();
    if (运行中) return;
    运行中 = true;
    const 文本 = 元素.输入框.value;
    元素.输入框.value = "";
    发送自由文本(文本);
    运行中 = false;
  });

  元素.JD按钮.addEventListener("click", () => {
    if (运行中) return;
    运行中 = true;
    const 文本 = 元素.JD输入.value;
    元素.JD输入.value = "";
    void 运行分析(文本).finally(() => (运行中 = false));
  });

  document.querySelectorAll<HTMLButtonElement>(".quick-btn").forEach((按钮) => {
    按钮.addEventListener("click", () => {
      if (运行中) return;
      运行中 = true;
      const 问题 = 按钮.dataset.question ?? "";
      追加气泡("user", 问题);
      追加气泡("assistant", 快捷应答(问题));
      运行中 = false;
    });
  });
}
