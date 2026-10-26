import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 晾衣架物理引擎, 晾衣架配置 } from './LiangYiShuangWuLi'

const 测试视口 = { 宽: 1000, 高: 480 }

describe('晾衣架物理引擎 - 世界结构', { timeout: 20_000 }, () => {
  let 引擎: 晾衣架物理引擎

  beforeEach(() => {
    引擎 = new 晾衣架物理引擎(测试视口)
  })

  afterEach(() => {
    引擎.销毁()
  })

  it('主绳、吊绳、便签存在于同一物理世界（银绳已统一为单链）', () => {
    const 检视 = 引擎.获取刚体检视()

    const 总数 = 检视.主绳节点.length + 检视.吊绳节点.length + 检视.便签.length
    expect(检视.世界刚体总数).toBe(总数)
    expect(检视.世界刚体总数).toBeGreaterThan(0)
  })

  it('银绳由多个轻节点组成且两端画布角静态锚定（单链）', () => {
    const 检视 = 引擎.获取刚体检视()
    const 银绳总节点数 = 晾衣架配置.侧绳.左节数 + 晾衣架配置.主绳.节点数 + 晾衣架配置.侧绳.右节数 + 2
    expect(检视.主绳节点.length).toBe(银绳总节点数)
    expect(检视.主绳节点[0].是静态).toBe(true)
    expect(检视.主绳节点[检视.主绳节点.length - 1].是静态).toBe(true)
    for (let i = 1; i < 检视.主绳节点.length - 1; i++) {
      expect(检视.主绳节点[i].是静态).toBe(false)
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

      expect(吊绳末端.y).toBeGreaterThan(便签.y - 便签.高 / 2)
      expect(吊绳末端.y).toBeLessThan(便签.y)
    }
  })
})

describe('晾衣架物理引擎 - 碰撞过滤', { timeout: 20_000 }, () => {
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
      expect(便签.分类 & 晾衣架配置.碰撞类.便签).toBe(晾衣架配置.碰撞类.便签)
      expect(便签.遮罩 & 晾衣架配置.碰撞类.便签).toBe(晾衣架配置.碰撞类.便签)
    }
  })

  it('绳体不自碰且不与便签互碰', () => {
    const 检视 = 引擎.获取刚体检视()
    const 全部绳 = [...检视.主绳节点, ...检视.吊绳节点]
    for (const 节点 of 全部绳) {
      expect(节点.分类 & 晾衣架配置.碰撞类.绳体).toBe(晾衣架配置.碰撞类.绳体)
      expect(节点.遮罩).toBe(0)
    }
    for (const 便签 of 检视.便签) {
      expect(便签.遮罩 & 晾衣架配置.碰撞类.绳体).toBe(0)
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

    expect(间距).toBeGreaterThan(便签宽 * 0.85)
  })
})

describe('晾衣架物理引擎 - 质量差异', { timeout: 20_000 }, () => {
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
    expect(便签.密度).toBeLessThan(绳节点.密度)
    expect(便签.质量).toBeGreaterThan(绳节点.质量 * 10)
  })

  it('绳节点阻尼大于便签（轻绳风停即稳、轻签摆动悠长）', () => {
    const 检视 = 引擎.获取刚体检视()
    const 绳节点 = 检视.主绳节点[5]
    const 便签 = 检视.便签[0]
    expect(绳节点.空气摩擦).toBeGreaterThan(便签.空气摩擦)
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

    expect(衰减签速).toBeGreaterThan(停风签速 * 0.2)
  })
})

describe('晾衣架物理引擎 - 风力', { timeout: 20_000 }, () => {
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
    const 目标索引 = 晾衣架配置.侧绳.左节数 + 2
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
    const 快照 = 引擎.获取快照()
    const 中点 = 快照.主绳[14]
    引擎.登记风源(中点.x, 中点.y, 5, 0, 1)
    for (let i = 0; i < 8; i++) {
      引擎.步进()
    }
    const 峰检视 = 引擎.获取刚体检视()
    const 峰速 = Math.max(...峰检视.主绳节点.filter((n) => !n.是静态).map((n) => Math.hypot(n.vx, n.vy)))
    for (let i = 0; i < 112; i++) {
      引擎.步进()
    }
    const 后检视 = 引擎.获取刚体检视()
    const 后速 = Math.max(...后检视.主绳节点.filter((n) => !n.是静态).map((n) => Math.hypot(n.vx, n.vy)))
    expect(后速).toBeLessThan(峰速 * 0.3)
    expect(后速).toBeLessThan(0.2)
  })
})

