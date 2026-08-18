import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { ringBuffer } from './globals'

export function RenderProbe(): null {
  const { gl } = useThree()
  const frameCount = useRef(0)

  useFrame(() => {
    frameCount.current++
    if (frameCount.current % 300 === 0) {
      const info = gl.info
      ringBuffer.write('debug', 0, 'R3F render stats', {
        frameCount: frameCount.current,
        drawCalls: info.render?.calls ?? 0,
        triangles: info.render?.triangles ?? 0,
        textures: info.memory?.textures ?? 0,
        geometries: info.memory?.geometries ?? 0,
      })
    }
  })

  useEffect(() => {
    ringBuffer.write('info', 0, 'R3F scene mounted', {
      renderer: gl.domElement.tagName,
      size: `${gl.domElement.width}x${gl.domElement.height}`,
    })

    const canvas = gl.domElement
    const onLost = () => ringBuffer.write('warn', 3, 'WebGL context lost')
    const onRestored = () => ringBuffer.write('info', 3, 'WebGL context restored')
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [gl])

  return null
}
