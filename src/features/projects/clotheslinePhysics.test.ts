import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 晾衣架物理引擎, 晾衣架配置 } from './clotheslinePhysics'

const 测试视口 = { 宽: 1000, 高: 480 }

describe('晾衣架物理引擎 - 世界结构', () => {
  let 引擎: 晾衣架物理引擎

  beforeEach(() => {
    引擎 = new 晾衣架物理引擎(测试视口)
  })

  afterEach(() => {
    引擎.销毁()
  })

  it('主绳、吊绳、便签存在于同一物理世界（银绳已统一为单链）', () => {
    const 检视 = 引擎.获取刚体检视()
    // 银绳 = 单一 主绳节点 数组（两端画布角静态 + 中间全部动态），不再有独立的 侧绳节点 字段
    const 总数 = 检视.主绳节点.length + 检视.吊绳节点.length + 检视.便签.length
    expect(检视.世界刚体总数).toBe(总数)
    expect(检视.世界刚体总数).toBeGreaterThan(0)
  })

  it('银绳由多个轻节点组成且两端画布角静态锚定（单链）', () => {
    const 检视 = 引擎.获取刚体检视()
    const 银绳总节点数 = 晾衣架配置.侧绳.左节数 + 晾衣架配置.主绳.节点数 + 晾衣架配置.侧绳.右节数 + 2
    expect(检视.主绳节点.length).toBe(银绳总节点数)
    expect(检视.主绳节点[0].isStatic).toBe(true)
    expect(检视.主绳节点[检视.主绳节点.length - 1].isStatic).toBe(true)
    for (let i = 1; i < 检视.主绳节点.length - 1; i++) {
      expect(检视.主绳节点[i].isStatic).toBe(false)
    }
  })

  it('四条吊绳各挂一张便签', () => {
    const 检视 = 引擎.获取刚体检视()
    expect(检视.便签.length).toBe(4)
    expect(检视.吊绳节点.length).toBe(4 * 晾衣架配置.吊绳.节数)
  })

  it('主绳自然悬垂：中点低于两端', () => {
    const 快照 = 引擎.获取快照()
    const 首 = 快照.主绳[0]
    const 尾 = 快照.主绳[快照.主绳.length - 1]
    const 中点 = 快照.主绳[Math.floor(快照.主绳.length / 2)]
    expect(中点.y).toBeGreaterThan(首.y)
    expect(中点.y).toBeGreaterThan(尾.y)
  })

  it('便签悬挂在对应吊点下方', () => {
    const 快照 = 引擎.获取快照()
    for (let i = 0; i < 快照.便签.length; i++) {
      const 吊绳 = 快照.吊绳[i]
      const 吊点 = 吊绳[0]
      const 便签 = 快照.便签[i]
      expect(便签.y).toBeGreaterThan(吊点.y)
      const 吊绳末端 = 吊绳[吊绳.length - 1]
      // 碰撞体小于视觉便签（取羊皮卷内收纸面），吊绳末端没入便签顶部卷边后方
      expect(吊绳末端.y).toBeGreaterThan(便签.y - 便签.高 / 2)
      expect(吊绳末端.y).toBeLessThan(便签.y)
    }
  })
})

