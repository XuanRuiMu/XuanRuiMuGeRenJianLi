import Matter from 'matter-js'

const { Engine, World, Bodies, Body, Composite, Constraint } = Matter

// 晾衣架全部物理参数集中于此。坐标系 = 晾衣架容器左上角原点的像素坐标。
export const 晾衣架配置 = {
  主绳: {
    节点数: 28, // 悬垂链节点数（两端为静态锚点）
    顶部Y: 28, // 锚点距容器顶部的距离 px
    边距比例: 0.045, // 锚点边距 = 钳制(容器宽 × 边距比例)
    边距最小: 16,
    边距最大: 48,
    悬垂深度: 36, // 初始抛物线悬垂深度 px（负载下的额外下垂由求解器自然产生）
    节点半径: 20, // 不可见，仅用于质量/惯量；节点间不自碰，重叠无影响
    密度: 0.002, // 低密度 → 轻绳，同样风力下加速快、响应灵敏
    空气摩擦: 0.05, // 高阻尼 → 轻绳随风即动、风停即稳
    跳节点跨度: 2, // 除相邻约束外再加 i→i+2 软支撑，抑制长链拉伸累积
    跳节点刚度: 1,
  },
  吊绳: {
    节数: 3, // 每条吊绳的摆动节数（不含主绳吊点）
    段长: 33.6, // 每节长度 px，吊绳总长 = 节数 × 段长（原 28 的 6/5 倍，便签下垂更自然、不紧绷）
  },
  侧绳: {
    // 根因修复：角→主跨端点跨度仅 ~60-80px（边距 16-48 + 顶部Y ~28 + 少量悬垂）；
    // 旧值 10 个节点 → 段长仅 ~7px 而节点直径 40px（节点半径 20），节点严重重叠，
    // quadraticCurveTo 以几乎重合的控制点画线，产生肉眼可见的螺旋伪影（用户截图右上的"curl"）。
    // 改为 2 节点 / 3 段 / 段长 ~27px → 节点间距（27px）> 节点直径（40px）的一半，
    // 节点体不再重叠，渲染无伪影；延伸变成与主跨端点同高的「水平侧跑」，侧段与主跨在端点处共线无折角（配合 FP-05 锚点高度修正）。
    // 物理连通性不变（仍是同一约束链、相邻约束+跳节点约束全链贯通）。
    左节数: 2,
    右节数: 2,
    段长: 28, // 历史配置项，保留；当前用相邻初始距作约束长，无需此值参与计算
    密度: 0.002, // 直接复用主绳密度，保证无区分
    空气摩擦: 0.05, // 直接复用主绳空气摩擦
  },
  便签: {
    宽占比: 0.19, // 便签视觉宽 = 钳制(容器宽 × 宽占比)
    最小宽: 72,
    最大宽: 200,
    高宽比: 638 / 547, // 与卷轴底图标准.png (547×638) 一致
    碰撞体缩放: 0.9, // 碰撞体贴近可视羊皮卷（带颜色部分）。原 0.72 过小，摆动时可见部分在碰撞体尚未接触前即重叠/穿过（穿模）；0.9 使物理碰撞在视觉接触前触发，杜绝穿模
    密度: 0.0014, // 低密度 → 轻签，相对绳子更轻、随风更灵敏（原 0.003 过重压绳）
    空气摩擦: 0.012, // 低阻尼 → 轻签摆动悠长、有惯性
    静止角列表Deg: [-2.5, 1.8, -1.2, 2.2], // 四张便签各自的静止倾角
  },
  碰撞类: {
    便签: 0x0001, // 便签↔便签碰撞开启（防穿模）
    绳体: 0x0002, // 绳体 mask=0：不自碰、不与便签互碰（约束已保证相对位置）
  },
  吊点比例: [0.13, 0.375, 0.625, 0.87], // 四个吊点在主绳上的归一化位置
  风: {
    影响半径: 220, // 风源作用半径 px
    速度系数: 0.0011, // 鼠标速度方向分量的力系数
    径向系数: 0.0006, // 径向推斥分量的力系数
    有效期帧数: 8, // 一次 pointermove 产生的风持续作用的物理帧数
    最小速度: 0.05, // 低于此速度不产生风（px/ms）
    最大速度: 6, // 速度钳制上限，防甩动过猛
  },
  滚动: {
    // 页面滚动 → 便签受力：向下滚给向下力、向上滚给向上力；每便签在“上下力”基础上叠加
    // 左右交替的水平分量（制造“偏左偏右、方向各不同”的观感），并附每便签微差力度因子，
    // 避免“大小方向全一样”。力随步数惯性衰减。
    系数: 0.0008, // 滚动速度(px/帧) → 便签受力系数（原 0.0016 的 1/2，用户反馈力过大）
    最大速度: 80, // 滚动速度钳制上限，防猛甩过冲
    水平权重: 0.5, // 左右交替水平分量相对“上下力”的比例（0.5 ≈ 偏转 26.5°），确保方向差异肉眼可辨
    水平方向: [1, -1, 1, -1], // 四张便签各自的左右方向（交替），使每张便签受力方向各不相同
    力度因子: [1.0, 0.85, 1.1, 0.9], // 每便签受力大小微差，避免“大小都一样”
    衰减: 0.9, // 每物理步滚动力衰减比例，呈惯性余韵
    吊绳权重: 0.6, // 吊绳节点分担的力比例，使整条挂链自然跟随便签
    静默窗口Ms: 120, // 距上次滚动超过该时长即判定滚动停止，滚动力清零，避免离屏残留力在回视时突跳
  },
  求解: {
    约束迭代: 16,
    位置迭代: 16,
    速度迭代: 8,
    固定步长Ms: 1000 / 60, // fixed-dt 累加器步长
    最大跳帧: 5, // 单帧最多补偿的物理步数
    预沉降步数: 600, // 构建后同步沉降的步数，必须真正收敛到平衡态：统一为单链后主跨两端不再静态锚定（改由延伸链拉住），
    // 整绳更"软"，120 步不足以收敛 → 首帧会带肉眼可见的余振（节点14 等动态节点残留 ~0.07px/步）。
    // 增至 600 步使构造结束时即处于平衡（残留 <0.003px/步），根除入场晃动，亦使"强度0风不动"判定成立。
  },
  重力Y: 1,
} as const

