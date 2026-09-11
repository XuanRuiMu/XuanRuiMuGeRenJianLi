// 全站统一的复制结果浮动提示（IntroCard 信封按钮、ContactsCard 联系行共用）。
//
// 为什么不用卡片角落的静态小字：0.72rem 的浅绿小字离点击位置远、视觉权重低，
// 用户反馈"复制了但根本注意不到有任何提示"。改为跟随点击位置的浮动 toast：
// 深色底 + 主题色描边 + 柔和阴影 + 淡入上浮动效，1.6s 后自动淡出，一眼可见。
//
// 用法：import { 显示复制提示 } from "../lib/copy-toast";
//       显示复制提示(true, e.clientX, e.clientY);   // 成功
//       显示复制提示(false, e.clientX, e.clientY);  // 失败（如实报错，禁止静默吞掉）

let 容器: HTMLDivElement | null = null;
let 计时器: number | undefined;

const 动画时长 = 1600;

export const 显示复制提示 = (成功: boolean, x: number, y: number): void => {
  if (typeof document === "undefined") return;

  if (!容器) {
    容器 = document.createElement("div");
    容器.id = "copyFloatToast";
    // 内联样式而非 class：toast 节点由 JS 动态创建，不依赖任何组件的 scoped 样式，
    // 也不受主题切换影响（颜色走 CSS 变量，深浅主题均协调）。
    容器.style.cssText = [
      "position: fixed",
      "z-index: 9999",
      "pointer-events: none",
      "padding: 8px 14px",
      "border-radius: 10px",
      "font-size: 0.82rem",
      "font-weight: 600",
      "letter-spacing: 0.02em",
      "color: #ffffff",
      "background: rgba(23, 28, 38, 0.94)",
      "border: 1px solid var(--primary-500, #2196f3)",
      "box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28)",
      "opacity: 0",
      "transform: translate(-50%, 4px)",
      "transition: opacity 0.18s ease, transform 0.18s ease",
      "white-space: nowrap",
    ].join(";");
    document.body.appendChild(容器);
  }

  容器.textContent = 成功 ? "已复制到剪切板 ✓" : "复制失败，请手动复制";
  // 默认显示在点击点上方 14px；太贴近视口顶部时改到下方，避免被裁掉。
  const 上方空间足够 = y > 48;
  容器.style.left = `${Math.max(60, Math.min(x, window.innerWidth - 60))}px`;
  容器.style.top = 上方空间足够 ? `${y - 44}px` : `${y + 22}px`;
  容器.style.transform = `translate(-50%, ${上方空间足够 ? 0 : 0}px)`;

  // 强制回流后触发过渡，保证连续点击时也有淡入动画
  void 容器.offsetHeight;
  容器.style.opacity = "1";

  if (计时器 !== undefined) window.clearTimeout(计时器);
  计时器 = window.setTimeout(() => {
    if (!容器) return;
    容器.style.opacity = "0";
    容器.style.transform = "translate(-50%, 4px)";
  }, 动画时长);
};
