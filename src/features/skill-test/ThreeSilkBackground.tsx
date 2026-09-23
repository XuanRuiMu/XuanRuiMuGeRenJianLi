import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface ThreeSilkProps {
  className?: string
  color?: string
  speed?: number
  scale?: number
  rotation?: number
  noiseIntensity?: number
}

export function ThreeSilkBackground({
  className,
  color = '#ffffff',
  speed = 0.3,
  scale = 1.0,
  rotation = 0.0,
  noiseIntensity = 0.5,
}: ThreeSilkProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 1

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uRotation;
      uniform float uNoiseIntensity;

      const float e = 2.71828182845904523536;

      float noise(vec2 texCoord) {
        vec2 r = e * sin(e * texCoord);
        return fract(r.x * r.y * (1.0 + texCoord.x));
      }

      vec2 rotateUvs(vec2 uv, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return mat2(c, -s, s, c) * uv;
      }

      void main() {
        float rnd = noise(gl_FragCoord.xy);
        vec2 uv = rotateUvs(vUv * uScale, uRotation);
        vec2 tex = uv;
        float t = uSpeed * uTime;
        tex.y += 0.03 * sin(8.0 * tex.x - t);

        float pattern = 0.6 +
          0.4 * sin(
            5.0 * (tex.x + tex.y + cos(3.0 * tex.x + 5.0 * tex.y) + 0.02 * t) +
            sin(20.0 * (tex.x + tex.y - 0.1 * t))
          );

        vec3 col = uColor * pattern - rnd / 15.0 * uNoiseIntensity;

        // Silk highlight effect
        float highlight = smoothstep(0.5, 0.8, pattern);
        col += highlight * 0.3 * uColor;

        gl_FragColor = vec4(col, 1.0);
      }
    `

    const uniforms = {
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uScale: { value: scale },
      uRotation: { value: rotation },
      uNoiseIntensity: { value: noiseIntensity },
      uColor: { value: new THREE.Color(color) },
    }

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    let animationId: number

    function animate(time: number) {
      uniforms.uTime.value = time * 0.001
      renderer.render(scene, camera)
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
    }
  }, [color, speed, scale, rotation, noiseIntensity])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