export interface 晾衣架视口 {
  宽: number
  高: number
  画布左X?: number // 画布左缘在容器坐标系下的 x（通常为负，因画布满幅居中溢出容器）；缺省 0
  画布宽?: number // 画布像素宽（100vw）；缺省取 视口.宽
  /**
   * 布局偏移X：主绳主跨（含吊点/便签）整体相对容器左缘的水平偏移。
   * 用途——晾衣绳区改为满幅（region = 100vw）后，绳子两端角点钉在 region 边缘（画布左X=0 / 画布宽=region）
   * 以连到浏览器两边；便签集群宽度（视口.宽）通常小于 region，用本偏移把集群居中到满幅 region 内，
   * 使 100%/缩小缩放的观感与改动前（便签居中、绳子满幅）完全一致。缺省 0（行为不变）。
   */
  布局偏移X?: number
}

export interface 便签位姿 {
  x: number
  y: number
  角度: number
  宽: number
  高: number
}

export interface 晾衣架快照 {
  主绳: Array<{ x: number; y: number }> // 统一单链：左角 → 左延伸 → 主跨 → 右延伸 → 右角（整根银绳的连续点列）
  吊绳: Array<Array<{ x: number; y: number }>>
  便签: 便签位姿[]
}

export interface 刚体检视项 {
  x: number
  y: number
  vx: number
  vy: number
  isStatic: boolean
  mass: number
  density: number
  frictionAir: number
  category: number
  mask: number
}

export interface 晾衣架检视 {
  世界刚体总数: number
  主绳节点: 刚体检视项[]
  吊绳节点: 刚体检视项[]
  便签: 刚体检视项[]
}

interface 风源 {
  x: number
  y: number
  速度x: number
  速度y: number
  强度: number
  剩余帧: number
}

interface 挂件 {
  吊点节点: Matter.Body
  吊绳节点: Matter.Body[]
  便签刚体: Matter.Body
  便签宽: number
  便签高: number
}

