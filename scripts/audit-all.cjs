#!/usr/bin/env node
/**
 * 全站质量回归：逐个打开页面，等页面内置的自检台跑完，读出六项结论。
 *
 * 直接用 Chrome DevTools Protocol 驱动本机 Edge/Chrome，不依赖 playwright 之类的自动化库，
 * 也就不需要为跑一次回归往项目里加依赖。浏览器用系统已装的那个，不下载。
 *
 * 用法（先启动 dev server）：
 *   node scripts/audit-all.cjs                 # 跑默认的八个页面
 *   node scripts/audit-all.cjs / /game         # 只跑指定页面
 *
 * 环境变量：
 *   AUDIT_BASE         站点基址，默认 http://localhost:4321
 *   AUDIT_BROWSER      浏览器可执行文件路径，默认自动探测 Edge/Chrome
 *   AUDIT_DEBUG_PORT   远程调试端口，默认 9333
 *   AUDIT_TIMEOUT_MS   单页等待自检完成的超时，默认 45000
 *
 * 退出码：0 全部无「失败」；1 存在失败项；2 环境或执行出错。
 */

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const 基址 = (process.env.AUDIT_BASE ?? "http://localhost:4321").replace(/\/+$/, "");
const 调试端口 = Number.parseInt(process.env.AUDIT_DEBUG_PORT ?? "9333", 10);
const 超时毫秒 = Number.parseInt(process.env.AUDIT_TIMEOUT_MS ?? "45000", 10);
const 页面清单 =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2).map((页) => (页.startsWith("/") ? 页 : `/${页}`))
    : ["/", "/chat", "/agent", "/game", "/projects", "/matcher", "/trace", "/audit"];

const 默认浏览器 = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

function 找浏览器() {
  if (process.env.AUDIT_BROWSER !== undefined) return process.env.AUDIT_BROWSER;
  const 命中 = 默认浏览器.find((路径) => fs.existsSync(路径));
  if (命中 === undefined) {
    console.error(
      "未找到 Edge 或 Chrome。请用环境变量 AUDIT_BROWSER 指向浏览器可执行文件。",
    );
    process.exit(2);
  }
  return 命中;
}

const 睡眠 = (毫秒) => new Promise((完) => setTimeout(完, 毫秒));

/** CJK 字符在终端里占两列，按此补齐才能真正对齐 */
function 显示宽度(串) {
  let 宽 = 0;
  for (const 字 of 串) {
    宽 += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/.test(字) ? 2 : 1;
  }
  return 宽;
}

const 补白 = (串, 宽) => 串 + " ".repeat(Math.max(0, 宽 - 显示宽度(串)));

/** CDP 上的一页：发命令、收事件 */
class 调试连接 {
  constructor(套接字) {
    this.套接字 = 套接字;
    this.序号 = 0;
    this.待办 = new Map();
    this.订阅者 = new Set();
    套接字.addEventListener("message", (事件) => {
      const 消息 = JSON.parse(事件.data);
      if (消息.id !== undefined) {
        const 待 = this.待办.get(消息.id);
        if (待 === undefined) return;
        this.待办.delete(消息.id);
        if (消息.error) 待.拒绝(new Error(JSON.stringify(消息.error)));
        else 待.完成(消息.result);
        return;
      }
      for (const 回 of this.订阅者) 回(消息);
    });
  }

  发送(方法, 参数 = {}) {
    const 编号 = (this.序号 += 1);
    return new Promise((完成, 拒绝) => {
      this.待办.set(编号, { 完成, 拒绝 });
      this.套接字.send(JSON.stringify({ id: 编号, method: 方法, params: 参数 }));
    });
  }

  求值(表达式) {
    return this.发送("Runtime.evaluate", {
      expression: 表达式,
      returnByValue: true,
      awaitPromise: true,
    });
  }
}

/** 等页面 load 完成，避免注入时文档还没就绪 */
async function 等待加载(连接) {
  for (let 次 = 0; 次 < 120; 次 += 1) {
    const 响应 = await 连接.求值("document.readyState");
    if (响应.result?.value === "complete") return true;
    await 睡眠(250);
  }
  return false;
}

/**
 * 把检查库注入当前页跑一遍六项检查。
 * 自检台只内嵌在 /audit 页，全站回归必须靠注入，否则其余页面根本无从判定。
 * 依赖 dev server 直接提供 /src/lib/audit.ts，所以这是开发期工具，不对构建产物生效。
 */
