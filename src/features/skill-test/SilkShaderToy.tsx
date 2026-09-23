import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface ShaderToyProps {
  shaderCode: string
  className?: string
  uniforms?: Record<string, number | number[]>
}

export function ShaderToy({ shaderCode, className, uniforms = {} }: ShaderToyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const uniformsRef = useRef(uniforms)
  const [error, setError] = useState<string | null>(null)

  useLayoutEffect(() => {
    uniformsRef.current = uniforms
  }, [uniforms])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true })
    if (!gl) {
      requestAnimationFrame(() => setError('WebGL2 not supported'))
      return
    }

    const canvasEl = canvas
    const glCtx = gl

    const vertexShaderSource = `#version 300 es
      precision highp float;
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const fragmentShaderSource = `#version 300 es
      precision highp float;
      in vec2 v_uv;
      out vec4 fragColor;

      uniform vec3 iResolution;
      uniform float iTime;
      uniform vec4 iMouse;
      uniform vec4 iDate;

      ${shaderCode}

      void main() {
        mainImage(fragColor, gl_FragCoord.xy);
      }
    `

    function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || 'Shader compile error')
      }
      return shader
    }

    function createProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader) {
      const program = gl.createProgram()!
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Program link error')
      }
      return program
    }

    let vs: WebGLShader
    let fs: WebGLShader
    let program: WebGLProgram

    try {
      vs = createShader(glCtx, glCtx.VERTEX_SHADER, vertexShaderSource)
      fs = createShader(glCtx, glCtx.FRAGMENT_SHADER, fragmentShaderSource)
      program = createProgram(glCtx, vs, fs)
    } catch (e) {
      const err = String(e)
      requestAnimationFrame(() => setError(err))
      return
    }

    const positionBuffer = glCtx.createBuffer()!
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, positionBuffer)
    glCtx.bufferData(
      glCtx.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      glCtx.STATIC_DRAW
    )

    const positionLocation = glCtx.getAttribLocation(program, 'a_position')
    const resolutionLocation = glCtx.getUniformLocation(program, 'iResolution')
    const timeLocation = glCtx.getUniformLocation(program, 'iTime')
    const mouseLocation = glCtx.getUniformLocation(program, 'iMouse')
    const dateLocation = glCtx.getUniformLocation(program, 'iDate')

    const uniformLocations: Record<string, WebGLUniformLocation | null> = {}

    const vao = glCtx.createVertexArray()!
    glCtx.bindVertexArray(vao)
    glCtx.enableVertexAttribArray(positionLocation)
    glCtx.vertexAttribPointer(positionLocation, 2, glCtx.FLOAT, false, 0, 0)

    let mouseX = 0
    let mouseY = 0
    let mouseDown = false

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasEl.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = rect.height - (e.clientY - rect.top)
    }

    const handleMouseDown = () => {
      mouseDown = true
    }
    const handleMouseUp = () => {
      mouseDown = false
    }

    canvasEl.addEventListener('mousemove', handleMouseMove)
    canvasEl.addEventListener('mousedown', handleMouseDown)
    canvasEl.addEventListener('mouseup', handleMouseUp)
    canvasEl.addEventListener('mouseleave', handleMouseUp)

    const startTime = performance.now()
    let animationId = 0

    function render(time: number) {
      const elapsed = (time - startTime) / 1000

      const dpr = window.devicePixelRatio || 1
      const rect = canvasEl.getBoundingClientRect()
      const targetWidth = Math.max(1, Math.floor(rect.width * dpr))
      const targetHeight = Math.max(1, Math.floor(rect.height * dpr))
      if (canvasEl.width !== targetWidth || canvasEl.height !== targetHeight) {
        canvasEl.width = targetWidth
        canvasEl.height = targetHeight
      }

      glCtx.viewport(0, 0, canvasEl.width, canvasEl.height)
      glCtx.clearColor(0, 0, 0, 0)
      glCtx.clear(glCtx.COLOR_BUFFER_BIT)

      glCtx.useProgram(program)
      glCtx.bindVertexArray(vao)

      glCtx.uniform3f(resolutionLocation, canvasEl.width, canvasEl.height, 1)
      glCtx.uniform1f(timeLocation, elapsed)
      glCtx.uniform4f(mouseLocation, mouseX, mouseY, mouseDown ? 1 : 0, 0)
      glCtx.uniform4f(
        dateLocation,
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        new Date().getDate(),
        (time % 86400000) / 1000
      )

      const currentUniforms = uniformsRef.current
      for (const [name, value] of Object.entries(currentUniforms)) {
        if (!(name in uniformLocations)) {
          uniformLocations[name] = glCtx.getUniformLocation(program, name)
        }
        const location = uniformLocations[name]
        if (!location) continue
        if (typeof value === 'number') {
          glCtx.uniform1f(location, value)
        } else if (Array.isArray(value)) {
          if (value.length === 2) glCtx.uniform2f(location, value[0], value[1])
          else if (value.length === 3) glCtx.uniform3f(location, value[0], value[1], value[2])
          else if (value.length === 4) glCtx.uniform4f(location, value[0], value[1], value[2], value[3])
        }
      }

      glCtx.drawArrays(glCtx.TRIANGLES, 0, 6)
      animationId = requestAnimationFrame(render)
    }

    animationId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationId)
      canvasEl.removeEventListener('mousemove', handleMouseMove)
      canvasEl.removeEventListener('mousedown', handleMouseDown)
      canvasEl.removeEventListener('mouseup', handleMouseUp)
      canvasEl.removeEventListener('mouseleave', handleMouseUp)
      glCtx.deleteProgram(program)
      glCtx.deleteShader(vs)
      glCtx.deleteShader(fs)
      glCtx.deleteBuffer(positionBuffer)
      glCtx.deleteVertexArray(vao)
    }
  }, [shaderCode])

  if (error) {
    return (
      <div className={className} style={{ color: 'red', padding: '1rem' }}>
        {error}
      </div>
    )
  }

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%', display: 'block' }} />
}