function 钳制(值: number, 最小: number, 最大: number): number {
  return Math.min(Math.max(值, 最小), 最大)
}

function 检视项(刚体: Matter.Body): 刚体检视项 {
  return {
    x: 刚体.position.x,
    y: 刚体.position.y,
    vx: 刚体.velocity.x,
    vy: 刚体.velocity.y,
    isStatic: 刚体.isStatic,
    mass: 刚体.mass,
    density: 刚体.density,
    frictionAir: 刚体.frictionAir,
    category: 刚体.collisionFilter.category ?? 0,
    mask: 刚体.collisionFilter.mask ?? 0,
  }
}

export class 晾衣架物理引擎 {
  private readonly engine: Matter.Engine
  private readonly 主绳节点: Matter.Body[] = []
  private readonly 挂件列表: 挂件[] = []
  private 画布左X = 0
  private 画布宽 = 0
  private 风源队列: 风源[] = []
  private 滚动速度Y = 0
  private 最后滚动时间 = 0

  constructor(视口: 晾衣架视口) {
    const 配置 = 晾衣架配置
    this.画布左X = 视口.画布左X ?? 0
    this.画布宽 = 视口.画布宽 ?? 视口.宽
    this.engine = Engine.create()
    this.engine.gravity.y = 配置.重力Y
    this.engine.constraintIterations = 配置.求解.约束迭代
    this.engine.positionIterations = 配置.求解.位置迭代
    this.engine.velocityIterations = 配置.求解.速度迭代

    const 绳碰 = { group: 0, category: 配置.碰撞类.绳体, mask: 0 }
    const 签碰 = { group: 0, category: 配置.碰撞类.便签, mask: 配置.碰撞类.便签 }
    const 绳参数 = {
      density: 配置.主绳.密度,
      frictionAir: 配置.主绳.空气摩擦,
      collisionFilter: 绳碰,
    }

    // 整根银绳 = 一条连续物理链：左画布角 → 左延伸 → 主跨 → 右延伸 → 右画布角。
    // 仅两端画布角静态，其余（含原主绳两端）全部动态，由同一组连续约束 + 跳节点约束串联为单一连通体。
    // 根因修复：旧版拆成 主绳(两端静态) + 侧绳左 + 侧绳右 三条独立约束链，仅在主绳静态端点处点约束钉合，
    //   物理上是"两套/三套子系统在一个点相遇"，并非一根连通绳（上一轮只统一了渲染）。现统一为单链，根除"中间断点"。
    const 节点数 = 配置.主绳.节点数
    const 边距X = 钳制(视口.宽 * 配置.主绳.边距比例, 配置.主绳.边距最小, 配置.主绳.边距最大)
    const 可用宽 = Math.max(视口.宽 - 2 * 边距X, 1)
    const 布局偏移 = 视口.布局偏移X ?? 0
    // 主跨 28 节点（全部动态；端点不再静态，改由短侧链刚性拉住，等同"绳两端被远处角点锚定"，悬垂形态不变）
    const 主跨: Matter.Body[] = []
    for (let i = 0; i < 节点数; i++) {
      const t = i / (节点数 - 1)
      const x = 布局偏移 + 边距X + t * 可用宽
      const y = 配置.主绳.顶部Y + 4 * 配置.主绳.悬垂深度 * t * (1 - t)
      主跨.push(Bodies.circle(x, y, 配置.主绳.节点半径, 绳参数))
    }
    // 画布左上/右上角静态锚（满幅溢出容器，银绳由此延至屏幕左右边框）。
    // 根因修复（FP-05）：锚点 y 必须等于 顶部Y（绳标称高度），而非 y=0（画布顶）。
    // 旧值 y=0 → 侧段从主跨端点「向上斜拉到顶角」，与主跨形成明显折角，视觉上像「两段独立绳」；
    // 改用 顶部Y 后侧段与主跨端点同高，整绳为一条连续悬链线从左框平滑延伸到右框，根除折角/两段感。
    const 锚Y = 配置.主绳.顶部Y
    const 左角 = Bodies.circle(this.画布左X, 锚Y, 配置.主绳.节点半径, { ...绳参数, isStatic: true })
    const 右角 = Bodies.circle(this.画布左X + this.画布宽, 锚Y, 配置.主绳.节点半径, { ...绳参数, isStatic: true })
    // 左/右延伸：在角点(锚Y)与主跨端点(顶部Y)间线性插值出动态节点。两端同高 → 延伸段为水平侧跑，
    // 与主跨端点切线（近似水平）共线，整绳在端点处无折角；刚性约束串联，与主跨同质，无独立"侧绳"概念。
    const 构建延伸 = (角: Matter.Body, 主跨端: Matter.Body, 节数: number): Matter.Body[] => {
      const 节点: Matter.Body[] = []
      for (let i = 0; i < 节数; i++) {
        const t = (i + 1) / (节数 + 1)
        const x = 角.position.x + (主跨端.position.x - 角.position.x) * t
        const y = 角.position.y + (主跨端.position.y - 角.position.y) * t
        节点.push(Bodies.circle(x, y, 配置.主绳.节点半径, 绳参数))
      }
      return 节点
    }
    const 左延伸 = 构建延伸(左角, 主跨[0], 配置.侧绳.左节数)
    // 右延伸需 reverse：构建延伸从「角」向「主跨端」插值（x 递减），而右链在数组中的顺序是
    // 主跨端 → 角（x 递增），若直接拼接会导致右段 x 先增后减、绳索在此自折（179° 折返）——正是右端「两段绳」伪影的隐藏根因。
    // 左延伸因数组顺序恰为 角→主跨端 无需反转；右延伸必须反转以保证整链 x 单调、无自折。
    const 右延伸 = 构建延伸(右角, 主跨[节点数 - 1], 配置.侧绳.右节数).reverse()
    this.主绳节点 = [左角, ...左延伸, ...主跨, ...右延伸, 右角]

    const 约束列表: Matter.Constraint[] = []
    const 间距 = (a: Matter.Body, b: Matter.Body) =>
      Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)
    // 相邻连续约束（全链统一 stiffness 1）
    for (let i = 0; i < this.主绳节点.length - 1; i++) {
      约束列表.push(
        Constraint.create({
          bodyA: this.主绳节点[i],
          bodyB: this.主绳节点[i + 1],
          length: 间距(this.主绳节点[i], this.主绳节点[i + 1]),
          stiffness: 1,
        })
      )
    }
    // 跳节点约束 i→i+2（全链抗拉伸，沿用主绳原方案）
    for (let i = 0; i + 配置.主绳.跳节点跨度 < this.主绳节点.length; i++) {
      约束列表.push(
        Constraint.create({
          bodyA: this.主绳节点[i],
          bodyB: this.主绳节点[i + 配置.主绳.跳节点跨度],
          length: 间距(this.主绳节点[i], this.主绳节点[i + 配置.主绳.跳节点跨度]),
          stiffness: 配置.主绳.跳节点刚度,
        })
      )
    }