async function 跑单页(连接) {
  const 注入 = `(async () => {
    const 模块 = await import("/src/lib/audit.ts");
    const 结果集 = [
      模块.检查对比度(),
      模块.检查图片(),
      await 模块.检查站内链接(location.pathname),
      模块.检查键盘可达(),
      模块.检查标题层级(),
      模块.检查主题覆盖(),
    ];
    return { 项: 结果集, 卡片数: document.querySelectorAll(".card").length };
  })()`;

  const 求值 = 连接.求值(注入);
  const 超时 = new Promise((完成) =>
    setTimeout(() => 完成({ 超时: true }), 超时毫秒),
  );
  const 响应 = await Promise.race([求值, 超时]);

  if (响应.超时 === true) return { 出错: `注入执行超过 ${超时毫秒} 毫秒` };
  if (响应.exceptionDetails !== undefined) {
    return {
      出错: 响应.exceptionDetails.exception?.description ?? "注入执行抛出异常",
    };
  }
  const 值 = 响应.result?.value;
  return 值 === undefined || 值 === null ? { 出错: "注入执行无返回" } : 值;
}

async function 主流程() {
  const 浏览器路径 = 找浏览器();
  const 用户目录 = path.join(os.tmpdir(), `audit-all-profile-${process.pid}`);

  const 进程 = spawn(
    浏览器路径,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      `--remote-debugging-port=${调试端口}`,
      "--remote-allow-origins=*",
      `--user-data-dir=${用户目录}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  const 清理 = () => {
    try {
      进程.kill();
    } catch {
      /* 浏览器已退出则忽略 */
    }
    try {
      fs.rmSync(用户目录, { recursive: true, force: true });
    } catch {
      /* 临时目录清理失败不影响结论 */
    }
  };
  process.on("exit", 清理);
  process.on("SIGINT", () => {
    清理();
    process.exit(2);
  });

  // 等调试端口就绪
  let 端点 = null;
  for (let 次 = 0; 次 < 60 && 端点 === null; 次 += 1) {
    try {
      const 响应 = await fetch(`http://127.0.0.1:${调试端口}/json/list`);
      const 目标 = await 响应.json();
      const 页面 = 目标.find((项) => 项.type === "page");
      if (页面 !== undefined) 端点 = 页面.webSocketDebuggerUrl;
    } catch {
      await 睡眠(250);
    }
  }
  if (端点 === null) {
    console.error(`浏览器调试端口 ${调试端口} 未就绪。`);
    清理();
    process.exit(2);
  }

  const 套接字 = new WebSocket(端点);
  await new Promise((完成, 拒绝) => {
    套接字.addEventListener("open", 完成, { once: true });
    套接字.addEventListener("error", 拒绝, { once: true });
  });
  const 连接 = new 调试连接(套接字);
  await 连接.发送("Page.enable");
  await 连接.发送("Runtime.enable");

  console.log(`基址 ${基址} ／ 浏览器 ${path.basename(浏览器路径)}`);
  console.log(`共 ${页面清单.length} 个页面\n`);

  const 汇总表 = [];
  let 失败总数 = 0;

  for (const 页 of 页面清单) {
    await 连接.发送("Page.navigate", { url: 基址 + 页 });
    const 已加载 = await 等待加载(连接);
    const 结果 = 已加载 ? await 跑单页(连接) : { 出错: "页面加载超时" };

    console.log(`===== ${页} =====`);
    if (结果 === null) {
      console.log("  等待自检完成超时，或该页没有自检台");
      汇总表.push({ 页, 结论集: null });
      console.log("");
      continue;
    }
    if (结果.出错 !== undefined) {
      console.log(`  自检台报错：${结果.出错}`);
      失败总数 += 1;
      汇总表.push({ 页, 结论集: null });
      console.log("");
      continue;
    }

    const 结论集 = {};
    for (const 项 of 结果.项) {
      结论集[项.编号] = 项.结论;
      if (项.结论 === "失败") 失败总数 += 1;
      const 标记 =
        项.结论 === "通过" ? "通过" : 项.结论 === "跳过" ? "跳过" : 项.结论 === "警告" ? "警告" : "失败";
      console.log(`  [${标记}] ${项.编号} ${项.名称}`);
      console.log(`        ${项.汇总}`);
      for (const 行 of 项.明细.slice(0, 8)) {
        console.log(`        · ${行.说明}${行.数值 ? `　${行.数值}` : ""}`);
      }
      if (项.明细.length > 8) {
        console.log(`        · …… 另有 ${项.明细.length - 8} 条`);
      }
    }
    console.log(`  卡片容器 ${结果.卡片数} 个`);
    console.log("");
    汇总表.push({ 页, 结论集 });
  }

  const 编号集 = ["01", "02", "03", "04", "05", "06"];
  console.log("===== 汇总 =====");
  console.log(`${补白("页面", 12)}${编号集.map((号) => 补白(号, 6)).join("")}`);
  for (const 行 of 汇总表) {
    const 单元 =
      行.结论集 === null
        ? "无结果"
        : 编号集.map((号) => 补白(行.结论集[号] ?? "—", 6)).join("");
    console.log(`${补白(行.页, 12)}${单元}`);
  }
  console.log(`\n失败项合计 ${失败总数} 个`);

  套接字.close();
  清理();
  process.exit(失败总数 > 0 ? 1 : 0);
}

主流程().catch((错误) => {
  console.error("回归执行出错：", 错误);
  process.exit(2);
});
