/**
 * 站点质量自检：全部基于当前页面真实的 DOM / 计算样式 / 站内请求，不依赖任何外部服务。
 */

export type 结论 = "通过" | "警告" | "失败" | "跳过";

export interface 明细项 {
  说明: string;
  结论: 结论;
  数值?: string;
}

export interface 检查结果 {
  编号: string;
  名称: string;
  说明: string;
  结论: 结论;
  汇总: string;
  明细: 明细项[];
}

/* ---------------- 颜色与对比度 ---------------- */

interface 颜色 {
  红: number;
  绿: number;
  蓝: number;
  透明: number;
}

/** 解析 rgb()/rgba()，其它写法（含 color-mix、渐变、transparent 关键字变体）一律返回 null 交由上游跳过 */
function 解析颜色(文本: string): 颜色 | null {
  const 规范 = 文本.trim().toLowerCase();
  if (规范 === "transparent") return { 红: 0, 绿: 0, 蓝: 0, 透明: 0 };

  const 匹配 = 规范.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/,
  );
  if (匹配 === null) return null;

  return {
    红: Number(匹配[1]),
    绿: Number(匹配[2]),
    蓝: Number(匹配[3]),
    透明: 匹配[4] === undefined ? 1 : Number(匹配[4]),
  };
}

/** 按 sRGB 把 0-255 转为线性分量，用于 WCAG 相对亮度 */
function 线性化(通道: number): number {
  const 归一 = 通道 / 255;
  return 归一 <= 0.03928 ? 归一 / 12.92 : ((归一 + 0.055) / 1.055) ** 2.4;
}

function 相对亮度(色: 颜色): number {
  return (
    0.2126 * 线性化(色.红) + 0.7152 * 线性化(色.绿) + 0.0722 * 线性化(色.蓝)
  );
}

/** 把半透明前景按 alpha 合成到背景上，否则对比度会算错 */
function 合成(前景: 颜色, 背景: 颜色): 颜色 {
  if (前景.透明 >= 1) return 前景;
  return {
    红: 前景.红 * 前景.透明 + 背景.红 * (1 - 前景.透明),
    绿: 前景.绿 * 前景.透明 + 背景.绿 * (1 - 前景.透明),
    蓝: 前景.蓝 * 前景.透明 + 背景.蓝 * (1 - 前景.透明),
    透明: 1,
  };
}

function 对比度(前景: 颜色, 背景: 颜色): number {
  const 亮 = 相对亮度(前景);
  const 暗 = 相对亮度(背景);
  const 大 = Math.max(亮, 暗);
  const 小 = Math.min(亮, 暗);
  return (大 + 0.05) / (小 + 0.05);
}

/** 单个渐变最多取多少个色停参与计算 */
const 色停上限 = 8;
/** 多层渐变展开后的候选色上限，防止组合爆炸 */
const 候选上限 = 48;

function 均匀取样<项>(数组: 项[], 上限: number): 项[] {
  if (数组.length <= 上限) return 数组;
  const 步长 = 数组.length / 上限;
  const 结果: 项[] = [];
  for (let 位 = 0; 位 < 上限; 位 += 1) 结果.push(数组[Math.floor(位 * 步长)]);
  return 结果;
}

/**
 * 从 background-image 里取出全部渐变色停。
 * 返回 null 表示遇到了无法解析的颜色写法（hex / hsl / 颜色关键字），交给上游如实跳过。
 *
 * 只取色停而不沿渐变插值采样是有依据的：sRGB 空间里相邻色停之间每个通道随参数线性变化，
 * 而 WCAG 相对亮度对每个通道单调递增，所以亮度的极值必然落在色停上。
 */
