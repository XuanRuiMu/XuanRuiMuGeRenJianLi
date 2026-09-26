/**
 * dev AI 反代的密钥注入钩子（与 deploy/nginx.conf 的 proxy_set_header 同契约）。
 *
 * 契约：前端只打同源 /api/ai/*，真实密钥由反代层注入，所以密钥变量名一律不带 VITE_ 前缀
 * （带前缀的值会被 vite 打进前端产物，等于公开凭据）。键名清单的唯一声明处是 .env.example，
 * 由 scripts/ai-proxy-contract.test.js 机器校验三方（vite.config.js / .env.example / nginx.conf）一致。
 *
 * 为什么必须响亮告警：读不到密钥时若静默跳过注入，上游只会回 401，而 401 被上层兜底策略
 * 吞成「看起来正常的本地答案」，故障可以潜伏到任何一次真实提问才暴露。
 */

/** 密钥类变量名合法形态：全大写蛇形 + 密钥后缀 + 无 VITE_ 前缀。 */
const 密钥变量名模式 = /^(?!VITE_)[A-Z][A-Z0-9_]*_(API_KEY|AUTH_TOKEN|SECRET|PASSWORD)$/

/**
 * 生成 vite server.proxy 的 configure 钩子：vite 在 dev server 启动、创建代理实例时同步调用，
 * 因此密钥缺失属于「启动即可知」的缺陷，必须当场报出来，而不是等到用户提问时静默降级。
 * 告警文案只输出变量名，绝不输出密钥值。
 */
export function 创建密钥注入钩子(env, 密钥变量名, 端点路径) {
  if (!密钥变量名模式.test(密钥变量名)) {
    throw new Error(
      `AI 反代密钥变量名不合法：${密钥变量名}。必须全大写蛇形且不带 VITE_ 前缀（键名契约见 .env.example）。`
    )
  }

  return (proxy) => {
    const 密钥 = env[密钥变量名]
    if (密钥) {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.setHeader('Authorization', `Bearer ${密钥}`)
      })
      return
    }

    console.warn(
      [
        `[ai-proxy] 启动检查失败：环境变量 ${密钥变量名} 缺失或为空。`,
        `           ${端点路径} 不会注入 Authorization → 上游必然返回 401 → 前端静默回退本地兜底引擎，`,
        '           界面看起来像「正常回答」，实际大模型通道全程不可用。',
        `           修复：在 .env.local（模板 .env.example，已 gitignore）中以 ${密钥变量名}= 声明密钥，`,
        '           禁止加 VITE_ 前缀（那会把凭据打进前端产物）。',
      ].join('\n')
    )
  }
}
