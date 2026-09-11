// 全站统一的剪贴板写入模块（IntroCard 信封按钮、ContactsCard 联系行共用）。
//
// 策略（按可靠性排序）：
// 1. navigator.clipboard.writeText —— 仅安全上下文（https / localhost）可用，优先走；
// 2. execCommand('copy') 兜底 —— 非安全上下文（如局域网 http://192.168.x.x）下
//    clipboard API 不存在，直接同步走这里，不浪费任何 user activation 时效；
// 3. 两者都失败时返回 false，由调用方在提示里如实显示“复制失败”，
//    严禁静默吞掉失败——否则用户粘贴出的是剪贴板残留旧值，造成“复制错内容”假象。
export const 写剪贴板 = async (文本: string): Promise<boolean> => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(文本);
      return true;
    } catch {
      /* 落入下方兜底 */
    }
  }
  return 兜底复制(文本);
};

// execCommand('copy') 兜底：textarea + select 的业界标准写法（参考 clipboard-polyfill）。
// readonly 防止移动端弹出键盘；setSelectionRange 兜底部分浏览器的全选缺失。
const 兜底复制 = (文本: string): boolean => {
  try {
    const 临时 = document.createElement("textarea");
    临时.value = 文本;
    临时.setAttribute("readonly", "");
    临时.style.position = "fixed";
    临时.style.top = "-9999px";
    document.body.appendChild(临时);
    临时.select();
    临时.setSelectionRange(0, 文本.length);
    let 成功 = false;
    try {
      成功 = document.execCommand("copy");
    } catch {
      成功 = false;
    }
    document.body.removeChild(临时);
    return 成功;
  } catch {
    return false;
  }
};
