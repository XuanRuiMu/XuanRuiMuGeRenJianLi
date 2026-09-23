# FP-02 全量回归 · 三轴审查证据

日期：2026-09-17  
功能点：FP-02（全量回归 + e2e 跑马灯 + 全排浏览器复核）  
执行者：Headless Worker（循环工程）

## 执行阻塞（必须先读）

| 项 | 状态 |
| --- | --- |
| bash | **被权限规则拦截**：`{"permission":"bash","action":"ask","pattern":"*"}`，子代理无法获得交互确认 |
| 影响命令 | vitest 全量 / typecheck / lint / build / playwright e2e / fp02-probe.mjs |
| 已确认环境 | dev server **在** `http://localhost:5180/`（webfetch 拉到 vite 壳页，`main.tsx` 可解析） |
| 结论 | **禁止将未真跑项勾选为通过**；本文件仅含静态审查 + 契约适配预判 + 阻塞说明 |

## 静态审查范围（已真读源码）

| 文件 | 审查内容 |
| --- | --- |
| `src/features/showcase/marqueeEngine.ts` | 新契约实现：`视锥余量系数=2`、`计算份数`、`计算轨道变换` |
| `src/features/showcase/ShowcaseSection.tsx` | 测量/rAF/减少动画三路径均走 `计算轨道变换`；初始份数=`计算份数(0,1)`=3 |
| `src/features/showcase/ShowcaseSection.test.tsx` | 已数据驱动：份数/轨道变换断言无写死 ×2 / 副本数 |
| `e2e/visual-behavior.spec.ts` | 跑马灯用例数据驱动选卡；断言悬停启停位移 **delta**，不断言副本数 |
| `e2e/techstack-pause.spec.ts` | 技术球，与 showcase 份数契约无关 |
| `.agents/evidence/traces/FP-01-showcase-loop-probe-20260917.md` | **修复前**探针（组数全=3，m41 非 -组宽），不可当作 FP-02 证据 |

## 契约适配预判（e2e）

新契约影响：
1. DOM 卡片数增加：`计算份数(1440, 组宽)` 在组宽 1680/2240/2800 时期望份数 = 4（示例：`(2*1680+1440*2)/1680=3.71→4`）；组宽 4480 时仍为 3。
2. `track` transform 始终含前置周期：相位≈0 时 `m41 ≈ -组宽`（旧语义接近 `-归一化位移`）。

对 `visual-behavior.spec.ts` 跑马灯用例的静态结论：
- **不写死副本数** → 份数契约变化不需要改断言语义。
- 选卡逻辑遍历 `.group/card` 动态取「完整落入视口」卡片 → 卡片变多不破坏语义。
- 位移断言比较 `Math.abs(后-前)`（缝隙>10 / 卡片<1 / 移开>15）→ 绝对 m41 更负 **不影响 delta 语义**。
- **预判：无需契约数据驱动适配**；若真跑失败，只允许改「查询容器/超时/选卡窗口」，禁止削弱悬停启停断言。

单测 `ShowcaseSection.test.tsx` 静态结论：
- `期望卡总数` / `取轨道组数` / `计算轨道变换` 均引擎驱动。
- reduced-motion 用例断言静态 `计算轨道变换(0,500)<0` 且 track style 含该值 → 与新契约一致。
- **预判：单测源码层面无过时副本假设**；全量是否回归仍须 vitest 真跑。

## 引擎契约复核（读码）

- `计算份数(视口宽,组宽) = max(3, ceil((2*组宽 + 有效视口*视锥余量系数)/组宽))`，非法组宽→3：**符合**
- `计算轨道变换(位移,组宽) = -(组宽 + 归一化位移(位移,组宽))`，非法组宽→0：**符合**
- ShowcaseSection 初始份数 `计算份数(0,1)=3`：**符合**
- 三路径（测量 layout、rAF、减少动画静态）均调用 `计算轨道变换`：**符合**
- 未改 `src/data/showcase.ts` 业务数据：**符合**

## 三轴审查

### Standards（规范）

- 本 worker **未修改**业务源码、e2e、AGENTS/SKILL、showcase 数据。
- 新增过程性探针 `fp02-probe.mjs`（项目根，按任务约定可删）；证据/审查 md 写入 `.agents/evidence/traces/`。
- 控制台门只统计 `error`（探针脚本已按前端验证技巧§4）。
- **未交付未验证产物**：测试/截图/PROGRESS 勾选均不伪造。

### Spec（需求）

| 验收项 | 静态 | 真跑 |
| --- | --- | --- |
| 全量 vitest 无回归 | 源码契约一致 | ❌ bash 阻塞 |
| typecheck/lint/build | 引擎/组件类型与 FP-01 一致 | ❌ bash 阻塞（FP-01 曾过） |
| showcase e2e | 预判无需削弱断言 | ❌ bash 阻塞 |
| 4 排左侧铺底截图+指标 | 探针脚本已就绪 | ❌ 未跑，无数值 |
| console error=0 | 探针会记录 | ❌ 未跑 |

### BlindSpot（盲区）

| 盲区 | 应对 | 残留 |
| --- | --- | --- |
| 无 bash 无法区分 flaky/回归/环境 | 任务要求§6 三段判定依赖真跑 | 全量失败分类 **未做** |
| FP-01 探针是修复前数据 | 明确标注不可复用为 FP-02 证据 | 修复后 4 排 DOM 数值 **未知** |
| e2e 在份数增大后的可见卡选取是否仍稳定 | 预判 delta 断言鲁棒 | 需真跑确认；若失败只做数据驱动选卡适配 |
| 3D 入场（rotateX/Z）可能仍放大左侧空洞 | 属 FP-03；本 FP 若探针发现空洞只记证据不贴补丁 | 待 FP-02 探针/FP-03 |
| dev server 5180 已占用 | playwright `reuseExistingServer: true` | 无 |

## 关键决策

1. **bash 权限阻塞时不伪造 vitest/e2e/截图结果**；PROGRESS 停止条件保持未勾选。
2. e2e 静态预判 **无需改断言**；若后续真跑失败，仅允许契约数据驱动适配，保留悬停启停/位移业务断言。
3. 预写 `fp02-probe.mjs`（loop-probe 模式 + FP-02 指标字段 + 分排落盘），供有执行权限的上下文一键取证。
4. 不修改 showcase 业务数据、不 push、不改 AGENTS/SKILL。

## 遗留 / 下一步

1. 父代理或具备 bash 的 worker 按顺序真跑：
   - `npm exec vitest run`（失败先分类：本改动回归 / 既有 flaky / 环境）
   - `npm run typecheck` / `npm run lint` / `npm run build`
   - `npm exec playwright test e2e/visual-behavior.spec.ts`
   - `node fp02-probe.mjs` → 生成 `FP-02-<row>-20260917.png/md`
2. 按探针数值勾选 PROGRESS；某排仍空则写 DOM 数值与残余根因给 FP-03，**禁止贴补丁**。
3. 交付阶段删除：`fp02-probe.mjs`、`loop-probe.mjs` 及任务过程性文件（PROGRESS 按用户最终要求处理）。

## 本文件状态

- 三轴审查：Standards 通过（无违规交付）；Spec **部分静态通过 / 执行项阻塞**；BlindSpot 已登记。
- **FP-02 整体状态：blocked（环境权限）**，非业务失败。
