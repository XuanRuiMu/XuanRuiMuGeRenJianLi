import { useState, useCallback, useMemo } from 'react'
import { SiChouZhaoSeQi } from './SiChouZhaoSeQi'
import { Settings, X, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { t, 填充 } from '../../国际化/翻译'

interface 丝绸参数 {
  速度: number
  波浪振幅: number
  波浪频率: number
  布料尺度: number
  布料强度: number
  丝绸频率一: number
  丝绸频率二: number
  高光颜色: [number, number, number]
  高光强度: number
  阴影强度: number
  伽马: [number, number, number]
  柔和度: number
  色调颜色: [number, number, number]
  色调强度: number
}

interface 页面参数 {
  主文本: string
  次文本: string
  次要文本: string
  卡片背景: string
  卡片不透明度: number
  边框: string
  主色: string
  遮罩不透明度: number
}

const 默认丝绸: 丝绸参数 = {
  速度: 1.0,
  波浪振幅: 0.03,
  波浪频率: 8.0,
  布料尺度: 0.0006,
  布料强度: 0.6,
  丝绸频率一: 5.0,
  丝绸频率二: 12.0,
  高光颜色: [1.0, 0.83, 0.6],
  高光强度: 0.7,
  阴影强度: 0.8,
  伽马: [0.52, 0.5, 0.4],
  柔和度: 0.9,
  色调颜色: [1.0, 1.0, 1.0],
  色调强度: 0.0,
}

const 默认页面: 页面参数 = {
  主文本: '#0b0c15',
  次文本: '#4b4f5c',
  次要文本: '#5f636f',
  卡片背景: '#ffffff',
  卡片不透明度: 0.75,
  边框: 'rgba(0, 0, 0, 0.1)',
  主色: '#007a99',
  遮罩不透明度: 0.35,
}

const 预设标识表 = ['经典白丝', '暗夜蓝丝', '暖金丝绸', '玫瑰粉丝', '翡翠绿丝', '极简灰丝'] as const

type 预设标识 = (typeof 预设标识表)[number]

const 预设表: Record<预设标识, { 丝绸: Partial<丝绸参数>; 页面: Partial<页面参数> }> = {
  经典白丝: {
    丝绸: {},
    页面: {},
  },
  暗夜蓝丝: {
    丝绸: {
      高光颜色: [0.4, 0.7, 1.0],
      高光强度: 1.2,
      阴影强度: 1.0,
      柔和度: 0.3,
      色调颜色: [0.15, 0.2, 0.35],
      色调强度: 0.6,
    },
    页面: {
      主文本: '#e8ecf4',
      次文本: '#a0a8c0',
      次要文本: '#6b7390',
      卡片背景: '#1a1f30',
      卡片不透明度: 0.7,
      边框: 'rgba(255, 255, 255, 0.12)',
      主色: '#5cc8ff',
      遮罩不透明度: 0.5,
    },
  },
  暖金丝绸: {
    丝绸: {
      高光颜色: [1.0, 0.85, 0.5],
      高光强度: 1.0,
      阴影强度: 0.6,
      柔和度: 0.7,
      色调颜色: [1.0, 0.95, 0.85],
      色调强度: 0.3,
    },
    页面: {
      主文本: '#3d2b1f',
      次文本: '#6b5344',
      次要文本: '#8a7560',
      卡片背景: '#fff8ee',
      卡片不透明度: 0.8,
      边框: 'rgba(120, 80, 40, 0.15)',
      主色: '#b8860b',
      遮罩不透明度: 0.3,
    },
  },
  玫瑰粉丝: {
    丝绸: {
      高光颜色: [1.0, 0.7, 0.8],
      高光强度: 0.9,
      阴影强度: 0.5,
      柔和度: 0.75,
      色调颜色: [1.0, 0.92, 0.95],
      色调强度: 0.35,
    },
    页面: {
      主文本: '#4a1f2e',
      次文本: '#7a4a5a',
      次要文本: '#9a6a7a',
      卡片背景: '#fff0f5',
      卡片不透明度: 0.8,
      边框: 'rgba(180, 80, 120, 0.15)',
      主色: '#c71585',
      遮罩不透明度: 0.3,
    },
  },
  翡翠绿丝: {
    丝绸: {
      高光颜色: [0.6, 1.0, 0.8],
      高光强度: 0.8,
      阴影强度: 0.7,
      柔和度: 0.65,
      色调颜色: [0.9, 1.0, 0.95],
      色调强度: 0.25,
    },
    页面: {
      主文本: '#0f2e22',
      次文本: '#3a6b55',
      次要文本: '#5a8a75',
      卡片背景: '#f0fff8',
      卡片不透明度: 0.8,
      边框: 'rgba(20, 120, 80, 0.15)',
      主色: '#008b5e',
      遮罩不透明度: 0.3,
    },
  },
  极简灰丝: {
    丝绸: {
      高光颜色: [0.9, 0.9, 0.92],
      高光强度: 0.4,
      阴影强度: 0.3,
      柔和度: 0.85,
      色调颜色: [0.95, 0.95, 0.96],
      色调强度: 0.2,
      布料强度: 0.3,
    },
    页面: {
      主文本: '#1a1a1e',
      次文本: '#55555a',
      次要文本: '#88888e',
      卡片背景: '#fafafa',
      卡片不透明度: 0.85,
      边框: 'rgba(0, 0, 0, 0.08)',
      主色: '#444448',
      遮罩不透明度: 0.25,
    },
  },
}

const 丝绸着色器源码 = `
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

function 十六进制转分量(十六进制: string): [number, number, number] {
  const h = 十六进制.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ]
}

function 分量转十六进制(红绿蓝: [number, number, number]): string {
  const 转十六进制 = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${转十六进制(红绿蓝[0])}${转十六进制(红绿蓝[1])}${转十六进制(红绿蓝[2])}`
}