describe('晾衣架物理引擎 - 碰撞过滤', () => {
  let 引擎: 晾衣架物理引擎

  beforeEach(() => {
    引擎 = new 晾衣架物理引擎(测试视口)
  })

  afterEach(() => {
    引擎.销毁()
  })

  it('便签之间碰撞开启（category/mask 互相包含）', () => {
    const 检视 = 引擎.获取刚体检视()
    for (const 便签 of 检视.便签) {
      expect(便签.category & 晾衣架配置.碰撞类.便签).toBe(晾衣架配置.碰撞类.便签)
      expect(便签.mask & 晾衣架配置.碰撞类.便签).toBe(晾衣架配置.碰撞类.便签)
    }
  })

  it('绳体不自碰且不与便签互碰', () => {
    const 检视 = 引擎.获取刚体检视()
    const 全部绳 = [...检视.主绳节点, ...检视.吊绳节点]
    for (const 节点 of 全部绳) {
      expect(节点.category & 晾衣架配置.碰撞类.绳体).toBe(晾衣架配置.碰撞类.绳体)
      expect(节点.mask).toBe(0)
    }
    for (const 便签 of 检视.便签) {
      expect(便签.mask & 晾衣架配置.碰撞类.绳体).toBe(0)
    }
  })

  it('两张便签被推重叠后会被碰撞分开（杜绝穿模：分离至无视觉重叠）', () => {
    const 快照前 = 引擎.获取快照()
    const 便签宽 = 快照前.便签[0].宽
    引擎.调试位移便签(1, 快照前.便签[0].x + 便签宽 * 0.3, 快照前.便签[0].y)
    for (let i = 0; i < 120; i++) {
      引擎.步进()
    }
    const 快照后 = 引擎.获取快照()
    const 间距 = Math.abs(快照后.便签[1].x - 快照后.便签[0].x)
    // 碰撞体缩放 0.9：分离平衡时中心距≈0.9·便签宽，故可见“带颜色部分”不再重叠（穿模消除）
    expect(间距).toBeGreaterThan(便签宽 * 0.85)
  })
})

describe('晾衣架物理引擎 - 质量差异', () => {
  let 引擎: 晾衣架物理引擎

  beforeEach(() => {
    引擎 = new 晾衣架物理引擎(测试视口)
  })

  afterEach(() => {
    引擎.销毁()
  })

  it('便签密度低于绳节点密度但绝对质量仍远大于单绳节点（轻签不压垮绳系）', () => {
    const 检视 = 引擎.获取刚体检视()
    const 绳节点 = 检视.主绳节点[5]
    const 便签 = 检视.便签[0]
    expect(便签.density).toBeLessThan(绳节点.density)
    expect(便签.mass).toBeGreaterThan(绳节点.mass * 10)
  })

  it('绳节点阻尼大于便签（轻绳风停即稳、轻签摆动悠长）', () => {
    const 检视 = 引擎.获取刚体检视()
    const 绳节点 = 检视.主绳节点[5]
    const 便签 = 检视.便签[0]
    expect(绳节点.frictionAir).toBeGreaterThan(便签.frictionAir)
  })

  it('轻绳对单次风脉冲有即时响应', () => {
    const 快照 = 引擎.获取快照()
    const 中点 = 快照.主绳[Math.floor(快照.主绳.length / 2)]
    引擎.登记风源(中点.x, 中点.y, 3, 0, 1)
    引擎.步进()
    const 检视 = 引擎.获取刚体检视()
    expect(Math.abs(检视.主绳节点[14].vx)).toBeGreaterThan(0)
  })

  it('风停后轻便签仍因低阻尼保持明显摆动（衰减慢于高阻尼体）', () => {
    const 快照 = 引擎.获取快照()
    const 吊点 = 快照.吊绳[0][0]
    for (let i = 0; i < 10; i++) {
      引擎.登记风源(吊点.x, 吊点.y, 3, 0, 1)
      引擎.步进()
    }
    const 停风时 = 引擎.获取刚体检视()
    const 停风签速 = Math.hypot(停风时.便签[0].vx, 停风时.便签[0].vy)
    expect(停风签速).toBeGreaterThan(0.05)
    for (let i = 0; i < 15; i++) {
      引擎.步进()
    }
    const 衰减后 = 引擎.获取刚体检视()
    const 衰减签速 = Math.hypot(衰减后.便签[0].vx, 衰减后.便签[0].vy)
    // 轻签惯性弱于重签，但低阻尼（0.012）仍使其 15 帧（约 0.25s）后保留明显摆速；高阻尼刚体此时应已近静止
    expect(衰减签速).toBeGreaterThan(停风签速 * 0.2)
  })
})

