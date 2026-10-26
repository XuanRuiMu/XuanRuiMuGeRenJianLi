import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { t } from '../../国际化/翻译'

interface 着色器属性 {
  着色器代码: string
  className?: string
  uniforms?: Record<string, number | number[]>
}

export function SiChouZhaoSeQi({ 着色器代码, className, uniforms = {} }: 着色器属性) {
  const 画布引用 = useRef<HTMLCanvasElement>(null)
  const 统一变量引用 = useRef(uniforms)
  const [error, 设置错误] = useState<string | null>(null)

  useLayoutEffect(() => {
    统一变量引用.current = uniforms
  }, [uniforms])

  useEffect(() => {
    const 画布 = 画布引用.current
    if (!画布) return

    const 绘图上下文 = 画布.getContext('webgl2', { alpha: true, antialias: true })
    if (!绘图上下文) {
      requestAnimationFrame(() => 设置错误(t('skillTest.error.webgl2')))
      return
    }

    const 画布元素 = 画布
    const 绘图上下文实例 = 绘图上下文

    const 顶点着色器源码 = `#version 300 es
      precision highp float;
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const 片元着色器源码 = `#version 300 es
      precision highp float;
      in vec2 v_uv;
      out vec4 fragColor;

      uniform vec3 iResolution;
      uniform float iTime;
      uniform vec4 iMouse;
      uniform vec4 iDate;

      ${着色器代码}

      void main() {
        mainImage(fragColor, gl_FragCoord.xy);
      }
    `

    function 创建着色器(绘图上下文实例: WebGL2RenderingContext, type: number, 来源: string) {
      const 着色器 = 绘图上下文实例.createShader(type)!
      绘图上下文实例.shaderSource(着色器, 来源)
      绘图上下文实例.compileShader(着色器)
      if (!绘图上下文实例.getShaderParameter(着色器, 绘图上下文实例.COMPILE_STATUS)) {
        throw new Error(绘图上下文实例.getShaderInfoLog(着色器) || 'Shader compile error')
      }
      return 着色器
    }

    function 创建程序(绘图上下文实例: WebGL2RenderingContext, 顶点着色器: WebGLShader, 片元着色器: WebGLShader) {
      const 程序 = 绘图上下文实例.createProgram()!
      绘图上下文实例.attachShader(程序, 顶点着色器)
      绘图上下文实例.attachShader(程序, 片元着色器)
      绘图上下文实例.linkProgram(程序)
      if (!绘图上下文实例.getProgramParameter(程序, 绘图上下文实例.LINK_STATUS)) {
        throw new Error(绘图上下文实例.getProgramInfoLog(程序) || 'Program link error')
      }
      return 程序
    }

    let 顶点着色器: WebGLShader
    let 片元着色器: WebGLShader
    let 程序: WebGLProgram

    try {
      顶点着色器 = 创建着色器(绘图上下文实例, 绘图上下文实例.VERTEX_SHADER, 顶点着色器源码)
      片元着色器 = 创建着色器(绘图上下文实例, 绘图上下文实例.FRAGMENT_SHADER, 片元着色器源码)
      程序 = 创建程序(绘图上下文实例, 顶点着色器, 片元着色器)
    } catch (e) {
      console.error('丝绸着色器初始化失败：', e)
      requestAnimationFrame(() => 设置错误(t('skillTest.error.shader')))
      return
    }

    const 位置缓冲 = 绘图上下文实例.createBuffer()!
    绘图上下文实例.bindBuffer(绘图上下文实例.ARRAY_BUFFER, 位置缓冲)
    绘图上下文实例.bufferData(
      绘图上下文实例.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      绘图上下文实例.STATIC_DRAW
    )

    const 位置变量 = 绘图上下文实例.getAttribLocation(程序, 'a_position')
    const 分辨率变量 = 绘图上下文实例.getUniformLocation(程序, 'iResolution')
    const 时间变量 = 绘图上下文实例.getUniformLocation(程序, 'iTime')
    const 鼠标变量 = 绘图上下文实例.getUniformLocation(程序, 'iMouse')
    const 日期变量 = 绘图上下文实例.getUniformLocation(程序, 'iDate')

    const 变量位置表: Record<string, WebGLUniformLocation | null> = {}

    const 顶点数组 = 绘图上下文实例.createVertexArray()!
    绘图上下文实例.bindVertexArray(顶点数组)
    绘图上下文实例.enableVertexAttribArray(位置变量)
    绘图上下文实例.vertexAttribPointer(位置变量, 2, 绘图上下文实例.FLOAT, false, 0, 0)

    let 鼠标横坐标 = 0
    let 鼠标纵坐标 = 0
    let 鼠标按下 = false

    const 处理鼠标移动 = (e: MouseEvent) => {
      const 矩形 = 画布元素.getBoundingClientRect()
      鼠标横坐标 = e.clientX - 矩形.left
      鼠标纵坐标 = 矩形.height - (e.clientY - 矩形.top)
    }

    const 处理鼠标按下 = () => {
      鼠标按下 = true
    }
    const 处理鼠标抬起 = () => {
      鼠标按下 = false
    }

    画布元素.addEventListener('mousemove', 处理鼠标移动)
    画布元素.addEventListener('mousedown', 处理鼠标按下)
    画布元素.addEventListener('mouseup', 处理鼠标抬起)
    画布元素.addEventListener('mouseleave', 处理鼠标抬起)

    const 起始时刻 = performance.now()
    let 动画编号 = 0

    function 绘制(时间: number) {
      const 已耗时 = (时间 - 起始时刻) / 1000

      const 像素比 = window.devicePixelRatio || 1
      const 矩形 = 画布元素.getBoundingClientRect()
      const 目标宽度 = Math.max(1, Math.floor(矩形.width * 像素比))
      const 目标高度 = Math.max(1, Math.floor(矩形.height * 像素比))
      if (画布元素.width !== 目标宽度 || 画布元素.height !== 目标高度) {
        画布元素.width = 目标宽度
        画布元素.height = 目标高度
      }

      绘图上下文实例.viewport(0, 0, 画布元素.width, 画布元素.height)
      绘图上下文实例.clearColor(0, 0, 0, 0)
      绘图上下文实例.clear(绘图上下文实例.COLOR_BUFFER_BIT)

      绘图上下文实例.useProgram(程序)
      绘图上下文实例.bindVertexArray(顶点数组)

      绘图上下文实例.uniform3f(分辨率变量, 画布元素.width, 画布元素.height, 1)
      绘图上下文实例.uniform1f(时间变量, 已耗时)
      绘图上下文实例.uniform4f(鼠标变量, 鼠标横坐标, 鼠标纵坐标, 鼠标按下 ? 1 : 0, 0)
      绘图上下文实例.uniform4f(
        日期变量,
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        new Date().getDate(),
        (时间 % 86400000) / 1000
      )

      const 当前变量 = 统一变量引用.current
      for (const [name, value] of Object.entries(当前变量)) {
        if (!(name in 变量位置表)) {
          变量位置表[name] = 绘图上下文实例.getUniformLocation(程序, name)
        }
        const 位置 = 变量位置表[name]
        if (!位置) continue
        if (typeof value === 'number') {
          绘图上下文实例.uniform1f(位置, value)
        } else if (Array.isArray(value)) {
          if (value.length === 2) 绘图上下文实例.uniform2f(位置, value[0], value[1])
          else if (value.length === 3) 绘图上下文实例.uniform3f(位置, value[0], value[1], value[2])
          else if (value.length === 4) 绘图上下文实例.uniform4f(位置, value[0], value[1], value[2], value[3])
        }
      }

      绘图上下文实例.drawArrays(绘图上下文实例.TRIANGLES, 0, 6)
      动画编号 = requestAnimationFrame(绘制)
    }

    动画编号 = requestAnimationFrame(绘制)

    return () => {
      cancelAnimationFrame(动画编号)
      画布元素.removeEventListener('mousemove', 处理鼠标移动)
      画布元素.removeEventListener('mousedown', 处理鼠标按下)
      画布元素.removeEventListener('mouseup', 处理鼠标抬起)
      画布元素.removeEventListener('mouseleave', 处理鼠标抬起)
      绘图上下文实例.deleteProgram(程序)
      绘图上下文实例.deleteShader(顶点着色器)
      绘图上下文实例.deleteShader(片元着色器)
      绘图上下文实例.deleteBuffer(位置缓冲)
      绘图上下文实例.deleteVertexArray(顶点数组)
    }
  }, [着色器代码])

  if (error) {
    return (
      <div className={className} style={{ color: 'red', padding: '1rem' }}>
        {error}
      </div>
    )
  }

  return <canvas ref={画布引用} className={className} style={{ width: '100%', height: '100%', display: 'block' }} />
}
