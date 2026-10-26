export interface 丝绸画布选项 {
  着色器代码: string
  uniforms?: Record<string, number | number[]>
}

const 顶点着色器源码 = `#version 300 es
  precision highp float;
  in vec2 a_position;
  out vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

export class 丝绸画布渲染器 {
  readonly 画布: HTMLCanvasElement
  private 绘图上下文: WebGL2RenderingContext
  private 程序: WebGLProgram
  private 顶点数组: WebGLVertexArrayObject
  private 位置缓冲: WebGLBuffer
  private 顶点着色器: WebGLShader
  private 片元着色器: WebGLShader
  private 分辨率变量: WebGLUniformLocation | null
  private 时间变量: WebGLUniformLocation | null
  private 鼠标变量: WebGLUniformLocation | null
  private 日期变量: WebGLUniformLocation | null
  private 统一变量引用: Record<string, number | number[]>
  private 变量位置表: Record<string, WebGLUniformLocation | null> = {}
  private 帧编号: number | null = null
  private 起始时刻 = 0
  private 运行中 = false
  private 已释放 = false
  private 鼠标横坐标 = 0
  private 鼠标纵坐标 = 0
  private 鼠标按下 = false

  constructor(选项: 丝绸画布选项) {
    this.画布 = document.createElement('canvas')
    this.统一变量引用 = 选项.uniforms ?? {}

    const 绘图上下文 = this.画布.getContext('webgl2', { alpha: true, antialias: true })
    if (!绘图上下文) throw new Error('WebGL2 not supported')
    this.绘图上下文 = 绘图上下文

    const 片元源码 = `#version 300 es
      precision highp float;
      in vec2 v_uv;
      out vec4 fragColor;
      uniform vec3 iResolution;
      uniform float iTime;
      uniform vec4 iMouse;
      uniform vec4 iDate;
      ${选项.着色器代码}
      void main() {
        mainImage(fragColor, gl_FragCoord.xy);
      }
    `

    this.顶点着色器 = this.创建着色器(绘图上下文.VERTEX_SHADER, 顶点着色器源码)
    this.片元着色器 = this.创建着色器(绘图上下文.FRAGMENT_SHADER, 片元源码)
    this.程序 = this.创建程序(this.顶点着色器, this.片元着色器)

    this.位置缓冲 = 绘图上下文.createBuffer()!
    绘图上下文.bindBuffer(绘图上下文.ARRAY_BUFFER, this.位置缓冲)
    绘图上下文.bufferData(
      绘图上下文.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      绘图上下文.STATIC_DRAW
    )

    const 位置变量 = 绘图上下文.getAttribLocation(this.程序, 'a_position')
    this.分辨率变量 = 绘图上下文.getUniformLocation(this.程序, 'iResolution')
    this.时间变量 = 绘图上下文.getUniformLocation(this.程序, 'iTime')
    this.鼠标变量 = 绘图上下文.getUniformLocation(this.程序, 'iMouse')
    this.日期变量 = 绘图上下文.getUniformLocation(this.程序, 'iDate')

    this.顶点数组 = 绘图上下文.createVertexArray()!
    绘图上下文.bindVertexArray(this.顶点数组)
    绘图上下文.enableVertexAttribArray(位置变量)
    绘图上下文.vertexAttribPointer(位置变量, 2, 绘图上下文.FLOAT, false, 0, 0)

    this.调整尺寸()
  }

  设置统一变量(统一变量: Record<string, number | number[]>) {
    this.统一变量引用 = 统一变量
  }

  设置鼠标位置(x: number, y: number, 向下: boolean) {
    this.鼠标横坐标 = x
    this.鼠标纵坐标 = y
    this.鼠标按下 = 向下
  }

  调整尺寸() {
    const w = Math.max(1, window.innerWidth)
    const h = Math.max(1, window.innerHeight)
    if (this.画布.width !== w || this.画布.height !== h) {
      this.画布.width = w
      this.画布.height = h
    }
  }

  开始() {
    if (this.运行中 || this.已释放) return
    this.运行中 = true
    this.起始时刻 = performance.now()
    this.帧编号 = requestAnimationFrame(this.帧步进)
  }

  停止() {
    this.运行中 = false
    if (this.帧编号 !== null) {
      cancelAnimationFrame(this.帧编号)
      this.帧编号 = null
    }
  }

  释放() {
    this.已释放 = true
    this.停止()
    const 绘图上下文 = this.绘图上下文
    绘图上下文.deleteProgram(this.程序)
    绘图上下文.deleteShader(this.顶点着色器)
    绘图上下文.deleteShader(this.片元着色器)
    绘图上下文.deleteBuffer(this.位置缓冲)
    绘图上下文.deleteVertexArray(this.顶点数组)
  }

  private 创建着色器(type: number, 来源: string): WebGLShader {
    const 绘图上下文 = this.绘图上下文
    const 着色器 = 绘图上下文.createShader(type)!
    绘图上下文.shaderSource(着色器, 来源)
    绘图上下文.compileShader(着色器)
    if (!绘图上下文.getShaderParameter(着色器, 绘图上下文.COMPILE_STATUS)) {
      throw new Error(绘图上下文.getShaderInfoLog(着色器) || 'Shader compile error')
    }
    return 着色器
  }

  private 创建程序(顶点着色器: WebGLShader, 片元着色器: WebGLShader): WebGLProgram {
    const 绘图上下文 = this.绘图上下文
    const 程序 = 绘图上下文.createProgram()!
    绘图上下文.attachShader(程序, 顶点着色器)
    绘图上下文.attachShader(程序, 片元着色器)
    绘图上下文.linkProgram(程序)
    if (!绘图上下文.getProgramParameter(程序, 绘图上下文.LINK_STATUS)) {
      throw new Error(绘图上下文.getProgramInfoLog(程序) || 'Program link error')
    }
    return 程序
  }

  private 帧步进 = (时间: number) => {
    if (!this.运行中 || this.已释放) return
    const 绘图上下文 = this.绘图上下文
    const 已耗时 = (时间 - this.起始时刻) / 1000

    this.调整尺寸()

    绘图上下文.viewport(0, 0, this.画布.width, this.画布.height)
    绘图上下文.clearColor(0, 0, 0, 0)
    绘图上下文.clear(绘图上下文.COLOR_BUFFER_BIT)

    绘图上下文.useProgram(this.程序)
    绘图上下文.bindVertexArray(this.顶点数组)

    绘图上下文.uniform3f(this.分辨率变量, this.画布.width, this.画布.height, 1)
    绘图上下文.uniform1f(this.时间变量, 已耗时)
    绘图上下文.uniform4f(this.鼠标变量, this.鼠标横坐标, this.鼠标纵坐标, this.鼠标按下 ? 1 : 0, 0)
    绘图上下文.uniform4f(
      this.日期变量,
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate(),
      (时间 % 86400000) / 1000
    )

    for (const [name, value] of Object.entries(this.统一变量引用)) {
      if (!(name in this.变量位置表)) {
        this.变量位置表[name] = 绘图上下文.getUniformLocation(this.程序, name)
      }
      const 位置 = this.变量位置表[name]
      if (!位置) continue
      if (typeof value === 'number') {
        绘图上下文.uniform1f(位置, value)
      } else if (Array.isArray(value)) {
        if (value.length === 2) 绘图上下文.uniform2f(位置, value[0], value[1])
        else if (value.length === 3) 绘图上下文.uniform3f(位置, value[0], value[1], value[2])
        else if (value.length === 4) 绘图上下文.uniform4f(位置, value[0], value[1], value[2], value[3])
      }
    }

    绘图上下文.drawArrays(绘图上下文.TRIANGLES, 0, 6)
    this.帧编号 = requestAnimationFrame(this.帧步进)
  }
}
