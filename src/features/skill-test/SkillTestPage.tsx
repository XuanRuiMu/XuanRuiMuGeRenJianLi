import { useState, useCallback, useMemo } from 'react'
import { ShaderToy } from './SilkShaderToy'
import { Settings, X, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'

// ============ 类型定义 ============

interface SilkParams {
  speed: number
  waveAmp: number
  waveFreq: number
  fabricScale: number
  fabricIntensity: number
  silkFreq1: number
  silkFreq2: number
  highlightColor: [number, number, number]
  highlightIntensity: number
  shadowIntensity: number
  gamma: [number, number, number]
  softness: number
  tintColor: [number, number, number]
  tintIntensity: number
}

interface PageParams {
  textPrimary: string
  textSecondary: string
  muted: string
  cardBg: string
  cardOpacity: number
  border: string
  primary: string
  overlayOpacity: number
}

// ============ 默认参数 ============

const DEFAULT_SILK: SilkParams = {
  speed: 1.0,
  waveAmp: 0.03,
  waveFreq: 8.0,
  fabricScale: 0.0006,
  fabricIntensity: 0.6,
  silkFreq1: 5.0,
  silkFreq2: 12.0,
  highlightColor: [1.0, 0.83, 0.6],
  highlightIntensity: 0.7,
  shadowIntensity: 0.8,
  gamma: [0.52, 0.5, 0.4],
  softness: 0.9,
  tintColor: [1.0, 1.0, 1.0],
  tintIntensity: 0.0,
}

const DEFAULT_PAGE: PageParams = {
  textPrimary: '#0b0c15',
  textSecondary: '#4b4f5c',
  muted: '#5f636f',
  cardBg: '#ffffff',
  cardOpacity: 0.75,
  border: 'rgba(0, 0, 0, 0.1)',
  primary: '#007a99',
  overlayOpacity: 0.35,
}

// ============ 预设 ============

const PRESETS: Record<string, { silk: Partial<SilkParams>; page: Partial<PageParams> }> = {
  经典白丝: {
    silk: {},
    page: {},
  },
  暗夜蓝丝: {
    silk: {
      highlightColor: [0.4, 0.7, 1.0],
      highlightIntensity: 1.2,
      shadowIntensity: 1.0,
      softness: 0.3,
      tintColor: [0.15, 0.2, 0.35],
      tintIntensity: 0.6,
    },
    page: {
      textPrimary: '#e8ecf4',
      textSecondary: '#a0a8c0',
      muted: '#6b7390',
      cardBg: '#1a1f30',
      cardOpacity: 0.7,
      border: 'rgba(255, 255, 255, 0.12)',
      primary: '#5cc8ff',
      overlayOpacity: 0.5,
    },
  },
  暖金丝绸: {
    silk: {
      highlightColor: [1.0, 0.85, 0.5],
      highlightIntensity: 1.0,
      shadowIntensity: 0.6,
      softness: 0.7,
      tintColor: [1.0, 0.95, 0.85],
      tintIntensity: 0.3,
    },
    page: {
      textPrimary: '#3d2b1f',
      textSecondary: '#6b5344',
      muted: '#8a7560',
      cardBg: '#fff8ee',
      cardOpacity: 0.8,
      border: 'rgba(120, 80, 40, 0.15)',
      primary: '#b8860b',
      overlayOpacity: 0.3,
    },
  },
  玫瑰粉丝: {
    silk: {
      highlightColor: [1.0, 0.7, 0.8],
      highlightIntensity: 0.9,
      shadowIntensity: 0.5,
      softness: 0.75,
      tintColor: [1.0, 0.92, 0.95],
      tintIntensity: 0.35,
    },
    page: {
      textPrimary: '#4a1f2e',
      textSecondary: '#7a4a5a',
      muted: '#9a6a7a',
      cardBg: '#fff0f5',
      cardOpacity: 0.8,
      border: 'rgba(180, 80, 120, 0.15)',
      primary: '#c71585',
      overlayOpacity: 0.3,
    },
  },
  翡翠绿丝: {
    silk: {
      highlightColor: [0.6, 1.0, 0.8],
      highlightIntensity: 0.8,
      shadowIntensity: 0.7,
      softness: 0.65,
      tintColor: [0.9, 1.0, 0.95],
      tintIntensity: 0.25,
    },
    page: {
      textPrimary: '#0f2e22',
      textSecondary: '#3a6b55',
      muted: '#5a8a75',
      cardBg: '#f0fff8',
      cardOpacity: 0.8,
      border: 'rgba(20, 120, 80, 0.15)',
      primary: '#008b5e',
      overlayOpacity: 0.3,
    },
  },
  极简灰丝: {
    silk: {
      highlightColor: [0.9, 0.9, 0.92],
      highlightIntensity: 0.4,
      shadowIntensity: 0.3,
      softness: 0.85,
      tintColor: [0.95, 0.95, 0.96],
      tintIntensity: 0.2,
      fabricIntensity: 0.3,
    },
    page: {
      textPrimary: '#1a1a1e',
      textSecondary: '#55555a',
      muted: '#88888e',
      cardBg: '#fafafa',
      cardOpacity: 0.85,
      border: 'rgba(0, 0, 0, 0.08)',
      primary: '#444448',
      overlayOpacity: 0.25,
    },
  },
}

// ============ 着色器代码 ============

const SILK_SHADER = `
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

// ============ 工具函数 ============

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ]
}

function rgb01ToHex(rgb: [number, number, number]): string {
  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`
}