describe('晾衣架物理引擎 - 风力', () => {
  let 引擎: 晾衣架物理引擎

  beforeEach(() => {
    引擎 = new 晾衣架物理引擎(测试视口)
  })

  afterEach(() => {
    引擎.销毁()
  })

  it('风作用于影响半径内的主绳节点（绳子会晃）', () => {
    const 快照 = 引擎.获取快照()
    const 目标 = 快照.主绳[10]
    const 检视前 = 引擎.获取刚体检视()
    const 前速度 = Math.abs(检视前.主绳节点[10].vx) + Math.abs(检视前.主绳节点[10].vy)
    for (let i = 0; i < 5; i++) {
      引擎.登记风源(目标.x, 目标.y, 4, 1, 1)
      引擎.步进()
    }
    const 检视后 = 引擎.获取刚体检视()
    const 后速度 = Math.abs(检视后.主绳节点[10].vx) + Math.abs(检视后.主绳节点[10].vy)
    expect(后速度).toBeGreaterThan(前速度)
  })

  it('风作用于影响半径内的银绳节点（整绳同步摆动）', () => {
    const 快照 = 引擎.获取快照()
    const 目标索引 = 晾衣架配置.侧绳.左节数 + 2 // 左延伸区节点
    const 目标 = 快照.主绳[目标索引]
    const 检视前 = 引擎.获取刚体检视()
    const 前速度 = Math.abs(检视前.主绳节点[目标索引].vx) + Math.abs(检视前.主绳节点[目标索引].vy)
    for (let i = 0; i < 5; i++) {
      引擎.登记风源(目标.x, 目标.y, 4, 1, 1)
      引擎.步进()
    }
    const 检视后 = 引擎.获取刚体检视()
    const 后速度 = Math.abs(检视后.主绳节点[目标索引].vx) + Math.abs(检视后.主绳节点[目标索引].vy)
    expect(后速度).toBeGreaterThan(前速度)
  })

  it('风力具有空间局部性：远处刚体响应明显小于近处刚体', () => {
    // 统一为单链后整绳连通性更强（远端仍会经主绳传递振动），局部性比值较旧拓扑（>3）收紧为 >1.5，
    // 但仍可证明"近处风源处刚体响应显著大于远端"。
    const 快照 = 引擎.获取快照()
    const 近端 = 快照.便签[0]
    const 远端便签索引 = 快照.便签.length - 1
    for (let i = 0; i < 5; i++) {
      引擎.登记风源(近端.x, 近端.y, 5, 0, 1)
      引擎.步进()
    }
    const 检视 = 引擎.获取刚体检视()
    const 近速 = Math.abs(检视.便签[0].vx)
    const 远速 = Math.abs(检视.便签[远端便签索引].vx)
    expect(近速).toBeGreaterThan(远速 * 1.5)
  })

  it('风力强度缩放生效：强度 0 时刚体近乎静止，强度 1 时明显运动', () => {
    // 决定性验证"强度缩放"：同位置同方向，强度 0 应不产生风（构造已收敛到平衡，残留 <0.02），
    // 强度 1 则产生明显速度。构造预沉降 600 步使强度 0 用例不再受入场余振干扰。
    const 快照 = 引擎.获取快照()
    const 中点 = 快照.主绳[14]
    const 静速 = (() => {
      for (let i = 0; i < 5; i++) {
        引擎.登记风源(中点.x, 中点.y, 5, 0, 0)
        引擎.步进()
      }
      const 检视 = 引擎.获取刚体检视()
      return Math.hypot(检视.主绳节点[14].vx, 检视.主绳节点[14].vy)
    })()
    for (let i = 0; i < 5; i++) {
      引擎.登记风源(中点.x, 中点.y, 5, 0, 1)
      引擎.步进()
    }
    const 检视 = 引擎.获取刚体检视()
    const 动速 = Math.hypot(检视.主绳节点[14].vx, 检视.主绳节点[14].vy)
    expect(静速).toBeLessThan(0.02)
    expect(动速).toBeGreaterThan(静速 * 3)
  })

  it('风源超过有效期后自动失效：风停后速度显著衰减至近静止', () => {
    // 验证"风源有有限寿命"：有效期内（前 8 帧）给绳注入能量达到峰值；风源失效后（叠加阻尼）
    // 速度须衰减到峰值的 30% 以下且接近静止（<0.2px/步），证明风源确实不再持续推动。
    const 快照 = 引擎.获取快照()
    const 中点 = 快照.主绳[14]
    引擎.登记风源(中点.x, 中点.y, 5, 0, 1)
    for (let i = 0; i < 8; i++) {
      引擎.步进()
    }
    const 峰检视 = 引擎.获取刚体检视()
    const 峰速 = Math.max(...峰检视.主绳节点.filter((n) => !n.isStatic).map((n) => Math.hypot(n.vx, n.vy)))
    for (let i = 0; i < 112; i++) {
      引擎.步进()
    }
    const 后检视 = 引擎.获取刚体检视()
    const 后速 = Math.max(...后检视.主绳节点.filter((n) => !n.isStatic).map((n) => Math.hypot(n.vx, n.vy)))
    expect(后速).toBeLessThan(峰速 * 0.3)
    expect(后速).toBeLessThan(0.2)
  })
})

