# FP-01 引擎级真循环连续 · 三轴审查证据

日期：2026-09-17
功能点：FP-01（marqueeEngine 前置周期 + 份数不变量 + ShowcaseSection 接入 + 单测）

## 变更摘要

| 文件 | 变更 |
| --- | --- |
| `src/features/showcase/marqueeEngine.ts` | 新增 `视锥余量系数=2`、`计算轨道变换`；重写 `计算份数` 为双向铺底不变量 |
| `src/features/showcase/ShowcaseSection.tsx` | 测量/rAF transform 全走 `计算轨道变换`；减少动画仍测量份数并应用静态前置变换；初始份数取引擎下界 |
| `src/features/showcase/ShowcaseSection.test.tsx` | 去掉写死 ×2；新增份数下界/轨道前置周期/非法输入用例 |

未触碰：`src/data/showcase.ts`、AGENTS.md、SKILL.md；未 git commit/push。

## 引擎契约（新语义）

- `视锥余量系数 = 2`
- `计算份数(视口宽, 组宽) = Math.max(3, Math.ceil((2*组宽 + 有效视口*视锥余量系数)/组宽))`；组宽非法 → 3
- `计算轨道变换(位移, 组宽) = -(组宽 + 归一化位移(位移, 组宽))`；组宽非法 → 0（有限，不 NaN）
- 轨道 transform 始终含一个完整前置周期：相位 0 时 `translate3d(-组宽)`，相位 →组宽 时接近 `-2*组宽`

## 验证结果（真跑）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| typecheck | `npm run typecheck` | 0 错误 |
| vitest | `exec vitest run src/features/showcase/ShowcaseSection.test.tsx` | 39 passed / 0 failed / 0 errors |
| lint | `npm run lint` | 0 errors（15 warnings 均在既有过程脚本/无关文件，非本次引入） |
| build | `npm run build` | 成功（tsc + vite + PWA injectManifest） |

## 三轴审查

### Standards（规范）

- 引擎/组件标识符中文；无新增用户可见硬编码文案
- 精确修改：仅 FP-01 三文件 + 证据/进度；未重构无关代码
- 组宽测量使用 `offsetWidth`（非 `getBoundingClientRect`），规避 3D 投影非线性
- 未改业务数据、未 push/commit、未改 AGENTS/SKILL

### Spec（需求）

- `视锥余量系数=2`：符合
- `计算轨道变换` 公式与非法回退：符合（非法组宽 → 0，有限）
- `计算份数` 公式与 ≥3 下界：符合
- ShowcaseSection 测量路径 + rAF 路径均接入 `计算轨道变换`：符合
- 减少动画：仍渲染 `计算份数` 份，静态 `计算轨道变换(0,组宽)`，不跑 rAF：符合
- 单测去掉 ×2，新增下界/前置周期/非法输入：符合
- 引擎层一次修复、4 排共用：符合（无按排分支）

### BlindSpot（盲区）

| 盲区 | 应对 | 残留 |
| --- | --- | --- |
| jsdom `offsetWidth=0` 时测量早退 | 初始份数 `计算份数(0,1)`=3；组件测试断言组数≥3 与引擎下界一致 | 浏览器真实组宽份数由 FP-02 截图核验 |
| rAF 与 transform 断言竞态 | 测量 transform 用例 stub `requestAnimationFrame` | 无 |
| 方向 ±1 与前置周期叠加 | 变换对位移导数为 -1，方向语义由 `推进一帧` 保持；回绕时组内容周期相同，视觉连续 | 浏览器双方向实测归 FP-02 |
| 3D 视锥是否仍空洞 | 份数按 2×组宽+2×视口铺底 + 前置周期，覆盖投影放大 | 必须浏览器证据，本 worker 未跑 e2e/截图 |
| lint 过程脚本 warnings | 非本次引入；整任务结束时按 PROGRESS 删除过程文件 | 待交付阶段清理 |

## 关键决策

1. 非法组宽时 `计算轨道变换` 返回 0 而非 NaN/抛错：保证 DOM style 永不写入 `NaNpx`
2. 减少动画不清空 track transform，改为静态前置周期：与「仍渲染足够份数」配套，避免静止态左侧空洞
3. 单测份数断言改为「轨道子节点数 = 该行组数」及 `计算份数(视口,组宽)` 数据驱动，禁止写死副本数
4. 视锥余量系数固定导出为 2（任务指定），不在组件内魔改

## 遗留（非 FP-01 阻塞）

- showcase e2e、4 排浏览器左侧铺底截图、console error 过滤：FP-02
- 3D 入场落稳（rotateX/rotateZ）：FP-03
- 过程性文件删除：整任务交付阶段
