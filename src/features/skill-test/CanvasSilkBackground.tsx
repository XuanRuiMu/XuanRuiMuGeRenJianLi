import { useEffect, useRef } from 'react'

interface CanvasSilkProps {
  className?: string
  variant: 'perlin' | 'curl' | 'wavefield' | 'fabric' | 'particles'
}

export function CanvasSilkBackground({ className, variant }: CanvasSilkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    let animationId: number
    let time = 0
    const width = (canvas.width = canvas.offsetWidth)
    const height = (canvas.height = canvas.offsetHeight)

    // Perlin noise implementation
    const perm = new Array(512)
    const grad3 = [
      [1, 1, 0],
      [-1, 1, 0],
      [1, -1, 0],
      [-1, -1, 0],
      [1, 0, 1],
      [-1, 0, 1],
      [1, 0, -1],
      [-1, 0, -1],
      [0, 1, 1],
      [0, -1, 1],
      [0, 1, -1],
      [0, -1, -1],
    ]

    for (let i = 0; i < 256; i++) perm[i] = i
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[perm[i], perm[j]] = [perm[j], perm[i]]
    }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i]

    function perlin2d(x: number, y: number): number {
      const X = Math.floor(x) & 255
      const Y = Math.floor(y) & 255
      x -= Math.floor(x)
      y -= Math.floor(y)
      const u = x * x * (3 - 2 * x)
      const v = y * y * (3 - 2 * y)
      const A = perm[X] + Y
      const B = perm[X + 1] + Y
      const n00 = grad3[perm[A] % 12][0] * x + grad3[perm[A] % 12][1] * y
      const n01 = grad3[perm[A + 1] % 12][0] * x + grad3[perm[A + 1] % 12][1] * (y - 1)
      const n10 = grad3[perm[B] % 12][0] * (x - 1) + grad3[perm[B] % 12][1] * y
      const n11 = grad3[perm[B + 1] % 12][0] * (x - 1) + grad3[perm[B + 1] % 12][1] * (y - 1)
      const x1 = n00 + u * (n10 - n00)
      const x2 = n01 + u * (n11 - n01)
      return x1 + v * (x2 - x1)
    }

    function fbm(x: number, y: number, octaves: number = 4): number {
      let value = 0
      let amplitude = 0.5
      let frequency = 1
      for (let i = 0; i < octaves; i++) {
        value += amplitude * perlin2d(x * frequency, y * frequency)
        amplitude *= 0.5
        frequency *= 2
      }
      return value
    }

    const particles: { x: number; y: number; vx: number; vy: number; size: number; hue: number }[] = []
    if (variant === 'particles') {
      for (let i = 0; i < 150; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          hue: Math.random() * 60 + 200,
        })
      }
    }

    function render() {
      time += 0.016
      ctx.clearRect(0, 0, width, height)

      if (variant === 'perlin') {
        // Perlin noise silk
        const imageData = ctx.createImageData(width, height)
        const data = imageData.data
        const scale = 0.008

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const nx = x * scale
            const ny = y * scale
            let n = fbm(nx + time * 0.1, ny + time * 0.05)
            n += 0.5 * fbm(nx * 2 + time * 0.2, ny * 2 - time * 0.1)
            n += 0.25 * fbm(nx * 4 - time * 0.15, ny * 4 + time * 0.1)
            n = (n + 1) * 0.5

            // Silk color mapping - white/cream tones
            const brightness = 0.85 + n * 0.12
            const warmth = 0.95 + Math.sin(n * 3 + time) * 0.02

            const idx = (y * width + x) * 4
            data[idx] = Math.min(255, 255 * brightness * warmth)
            data[idx + 1] = Math.min(255, 255 * brightness * 0.98)
            data[idx + 2] = Math.min(255, 255 * brightness * 0.95)
            data[idx + 3] = 255
          }
        }
        ctx.putImageData(imageData, 0, 0)
      } else if (variant === 'curl') {
        // Curl noise silk
        ctx.fillStyle = '#f8f9fb'
        ctx.fillRect(0, 0, width, height)

        const lines = 60
        for (let i = 0; i < lines; i++) {
          const y = (i / lines) * height
          ctx.beginPath()
          ctx.moveTo(0, y)
          for (let x = 0; x <= width; x += 5) {
            const n = fbm(x * 0.005, y * 0.003 + time * 0.5)
            const offset = Math.sin(n * 10 + time) * 30
            ctx.lineTo(x, y + offset)
          }
          const alpha = 0.03 + 0.02 * Math.sin(i * 0.5 + time)
          ctx.strokeStyle = `rgba(200, 200, 220, ${alpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      } else if (variant === 'wavefield') {
        // Wave field silk
        ctx.fillStyle = '#f8f9fb'
        ctx.fillRect(0, 0, width, height)

        const cols = 40
        const rows = 30
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const x = (i / cols) * width
            const y = (j / rows) * height
            const n = fbm(x * 0.003, y * 0.003 + time * 0.3)
            const radius = 8 + n * 20
            const alpha = 0.02 + n * 0.03
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(180, 190, 210, ${alpha})`
            ctx.fill()
          }
        }
      } else if (variant === 'fabric') {
        // Fabric texture
        ctx.fillStyle = '#f8f9fb'
        ctx.fillRect(0, 0, width, height)

        // Warp threads
        ctx.strokeStyle = 'rgba(200,200,220,0.04)'
        ctx.lineWidth = 0.5
        for (let x = 0; x < width; x += 3) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          for (let y = 0; y <= height; y += 10) {
            const n = fbm(x * 0.01, y * 0.005 + time * 0.2)
            ctx.lineTo(x + Math.sin(n * 5 + time) * 2, y)
          }
          ctx.stroke()
        }
        // Weft threads
        for (let y = 0; y < height; y += 3) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          for (let x = 0; x <= width; x += 10) {
            const n = fbm(x * 0.005, y * 0.01 - time * 0.15)
            ctx.lineTo(x, y + Math.sin(n * 5 - time) * 2)
          }
          ctx.stroke()
        }
      } else if (variant === 'particles') {
        // Silk particles
        ctx.fillStyle = '#f8f9fb'
        ctx.fillRect(0, 0, width, height)

        for (const p of particles) {
          // Update position with flow field
          const n = fbm(p.x * 0.002, p.y * 0.002 + time * 0.1)
          const angle = n * Math.PI * 2
          p.vx += Math.cos(angle) * 0.01
          p.vy += Math.sin(angle) * 0.01
          p.vx *= 0.98
          p.vy *= 0.98
          p.x += p.vx
          p.y += p.vy

          // Wrap around
          if (p.x < 0) p.x = width
          if (p.x > width) p.x = 0
          if (p.y < 0) p.y = height
          if (p.y > height) p.y = 0

          // Draw
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          const alpha = 0.1 + 0.05 * Math.sin(time * 2 + p.hue)
          ctx.fillStyle = `hsla(${p.hue}, 20%, 95%, ${alpha})`
          ctx.fill()
        }
      }

      animationId = requestAnimationFrame(render)
    }

    const handleResize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    window.addEventListener('resize', handleResize)
    render()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [variant])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', background: '#f8f9fb' }}
      aria-hidden="true"
    />
  )
}