function 提取渐变色(背景图: string): 颜色[] | null {
  const 规范 = 背景图.toLowerCase();
  if (/(^|[\s,(])#[\da-f]{3,8}\b/.test(规范) || /hsla?\(/.test(规范)) return null;

  const 匹配 = 背景图.match(/rgba?\([^)]*\)/gi);
  if (匹配 === null) return null;

  const 色组: 颜色[] = [];
  for (const 串 of 匹配) {
    const 色 = 解析颜色(串);
    if (色 === null) return null;
    色组.push(色);
  }
  return 色组.length === 0 ? null : 均匀取样(色组, 色停上限);
}

interface 背景信息 {
  /** 实效背景的全部候选色；渐变按色停展开，多层按合成关系展开 */
  候选: 颜色[];
  /** 存在 url() 背景图或无法解析的颜色写法时，像素内容不可判定 */
  有图片: boolean;
}

/**
 * 沿祖先链合成出实效背景的全部候选色。
 * 渐变按色停展开成多个候选，多层渐变由远及近逐层合成，最后取最差值判定。
 */
function 找实际背景(
  元素: Element,
  选项: { 跳过自身背景: boolean } = { 跳过自身背景: false },
): 背景信息 {
  const 渐变层: 颜色[][] = [];
  const 实心层: 颜色[] = [];
  let 当前: Element | null = 元素;
  let 有图片 = false;
  let 找到不透明底 = false;

  while (当前 !== null) {
    const 样式 = getComputedStyle(当前);
    const 图 = 样式.backgroundImage;

    // background-clip:text 时元素自身的渐变是文字填充色，不是背景
    if (图 !== "none" && !(选项.跳过自身背景 && 当前 === 元素)) {
      if (/url\(/i.test(图)) {
        有图片 = true;
      } else {
        const 色组 = 提取渐变色(图);
        if (色组 === null) 有图片 = true;
        else 渐变层.push(色组);
      }
    }

    const 背景 = 解析颜色(样式.backgroundColor);
    if (背景 !== null && 背景.透明 > 0) {
      实心层.push(背景);
      if (背景.透明 === 1) {
        找到不透明底 = true;
        break;
      }
    }
    当前 = 当前.parentElement;
  }

  // 一路没找到不透明底色，说明底下是什么取决于浏览器默认画布，不予判定
  if (!找到不透明底) return { 候选: [], 有图片 };

  let 候选: 颜色[] = [实心层[实心层.length - 1]];
  for (let 位 = 实心层.length - 2; 位 >= 0; 位 -= 1) {
    候选 = 候选.map((底) => 合成(实心层[位], 底));
  }
  for (let 位 = 渐变层.length - 1; 位 >= 0; 位 -= 1) {
    const 展开: 颜色[] = [];
    for (const 底 of 候选) for (const 停 of 渐变层[位]) 展开.push(合成(停, 底));
    候选 = 均匀取样(展开, 候选上限);
  }

  return { 候选, 有图片 };
}

function 元素路径(元素: Element): string {
  const 标签 = 元素.tagName.toLowerCase();
  const 标识 = 元素.id ? `#${元素.id}` : "";
  const 类 =
    元素.classList.length > 0
      ? `.${Array.from(元素.classList).slice(0, 2).join(".")}`
      : "";
  return `${标签}${标识}${类}`;
}

/** 只检查真正承载文字的元素：有可见文本节点且自身可见 */
function 收集文本元素(根: ParentNode): HTMLElement[] {
  const 结果: HTMLElement[] = [];
  for (const 元素 of Array.from(根.querySelectorAll<HTMLElement>("body *"))) {
    if (元素.closest("[aria-hidden='true'], .sr-only, script, style")) continue;
    const 样式 = getComputedStyle(元素);
    if (样式.display === "none" || 样式.visibility === "hidden") continue;
    if (Number(样式.opacity) === 0) continue;

    const 有文字 = Array.from(元素.childNodes).some(
      (节点) => 节点.nodeType === Node.TEXT_NODE && (节点.textContent ?? "").trim().length > 0,
    );
    if (有文字) 结果.push(元素);
  }
  return 结果;
}

export function 检查对比度(根: ParentNode = document): 检查结果 {
  const 明细: 明细项[] = [];
  const 文本元素 = 收集文本元素(根);
  let 跳过 = 0;

  for (const 元素 of 文本元素) {
    const 样式 = getComputedStyle(元素);
    const 前景 = 解析颜色(样式.color);

    // 渐变填充文字：元素自身的渐变是文字填充色而非背景，取背景时要跳过它
    const 裁剪到文字 =
      样式.getPropertyValue("-webkit-background-clip") === "text" ||
      样式.backgroundClip === "text";
    const 背景信息 = 找实际背景(元素, { 跳过自身背景: 裁剪到文字 });

    if (前景 === null || 背景信息.候选.length === 0 || 背景信息.有图片) {
      跳过 += 1;
      continue;
    }

    let 前景候选: 颜色[] = [前景];
    if (裁剪到文字) {
      const 色组 = 提取渐变色(样式.backgroundImage);
      if (色组 === null) {
        跳过 += 1;
        continue;
      }
      前景候选 = 色组;
    }

    // 元素自身的 opacity 会让文字向背景衰减，不纳入合成就会高估对比度
    const 元素不透明度 = Number.parseFloat(样式.opacity);
    const 字号 = Number.parseFloat(样式.fontSize) || 16;
    const 粗细 = Number.parseInt(样式.fontWeight, 10) || 400;
    // WCAG AA：大号字（>=18.66px 且加粗，或 >=24px）阈值降到 3.0
    const 是大号 = 字号 >= 24 || (字号 >= 18.66 && 粗细 >= 700);
    const 阈值 = 是大号 ? 3 : 4.5;

    // 渐变会铺出一段亮度范围，只要其中任何一处不达标，读者就有可能看不清
    let 最差比值 = Number.POSITIVE_INFINITY;
    for (const 前 of 前景候选) {
      const 衰减前 =
        Number.isFinite(元素不透明度) && 元素不透明度 < 1
          ? { ...前, 透明: 前.透明 * 元素不透明度 }
          : 前;
      for (const 背 of 背景信息.候选) {
        const 比值 = 对比度(合成(衰减前, 背), 背);
        if (比值 < 最差比值) 最差比值 = 比值;
      }
    }

    if (最差比值 < 阈值) {
      明细.push({
        说明: `${元素路径(元素)}：${(元素.textContent ?? "").trim().slice(0, 24)}`,
        结论: 最差比值 < 阈值 * 0.7 ? "失败" : "警告",
        数值: `${最差比值.toFixed(2)}:1（要求 ${阈值}:1）`,
      });
    }
  }

  const 失败数 = 明细.filter((项) => 项.结论 === "失败").length;
  const 跳过占比 = 文本元素.length === 0 ? 0 : 跳过 / 文本元素.length;
  // 大面积无法解析时不能断言通过，否则「跳过」就成了变相的假通过
  const 最终结论: 结论 =
    失败数 > 0
      ? "失败"
      : 明细.length > 0
        ? "警告"
        : 跳过占比 > 0.3
          ? "跳过"
          : "通过";

  return {
    编号: "01",
    名称: "文字对比度（WCAG AA）",
    说明:
      "逐个计算可见文字与其实效背景的对比度，含 alpha 合成、元素自身 opacity，以及祖先链上的渐变背景与渐变填充文字——渐变按色停展开后取最差的一处，低于 AA 阈值即列出。",
    结论: 最终结论,
    汇总:
      最终结论 === "跳过"
        ? `${文本元素.length} 个文本元素中 ${跳过} 个颜色无法解析（${Math.round(跳过占比 * 100)}%），覆盖率不足，不予判定`
        : `检查 ${文本元素.length} 处，不达标 ${明细.length} 处（其中严重 ${失败数} 处），无法解析而跳过 ${跳过} 处`,
    明细,
  };
}

/* ---------------- 图片可访问性 ---------------- */

export function 检查图片(根: ParentNode = document): 检查结果 {
  const 明细: 明细项[] = [];

  for (const 图 of Array.from(根.querySelectorAll<HTMLImageElement>("img"))) {
    const 有alt = (图.getAttribute("alt") ?? "").trim().length > 0;
    if (!有alt) {
      明细.push({
        说明: `${元素路径(图)}：src=${图.getAttribute("src") ?? "(无)"}`,
        结论: "失败",
        数值: "缺少 alt 文本",
      });
    }
  }

  for (const 矢量图 of Array.from(
    根.querySelectorAll<SVGElement>("svg[role='img']"),
  )) {
    const 有名 =
      (矢量图.getAttribute("aria-label") ?? "").trim().length > 0 ||
      (矢量图.querySelector("title")?.textContent ?? "").trim().length > 0;
    if (!有名) {
      明细.push({
        说明: `${元素路径(矢量图)}`,
        结论: "警告",
        数值: "role=img 但缺少 aria-label / <title>",
      });
    }
  }

  const 总数 = 根.querySelectorAll("img, svg[role='img']").length;
  return {
    编号: "02",
    名称: "图片可访问性",
    说明: "所有图片都要有替代文本，否则读屏软件与搜索引擎读不到。",
    结论: 明细.some((项) => 项.结论 === "失败") ? "失败" : 明细.length > 0 ? "警告" : "通过",
    汇总: `共 ${总数} 个图形元素，缺少可访问名称 ${明细.length} 个`,
    明细,
  };
}

/* ---------------- 站内链接可达性 ---------------- */

async function 并发映射<入, 出>(
  输入: 入[],
  并发数: number,
  处理: (项: 入) => Promise<出>,
): Promise<出[]> {
  const 结果: 出[] = new Array(输入.length);
  let 游标 = 0;

  const 工人 = async (): Promise<void> => {
    while (游标 < 输入.length) {
      const 下标 = 游标;
      游标 += 1;
      结果[下标] = await 处理(输入[下标]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(并发数, 输入.length) }, () => 工人()),
  );
  return 结果;
}

export async function 检查站内链接(当前地址: string): Promise<检查结果> {
  const 链接 = Array.from(
    new Set(
      Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .map((a) => {
          const 值 = a.getAttribute("href") ?? "";
          // 只测站内相对路径，外链和锚点不在本站自检范围内
          if (!值.startsWith("/") || 值.startsWith("//")) return "";
          return 值.split("#")[0] || "/";
        })
        .filter((值) => 值.length > 0),
    ),
  );

  const 明细: 明细项[] = [];
  await 并发映射(链接, 5, async (路径) => {
    try {
      const 响应 = await fetch(路径, { method: "GET", redirect: "follow" });
      if (!响应.ok) {
        明细.push({
          说明: `${路径}`,
          结论: "失败",
          数值: `HTTP ${响应.status}`,
        });
      }
    } catch {
      明细.push({ 说明: `${路径}`, 结论: "失败", 数值: "请求失败" });
    }
  });

  return {
    编号: "03",
    名称: "站内链接可达性",
    说明: `抓取本页所有站内链接并真实请求一遍（当前页：${当前地址}）。`,
    结论: 明细.length > 0 ? "失败" : "通过",
    汇总: `检测 ${链接.length} 个站内链接，异常 ${明细.length} 个`,
    明细,
  };
}

/* ---------------- 键盘可达性 ---------------- */

export function 检查键盘可达(根: ParentNode = document): 检查结果 {
  const 明细: 明细项[] = [];
  const 选择器 = "a[href], button, input, select, textarea, [tabindex]";

  for (const 元素 of Array.from(根.querySelectorAll<HTMLElement>(选择器))) {
    if (元素.closest("[aria-hidden='true']")) continue;
    const 样式 = getComputedStyle(元素);
    if (样式.display === "none" || 样式.visibility === "hidden") continue;

    const 索引 = 元素.getAttribute("tabindex");
    const 索引值 = 索引 === null ? null : Number(索引);
    // 负 tabindex 是标准的「可编程聚焦但不进 Tab 序列」模式（跳过链接目标、对话框初始焦点），
    // 属于正确用法；真正有害的是正数，它会把元素强行插到自然焦点顺序之前
    if (索引值 !== null && 索引值 > 0) {
      明细.push({
        说明: `${元素路径(元素)}`,
        结论: "警告",
        数值: `tabindex=${索引} 为正数，会打乱自然焦点顺序`,
      });
    }

    const 可访问名 =
      (元素.getAttribute("aria-label") ?? "").trim() ||
      (元素.textContent ?? "").trim() ||
      (元素.getAttribute("title") ?? "").trim() ||
      (元素.getAttribute("placeholder") ?? "").trim();
    if (可访问名.length === 0) {
      明细.push({
        说明: `${元素路径(元素)}`,
        结论: "失败",
        数值: "可聚焦但没有任何可访问名称",
      });
    }
  }

  return {
    编号: "04",
    名称: "键盘可达性",
    说明: "所有可交互元素都应能用 Tab 聚焦，并且要有能被读屏软件读出的名字。",
    结论: 明细.some((项) => 项.结论 === "失败") ? "失败" : 明细.length > 0 ? "警告" : "通过",
    汇总: `异常 ${明细.length} 处`,
    明细,
  };
}

/* ---------------- 标题层级 ---------------- */

export function 检查标题层级(根: ParentNode = document): 检查结果 {
  const 明细: 明细项[] = [];
  const 标题 = Array.from(根.querySelectorAll("h1, h2, h3, h4, h5, h6"));

  const 一级 = 标题.filter((h) => h.tagName === "H1");
  if (一级.length !== 1) {
    明细.push({
      说明: "h1 数量",
      结论: "失败",
      数值: `期望 1 个，实际 ${一级.length} 个`,
    });
  }

  let 上一级 = 0;
  for (const h of 标题) {
    const 级 = Number(h.tagName[1]);
    if (上一级 > 0 && 级 > 上一级 + 1) {
      明细.push({
        说明: `${元素路径(h)}：${(h.textContent ?? "").trim().slice(0, 20)}`,
        结论: "警告",
        数值: `从 h${上一级} 跳到 h${级}`,
      });
    }
    上一级 = 级;
  }

  return {
    编号: "05",
    名称: "标题层级",
    说明: "h1 应唯一，标题层级不应跳级，否则读屏用户无法理解页面结构。",
    结论: 明细.some((项) => 项.结论 === "失败") ? "失败" : 明细.length > 0 ? "警告" : "通过",
    汇总: `共 ${标题.length} 个标题，问题 ${明细.length} 处`,
    明细,
  };
}

/* ---------------- 主题 × 外观 覆盖 ---------------- */

export const 主题类 = [
  "default",
  "red-theme",
  "yellow-theme",
  "purple-theme",
  "green-theme",
];

export const 外观类 = [
  "default",
  "style-glass",
  "style-sharp",
  "style-neon",
  "style-paper",
];

export function 检查主题覆盖(): 检查结果 {
  const 组合数 = 主题类.length * 外观类.length;
  const 基础说明 = `遍历 ${组合数} 种组合，检查关键卡片容器仍能正常渲染且主题变量确实生效（检查后会还原当前主题）。`;

  // 没有可观测的卡片容器时，这一项在此页无法验证，必须如实报「跳过」而不是冒充通过
  if (document.querySelector(".card") === null) {
    return {
      编号: "06",
      名称: "主题 × 外观 组合覆盖",
      说明: 基础说明,
      结论: "跳过",
      汇总: `本页没有 .card 容器，${组合数} 种组合均未验证`,
      明细: [
        {
          说明: "缺少观测目标",
          结论: "跳过",
          数值: "请在首页等含卡片的页面运行本项",
        },
      ],
    };
  }

  const 明细: 明细项[] = [];
  // 只增删主题与外观类，保留 body 原有的布局类，否则测到的是错误布局下的尺寸
  const 原有类 = Array.from(document.body.classList);
  const 保留类 = 原有类.filter(
    (值) => !主题类.includes(值) && !外观类.includes(值),
  );
  const 主题主色 = new Map<string, string>();

  try {
    for (const 主题 of 主题类) {
      for (const 外观 of 外观类) {
        document.body.className = [
          ...保留类,
          主题 === "default" ? "" : 主题,
          外观 === "default" ? "" : 外观,
        ]
          .filter((值) => 值.length > 0)
          .join(" ");

        const 卡片 = document.querySelector<HTMLElement>(".card");
        const 矩形 = 卡片?.getBoundingClientRect();
        const 主色 = getComputedStyle(document.body)
          .getPropertyValue("--primary-500")
          .trim();

        if (卡片 === null) {
          明细.push({
            说明: `${主题} × ${外观}`,
            结论: "失败",
            数值: "卡片在切换后消失",
          });
        } else if (矩形 !== undefined && (矩形.width === 0 || 矩形.height === 0)) {
          明细.push({
            说明: `${主题} × ${外观}`,
            结论: "失败",
            数值: "卡片尺寸为 0，未正常渲染",
          });
        } else if (主色.length === 0) {
          明细.push({
            说明: `${主题} × ${外观}`,
            结论: "失败",
            数值: "未取到 --primary-500",
          });
        } else {
          主题主色.set(主题, 主色);
        }
      }
    }
  } finally {
    // 无论中途是否抛错，都必须把用户原本的主题与外观还原回去
    document.body.className = 原有类.join(" ");
  }

  // 主题变量必须随主题切换而变化，否则说明某套主题根本没生效
  const 唯一主色 = new Set(主题主色.values());
  if (唯一主色.size < 主题类.length) {
    明细.push({
      说明: "主题变量区分度",
      结论: "失败",
      数值: `${主题类.length} 套主题只解析出 ${唯一主色.size} 种 --primary-500`,
    });
  }

  return {
    编号: "06",
    名称: "主题 × 外观 组合覆盖",
    说明: 基础说明,
    结论: 明细.length > 0 ? "失败" : "通过",
    汇总:
      明细.length === 0
        ? `${组合数} 种组合全部正常，且 ${主题类.length} 套主题主色互不相同`
        : `${组合数} 种组合，异常 ${明细.length} 种`,
    明细,
  };
}

/** 汇总用：把一组结果压成通过/警告/失败/跳过的计数 */
export function 统计(结果集: 检查结果[]): Record<结论, number> {
  const 计数: Record<结论, number> = { 通过: 0, 警告: 0, 失败: 0, 跳过: 0 };
  for (const 结果 of 结果集) 计数[结果.结论] += 1;
  return 计数;
}
