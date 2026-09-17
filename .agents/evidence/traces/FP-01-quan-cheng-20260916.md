# FP-01 欢迎行与顶栏全橙验证 2026-09-16

- 页面URL：http://localhost:5180/
- 视口：1440x900
- 截图：FP-01-quan-cheng-20260916.png（AI面板已打开，欢迎行与顶栏可见）
- 欢迎行Rect：x=1021 y=515 w=190.28 h=15
- 顶栏Rect：x=1021 y=350 w=88.17 h=17
- 欢迎行计算色：rgb(255, 149, 0)（恒橙 #ff9500）
- 顶栏计算色：rgb(255, 149, 0)（恒橙 #ff9500）
- 动画：两处均为 none；渐变残留节点数 0
- 横向溢出：无
- 过滤后console error：0
- 结构：欢迎行 `welcome-line > welcome-full.xuan-harness-fixed-orange` 单span拼接 welcomePrefix/welcomeTitle/welcomeTitleSuffix，✻ 保留 aria-hidden
- 其余验证：lint 零错（5历史警告）、build 成功、全量 vitest 55文件530用例通过