    // 四组吊绳 + 便签
    const 便签宽 = 钳制(视口.宽 * 配置.便签.宽占比, 配置.便签.最小宽, 配置.便签.最大宽)
    const 便签高 = 便签宽 * 配置.便签.高宽比
    const 碰宽 = 便签宽 * 配置.便签.碰撞体缩放
    const 碰高 = 便签高 * 配置.便签.碰撞体缩放
    const 吊绳总长 = 配置.吊绳.节数 * 配置.吊绳.段长

    配置.吊点比例.forEach((比例, 索引) => {
      // 统一为单链后主跨位于索引 [左节数 .. 左节数+(节点数-1)]，吊点须加偏移（否则便签挂错节点→穿模）
      const 主跨起点 = 配置.侧绳.左节数
      const 吊点 = this.主绳节点[主跨起点 + Math.round(比例 * (节点数 - 1))]
      const 链: Matter.Body[] = []
      for (let j = 0; j < 配置.吊绳.节数; j++) {
        链.push(Bodies.circle(吊点.position.x, 吊点.position.y + (j + 1) * 配置.吊绳.段长, 配置.主绳.节点半径, 绳参数))
      }
      const 静止角 = (配置.便签.静止角列表Deg[索引 % 配置.便签.静止角列表Deg.length] * Math.PI) / 180
      const 便签刚体 = Bodies.rectangle(吊点.position.x, 吊点.position.y + 吊绳总长 + 碰高 / 2, 碰宽, 碰高, {
        density: 配置.便签.密度,
        frictionAir: 配置.便签.空气摩擦,
        angle: 静止角,
        collisionFilter: 签碰,
      })
      约束列表.push(Constraint.create({ bodyA: 吊点, bodyB: 链[0], length: 配置.吊绳.段长, stiffness: 1 }))
      for (let j = 0; j < 链.length - 1; j++) {
        约束列表.push(Constraint.create({ bodyA: 链[j], bodyB: 链[j + 1], length: 配置.吊绳.段长, stiffness: 1 }))
      }
      约束列表.push(
        Constraint.create({
          bodyA: 链[链.length - 1],
          bodyB: 便签刚体,
          pointB: { x: 0, y: -碰高 / 2 },
          length: 0,
          stiffness: 1,
          damping: 0.1,
        })
      )
      Composite.add(this.engine.world, [...链, 便签刚体])
      this.挂件列表.push({ 吊点节点: 吊点, 吊绳节点: 链, 便签刚体, 便签宽, 便签高 })
    })