describe('晾衣架物理引擎 - 快照与销毁', () => {
  it('快照包含银绳单链点列、四条吊绳点列与四张便签位姿', () => {
    const 引擎 = new 晾衣架物理引擎(测试视口)
    const 快照 = 引擎.获取快照()
    const 银绳总节点数 = 晾衣架配置.侧绳.左节数 + 晾衣架配置.主绳.节点数 + 晾衣架配置.侧绳.右节数 + 2
    // 银绳 = 单一连续点列（左角→左延伸→主跨→右延伸→右角），无独立侧绳字段
    expect(快照.主绳.length).toBe(银绳总节点数)
    expect(快照.吊绳.length).toBe(4)
    for (const 吊绳 of 快照.吊绳) {
      expect(吊绳.length).toBe(晾衣架配置.吊绳.节数 + 1)
    }
    expect(快照.便签.length).toBe(4)
    for (const 便签 of 快照.便签) {
      expect(Number.isFinite(便签.x)).toBe(true)
      expect(Number.isFinite(便签.y)).toBe(true)
      expect(Number.isFinite(便签.角度)).toBe(true)
      expect(便签.宽).toBeGreaterThan(0)
      expect(便签.高).toBeGreaterThan(0)
    }
    // 两端画布角锚（默认 画布左X=0、画布宽=视口宽）：左角≈(0,顶部Y)、右角≈(视口宽,顶部Y)
    // FP-05 根因：锚点高度必须是顶部Y（绳标称高度），而非画布顶 0——后者使侧段向上斜拉到顶角→折角/两段感。
    expect(快照.主绳[0].x).toBeCloseTo(0, 5)
    expect(快照.主绳[0].y).toBeCloseTo(晾衣架配置.主绳.顶部Y, 5)
    expect(快照.主绳[银绳总节点数 - 1].x).toBeCloseTo(测试视口.宽, 5)
    expect(快照.主绳[银绳总节点数 - 1].y).toBeCloseTo(晾衣架配置.主绳.顶部Y, 5)
    // 连续性：相邻点距均有限且在合理分段长度内（无断点/跳变）
    for (let i = 0; i < 快照.主绳.length - 1; i++) {
      const d = Math.hypot(快照.主绳[i + 1].x - 快照.主绳[i].x, 快照.主绳[i + 1].y - 快照.主绳[i].y)
      expect(d).toBeGreaterThan(0)
      expect(d).toBeLessThan(120)
    }
    引擎.销毁()
  })

  it('银绳物理连通：一侧延伸受风，主跨内部节点亦获得速度（非两套独立物理）', () => {
    // 决定性验证"物理意义上的连上"：风打在左延伸远端节点，主跨中部节点也动起来，
    // 证明整根银绳是连通的单一约束体，而非"主绳 + 侧绳"两套在点处钉合。
    const 引擎 = new 晾衣架物理引擎(测试视口)
    const 快照 = 引擎.获取快照()
    const 侧索引 = 2 // 左延伸区（靠近画布左角）
    const 主跨中点索引 = 晾衣架配置.侧绳.左节数 + Math.floor(晾衣架配置.主绳.节点数 / 2)
    const 侧节点 = 快照.主绳[侧索引]
    const 检视前 = 引擎.获取刚体检视()
    const 主前速度 = Math.hypot(检视前.主绳节点[主跨中点索引].vx, 检视前.主绳节点[主跨中点索引].vy)
    for (let i = 0; i < 20; i++) {
      引擎.登记风源(侧节点.x, 侧节点.y, 5, 0, 1)
      引擎.步进()
    }
    const 检视后 = 引擎.获取刚体检视()
    const 侧后速度 = Math.hypot(检视后.主绳节点[侧索引].vx, 检视后.主绳节点[侧索引].vy)
    const 主后速度 = Math.hypot(检视后.主绳节点[主跨中点索引].vx, 检视后.主绳节点[主跨中点索引].vy)
    expect(侧后速度).toBeGreaterThan(0)
    // 关键点：风在侧绳，主跨中部也动 → 整根绳连通
    expect(主后速度).toBeGreaterThan(主前速度)
    引擎.销毁()
  })

  it('便签宽高比与卷轴底图一致', () => {
    const 引擎 = new 晾衣架物理引擎(测试视口)
    const 快照 = 引擎.获取快照()
    for (const 便签 of 快照.便签) {
      expect(便签.高 / 便签.宽).toBeCloseTo(638 / 547, 2)
    }
    引擎.销毁()
  })

  it('销毁后世界被清空', () => {
    const 引擎 = new 晾衣架物理引擎(测试视口)
    引擎.销毁()
    const 检视 = 引擎.获取刚体检视()
    expect(检视.世界刚体总数).toBe(0)
  })

  it('小宽度视口下便签尺寸随视口收缩', () => {
    const 窄引擎 = new 晾衣架物理引擎({ 宽: 400, 高: 480 })
    const 宽引擎 = new 晾衣架物理引擎({ 宽: 1200, 高: 480 })
    const 窄快照 = 窄引擎.获取快照()
    const 宽快照 = 宽引擎.获取快照()
    expect(窄快照.便签[0].宽).toBeLessThan(宽快照.便签[0].宽)
    窄引擎.销毁()
    宽引擎.销毁()
  })
})

