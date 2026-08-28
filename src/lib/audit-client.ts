import {
  检查对比度,
  检查图片,
  检查站内链接,
  检查键盘可达,
  检查标题层级,
  检查主题覆盖,
  统计,
  type 检查结果,
  type 结论,
} from "./audit";
import { 自检台文案 } from "./locales/audit";

export interface 自检台元素 {
  列表: HTMLElement;
  汇总文本: HTMLElement;
  状态: HTMLElement;
  通过: HTMLElement;
  警告: HTMLElement;
  失败: HTMLElement;
  重新自检: HTMLButtonElement;
}

const 结论类名: Record<结论, string> = {
  通过: "pass",
  警告: "warn",
  失败: "fail",
  跳过: "skip",
};

function 渲染分组(结果: 检查结果): HTMLElement {
  const 分组 = document.createElement("section");
  分组.className = `au-item ${结论类名[结果.结论]}`;

  const 头部 = document.createElement("button");
  头部.type = "button";
  头部.className = "au-item-head";
  头部.setAttribute("aria-expanded", "false");
  头部.innerHTML = `
    <span class="au-item-index">${结果.编号}</span>
    <span class="au-item-name">${结果.名称}</span>
    <span class="au-item-tag ${结论类名[结果.结论]}">${结果.结论}</span>
    <span class="au-item-summary">${结果.汇总}</span>
    <span class="au-item-caret">▾</span>
  `;

  const 明细 = document.createElement("div");
  明细.className = "au-item-detail";
  明细.hidden = true;

  if (结果.明细.length === 0) {
    const 空 = document.createElement("p");
    空.className = "au-empty";
    空.textContent = 自检台文案.无异常;
    明细.appendChild(空);
  } else {
    for (const 项 of 结果.明细) {
      const 行 = document.createElement("div");
      行.className = `au-detail-row ${结论类名[项.结论]}`;
      const 说明 = document.createElement("span");
      说明.className = "au-detail-desc";
      说明.textContent = 项.说明;
      行.appendChild(说明);
      if (项.数值) {
        const 数值 = document.createElement("span");
        数值.className = "au-detail-value";
        数值.textContent = 项.数值;
        行.appendChild(数值);
      }
      明细.appendChild(行);
    }
  }

  头部.addEventListener("click", () => {
    const 展开 = 明细.hidden;
    明细.hidden = !展开;
    头部.setAttribute("aria-expanded", String(展开));
    头部.querySelector(".au-item-caret")!.textContent = 展开 ? "▴" : "▾";
  });

  分组.appendChild(头部);
  分组.appendChild(明细);
  return 分组;
}

export function 创建自检台(元素: 自检台元素): void {
  let 运行中 = false;

  const 渲染 = (结果集: 检查结果[]): void => {
    const 计数 = 统计(结果集);
    元素.通过.textContent = `${自检台文案.汇总标签.通过} ${计数.通过}`;
    元素.警告.textContent = `${自检台文案.汇总标签.警告} ${计数.警告}`;
    元素.失败.textContent = `${自检台文案.汇总标签.失败} ${计数.失败}`;

    if (计数.失败 > 0) {
      元素.汇总文本.textContent = `${计数.失败} 项未通过`;
    } else if (计数.警告 > 0) {
      元素.汇总文本.textContent = `${计数.警告} 项待改进`;
    } else {
      元素.汇总文本.textContent = "全部通过";
    }

    元素.列表.replaceChildren(...结果集.map(渲染分组));
  };

  const 运行 = async (): Promise<void> => {
    if (运行中) return;
    运行中 = true;
    元素.重新自检.disabled = true;
    元素.状态.textContent = 自检台文案.状态.进行中;
    元素.列表.replaceChildren();

    try {
      const 结果集: 检查结果[] = [
        检查对比度(),
        检查图片(),
        await 检查站内链接(window.location.pathname),
        检查键盘可达(),
        检查标题层级(),
        检查主题覆盖(),
      ];
      渲染(结果集);
      元素.状态.textContent = 自检台文案.状态.完成(结果集.length);
    } catch (错误) {
      console.error("[audit]", 错误);
      元素.状态.textContent = 自检台文案.状态.失败;
    } finally {
      运行中 = false;
      元素.重新自检.disabled = false;
    }
  };

  元素.重新自检.addEventListener("click", () => void 运行());
  void 运行();
}