    Composite.add(this.engine.world, [...this.主绳节点, ...约束列表])

    // 预沉降：让负载下垂在首帧前完成，避免入场时便签集体下坠
    for (let i = 0; i < 配置.求解.预沉降步数; i++) {
      Engine.update(this.engine, 配置.求解.固定步长Ms)
    }
    // 沉降残余摆动清零：保留沉降后的位置，从静止开始进入首帧
    for (const 刚体 of Composite.allBodies(this.engine.world)) {
      Body.setVelocity(刚体, { x: 0, y: 0 })
      Body.setAngularVelocity(刚体, 0)
    }
  }

  get 便签数量(): number {
    return this.挂件列表.length
  }

  登记风源(x: number, y: number, 速度x: number, 速度y: number, 强度: number): void {
    const 风 = 晾衣架配置.风
    const 速率 = Math.hypot(速度x, 速度y)
    if (速率 < 风.最小速度) return
    const 缩放 = 速率 > 风.最大速度 ? 风.最大速度 / 速率 : 1
    this.风源队列.push({
      x,
      y,
      速度x: 速度x * 缩放,
      速度y: 速度y * 缩放,
      强度,
      剩余帧: 风.有效期帧数,
    })
  }

  private 施加风力(刚体: Matter.Body): void {
    const 风 = 晾衣架配置.风
    for (const 源 of this.风源队列) {
      const dx = 刚体.position.x - 源.x
      const dy = 刚体.position.y - 源.y
      const 距离 = Math.hypot(dx, dy)
      if (距离 >= 风.影响半径 || 源.强度 <= 0) continue
      const 衰减 = (1 - 距离 / 风.影响半径) ** 2
      const 径向X = 距离 > 0.001 ? dx / 距离 : 0
      const 径向Y = 距离 > 0.001 ? dy / 距离 : 0
      const 速率 = Math.hypot(源.速度x, 源.速度y)
      Body.applyForce(刚体, 刚体.position, {
        x: 源.强度 * 衰减 * (源.速度x * 风.速度系数 + 径向X * 速率 * 风.径向系数),
        y: 源.强度 * 衰减 * (源.速度y * 风.速度系数 + 径向Y * 速率 * 风.径向系数),
      })
    }
  }

  步进(): void {
    this.施加滚动力()
    if (this.风源队列.length > 0) {
      // 整根银绳已是单一节点数组（含两端静态角点，isStatic 守卫自动跳过），单次遍历即可
      for (const 节点 of this.主绳节点) {
        if (!节点.isStatic) this.施加风力(节点)
      }
      for (const 挂件 of this.挂件列表) {
        for (const 节点 of 挂件.吊绳节点) {
          this.施加风力(节点)
        }
        this.施加风力(挂件.便签刚体)
      }
      for (const 源 of this.风源队列) {
        源.剩余帧 -= 1
      }
      this.风源队列 = this.风源队列.filter((源) => 源.剩余帧 > 0)
    }
    Engine.update(this.engine, 晾衣架配置.求解.固定步长Ms)
  }

  获取快照(): 晾衣架快照 {
    return {
      主绳: this.主绳节点.map((n) => ({ x: n.position.x, y: n.position.y })),
      吊绳: this.挂件列表.map((挂件) => [
        { x: 挂件.吊点节点.position.x, y: 挂件.吊点节点.position.y },
        ...挂件.吊绳节点.map((n) => ({ x: n.position.x, y: n.position.y })),
      ]),
      便签: this.挂件列表.map((挂件) => ({
        x: 挂件.便签刚体.position.x,
        y: 挂件.便签刚体.position.y,
        角度: 挂件.便签刚体.angle,
        宽: 挂件.便签宽,
        高: 挂件.便签高,
      })),
    }
  }

  获取刚体检视(): 晾衣架检视 {
    return {
      世界刚体总数: Composite.allBodies(this.engine.world).length,
      主绳节点: this.主绳节点.map(检视项),
      吊绳节点: this.挂件列表.flatMap((挂件) => 挂件.吊绳节点.map(检视项)),
      便签: this.挂件列表.map((挂件) => 检视项(挂件.便签刚体)),
    }
  }

  // 仅供单元测试驱碰撞行为使用
  调试位移便签(索引: number, x: number, y: number): void {
    const 挂件 = this.挂件列表[索引]
    if (!挂件) return
    Body.setPosition(挂件.便签刚体, { x, y })
  }

  /**
   * 登记页面滚动产生的竖向速度（px/帧，正=向下滚）。引擎据此对便签施加带偏角的斜向力，
   * 并在滚动停止后自动清零（见 步进 的静默窗口判定），使便签获得“被赋予上下力”的惯性观感。
   */
  登记滚动力(速度Y: number): void {
    const 上限 = 晾衣架配置.滚动.最大速度
    this.滚动速度Y = Math.max(-上限, Math.min(上限, 速度Y))
    this.最后滚动时间 = (typeof performance !== 'undefined' ? performance.now() : Date.now())
  }

  private 施加滚动力(): void {
    const 配置 = 晾衣架配置.滚动
    // 静默窗口：距上次滚动过久 → 判定已停，清零残留力，杜绝离屏期间累积的力在回视时突跳
    const 现在 = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (现在 - this.最后滚动时间 > 配置.静默窗口Ms) {
      this.滚动速度Y = 0
      return
    }
    if (Math.abs(this.滚动速度Y) <= 0.01) {
      this.滚动速度Y = 0
      return
    }
    const 速 = this.滚动速度Y
    const 符号 = Math.sign(速) || 0
    const 方向 = 配置.水平方向
    const 因子 = 配置.力度因子
    for (let i = 0; i < this.挂件列表.length; i++) {
      const 挂件 = this.挂件列表[i]
      // 每便签受力大小：基础滚动速度 × 系数（已减半）× 每签微差因子，避免“大小都一样”
      const 本签力大小 = Math.abs(速) * 配置.系数 * (因子[i % 因子.length] ?? 1)
      // 垂直“上下力”：向下滚→向下、向上滚→向上（用户认可的观感），大小随每签因子微差
      const fy = 符号 * 本签力大小
      // 水平“偏左偏右”分量：方向随便签交替（[1,-1,1,-1]），使每张便签受力方向各不相同
      const fx = 符号 * 本签力大小 * 配置.水平权重 * (方向[i % 方向.length] ?? 0)
      Body.applyForce(挂件.便签刚体, 挂件.便签刚体.position, { x: fx, y: fy })
      for (const 节点 of 挂件.吊绳节点) {
        Body.applyForce(节点, 节点.position, { x: fx * 配置.吊绳权重, y: fy * 配置.吊绳权重 })
      }
    }
  }

  销毁(): void {
    World.clear(this.engine.world, false)
    Engine.clear(this.engine)
    this.主绳节点.length = 0
    this.挂件列表.length = 0
    this.风源队列 = []
  }
}
