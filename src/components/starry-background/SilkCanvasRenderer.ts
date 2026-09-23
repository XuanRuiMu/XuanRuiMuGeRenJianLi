/**
 * SilkCanvasRenderer — 独立 WebGL 丝绸背景渲染器。
 *
 * 从 SilkShaderToy 组件提取的纯 WebGL 渲染逻辑，不依赖 React。
 * 输出一个 canvas 元素，可被 InkRevealRenderer 作为遮罩源 drawImage。
 * 动画速度 0.5、柔化亮度 0.3 为浅色水墨屏最终选定参数。
 */

export interface SilkCanvasOptions {
  shaderCode: string
  uniforms?: Record<string, number | number[]>
}

const VERTEX_SHADER = `#version 300 es
  precision highp float;
  in vec2 a_position;
  out vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

export class SilkCanvasRenderer {
  readonly canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private vao: WebGLVertexArrayObject
  private positionBuffer: WebGLBuffer
  private vs: WebGLShader
  private fs: WebGLShader
  private resolutionLocation: WebGLUniformLocation | null
  private timeLocation: WebGLUniformLocation | null
  private mouseLocation: WebGLUniformLocation | null
  private dateLocation: WebGLUniformLocation | null
  private uniformsRef: Record<string, number | number[]>
  private uniformLocations: Record<string, WebGLUniformLocation | null> = {}
  private rafId: number | null = null
  private startTime = 0
  private running = false
  private disposed = false
  private mouseX = 0
  private mouseY = 0
  private mouseDown = false

  constructor(options: SilkCanvasOptions) {
    this.canvas = document.createElement('canvas')
    this.uniformsRef = options.uniforms ?? {}

    const gl = this.canvas.getContext('webgl2', { alpha: true, antialias: true })
    if (!gl) throw new Error('WebGL2 not supported')
    this.gl = gl

    const fragmentSource = `#version 300 es
      precision highp float;
      in vec2 v_uv;
      out vec4 fragColor;
      uniform vec3 iResolution;
      uniform float iTime;
      uniform vec4 iMouse;
      uniform vec4 iDate;
      ${options.shaderCode}
      void main() {
        mainImage(fragColor, gl_FragCoord.xy);
      }
    `

    this.vs = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER)
    this.fs = this.createShader(gl.FRAGMENT_SHADER, fragmentSource)
    this.program = this.createProgram(this.vs, this.fs)

    this.positionBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)

    const positionLocation = gl.getAttribLocation(this.program, 'a_position')
    this.resolutionLocation = gl.getUniformLocation(this.program, 'iResolution')
    this.timeLocation = gl.getUniformLocation(this.program, 'iTime')
    this.mouseLocation = gl.getUniformLocation(this.program, 'iMouse')
    this.dateLocation = gl.getUniformLocation(this.program, 'iDate')

    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    this.resize()
  }

  setUniforms(uniforms: Record<string, number | number[]>) {
    this.uniformsRef = uniforms
  }

  setMouse(x: number, y: number, down: boolean) {
    this.mouseX = x
    this.mouseY = y
    this.mouseDown = down
  }

  resize() {
    const w = Math.max(1, window.innerWidth)
    const h = Math.max(1, window.innerHeight)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  start() {
    if (this.running || this.disposed) return
    this.running = true
    this.startTime = performance.now()
    this.rafId = requestAnimationFrame(this.tick)
  }

  stop() {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  dispose() {
    this.disposed = true
    this.stop()
    const gl = this.gl
    gl.deleteProgram(this.program)
    gl.deleteShader(this.vs)
    gl.deleteShader(this.fs)
    gl.deleteBuffer(this.positionBuffer)
    gl.deleteVertexArray(this.vao)
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || 'Shader compile error')
    }
    return shader
  }

  private createProgram(vs: WebGLShader, fs: WebGLShader): WebGLProgram {
    const gl = this.gl
    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Program link error')
    }
    return program
  }

  private tick = (time: number) => {
    if (!this.running || this.disposed) return
    const gl = this.gl
    const elapsed = (time - this.startTime) / 1000

    this.resize()

    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)

    gl.uniform3f(this.resolutionLocation, this.canvas.width, this.canvas.height, 1)
    gl.uniform1f(this.timeLocation, elapsed)
    gl.uniform4f(this.mouseLocation, this.mouseX, this.mouseY, this.mouseDown ? 1 : 0, 0)
    gl.uniform4f(
      this.dateLocation,
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate(),
      (time % 86400000) / 1000
    )

    for (const [name, value] of Object.entries(this.uniformsRef)) {
      if (!(name in this.uniformLocations)) {
        this.uniformLocations[name] = gl.getUniformLocation(this.program, name)
      }
      const location = this.uniformLocations[name]
      if (!location) continue
      if (typeof value === 'number') {
        gl.uniform1f(location, value)
      } else if (Array.isArray(value)) {
        if (value.length === 2) gl.uniform2f(location, value[0], value[1])
        else if (value.length === 3) gl.uniform3f(location, value[0], value[1], value[2])
        else if (value.length === 4) gl.uniform4f(location, value[0], value[1], value[2], value[3])
      }
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6)
    this.rafId = requestAnimationFrame(this.tick)
  }
}