interface 滑块属性 {
  标签: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  单位?: string
}

function HuaDongTiao({ 标签, value, min, max, step, onChange, 单位 = '' }: 滑块属性) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs font-medium" style={{ color: 'var(--ctrl-text)' }}>
          {标签}
        </label>
        <span className="text-xs font-mono" style={{ color: 'var(--ctrl-muted)' }}>
          {value.toFixed(step < 0.01 ? 4 : step < 0.1 ? 3 : 2)}
          {单位}
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

interface 取色器属性 {
  标签: string
  value: string
  onChange: (v: string) => void
}

function QuSeQi({ 标签, value, onChange }: 取色器属性) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <label className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--ctrl-text)' }}>
        {标签}
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

interface 板块组件属性 {
  title: string
  默认展开?: boolean
  children: React.ReactNode
}

function KongZhiFenQu({ title, 默认展开 = true, children }: 板块组件属性) {
  const [open, 设置展开] = useState(默认展开)
  return (
    <div className="border-b border-[var(--ctrl-border)] pb-3 mb-3">
      <button onClick={() => 设置展开(!open)} className="w-full flex items-center justify-between py-1 text-left">
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

const 丝绸字段表 = {
  speed: '速度',
  waveAmp: '波浪振幅',
  waveFreq: '波浪频率',
  silkFreq1: '丝绸频率一',
  silkFreq2: '丝绸频率二',
  fabricScale: '布料尺度',
  fabricIntensity: '布料强度',
  highlightColor: '高光颜色',
  highlightIntensity: '高光强度',
  shadowIntensity: '阴影强度',
  gamma: '伽马',
  softness: '柔和度',
  tintColor: '色调颜色',
  tintIntensity: '色调强度',
} as const

const 页面字段表 = {
  textPrimary: '主文本',
  textSecondary: '次文本',
  muted: '次要文本',
  cardBg: '卡片背景',
  cardOpacity: '卡片不透明度',
  border: '边框',
  primary: '主色',
  overlayOpacity: '遮罩不透明度',
} as const

export function SiChouCeShiYe() {
  const [丝绸, 设置丝绸] = useState<丝绸参数>(默认丝绸)
  const [页面, 设置页面] = useState<页面参数>(默认页面)
  const [面板打开, 设置面板打开] = useState(true)
  const [当前预设, 设置当前预设] = useState<预设标识>(预设标识表[0])

  const 更新丝绸 = useCallback((键: keyof typeof 丝绸字段表, 值: number | [number, number, number]) => {
    设置丝绸((上一个) => ({ ...上一个, [丝绸字段表[键]]: 值 }) as 丝绸参数)
  }, [])

  const 更新页面 = useCallback((键: keyof typeof 页面字段表, 值: string | number) => {
    设置页面((上一个) => ({ ...上一个, [页面字段表[键]]: 值 }) as 页面参数)
  }, [])

  const 重置全部 = useCallback(() => {
    设置丝绸(默认丝绸)
    设置页面(默认页面)
    设置当前预设(预设标识表[0])
  }, [])

  const 应用预设 = useCallback((name: string) => {
    const 预设 = 预设表[name as 预设标识]
    if (!预设) return
    设置丝绸((上一个) => ({ ...上一个, ...预设.丝绸 }))
    设置页面((上一个) => ({ ...上一个, ...预设.页面 }))
    设置当前预设(name as 预设标识)
  }, [])

  const 统一变量 = useMemo(
    () => ({
      uSpeed: 丝绸.速度,
      uWaveAmp: 丝绸.波浪振幅,
      uWaveFreq: 丝绸.波浪频率,
      uFabricScale: 丝绸.布料尺度,
      uFabricIntensity: 丝绸.布料强度,
      uSilkFreq1: 丝绸.丝绸频率一,
      uSilkFreq2: 丝绸.丝绸频率二,
      uHighlightColor: 丝绸.高光颜色,
      uHighlightIntensity: 丝绸.高光强度,
      uShadowIntensity: 丝绸.阴影强度,
      uGamma: 丝绸.伽马,
      uSoftness: 丝绸.柔和度,
      uTintColor: 丝绸.色调颜色,
      uTintIntensity: 丝绸.色调强度,
    }),
    [丝绸]
  )

  const 页面样式 = useMemo(
    () =>
      ({
        '--color-text-primary': 页面.主文本,
        '--color-text-secondary': 页面.次文本,
        '--color-muted': 页面.次要文本,
        '--color-surface': 页面.卡片背景,
        '--color-border': 页面.边框,
        '--color-primary': 页面.主色,
        '--ctrl-text': 页面.主文本,
        '--ctrl-muted': 页面.次要文本,
        '--ctrl-border': 页面.边框,
        '--ctrl-primary': 页面.主色,
        '--ctrl-track': 页面.边框,
      }) as React.CSSProperties,
    [页面]
  )

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={页面样式}>
      {}
      <div className="fixed inset-0 z-0">
        <SiChouZhaoSeQi 着色器代码={丝绸着色器源码} className="absolute inset-0" uniforms={统一变量} />
        {}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom, ${页面.卡片背景}${Math.round(页面.遮罩不透明度 * 255)
              .toString(16)
              .padStart(2, '0')} 0%, transparent 30%, transparent 70%, ${页面.卡片背景}${Math.round(
              页面.遮罩不透明度 * 255
            )
              .toString(16)
              .padStart(2, '0')} 100%)`,
          }}
        />
      </div>

      {}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 页面.主文本 }}>
            {t('skillTest.title')}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 页面.次要文本 }}>
            {t('skillTest.subtitle')}
          </p>
        </div>
        <button
          onClick={() => 设置面板打开(!面板打开)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
          style={{
            backgroundColor: `${页面.主色}15`,
            color: 页面.主色,
            border: `1px solid ${页面.主色}40`,
          }}
        >
          {面板打开 ? <X size={16} /> : <Settings size={16} />}
          {面板打开 ? t('skillTest.panelToggleCollapse') : t('skillTest.panelToggleExpand')}
        </button>
      </header>

      {}
      <div className="relative z-10 flex items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 180px)' }}>
        <div
          className="max-w-lg w-full rounded-2xl p-8 backdrop-blur-md"
          style={{
            backgroundColor: `${页面.卡片背景}${Math.round(页面.卡片不透明度 * 255)
              .toString(16)
              .padStart(2, '0')}`,
            border: `1px solid ${页面.边框}`,
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span
              className="px-3 py-1 text-xs font-bold rounded-full"
              style={{ backgroundColor: `${页面.主色}20`, color: 页面.主色 }}
            >
              {t('skillTest.badge')}
            </span>
            <span className="text-xs font-mono" style={{ color: 页面.次要文本 }}>
              {填充(t('skillTest.presetLine'), { 名称: t(`skillTest.presets.${当前预设}` as never) })}
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 页面.主文本 }}>
            {t('skillTest.heading')}
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 页面.次文本 }}>
            {t('skillTest.desc')}
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2" style={{ color: 页面.次要文本 }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 页面.主色 }} />
              {填充(t('skillTest.live.speed'), { 值: 丝绸.速度.toFixed(2) })}
            </div>
            <div className="flex items-center gap-2" style={{ color: 页面.次要文本 }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 页面.主色 }} />
              {填充(t('skillTest.live.waveAmp'), { 值: 丝绸.波浪振幅.toFixed(3) })}
            </div>
            <div className="flex items-center gap-2" style={{ color: 页面.次要文本 }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 页面.主色 }} />
              {填充(t('skillTest.live.fabric'), { 值: 丝绸.布料强度.toFixed(2) })}
            </div>
            <div className="flex items-center gap-2" style={{ color: 页面.次要文本 }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 页面.主色 }} />
              {填充(t('skillTest.live.softness'), { 值: 丝绸.柔和度.toFixed(2) })}
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="relative z-10 text-center pb-6">
        <p className="text-xs" style={{ color: 页面.次要文本 }}>
          {t('skillTest.hint')}
        </p>
      </div>

      {}
      <div
        className={`fixed top-0 right-0 h-full z-50 transition-transform duration-300 ease-out ${面板打开 ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          width: '340px',
          backgroundColor: `${页面.卡片背景}ee`,
          backdropFilter: 'blur(20px)',
          borderLeft: `1px solid ${页面.边框}`,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
        }}
      >
        <div className="h-full flex flex-col">
          {}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 页面.边框 }}>
            <div className="flex items-center gap-2">
              <Settings size={16} style={{ color: 页面.主色 }} />
              <span className="text-sm font-bold" style={{ color: 页面.主文本 }}>
                {t('skillTest.panelTitle')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={重置全部}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all hover:scale-105"
                style={{ backgroundColor: `${页面.主色}15`, color: 页面.主色 }}
                title={t('skillTest.reset.title')}
              >
                <RotateCcw size={12} />
                {t('skillTest.reset.label')}
              </button>
              <button
                onClick={() => 设置面板打开(false)}
                className="p-1.5 rounded-md transition-all hover:scale-110"
                style={{ color: 页面.次要文本 }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {}
          <div className="px-5 py-3 border-b" style={{ borderColor: 页面.边框 }}>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: 页面.主色 }}>
              {t('skillTest.presetsTitle')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {预设标识表.map((标识) => (
                <button
                  key={标识}
                  onClick={() => 应用预设(标识)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: 当前预设 === 标识 ? 页面.主色 : `${页面.主色}10`,
                    color: 当前预设 === 标识 ? 页面.卡片背景 : 页面.主色,
                    border: `1px solid ${当前预设 === 标识 ? 页面.主色 : 页面.边框}`,
                  }}
                >
                  {t(`skillTest.presets.${标识}` as never)}
                </button>
              ))}
            </div>
          </div>

          {}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {}
            <KongZhiFenQu title={t('skillTest.sections.silk')}>
              <HuaDongTiao
                标签={t('skillTest.sliders.speed')}
                value={丝绸.速度}
                min={0}
                max={3}
                step={0.05}
                onChange={(v) => 更新丝绸('speed', v)}
                单位="x"
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.waveAmp')}
                value={丝绸.波浪振幅}
                min={0}
                max={0.2}
                step={0.005}
                onChange={(v) => 更新丝绸('waveAmp', v)}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.waveFreq')}
                value={丝绸.波浪频率}
                min={0}
                max={20}
                step={0.5}
                onChange={(v) => 更新丝绸('waveFreq', v)}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.silkFreq1')}
                value={丝绸.丝绸频率一}
                min={1}
                max={15}
                step={0.5}
                onChange={(v) => 更新丝绸('silkFreq1', v)}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.silkFreq2')}
                value={丝绸.丝绸频率二}
                min={4}
                max={24}
                step={0.5}
                onChange={(v) => 更新丝绸('silkFreq2', v)}
              />
            </KongZhiFenQu>

            {}
            <KongZhiFenQu title={t('skillTest.sections.fabric')}>
              <HuaDongTiao
                标签={t('skillTest.sliders.fabricScale')}
                value={丝绸.布料尺度}
                min={0.0001}
                max={0.002}
                step={0.00005}
                onChange={(v) => 更新丝绸('fabricScale', v)}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.fabricIntensity')}
                value={丝绸.布料强度}
                min={0}
                max={1.5}
                step={0.05}
                onChange={(v) => 更新丝绸('fabricIntensity', v)}
              />
            </KongZhiFenQu>

            {}
            <KongZhiFenQu title={t('skillTest.sections.color')}>
              <QuSeQi
                标签={t('skillTest.sliders.highlightColor')}
                value={分量转十六进制(丝绸.高光颜色)}
                onChange={(v) => 更新丝绸('highlightColor', 十六进制转分量(v))}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.highlightIntensity')}
                value={丝绸.高光强度}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => 更新丝绸('highlightIntensity', v)}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.shadowIntensity')}
                value={丝绸.阴影强度}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => 更新丝绸('shadowIntensity', v)}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.gammaR')}
                value={丝绸.伽马[0]}
                min={0.1}
                max={1}
                step={0.01}
                onChange={(v) => 更新丝绸('gamma', [v, 丝绸.伽马[1], 丝绸.伽马[2]])}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.gammaG')}
                value={丝绸.伽马[1]}
                min={0.1}
                max={1}
                step={0.01}
                onChange={(v) => 更新丝绸('gamma', [丝绸.伽马[0], v, 丝绸.伽马[2]])}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.gammaB')}
                value={丝绸.伽马[2]}
                min={0.1}
                max={1}
                step={0.01}
                onChange={(v) => 更新丝绸('gamma', [丝绸.伽马[0], 丝绸.伽马[1], v])}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.softness')}
                value={丝绸.柔和度}
                min={0.3}
                max={1}
                step={0.02}
                onChange={(v) => 更新丝绸('softness', v)}
              />
              <QuSeQi
                标签={t('skillTest.sliders.tintColor')}
                value={分量转十六进制(丝绸.色调颜色)}
                onChange={(v) => 更新丝绸('tintColor', 十六进制转分量(v))}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.tintIntensity')}
                value={丝绸.色调强度}
                min={0}
                max={1}
                step={0.02}
                onChange={(v) => 更新丝绸('tintIntensity', v)}
              />
            </KongZhiFenQu>

            {}
            <KongZhiFenQu title={t('skillTest.sections.page')} 默认展开={false}>
              <QuSeQi
                标签={t('skillTest.sliders.textPrimary')}
                value={页面.主文本}
                onChange={(v) => 更新页面('textPrimary', v)}
              />
              <QuSeQi
                标签={t('skillTest.sliders.textSecondary')}
                value={页面.次文本}
                onChange={(v) => 更新页面('textSecondary', v)}
              />
              <QuSeQi
                标签={t('skillTest.sliders.muted')}
                value={页面.次要文本}
                onChange={(v) => 更新页面('muted', v)}
              />
              <QuSeQi
                标签={t('skillTest.sliders.cardBg')}
                value={页面.卡片背景}
                onChange={(v) => 更新页面('cardBg', v)}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.cardOpacity')}
                value={页面.卡片不透明度}
                min={0.3}
                max={1}
                step={0.05}
                onChange={(v) => 更新页面('cardOpacity', v)}
              />
              <QuSeQi
                标签={t('skillTest.sliders.primary')}
                value={页面.主色}
                onChange={(v) => 更新页面('primary', v)}
              />
              <HuaDongTiao
                标签={t('skillTest.sliders.overlayOpacity')}
                value={页面.遮罩不透明度}
                min={0}
                max={0.8}
                step={0.05}
                onChange={(v) => 更新页面('overlayOpacity', v)}
              />
            </KongZhiFenQu>
          </div>

          {}
          <div className="px-5 py-3 border-t text-center" style={{ borderColor: 页面.边框 }}>
            <p className="text-xs" style={{ color: 页面.次要文本 }}>
              {填充(t('skillTest.footer'), {
                数量: Object.keys(默认丝绸).length + Object.keys(默认页面).length,
              })}
            </p>
          </div>
        </div>
      </div>

      {}
      {面板打开 && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => 设置面板打开(false)}
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        />
      )}
    </div>
  )
}

export default SiChouCeShiYe
