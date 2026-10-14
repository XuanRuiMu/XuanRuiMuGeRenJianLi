# 玄锐暮个人简历（XuanRuiMuGeRenJianLi）项目规则

本项目同时遵守上级工作区的 [../AGENTS.md](../AGENTS.md) 通用规则。本文件只补充本项目特有的强制规则。

## 项目定位

- 基于高级技术的炫技的在线个人简历网站

## GitHub 备份规则 [P0]

- 每次完成代码修改并验证通过后，必须立即上传到 GitHub 备份。
- 仓库地址：https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi
- 默认分支：main
- 提交信息使用中文描述本次改动。
- 可通过循环工程skill「Git 推送」菜单或本地 `git push origin main` 执行。
- 上传前清理临时文件、构建产物、测试截图等非必要文件，保持仓库只含源码、资源与文档。

## 代码规范

- 变量/方法/类名优先中文；中文不可能时用 camelCase 拼音
- 用户可见文本走翻译/配置文件，禁止硬编码
- 每次修改后执行 `npm run lint` 与 `npm run build`，通过后再提交
- 3D 资源变更后需重新验证浏览器控制台无红色错误

### 命名约定细则（英改中的落地口径）

- **中文优先**：函数、变量、类型/接口、常量、类、属性、文件名一律中文。
- **拼音兜底（仅两类）**：React 工具链强制要求拉丁约定的位置——
  - 组件名必须大写开头 → 拼音 PascalCase（`YingYong`、`ShouPing`）；
  - 自定义 Hook 必须 `use` 前缀 → `use` + 拼音驼峰（`useShuZiGunDong`）。
    （eslint/oxlint 的 rules-of-hooks 对中文名组件/Hook 直接报错，中文在此属「不可能」。）
- **框架契约豁免**：React/DOM API 与属性（`useState`/`className`/`key`/`value` 等）、
  第三方库 API、Tailwind/CSS 类名、数据层 id（`xrm`/`yangLai` 等 zh-CN.json 键）、
  本地化文件名（`zh-CN.json` 即 locale 码）不是自有命名，不纳入改名范围。
- **目录名**：src/ 与 scripts/、e2e/ 下的自有目录改中文；框架/平台约定目录
  （`public/`、`deploy/`、`data/`、`.github/`、`.husky/`）保持原名。

## 依赖版本约束（升级前必读）

以下三项为「最新可用版本」而非「npm 最新版」，升级前必须核验，否则直接破坏工具链：

- `oxlint` 锁 **1.75.0**：1.76+ 的 react 插件在中文标识符上必触发 Rust panic
  （`oxc_react_compiler` 类型推断不做 UTF-8 字符边界处理），本项目全面使用中文命名，不可升级。
- `eslint` 锁 **9.x 线**：`eslint-plugin-react`（最新 7.37.5）peer 只支持到 ESLint 9，升 ESLint 10 会 ERESOLVE 失败。
- `typescript` 锁 **6.x 线**：`@typescript-eslint`（最新 8.71.2）peer 上限 `<6.1.0`，升 TS 7 会 ERESOLVE 失败。
