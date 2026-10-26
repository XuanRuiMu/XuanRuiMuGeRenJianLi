const 密钥变量名模式 = /^(?!VITE_)[A-Z][A-Z0-9_]*_(API_KEY|AUTH_TOKEN|SECRET|PASSWORD)$/

export function 创建密钥注入钩子(env, 密钥变量名, 端点路径) {
  if (!密钥变量名模式.test(密钥变量名)) {
    throw new Error(
      `AI 反代密钥变量名不合法：${密钥变量名}。必须全大写蛇形且不带 VITE_ 前缀（键名契约见 .env.example）。`
    )
  }

  return (代理) => {
    const 密钥 = env[密钥变量名]
    if (密钥) {
      代理.on('proxyReq', (代理请求) => {
        代理请求.setHeader('Authorization', `Bearer ${密钥}`)
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
