import Matter from 'matter-js'

const { Engine, World: 世界, Bodies, Body, Composite, Constraint: 约束 } = Matter

export const 晾衣架配置 = {
  主绳: {
    节点数: 28,
    顶部Y: 28,
    边距比例: 0.045,
    边距最小: 16,
    边距最大: 48,
    悬垂深度: 36,
    节点半径: 20,
    密度: 0.002,
    空气摩擦: 0.05,
    跳节点跨度: 2,
    跳节点刚度: 1,
  },
  吊绳: {
    节数: 3,
    段长: 33.6,
  },
  侧绳: {
    左节数: 2,
    右节数: 2,
    段长: 28,
    密度: 0.002,
    空气摩擦: 0.05,
  },
  便签: {
    宽占比: 0.19,
    最小宽: 72,
    最大宽: 200,
    高宽比: 638 / 547,
    碰撞体缩放: 0.9,
    密度: 0.0014,
    空气摩擦: 0.012,
    静止角列表Deg: [-2.5, 1.8, -1.2, 2.2],
  },
  碰撞类: {
    便签: 0x0001,
    绳体: 0x0002,
  },
  吊点比例: [0.13, 0.375, 0.625, 0.87],
  风: {
    影响半径: 220,
    速度系数: 0.0011,
    径向系数: 0.0006,
    有效期帧数: 8,
    最小速度: 0.05,
    最大速度: 6,
  },
  滚动: {
    系数: 0.0008,
    最大速度: 80,
    水平权重: 0.5,
    水平方向: [1, -1, 1, -1],
    力度因子: [1.0, 0.85, 1.1, 0.9],
    衰减: 0.9,
    吊绳权重: 0.6,
    静默窗口Ms: 120,
  },
  求解: {
    约束迭代: 16,
    位置迭代: 16,
    速度迭代: 8,
    固定步长Ms: 1000 / 60,
    最大跳帧: 5,
    预沉降步数: 600,
  },
  重力Y: 1,
} as const

export interface 晾衣架视口 {
  宽: number
  高: number
  画布左X?: number
  画布宽?: number

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
  主绳: Array<{ x: number; y: number }>
  吊绳: Array<Array<{ x: number; y: number }>>
  便签: 便签位姿[]
}

export interface 刚体检视项 {
  x: number
  y: number
  vx: number
  vy: number
  是静态: boolean
  质量: number
  密度: number
  空气摩擦: number
  分类: number
  遮罩: number
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
    是静态: 刚体.isStatic,
    质量: 刚体.mass,
    密度: 刚体.density,
    空气摩擦: 刚体.frictionAir,
    分类: 刚体.collisionFilter.category ?? 0,
    遮罩: 刚体.collisionFilter.mask ?? 0,
  }
}

export class 晾衣架物理引擎 {
  private readonly 引擎: Matter.Engine
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
    this.引擎 = Engine.create()
    this.引擎.gravity.y = 配置.重力Y
    this.引擎.constraintIterations = 配置.求解.约束迭代
    this.引擎.positionIterations = 配置.求解.位置迭代
    this.引擎.velocityIterations = 配置.求解.速度迭代

    const 绳碰 = { group: 0, category: 配置.碰撞类.绳体, mask: 0 }
    const 签碰 = { group: 0, category: 配置.碰撞类.便签, mask: 配置.碰撞类.便签 }
    const 绳参数 = {
      density: 配置.主绳.密度,
      frictionAir: 配置.主绳.空气摩擦,
      collisionFilter: 绳碰,
    }

    const 节点数 = 配置.主绳.节点数
    const 边距X = 钳制(视口.宽 * 配置.主绳.边距比例, 配置.主绳.边距最小, 配置.主绳.边距最大)
    const 可用宽 = Math.max(视口.宽 - 2 * 边距X, 1)
    const 布局偏移 = 视口.布局偏移X ?? 0

    const 主跨: Matter.Body[] = []
    for (let i = 0; i < 节点数; i++) {
      const t = i / (节点数 - 1)
      const x = 布局偏移 + 边距X + t * 可用宽
      const y = 配置.主绳.顶部Y + 4 * 配置.主绳.悬垂深度 * t * (1 - t)
      主跨.push(Bodies.circle(x, y, 配置.主绳.节点半径, 绳参数))
    }

    const 锚Y = 配置.主绳.顶部Y
    const 左角 = Bodies.circle(this.画布左X, 锚Y, 配置.主绳.节点半径, { ...绳参数, isStatic: true })
    const 右角 = Bodies.circle(this.画布左X + this.画布宽, 锚Y, 配置.主绳.节点半径, { ...绳参数, isStatic: true })

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

    const 右延伸 = 构建延伸(右角, 主跨[节点数 - 1], 配置.侧绳.右节数).reverse()
    this.主绳节点 = [左角, ...左延伸, ...主跨, ...右延伸, 右角]

