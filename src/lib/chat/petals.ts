/**
 * 聊天页「飘落花瓣」背景。
 * 由已归档的 ai聊天 项目 PetalBackground.vue 移植而来，配色改为跟随站点默认蓝色主题。
 * 纯 DOM 实现，配合 Astro ClientRouter：进入 /chat 时启动，路由切换前（astro:before-swap）整体销毁。
 */

const 容器类名 = "chat-petal-bg";
const 花瓣类名 = "chat-petal";
const 光斑类名 = "chat-soft-spot";

interface 光斑配置 {
  尺寸: number;
  上?: string;
  下?: string;
  左?: string;
  右?: string;
  延迟秒: number;
}

const 配置 = {
  初始铺放数量: 18,
  补充间隔毫秒: 1100,
  并发上限: 34,
  花瓣尺寸区间: [14, 26] as const,
  下落时长区间: [7, 13] as const,
  随机延迟上限秒: 5,
  /** 蓝色主题：primary-200 / primary-300，与 --primary-500(#2196f3) 同色系 */
  花瓣色: ["#90caf9", "#64b5f6"] as const,
  光斑列表: [
    { 尺寸: 240, 上: "8%", 左: "6%", 延迟秒: 0 },
    { 尺寸: 180, 上: "55%", 右: "8%", 延迟秒: -5 },
    { 尺寸: 150, 下: "18%", 左: "18%", 延迟秒: -10 },
  ] as 光斑配置[],
};

let 容器: HTMLDivElement | null = null;
let 补充定时器: number | null = null;
const 待清理定时器 = new Set<number>();

const 减少动效 = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const 随机区间 = (最小: number, 最大: number): number =>
  Math.random() * (最大 - 最小) + 最小;

const 取容器 = (): HTMLDivElement => {
  const 已有 = document.querySelector<HTMLDivElement>(`.${容器类名}`);
  if (已有) {
    容器 = 已有;
    return 已有;
  }

  const 新建 = document.createElement("div");
  新建.className = 容器类名;
  新建.setAttribute("aria-hidden", "true");

  for (const 光斑 of 配置.光斑列表) {
    const 元素 = document.createElement("span");
    元素.className = 光斑类名;
    元素.style.width = `${光斑.尺寸}px`;
    元素.style.height = `${光斑.尺寸}px`;
    if (光斑.上) 元素.style.top = 光斑.上;
    if (光斑.下) 元素.style.bottom = 光斑.下;
    if (光斑.左) 元素.style.left = 光斑.左;
    if (光斑.右) 元素.style.right = 光斑.右;
    元素.style.animationDelay = `${光斑.延迟秒}s`;
    新建.appendChild(元素);
  }

  document.body.appendChild(新建);
  容器 = 新建;
  return 新建;
};

const 创建花瓣 = (宿主: HTMLElement): void => {
  if (宿主.querySelectorAll(`.${花瓣类名}`).length >= 配置.并发上限) return;

  const 时长 = 随机区间(配置.下落时长区间[0], 配置.下落时长区间[1]);
  const 延迟 = Math.random() * 配置.随机延迟上限秒;
  const 尺寸 = 随机区间(配置.花瓣尺寸区间[0], 配置.花瓣尺寸区间[1]);
  const 颜色 =
    配置.花瓣色[Math.floor(Math.random() * 配置.花瓣色.length)] ??
    配置.花瓣色[0];

  const 花瓣 = document.createElement("span");
  花瓣.className = 花瓣类名;
  花瓣.style.left = `${Math.random() * 100}vw`;
  花瓣.style.width = `${尺寸}px`;
  花瓣.style.height = `${尺寸}px`;
  花瓣.style.setProperty("--chat-petal-color", 颜色);
  花瓣.style.animationDuration = `${时长}s, ${时长 * 0.6}s`;
  花瓣.style.animationDelay = `${延迟}s, ${延迟}s`;
  宿主.appendChild(花瓣);

  const 清理标识 = window.setTimeout(
    () => {
      待清理定时器.delete(清理标识);
      花瓣.remove();
    },
    (时长 + 延迟) * 1000,
  );
  待清理定时器.add(清理标识);
};

const 停止补充 = (): void => {
  if (补充定时器 !== null) {
    window.clearInterval(补充定时器);
    补充定时器 = null;
  }
};

const 开启补充 = (宿主: HTMLElement): void => {
  if (补充定时器 !== null || document.hidden) return;
  补充定时器 = window.setInterval(() => 创建花瓣(宿主), 配置.补充间隔毫秒);
};

const 处理可见性变化 = (): void => {
  if (document.hidden) {
    停止补充();
    return;
  }
  const 宿主 = document.querySelector<HTMLElement>(`.${容器类名}`);
  if (宿主) 开启补充(宿主);
};

export function 启动花瓣背景(): void {
  if (减少动效()) return;

  const 宿主 = 取容器();
  for (let 序号 = 0; 序号 < 配置.初始铺放数量; 序号 += 1) {
    window.setTimeout(() => 创建花瓣(宿主), 序号 * 240);
  }
  开启补充(宿主);

  document.removeEventListener("visibilitychange", 处理可见性变化);
  document.addEventListener("visibilitychange", 处理可见性变化);
}

export function 停止花瓣背景(): void {
  停止补充();
  待清理定时器.forEach((标识) => window.clearTimeout(标识));
  待清理定时器.clear();
  document.removeEventListener("visibilitychange", 处理可见性变化);
  容器?.remove();
  容器 = null;
}