// ============ 控制面板子组件 ============

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  unit?: string
}

function Slider({ label, value, min, max, step, onChange, unit = '' }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs font-medium" style={{ color: 'var(--ctrl-text)' }}>
          {label}
        </label>
        <span className="text-xs font-mono" style={{ color: 'var(--ctrl-muted)' }}>
          {value.toFixed(step < 0.01 ? 4 : step < 0.1 ? 3 : 2)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--ctrl-primary) ${((value - min) / (max - min)) * 100}%, var(--ctrl-track) ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
    </div>
  )
}

interface ColorPickerProps {
  label: string
  value: string
  onChange: (v: string) => void
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <label className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--ctrl-text)' }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono" style={{ color: 'var(--ctrl-muted)' }}>
          {value}
        </span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
        />
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function ControlSection({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[var(--ctrl-border)] pb-3 mb-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-1 text-left">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ctrl-primary)' }}>
          {title}
        </span>
        {open ? (
          <ChevronDown size={14} style={{ color: 'var(--ctrl-muted)' }} />
        ) : (
          <ChevronRight size={14} style={{ color: 'var(--ctrl-muted)' }} />
        )}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

// ============ 主组件 ============

export function SkillTestPage() {
  const [silk, setSilk] = useState<SilkParams>(DEFAULT_SILK)
  const [page, setPage] = useState<PageParams>(DEFAULT_PAGE)
  const [panelOpen, setPanelOpen] = useState(true)
  const [activePreset, setActivePreset] = useState('经典白丝')

  const updateSilk = useCallback(<K extends keyof SilkParams>(key: K, value: SilkParams[K]) => {
    setSilk((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updatePage = useCallback(<K extends keyof PageParams>(key: K, value: PageParams[K]) => {
    setPage((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetAll = useCallback(() => {
    setSilk(DEFAULT_SILK)
    setPage(DEFAULT_PAGE)
    setActivePreset('经典白丝')
  }, [])

  const applyPreset = useCallback((name: string) => {
    const preset = PRESETS[name]
    if (!preset) return
    setSilk((prev) => ({ ...prev, ...preset.silk }))
    setPage((prev) => ({ ...prev, ...preset.page }))
    setActivePreset(name)
  }, [])

  const uniforms = useMemo(
    () => ({
      uSpeed: silk.speed,
      uWaveAmp: silk.waveAmp,
      uWaveFreq: silk.waveFreq,
      uFabricScale: silk.fabricScale,
      uFabricIntensity: silk.fabricIntensity,
      uSilkFreq1: silk.silkFreq1,
      uSilkFreq2: silk.silkFreq2,
      uHighlightColor: silk.highlightColor,
      uHighlightIntensity: silk.highlightIntensity,
      uShadowIntensity: silk.shadowIntensity,
      uGamma: silk.gamma,
      uSoftness: silk.softness,
      uTintColor: silk.tintColor,
      uTintIntensity: silk.tintIntensity,
    }),
    [silk]
  )

  const pageStyle = useMemo(
    () =>
      ({
        '--color-text-primary': page.textPrimary,
        '--color-text-secondary': page.textSecondary,
        '--color-muted': page.muted,
        '--color-surface': page.cardBg,
        '--color-border': page.border,
        '--color-primary': page.primary,
        '--ctrl-text': page.textPrimary,
        '--ctrl-muted': page.muted,
        '--ctrl-border': page.border,
        '--ctrl-primary': page.primary,
        '--ctrl-track': page.border,
      }) as React.CSSProperties,
    [page]
  )

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={pageStyle}>
      {/* 丝绸背景层 */}
      <div className="fixed inset-0 z-0">
        <ShaderToy shaderCode={SILK_SHADER} className="absolute inset-0" uniforms={uniforms} />
        {/* 文字可读性叠加层 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, ${page.cardBg}${Math.round(page.overlayOpacity * 255)
              .toString(16)
              .padStart(2, '0')} 0%, transparent 30%, transparent 70%, ${page.cardBg}${Math.round(
              page.overlayOpacity * 255
            )
              .toString(16)
              .padStart(2, '0')} 100%)`,
          }}
        />
      </div>

      {/* 顶部标题栏 */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: page.textPrimary }}>
            Silk Background Lab
          </h1>
          <p className="text-xs mt-0.5" style={{ color: page.muted }}>
            ShaderToy Classic Silk · 实时参数调节
          </p>
        </div>
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
          style={{
            backgroundColor: `${page.primary}15`,
            color: page.primary,
            border: `1px solid ${page.primary}40`,
          }}
        >
          {panelOpen ? <X size={16} /> : <Settings size={16} />}
          {panelOpen ? '收起面板' : '打开面板'}
        </button>
      </header>

      {/* 中央信息卡片 */}
      <div className="relative z-10 flex items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 180px)' }}>
        <div
          className="max-w-lg w-full rounded-2xl p-8 backdrop-blur-md"
          style={{
            backgroundColor: `${page.cardBg}${Math.round(page.cardOpacity * 255)
              .toString(16)
              .padStart(2, '0')}`,
            border: `1px solid ${page.border}`,
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span
              className="px-3 py-1 text-xs font-bold rounded-full"
              style={{ backgroundColor: `${page.primary}20`, color: page.primary }}
            >
              SHADERTOY
            </span>
            <span className="text-xs font-mono" style={{ color: page.muted }}>
              预设: {activePreset}
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: page.textPrimary }}>
            Classic Silk
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: page.textSecondary }}>
            基于ShaderToy经典丝绸着色器（MIT License, Giorgi Azmaipharashvili）。
            右侧面板可实时调节动画速度、波动振幅、织物纹理、高光颜色、Gamma校正、页面配色等全部参数。
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2" style={{ color: page.muted }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: page.primary }} />
              动画速度: {silk.speed.toFixed(2)}x
            </div>
            <div className="flex items-center gap-2" style={{ color: page.muted }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: page.primary }} />
              波动振幅: {silk.waveAmp.toFixed(3)}
            </div>
            <div className="flex items-center gap-2" style={{ color: page.muted }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: page.primary }} />
              纹理强度: {silk.fabricIntensity.toFixed(2)}
            </div>
            <div className="flex items-center gap-2" style={{ color: page.muted }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: page.primary }} />
              柔化度: {silk.softness.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="relative z-10 text-center pb-6">
        <p className="text-xs" style={{ color: page.muted }}>
          鼠标在背景上移动并按住可交互 · 所有参数实时生效
        </p>
      </div>

      {/* 右侧控制面板 */}
      <div
        className={`fixed top-0 right-0 h-full z-50 transition-transform duration-300 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          width: '340px',
          backgroundColor: `${page.cardBg}ee`,
          backdropFilter: 'blur(20px)',
          borderLeft: `1px solid ${page.border}`,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
        }}
      >
        <div className="h-full flex flex-col">
          {/* 面板头部 */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: page.border }}>
            <div className="flex items-center gap-2">
              <Settings size={16} style={{ color: page.primary }} />
              <span className="text-sm font-bold" style={{ color: page.textPrimary }}>
                控制面板
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all hover:scale-105"
                style={{ backgroundColor: `${page.primary}15`, color: page.primary }}
                title="重置全部参数"
              >
                <RotateCcw size={12} />
                重置
              </button>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 rounded-md transition-all hover:scale-110"
                style={{ color: page.muted }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 预设选择 */}
          <div className="px-5 py-3 border-b" style={{ borderColor: page.border }}>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: page.primary }}>
              预设主题
            </label>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(PRESETS).map((name) => (
                <button
                  key={name}
                  onClick={() => applyPreset(name)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: activePreset === name ? page.primary : `${page.primary}10`,
                    color: activePreset === name ? page.cardBg : page.primary,
                    border: `1px solid ${activePreset === name ? page.primary : page.border}`,
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* 可滚动参数区 */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* 丝绸动画 */}
            <ControlSection title="丝绸动画">
              <Slider
                label="动画速度"
                value={silk.speed}
                min={0}
                max={3}
                step={0.05}
                onChange={(v) => updateSilk('speed', v)}
                unit="x"
              />
              <Slider
                label="波动振幅"
                value={silk.waveAmp}
                min={0}
                max={0.2}
                step={0.005}
                onChange={(v) => updateSilk('waveAmp', v)}
              />
              <Slider
                label="波动频率"
                value={silk.waveFreq}
                min={0}
                max={20}
                step={0.5}
                onChange={(v) => updateSilk('waveFreq', v)}
              />
              <Slider
                label="主波纹频率"
                value={silk.silkFreq1}
                min={1}
                max={15}
                step={0.5}
                onChange={(v) => updateSilk('silkFreq1', v)}
              />
              <Slider
                label="次波纹频率"
                value={silk.silkFreq2}
                min={4}
                max={24}
                step={0.5}
                onChange={(v) => updateSilk('silkFreq2', v)}
              />
            </ControlSection>

            {/* 丝绸纹理 */}
            <ControlSection title="丝绸纹理">
              <Slider
                label="织物缩放"
                value={silk.fabricScale}
                min={0.0001}
                max={0.002}
                step={0.00005}
                onChange={(v) => updateSilk('fabricScale', v)}
              />
              <Slider
                label="织物强度"
                value={silk.fabricIntensity}
                min={0}
                max={1.5}
                step={0.05}
                onChange={(v) => updateSilk('fabricIntensity', v)}
              />
            </ControlSection>

            {/* 丝绸颜色 */}
            <ControlSection title="丝绸颜色">
              <ColorPicker
                label="高光颜色"
                value={rgb01ToHex(silk.highlightColor)}
                onChange={(v) => updateSilk('highlightColor', hexToRgb01(v))}
              />
              <Slider
                label="高光强度"
                value={silk.highlightIntensity}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => updateSilk('highlightIntensity', v)}
              />
              <Slider
                label="阴影强度"
                value={silk.shadowIntensity}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => updateSilk('shadowIntensity', v)}
              />
              <Slider
                label="Gamma R"
                value={silk.gamma[0]}
                min={0.1}
                max={1}
                step={0.01}
                onChange={(v) => updateSilk('gamma', [v, silk.gamma[1], silk.gamma[2]])}
              />
              <Slider
                label="Gamma G"
                value={silk.gamma[1]}
                min={0.1}
                max={1}
                step={0.01}
                onChange={(v) => updateSilk('gamma', [silk.gamma[0], v, silk.gamma[2]])}
              />
              <Slider
                label="Gamma B"
                value={silk.gamma[2]}
                min={0.1}
                max={1}
                step={0.01}
                onChange={(v) => updateSilk('gamma', [silk.gamma[0], silk.gamma[1], v])}
              />
              <Slider
                label="柔化亮度"
                value={silk.softness}
                min={0.3}
                max={1}
                step={0.02}
                onChange={(v) => updateSilk('softness', v)}
              />
              <ColorPicker
                label="染色颜色"
                value={rgb01ToHex(silk.tintColor)}
                onChange={(v) => updateSilk('tintColor', hexToRgb01(v))}
              />
              <Slider
                label="染色强度"
                value={silk.tintIntensity}
                min={0}
                max={1}
                step={0.02}
                onChange={(v) => updateSilk('tintIntensity', v)}
              />
            </ControlSection>

            {/* 页面配色 */}
            <ControlSection title="页面配色" defaultOpen={false}>
              <ColorPicker label="主文字色" value={page.textPrimary} onChange={(v) => updatePage('textPrimary', v)} />
              <ColorPicker
                label="次文字色"
                value={page.textSecondary}
                onChange={(v) => updatePage('textSecondary', v)}
              />
              <ColorPicker label="弱化文字色" value={page.muted} onChange={(v) => updatePage('muted', v)} />
              <ColorPicker label="卡片背景色" value={page.cardBg} onChange={(v) => updatePage('cardBg', v)} />
              <Slider
                label="卡片透明度"
                value={page.cardOpacity}
                min={0.3}
                max={1}
                step={0.05}
                onChange={(v) => updatePage('cardOpacity', v)}
              />
              <ColorPicker label="主题强调色" value={page.primary} onChange={(v) => updatePage('primary', v)} />
              <Slider
                label="上下遮罩强度"
                value={page.overlayOpacity}
                min={0}
                max={0.8}
                step={0.05}
                onChange={(v) => updatePage('overlayOpacity', v)}
              />
            </ControlSection>
          </div>

          {/* 面板底部 */}
          <div className="px-5 py-3 border-t text-center" style={{ borderColor: page.border }}>
            <p className="text-xs" style={{ color: page.muted }}>
              共{15 + 8}个可调节参数 · 实时生效
            </p>
          </div>
        </div>
      </div>

      {/* 面板打开时的点击遮罩（移动端） */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setPanelOpen(false)}
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        />
      )}
    </div>
  )
}

export default SkillTestPage
