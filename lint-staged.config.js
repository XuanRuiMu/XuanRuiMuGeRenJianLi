/**
 * 提交前检查。
 * 注意：lint-staged 默认会把暂存文件作为命令行参数传给各工具，
 * 而本仓全面使用中文路径，Windows 下 eslint/oxlint 收到的是乱码路径（既有缺陷），
 * 因此这里用「函数式配置」自行给出命令、不追加文件参数，改为全量检查。
 */
export default {
  'src/**/*.{js,jsx,ts,tsx}': () => 'npm run lint',
  '**/*.{json,md,css}': () => 'npx prettier --check .',
}