describe('晾衣架物理引擎 - 银绳连续性（FP-05：根除「两段绳」折角）', () => {
  it('整绳为一条连续悬链线：两端锚点位于绳标称高度且与浏览器边框对齐', () => {
    // 用户可见诉求：第一个便签前段绳、最后一个便签后段绳都应连到浏览器边框，且整绳是一根连续绳（无折角/两段感）。
    // 几何上证明：(1) 两端锚点 x 落在画布左右边缘（=浏览器左右框）；(2) 锚点 y = 顶部Y（与主跨端点同高，侧段不再向上斜拉）；
    // (3) 相邻段最大转折角足够小（平滑悬链线特征），不存在侧段↔主跨的明显折角。
    const 引擎 = new 晾衣架物理引擎(测试视口)
    const 快照 = 引擎.获取快照()
    const N = 快照.主绳.length
    // (1) 端点对齐画布左右边缘（默认 画布左X=0、画布宽=视口宽）
    expect(快照.主绳[0].x).toBeCloseTo(0, 5)
    expect(快照.主绳[N - 1].x).toBeCloseTo(测试视口.宽, 5)
    // (2) 锚点高度 = 顶部Y（非 0）：侧段与主跨同高，整绳连续
    expect(快照.主绳[0].y).toBeCloseTo(晾衣架配置.主绳.顶部Y, 5)
    expect(快照.主绳[N - 1].y).toBeCloseTo(晾衣架配置.主绳.顶部Y, 5)
    // (3) 最大转折角 < 20°：平滑悬链线在 32 节点下相邻段夹角极小（实测 ≈10°，位于便签吊点处）；
    // 若侧段反向折叠（旧版右段 x 先增后减）会出现 ≈179° 折返——此断言是最直接的回归守卫。
    let 最大转折角 = 0
    for (let i = 1; i < N - 1; i++) {
      const a = 快照.主绳[i - 1]
      const b = 快照.主绳[i]
      const c = 快照.主绳[i + 1]
      const v1x = b.x - a.x
      const v1y = b.y - a.y
      const v2x = c.x - b.x
      const v2y = c.y - b.y
      const 模1 = Math.hypot(v1x, v1y)
      const 模2 = Math.hypot(v2x, v2y)
      if (模1 > 1e-6 && 模2 > 1e-6) {
        const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (模1 * 模2)))
        const 角 = Math.acos(cos) * (180 / Math.PI)
        if (角 > 最大转折角) 最大转折角 = 角
      }
    }
    expect(最大转折角).toBeLessThan(20)
    引擎.销毁()
  })

  it('侧段不向上凸起：侧段节点 y 不显著低于绳标称高度（无「向上斜拉到顶角」）', () => {
    // 直接验证视觉根因：旧版侧段从主跨端点(y≈顶部Y)升到顶角(y=0)，侧段中存在 y << 顶部Y 的「上凸」节点；
    // 修正后侧段全程 y ≈ 顶部Y（与锚点、主跨端点同高），不允许明显上凸。
    const 引擎 = new 晾衣架物理引擎(测试视口)
    const 快照 = 引擎.获取快照()
    const N = 快照.主绳.length
    const 左节数 = 晾衣架配置.侧绳.左节数
    const 右节数 = 晾衣架配置.侧绳.右节数
    const 顶部Y = 晾衣架配置.主绳.顶部Y
    // 左侧段节点索引 [1 .. 左节数]（夹在左角[0]与主跨首节点之间）
    for (let i = 1; i <= 左节数; i++) {
      expect(快照.主绳[i].y).toBeGreaterThan(顶部Y - 6) // 允许微小悬链下垂，但不得上凸超过 6px
    }
    // 右侧段节点索引 [N-1-右节数 .. N-2]
    for (let i = N - 1 - 右节数; i <= N - 2; i++) {
      expect(快照.主绳[i].y).toBeGreaterThan(顶部Y - 6)
    }
    引擎.销毁()
  })
})