    const 约束列表: Matter.Constraint[] = []
    const 间距 = (a: Matter.Body, b: Matter.Body) =>
      Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)

    for (let i = 0; i < this.主绳节点.length - 1; i++) {
      约束列表.push(
        约束.create({
          bodyA: this.主绳节点[i],
          bodyB: this.主绳节点[i + 1],
          length: 间距(this.主绳节点[i], this.主绳节点[i + 1]),
          stiffness: 1,
        })
      )
    }

    for (let i = 0; i + 配置.主绳.跳节点跨度 < this.主绳节点.length; i++) {
      约束列表.push(
        约束.create({
          bodyA: this.主绳节点[i],
          bodyB: this.主绳节点[i + 配置.主绳.跳节点跨度],
          length: 间距(this.主绳节点[i], this.主绳节点[i + 配置.主绳.跳节点跨度]),
          stiffness: 配置.主绳.跳节点刚度,
        })
      )
    }

    const 便签宽 = 钳制(视口.宽 * 配置.便签.宽占比, 配置.便签.最小宽, 配置.便签.最大宽)
    const 便签高 = 便签宽 * 配置.便签.高宽比
    const 碰宽 = 便签宽 * 配置.便签.碰撞体缩放
    const 碰高 = 便签高 * 配置.便签.碰撞体缩放
    const 吊绳总长 = 配置.吊绳.节数 * 配置.吊绳.段长

    配置.吊点比例.forEach((比例, 索引) => {
      const 主跨起点 = 1 + 配置.侧绳.左节数
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
      约束列表.push(约束.create({ bodyA: 吊点, bodyB: 链[0], length: 配置.吊绳.段长, stiffness: 1 }))
      for (let j = 0; j < 链.length - 1; j++) {
        约束列表.push(约束.create({ bodyA: 链[j], bodyB: 链[j + 1], length: 配置.吊绳.段长, stiffness: 1 }))
      }
      约束列表.push(
        约束.create({
          bodyA: 链[链.length - 1],
          bodyB: 便签刚体,
          pointB: { x: 0, y: -碰高 / 2 },
          length: 0,
          stiffness: 1,
          damping: 0.1,
        })
      )
      Composite.add(this.引擎.world, [...链, 便签刚体])
      this.挂件列表.push({ 吊点节点: 吊点, 吊绳节点: 链, 便签刚体, 便签宽, 便签高 })
    })

    Composite.add(this.引擎.world, [...this.主绳节点, ...约束列表])

    for (let i = 0; i < 配置.求解.预沉降步数; i++) {
      Engine.update(this.引擎, 配置.求解.固定步长Ms)
    }

    for (const 刚体 of Composite.allBodies(this.引擎.world)) {
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
      const 横向增量 = 刚体.position.x - 源.x
      const 纵向增量 = 刚体.position.y - 源.y
      const 距离 = Math.hypot(横向增量, 纵向增量)
      if (距离 >= 风.影响半径 || 源.强度 <= 0) continue
      const 衰减 = (1 - 距离 / 风.影响半径) ** 2
      const 径向X = 距离 > 0.001 ? 横向增量 / 距离 : 0
      const 径向Y = 距离 > 0.001 ? 纵向增量 / 距离 : 0
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
    Engine.update(this.引擎, 晾衣架配置.求解.固定步长Ms)
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
      世界刚体总数: Composite.allBodies(this.引擎.world).length,
      主绳节点: this.主绳节点.map(检视项),
      吊绳节点: this.挂件列表.flatMap((挂件) => 挂件.吊绳节点.map(检视项)),
      便签: this.挂件列表.map((挂件) => 检视项(挂件.便签刚体)),
    }
  }

  调试位移便签(索引: number, x: number, y: number): void {
    const 挂件 = this.挂件列表[索引]
    if (!挂件) return
    Body.setPosition(挂件.便签刚体, { x, y })
  }

  登记滚动力(速度Y: number): void {
    const 上限 = 晾衣架配置.滚动.最大速度
    this.滚动速度Y = Math.max(-上限, Math.min(上限, 速度Y))
    this.最后滚动时间 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  }

  private 施加滚动力(): void {
    const 配置 = 晾衣架配置.滚动

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

      const 本签力大小 = Math.abs(速) * 配置.系数 * (因子[i % 因子.length] ?? 1)

      const fy = 符号 * 本签力大小

      const fx = 符号 * 本签力大小 * 配置.水平权重 * (方向[i % 方向.length] ?? 0)
      Body.applyForce(挂件.便签刚体, 挂件.便签刚体.position, { x: fx, y: fy })
      for (const 节点 of 挂件.吊绳节点) {
        Body.applyForce(节点, 节点.position, { x: fx * 配置.吊绳权重, y: fy * 配置.吊绳权重 })
      }
    }
  }

  销毁(): void {
    世界.clear(this.引擎.world, false)
    Engine.clear(this.引擎)
    this.主绳节点.length = 0
    this.挂件列表.length = 0
    this.风源队列 = []
  }
}
