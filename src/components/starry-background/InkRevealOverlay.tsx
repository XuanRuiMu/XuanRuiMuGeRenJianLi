import { useEffect, useRef } from 'react'
import { InkRevealRenderer } from './InkRevealRenderer'
import { SilkCanvasRenderer } from './SilkCanvasRenderer'
import { useIsDarkMode } from './useIsDarkMode'
import { useStarryUiStore } from '../../store/useStarryUiStore'

interface InkRevealOverlayProps {
  enabled?: boolean
}

// 水墨遮罩双主题均为满不透明实色：深色=墨黑与星空底色一致（擦开见星）；
// 浅色=动态丝绸遮罩（擦开见烈焰中的世界树）
const 墨色深 = '#05060f'

// 浅色丝绸遮罩着色器（与 skill-test 页 ShaderToy Classic Silk 同源）
const 丝绸着色器 = `
uniform float uSpeed;
uniform float uWaveAmp;
uniform float uWaveFreq;
uniform float uFabricScale;
uniform float uFabricIntensity;
uniform float uSilkFreq1;
uniform float uSilkFreq2;
uniform vec3  uHighlightColor;
uniform float uHighlightIntensity;
uniform float uShadowIntensity;
uniform vec3  uGamma;
uniform float uSoftness;
uniform vec3  uTintColor;
uniform float uTintIntensity;

float noise(vec2 p) {
  return smoothstep(-0.5, 0.9, sin((p.x - p.y) * 555.0) * sin(p.y * 1444.0)) - 0.4;
}

float fabric(vec2 p) {
  const mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  float f = 0.4 * noise(p);
  f += 0.3 * noise(p = m * p);
  f += 0.2 * noise(p = m * p);
  return f + 0.1 * noise(m * p);
}

float silk(vec2 uv, float t) {
  float s = sin(uSilkFreq1 * (uv.x + uv.y + cos(2.0 * uv.x + 5.0 * uv.y)) + sin(uSilkFreq2 * (uv.x + uv.y)) - t);
  s = 0.7 + 0.3 * (s * s * 0.5 + s);
  s *= 0.9 + uFabricIntensity * fabric(uv * min(iResolution.x, iResolution.y) * uFabricScale);
  return s * 0.9 + 0.1;
}

float silkd(vec2 uv, float t) {
  float xy = uv.x + uv.y;
  float d = (5.0 * (1.0 - 2.0 * sin(2.0 * uv.x + 5.0 * uv.y)) + 12.0 * cos(12.0 * xy)) * cos(5.0 * (cos(2.0 * uv.x + 5.0 * uv.y) + xy) + sin(12.0 * xy) - t);
  return 0.005 * d * (sign(d) + 3.0);
}

void mainImage(out vec4 fragColor, vec2 fragCoord) {
  float mr = min(iResolution.x, iResolution.y);
  vec2 uv = fragCoord / mr;
  float t = iTime * uSpeed;
  uv.y += uWaveAmp * sin(uWaveFreq * uv.x - t);
  if (iMouse.z > 1.0)
    uv += smoothstep(0.5, 0.0, distance(iMouse.xy / mr, uv)) * 0.08;

  float s = sqrt(silk(uv, t));
  float d = silkd(uv, t);
  vec3 c = vec3(s);
  c += uHighlightIntensity * uHighlightColor * d;
  c *= 1.0 - max(0.0, uShadowIntensity * d);

  c = pow(c, 0.3 / uGamma);
  c = 1.0 - c;
  c = 1.0 - c;
  c = c * uSoftness + (1.0 - uSoftness);

  c = mix(c, c * uTintColor, uTintIntensity);

  fragColor = vec4(c, 1);
}
`

// 浅色丝绸遮罩最终选定参数（动画速度 0.5，柔化亮度 0.3）
const 丝绸参数 = {
  uSpeed: 0.5,
  uWaveAmp: 0.03,
  uWaveFreq: 8.0,
  uFabricScale: 0.0006,
  uFabricIntensity: 0.6,
  uSilkFreq1: 5.0,
  uSilkFreq2: 12.0,
  uHighlightColor: [1.0, 0.83, 0.6] as [number, number, number],
  uHighlightIntensity: 0.7,
  uShadowIntensity: 0.8,
  uGamma: [0.52, 0.5, 0.4] as [number, number, number],
  uSoftness: 0.3,
  uTintColor: [1.0, 1.0, 1.0] as [number, number, number],
  uTintIntensity: 0.0,
}

export function InkRevealOverlay({ enabled: enabledProp }: InkRevealOverlayProps) {
  const rendererRef = useRef<InkRevealRenderer | null>(null)
  const silkRef = useRef<SilkCanvasRenderer | null>(null)
  const isDark = useIsDarkMode()
  const inkEnabled = useStarryUiStore((s) => s.inkEnabled)
  const enabled = enabledProp ?? inkEnabled

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(hover: hover)').matches) return

    // 浅色模式：创建动态丝绸渲染器作为遮罩源；深色模式：纯色遮罩
    let silk: SilkCanvasRenderer | null = null
    if (!isDark) {
      try {
        silk = new SilkCanvasRenderer({
          shaderCode: 丝绸着色器,
          uniforms: 丝绸参数,
        })
        silk.start()
        silkRef.current = silk
      } catch (e) {
        console.warn('丝绸遮罩初始化失败，回退纯色遮罩:', e)
        silk = null
      }
    }

    // 主题切换时经依赖数组整体重建渲染器，覆盖色随主题换色并重涂遮罩
    const renderer = new InkRevealRenderer({
      enabled,
      coverColor: 墨色深,
      sourceCanvas: silk?.canvas ?? null,
    })
    rendererRef.current = renderer
    renderer.mount(document.body)

    const onMove = (e: PointerEvent) => {
      renderer.onPointerMove(e.clientX, e.clientY)
      silk?.setMouse(e.clientX, e.clientY, e.buttons > 0)
    }
    const onDown = (e: PointerEvent) => silk?.setMouse(e.clientX, e.clientY, true)
    const onUp = () => silk?.setMouse(0, 0, false)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      renderer.unmount()
      rendererRef.current = null
      silk?.dispose()
      silkRef.current = null
    }
  }, [isDark, enabled])

  return null
}