describe('晾衣架物理引擎 - 快照与销毁', { timeout: 20_000 }, () => {
  it('快照包含银绳单链点列、四条吊绳点列与四张便签位姿', () => {
    const 引擎 = new 晾衣架物理引擎(测试视口)
    const 快照 = 引擎.获取快照()
    const 银绳总节点数 = 晾衣架配置.侧绳.左节数 + 晾衣架配置.主绳.节点数 + 晾衣架配置.侧绳.右节数 + 2

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

    expect(快照.主绳[0].x).toBeCloseTo(0, 5)
    expect(快照.主绳[0].y).toBeCloseTo(晾衣架配置.主绳.顶部Y, 5)
    expect(快照.主绳[银绳总节点数 - 1].x).toBeCloseTo(测试视口.宽, 5)
    expect(快照.主绳[银绳总节点数 - 1].y).toBeCloseTo(晾衣架配置.主绳.顶部Y, 5)

    for (let i = 0; i < 快照.主绳.length - 1; i++) {
      const d = Math.hypot(快照.主绳[i + 1].x - 快照.主绳[i].x, 快照.主绳[i + 1].y - 快照.主绳[i].y)
      expect(d).toBeGreaterThan(0)
      expect(d).toBeLessThan(120)
    }
    引擎.销毁()
  })

  it('银绳物理连通：一侧延伸受风，主跨内部节点亦获得速度（非两套独立物理）', () => {
    const 引擎 = new 晾衣架物理引擎(测试视口)
    const 快照 = 引擎.获取快照()
    const 侧索引 = 2
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

  it('便签集群水平居中：四张便签的横向中心落在带宽中线上（≤2px）', () => {
    for (const 视口 of [
      { 宽: 768, 画布宽: 768, 布局偏移X: 0 },
      { 宽: 1152, 画布宽: 1920, 布局偏移X: 384 },
      { 宽: 900, 画布宽: 900, 布局偏移X: 0 },
    ]) {
      const 引擎 = new 晾衣架物理引擎({ 高: 480, 画布左X: 0, ...视口 })
      const 快照 = 引擎.获取快照()
      const 横向缩放 = 快照.便签.map((便签) => 便签.x)
      const 集群中 = (Math.min(...横向缩放) + Math.max(...横向缩放)) / 2
      const 区域中 = 视口.布局偏移X + 视口.宽 / 2
      expect(Math.abs(集群中 - 区域中), `带宽 ${视口.宽} 下集群应居中`).toBeLessThanOrEqual(2)
      引擎.销毁()
    }
  })

  it('吊点取自主跨内部节点：首末便签不落在主跨端点上（端点留给绳延伸段）', () => {
    const 引擎 = new 晾衣架物理引擎(测试视口)
    const 快照 = 引擎.获取快照()
    const 主跨起点 = 1 + 晾衣架配置.侧绳.左节数
    const 首吊点序号 = Math.round(晾衣架配置.吊点比例[0] * (晾衣架配置.主绳.节点数 - 1))
    const 末吊点序号 = Math.round(晾衣架配置.吊点比例[晾衣架配置.吊点比例.length - 1] * (晾衣架配置.主绳.节点数 - 1))
    expect(首吊点序号).toBeGreaterThan(0)
    expect(末吊点序号).toBeLessThan(晾衣架配置.主绳.节点数 - 1)

    const 横向缩放 = 快照.便签.map((便签) => 便签.x)
    const 期望跨度 = 快照.主绳[主跨起点 + 末吊点序号].x - 快照.主绳[主跨起点 + 首吊点序号].x
    expect(Math.abs(Math.max(...横向缩放) - Math.min(...横向缩放) - 期望跨度)).toBeLessThanOrEqual(2)
    引擎.销毁()
  })
})

describe('晾衣架物理引擎 - 银绳连续性（FP-05：根除「两段绳」折角）', { timeout: 20_000 }, () => {
  it('整绳为一条连续悬链线：两端锚点位于绳标称高度且与浏览器边框对齐', () => {
    const 引擎 = new 晾衣架物理引擎(测试视口)
    const 快照 = 引擎.获取快照()
    const N = 快照.主绳.length

    expect(快照.主绳[0].x).toBeCloseTo(0, 5)
    expect(快照.主绳[N - 1].x).toBeCloseTo(测试视口.宽, 5)

    expect(快照.主绳[0].y).toBeCloseTo(晾衣架配置.主绳.顶部Y, 5)
    expect(快照.主绳[N - 1].y).toBeCloseTo(晾衣架配置.主绳.顶部Y, 5)

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
    const 引擎 = new 晾衣架物理引擎(测试视口)
    const 快照 = 引擎.获取快照()
    const N = 快照.主绳.length
    const 左节数 = 晾衣架配置.侧绳.左节数
    const 右节数 = 晾衣架配置.侧绳.右节数
    const 顶部Y = 晾衣架配置.主绳.顶部Y

    for (let i = 1; i <= 左节数; i++) {
      expect(快照.主绳[i].y).toBeGreaterThan(顶部Y - 6)
    }

    for (let i = N - 1 - 右节数; i <= N - 2; i++) {
      expect(快照.主绳[i].y).toBeGreaterThan(顶部Y - 6)
    }
    引擎.销毁()
  })
})

describe('晾衣架物理引擎 - 滚动力（页面滚动耦合便签）', { timeout: 20_000 }, () => {
  let 引擎: 晾衣架物理引擎

  beforeEach(() => {
    引擎 = new 晾衣架物理引擎(测试视口)
  })

  afterEach(() => {
    引擎.销毁()
  })

  it('向下滚（正速度）给便签向下的力：便签被拉到更低处', () => {
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
    const 前 = 引擎.获取快照().便签[0]
    for (let i = 0; i < 40; i++) {
      引擎.登记滚动力(-60)
      引擎.步进()
    }
    const 冲最高 = 引擎.获取快照().便签[0]
    expect(冲最高.y).toBeLessThan(前.y)

    for (let i = 0; i < 600; i++) {
      引擎.步进()
    }
    const 后 = 引擎.获取快照().便签[0]
    expect(后.y).toBeGreaterThan(冲最高.y)
    expect(Math.abs(后.y - 前.y)).toBeLessThan(前.高 * 0.25)
  })

  it('每便签受力方向各不相同：向下滚时相邻便签水平偏移方向相反', () => {
    const 前 = 引擎.获取快照().便签
    for (let i = 0; i < 30; i++) {
      引擎.登记滚动力(40)
      引擎.步进()
    }
    const 后 = 引擎.获取快照().便签

    expect(后[0].x - 前[0].x).toBeGreaterThan(0.05)
    expect(后[1].x - 前[1].x).toBeLessThan(-0.05)
  })

  it('每便签受力大小微差：因子更大的便签垂直位移更明显', () => {
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