describe('晾衣架物理引擎 - 滚动力（页面滚动耦合便签）', () => {
  let 引擎: 晾衣架物理引擎

  beforeEach(() => {
    引擎 = new 晾衣架物理引擎(测试视口)
  })

  afterEach(() => {
    引擎.销毁()
  })

  it('向下滚（正速度）给便签向下的力：便签被拉到更低处', () => {
    // 便签为低阻尼近不可伸长摆：向下滚时先被拉低再回弹，终态位置相位敏感；
    // 改为跟踪窗口内最大 y（屏幕上最低点，用户所见"被拖向下"），与相位无关地证明向下受力成立。
    const 前 = 引擎.获取快照().便签[0].y
    let 最低y = 前
    for (let i = 0; i < 20; i++) {
      引擎.登记滚动力(40)
      引擎.步进()
      最低y = Math.max(最低y, 引擎.获取快照().便签[0].y)
    }
    expect(最低y).toBeGreaterThan(前)
  })

  it('向上滚（负速度）给便签向上的力：便签被推到更高处', () => {
    // 屏幕上更高 = 更小 y。跟踪窗口内最小 y（最高点），相位无关地证明向上受力成立。
    const 前 = 引擎.获取快照().便签[0].y
    let 最高y = 前
    for (let i = 0; i < 20; i++) {
      引擎.登记滚动力(-40)
      引擎.步进()
      最高y = Math.min(最高y, 引擎.获取快照().便签[0].y)
    }
    expect(最高y).toBeLessThan(前)
  })

  it('滚动力带斜向分量：便签 x 亦发生偏移（非纯竖直）', () => {
    const 前x = 引擎.获取快照().便签[0].x
    for (let i = 0; i < 20; i++) {
      引擎.登记滚动力(40)
      引擎.步进()
    }
    const 后x = 引擎.获取快照().便签[0].x
    expect(Math.abs(后x - 前x)).toBeGreaterThan(0.01)
  })

  it('滚动停止后受力衰减，便签速度有界（不会无限加速）', () => {
    // 仅首次登记一次，之后不再滚动；滚动速度随每步 0.9 衰减、且静默窗口会清零，
    // 故便签只获得有限冲量，速度始终有界，不会出现失控加速。
    引擎.登记滚动力(60)
    引擎.步进()
    let 峰值速度 = 0
    for (let i = 0; i < 400; i++) {
      引擎.步进()
      const b = 引擎.获取刚体检视().便签[0]
      const v = Math.hypot(b.vx, b.vy)
      if (v > 峰值速度) 峰值速度 = v
    }
    expect(峰值速度).toBeLessThan(8)
  })

  it('向上推动后重力使便签回落：不会出现“停在高处不下落”的冻结', () => {
    // 模拟用户向上滚动把便签推到绳子上面，然后停止滚动；
    // 物理引擎持续运行 → 重力与约束应把便签拉回悬挂平衡位置附近（修复离屏暂停导致的冻结）
    const 前 = 引擎.获取快照().便签[0]
    for (let i = 0; i < 40; i++) {
      引擎.登记滚动力(-60) // 负速度 = 向上力
      引擎.步进()
    }
    const 冲最高 = 引擎.获取快照().便签[0]
    expect(冲最高.y).toBeLessThan(前.y) // 确实被推上去了
    // 停止登记后再步进足够长时间，让重力和约束把便签拉回来
    for (let i = 0; i < 600; i++) {
      引擎.步进()
    }
    const 后 = 引擎.获取快照().便签[0]
    expect(后.y).toBeGreaterThan(冲最高.y) // 回落
    expect(Math.abs(后.y - 前.y)).toBeLessThan(前.高 * 0.25) // 最终接近原悬挂位置
  })

  it('每便签受力方向各不相同：向下滚时相邻便签水平偏移方向相反', () => {
    // 水平方向 [1,-1,1,-1]：便签0/2 向右偏、便签1/3 向左偏，方向明显不同（修复“方向全一样”）
    const 前 = 引擎.获取快照().便签
    for (let i = 0; i < 30; i++) {
      引擎.登记滚动力(40)
      引擎.步进()
    }
    const 后 = 引擎.获取快照().便签
    // 便签0（方向+1）向右、便签1（方向-1）向左：两者水平位移方向相反
    expect(后[0].x - 前[0].x).toBeGreaterThan(0.05) // 便签0 右偏
    expect(后[1].x - 前[1].x).toBeLessThan(-0.05) // 便签1 左偏
  })

  it('每便签受力大小微差：因子更大的便签垂直位移更明显', () => {
    // 力度因子 [1.0, 0.85, 1.1, 0.9]：便签2(1.1) > 便签3(0.9)，向下滚时便签2 下沉更多（修复“大小全一样”）
    const 前 = 引擎.获取快照().便签
    for (let i = 0; i < 30; i++) {
      引擎.登记滚动力(40)
      引擎.步进()
    }
    const 后 = 引擎.获取快照().便签
    const 下沉2 = 后[2].y - 前[2].y
    const 下沉3 = 后[3].y - 前[3].y
    expect(下沉2).toBeGreaterThan(下沉3)
  })

  it('滚动受力收敛：同速下便签摆幅有界且不失控', () => {
    // 系数已减半（0.0016 → 0.0008，用户反馈力过大）。FP-05 修正右段折叠后整绳真正连通、柔顺度提升，
    // 便签摆幅由旧几何的 ~9px 收敛到 ~12px（仍远小于吊绳长 100px，绝对受控）；
    // 核心保证是"有界"——30 帧满速滚动内便签相对起始的最大偏移收敛在 16px 内（不飞出/不失控），
    // 且确有响应（偏移 > 0.5px）。摆为低阻尼，终态位置相位敏感，故跟踪最大偏移而非终态。
    const 基准引擎 = new 晾衣架物理引擎(测试视口)
    const 前 = 基准引擎.获取快照().便签[0].y
    let 最大偏移 = 0
    for (let i = 0; i < 30; i++) {
      基准引擎.登记滚动力(40)
      基准引擎.步进()
      最大偏移 = Math.max(最大偏移, Math.abs(基准引擎.获取快照().便签[0].y - 前))
    }
    基准引擎.销毁()
    expect(最大偏移).toBeGreaterThan(0.5)
    expect(最大偏移).toBeLessThan(16)
  })
})
