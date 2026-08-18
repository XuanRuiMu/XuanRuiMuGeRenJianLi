# 玄锐暮个人简历（XuanRuiMuResume）项目规则

本项目同时遵守上级工作区的 [../AGENTS.md](../AGENTS.md) 通用规则。本文件只补充本项目特有的强制规则。

## 项目定位

- 基于高级技术的炫技的在线个人简历网站

## GitHub 备份规则 [P0]

- 每次完成代码修改并验证通过后，必须立即上传到 GitHub 备份。
- 仓库地址：https://github.com/XuanRuiMu/XuanRuiMuResume
- 默认分支：main
- 提交信息使用中文描述本次改动。
- 可通过总控制台「Git 推送」菜单或本地 `git push origin main` 执行。
- 上传前清理临时文件、构建产物、测试截图等非必要文件，保持仓库只含源码、资源与文档。

## 代码规范

- 变量/方法/类名优先中文；中文不可能时用 camelCase 拼音
- 用户可见文本走翻译/配置文件，禁止硬编码
- 每次修改后执行 `npm run lint` 与 `npm run build`，通过后再提交
- 3D 资源变更后需重新验证浏览器控制台无红色错误
