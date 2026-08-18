import * as THREE from 'three'
import GUI from 'three/addons/libs/lil-gui.module.min.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { t as translate } from '../../i18n/translations'
import { useStarryUiStore } from '../../store/useStarryUiStore'
import { useProjectsWindStore, 风力下限, 风力上限 } from '../../store/useProjectsWindStore'

export interface StarryGalaxySceneOptions {
  dpr?: number
}

export interface StarryGalaxySceneApi {
  getFps: () => number
  destroy: () => void
  /** 视差：传入当前页面滚动值（px），场景内部据此偏移主星群，制造随滚动缓缓漂移的纵深感。 */
  setParallax: (scroll: number) => void
}

export const DEFAULT_EFFECT_PARAMS = {
  supernova: { frequency: 0.5, opacity: 0.25 },
  nebula: { count: 6, opacity: 0.5 },
  twinkle: { intensity: 0.6, speed: 1.85 },
  stardust: { opacity: 1 },
} as const

interface GalaxyUniforms extends Record<string, THREE.IUniform> {
  uSize: THREE.IUniform<number>
  uBranches: THREE.IUniform<number>
  uRadius: THREE.IUniform<number>
  uSpin: THREE.IUniform<number>
  uRandomness: THREE.IUniform<number>
  uCycleSpeed: THREE.IUniform<number>
  uTime: THREE.IUniform<number>
  uTwinkle: THREE.IUniform<number>
  uTwinkleSpeed: THREE.IUniform<number>
  uColorInn: THREE.IUniform<THREE.Color>
  uColorOut: THREE.IUniform<THREE.Color>
  uAlphaMap: THREE.IUniform<THREE.Texture>
}

interface UniverseUniforms extends Record<string, THREE.IUniform> {
  uTime: THREE.IUniform<number>
  uSize: THREE.IUniform<number>
  uRadius: THREE.IUniform<number>
  uAlphaMap: THREE.IUniform<THREE.Texture>
}

interface EffectState {
  colorBreath: { enabled: boolean }
  supernova: { enabled: boolean; frequency: number; opacity: number }
  nebula: { enabled: boolean; count: number; opacity: number }
  twinkle: { enabled: boolean; intensity: number; speed: number }
  stardust: { enabled: boolean; opacity: number }
}

interface SupernovaItem {
  obj: THREE.Sprite
  mat: THREE.SpriteMaterial
  t0: number
  dur: number
  color: THREE.Color
}

// ============================================================================
// FP-05：控制面板（GUI）与被渲染场景解耦
// ============================================================================
// 根因：原 GUI 完全构建在 createStarryGalaxyScene 内部；starryHidden=true
// 短路场景创建时整个控制台也消失，用户无法在隐藏状态下调整星空参数。
// 解耦后：模块级 starryGuiState 持久保存 GUI 绑定的数值/开关；starryApplier
// 是场景创建时注册的同步闭包（活动时存在），GUI onChange 同时更新
// starryGuiState 与（如有）调用 applier 把状态写入场景。控制台由独立的
// createStarryControlPanel 始终构建——无论场景是否创建，控制台都有内容。
export interface StarryGuiState {
  galaxy: { uSize: number; uBranches: number; uRadius: number; uSpin: number; uRandomness: number; uCycleSpeed: number }
  elevation: number
  camZoom: number
  colorBreath: { enabled: boolean }
  supernova: { enabled: boolean; frequency: number; opacity: number }
  nebula: { enabled: boolean; count: number; opacity: number }
  twinkle: { enabled: boolean; intensity: number; speed: number }
  stardust: { enabled: boolean; opacity: number }
  centerDim: { enabled: boolean; startOpacity: number; endOpacity: number; radius: number; period: number }
}
// 模块级唯一状态：与被渲染场景解耦，场景销毁后仍保留用户设置（持久化）。
const starryGuiState: StarryGuiState = {
  galaxy: { uSize: 1.69, uBranches: 5, uRadius: 2.79, uSpin: 1.75, uRandomness: 1, uCycleSpeed: 1.02 },
  elevation: 28,
  camZoom: 3,
  colorBreath: { enabled: true },
  supernova: { enabled: true, frequency: DEFAULT_EFFECT_PARAMS.supernova.frequency, opacity: DEFAULT_EFFECT_PARAMS.supernova.opacity },
  nebula: { enabled: true, count: DEFAULT_EFFECT_PARAMS.nebula.count, opacity: DEFAULT_EFFECT_PARAMS.nebula.opacity },
  twinkle: { enabled: true, intensity: DEFAULT_EFFECT_PARAMS.twinkle.intensity, speed: DEFAULT_EFFECT_PARAMS.twinkle.speed },
  stardust: { enabled: true, opacity: DEFAULT_EFFECT_PARAMS.stardust.opacity },
  centerDim: { enabled: true, startOpacity: 0.9, endOpacity: 1.0, radius: 0.6, period: 5.0 },
}
// 活动场景的参数同步器：场景创建时注册，销毁时清空。GUI 变更时若存在则调用。
let starryApplier: ((s: StarryGuiState) => void) | null = null
let starryPanelGui: GUI | null = null

/**
 * 构建星图控制台（lil-gui）。无论场景是否被创建都会构建——只要 DOM 存在
 * #starry-gui-slot 与 #starry-gui-trigger。无 DOM 时（SSR/jsdom 测试）直接 no-op。
 * 幂等：重复调用不会重建。绑定的所有值都来自模块级 starryGuiState；
 * onChange 后调用 starryApplier（如有）把状态同步进活动场景。
 */
export function createStarryControlPanel(): void {
  if (typeof document === 'undefined') return
  if (starryPanelGui) return
  const tf = translate
  const guiContainer = document.getElementById('starry-gui-slot')
  const starryGuiTrigger = document.getElementById('starry-gui-trigger')
  if (!guiContainer) return
  guiContainer.setAttribute('data-lenis-prevent', '')
  const gui = new GUI({ title: tf('starryBg.title'), width: 300, container: guiContainer })
  starryPanelGui = gui
  const guiStyle = gui.domElement.style
  guiStyle.position = 'relative'
  guiStyle.width = '100%'
  guiStyle.maxHeight = 'calc(100vh - 80px)'
  guiStyle.overflowY = 'auto'

  const 面板安全边距 = 12
  const 夹取 = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
  let starryPanelOpen = false
  let 上次点击X = 0
  let 上次点击Y = 0
  const 定位星图面板 = (点击X: number, 点击Y: number) => {
    guiContainer.classList.remove('hidden')
    const 面板宽 = guiContainer.offsetWidth || 300
    const 面板高 = guiContainer.offsetHeight || 0
    guiContainer.style.left = `${夹取(点击X, 面板安全边距, window.innerWidth - 面板宽 - 面板安全边距)}px`
    guiContainer.style.top = `${夹取(点击Y, 面板安全边距, window.innerHeight - 面板高 - 面板安全边距)}px`
  }
  const setStarryPanel = (open: boolean) => {
    starryPanelOpen = open
    if (open) 定位星图面板(上次点击X, 上次点击Y)
    else guiContainer.classList.add('hidden')
    starryGuiTrigger?.setAttribute('aria-expanded', String(open))
  }
  const onStarryDocClick = (e: MouseEvent) => {
    const target = e.target as Node
    if (starryGuiTrigger && starryGuiTrigger.contains(target)) {
      e.stopPropagation()
      上次点击X = e.clientX
      上次点击Y = e.clientY
      setStarryPanel(!starryPanelOpen)
      return
    }
    if (guiContainer.contains(target)) return
    if (starryPanelOpen) setStarryPanel(false)
  }
  if (starryGuiTrigger) document.addEventListener('click', onStarryDocClick)

  // 拖动 handle
  let starryDragHandle = guiContainer.querySelector<HTMLElement>('.starry-drag-handle')
  if (!starryDragHandle) {
    starryDragHandle = document.createElement('div')
    starryDragHandle.className = 'starry-drag-handle'
    starryDragHandle.style.cssText =
      'position:sticky;top:0;height:30px;display:flex;align-items:center;justify-content:center;cursor:grab;user-select:none;border-bottom:1px solid rgba(255,255,255,.12);font-size:12px;letter-spacing:.04em;color:#e6e8ee;background:rgba(11,14,22,.96);z-index:1'
    starryDragHandle.innerHTML = '<span>⠿ 拖动特效面板</span>'
    guiContainer.insertBefore(starryDragHandle, guiContainer.firstChild)
  }
  let dragging = false
  let dragStartX = 0
  let dragStartY = 0
  let panelLeft = 0
  let panelTop = 0
  const onDragMove = (e: MouseEvent) => {
    if (!dragging) return
    guiContainer.style.left = `${panelLeft + e.clientX - dragStartX}px`
    guiContainer.style.top = `${panelTop + e.clientY - dragStartY}px`
  }
  const onDragEnd = () => {
    dragging = false
    window.removeEventListener('mousemove', onDragMove)
    window.removeEventListener('mouseup', onDragEnd)
  }
  starryDragHandle.addEventListener('mousedown', (e: MouseEvent) => {
    dragging = true
    dragStartX = e.clientX
    dragStartY = e.clientY
    const rect = guiContainer.getBoundingClientRect()
    panelLeft = rect.left
    panelTop = rect.top
    window.addEventListener('mousemove', onDragMove)
    window.addEventListener('mouseup', onDragEnd)
  })

  // GUI 变更 → 写入 starryGuiState + 调 applier 同步进活动场景
  const apply = () => starryApplier?.(starryGuiState)

  const fGalaxy = gui.addFolder(tf('starryBg.galaxy'))
  fGalaxy.add(starryGuiState.galaxy, 'uSize', 0, 4, 0.01).name(tf('starryBg.particleSize')).onChange(apply)
  fGalaxy.add(starryGuiState.galaxy, 'uBranches', 1, 5, 1).name(tf('starryBg.branches')).onChange(apply)
  fGalaxy.add(starryGuiState.galaxy, 'uRadius', 0, 8, 0.01).name(tf('starryBg.radius')).onChange(apply)
  fGalaxy.add(starryGuiState.galaxy, 'uSpin', -12.57, 12.57, 0.01).name(tf('starryBg.spin')).onChange(apply)
  fGalaxy.add(starryGuiState.galaxy, 'uRandomness', 0, 1, 0.01).name(tf('starryBg.randomness')).onChange(apply)
  fGalaxy.add(starryGuiState, 'elevation', 0, 90, 1).name(tf('starryBg.viewAngle')).onChange(apply)
  fGalaxy.add(starryGuiState, 'camZoom', 1.5, 25, 0.01).name(tf('starryBg.zoom') ?? '缩放').onChange(apply)
  fGalaxy.open()

  const fBreath = gui.addFolder(tf('starryBg.colorBreath'))
  fBreath.add(starryGuiState.colorBreath, 'enabled').name(tf('starryBg.enabled')).onChange(apply)
  fBreath.add(starryGuiState.galaxy, 'uCycleSpeed', 0.1, 5, 0.01).name(tf('starryBg.cycleSpeed')).onChange(apply)

  const fSupernova = gui.addFolder(tf('starryBg.supernova'))
  fSupernova.add(starryGuiState.supernova, 'enabled').name(tf('starryBg.enabled')).onChange(apply)
  fSupernova.add(starryGuiState.supernova, 'frequency', 0.1, 3, 0.1).name(tf('starryBg.frequency')).onChange(apply)
  fSupernova.add(starryGuiState.supernova, 'opacity', 0, 1, 0.01).name(tf('starryBg.opacity') ?? '透明度').onChange(apply)

  const fNebula = gui.addFolder(tf('starryBg.nebula'))
  fNebula.add(starryGuiState.nebula, 'enabled').name(tf('starryBg.enabled')).onChange(apply)
  fNebula.add(starryGuiState.nebula, 'count', 1, 6, 1).name(tf('starryBg.count')).onChange(apply)
  fNebula.add(starryGuiState.nebula, 'opacity', 0, 1, 0.01).name(tf('starryBg.opacity')).onChange(apply)

  const fTwinkle = gui.addFolder(tf('starryBg.twinkle'))
  fTwinkle.add(starryGuiState.twinkle, 'enabled').name(tf('starryBg.enabled')).onChange(apply)
  fTwinkle.add(starryGuiState.twinkle, 'intensity', 0, 1, 0.01).name(tf('starryBg.intensity')).onChange(apply)
  fTwinkle.add(starryGuiState.twinkle, 'speed', 0.1, 3, 0.01).name(tf('starryBg.speed')).onChange(apply)

  const fStardust = gui.addFolder(tf('starryBg.stardust'))
  fStardust.add(starryGuiState.stardust, 'enabled').name(tf('starryBg.enabled')).onChange(apply)
  fStardust.add(starryGuiState.stardust, 'opacity', 0, 1, 0.01).name(tf('starryBg.opacity')).onChange(apply)

  const fCenterDim = gui.addFolder(tf('starryBg.centerDim'))
  fCenterDim.add(starryGuiState.centerDim, 'enabled').name(tf('starryBg.enabled')).onChange(apply)
  fCenterDim.add(starryGuiState.centerDim, 'startOpacity', 0, 1, 0.01).name(tf('starryBg.startOpacity')).onChange(apply)
  fCenterDim.add(starryGuiState.centerDim, 'endOpacity', 0, 1, 0.01).name(tf('starryBg.endOpacity')).onChange(apply)
  fCenterDim.add(starryGuiState.centerDim, 'radius', 0.05, 1.5, 0.01).name(tf('starryBg.radius')).onChange(apply)
  fCenterDim.add(starryGuiState.centerDim, 'period', 0.5, 20, 0.1).name(tf('starryBg.period')).onChange(apply)

  const fDisplay = gui.addFolder(tf('starryBg.display'))
  const inkProxy = { on: useStarryUiStore.getState().inkEnabled }
  fDisplay.add(inkProxy, 'on').name(tf('starryBg.inkScreen')).onChange((v) => useStarryUiStore.getState().setInkEnabled(Boolean(v)))
  const hideProxy = { on: useStarryUiStore.getState().starryHidden }
  fDisplay.add(hideProxy, 'on').name(tf('starryBg.hideStarry')).onChange((v) => {
    const enabled = Boolean(v)
    useStarryUiStore.getState().setStarryHidden(enabled)
  })
  fDisplay.open()

  const fWind = gui.addFolder(tf('projects.wind.title'))
  const windProxy = { 风力: useProjectsWindStore.getState().风力强度 }
  fWind
    .add(windProxy, '风力', 风力下限, 风力上限, 0.05)
    .name(tf('projects.wind.strength'))
    .onChange((v: number) => useProjectsWindStore.getState().设置风力强度(v))
}

const GALAXY_COUNT = 128 ** 2
const UNIVERSE_COUNT = GALAXY_COUNT / 2
const STARDUST_COUNT = 500
const BACKGROUND_COLOR = 0x05060f

const NEBULA_COLORS = [
  { r: 180, g: 60, b: 220, a: 0.6 },
  { r: 60, g: 120, b: 255, a: 0.5 },
  { r: 255, g: 80, b: 120, a: 0.4 },
  { r: 80, g: 220, b: 200, a: 0.5 },
  { r: 220, g: 160, b: 60, a: 0.4 },
  { r: 140, g: 60, b: 255, a: 0.5 },
] as const

const shaderUtils = `
  float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  vec3 scatter (vec3 seed) {
    float u = random(seed.xy);
    float v = random(seed.yz);
    float theta = u * 6.28318530718;
    float phi = acos(2.0 * v - 1.0);
    return vec3(sin(phi)*cos(theta), sin(phi)*sin(theta), cos(phi));
  }
`

const galaxyVertexShader = `
  precision highp float;
  in vec3 position; in float size; in vec3 seed;
  uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix;
  uniform float uTime; uniform float uSize; uniform float uBranches;
  uniform float uRadius; uniform float uSpin; uniform float uRandomness;
  out float vDistance;
  #define PI 3.14159265359
  #define PI2 6.28318530718
  #include <random, scatter>
  void main() {
    vec3 p = position;
    float st = sqrt(p.x); float qt = p.x * p.x; float mt = mix(st, qt, p.x);
    float angle = qt * uSpin * (2.0 - sqrt(1.0 - qt));
    float branchOffset = (PI2 / uBranches) * floor(seed.x * uBranches);
    p.x = position.x * cos(angle + branchOffset) * uRadius;
    p.z = position.x * sin(angle + branchOffset) * uRadius;
    p += scatter(seed) * random(seed.zx) * uRandomness * mt;
    p.y *= 0.5 + qt * 0.5;
    vec3 temp = p;
    float ac = cos(-uTime * (2.0 - st) * 0.5);
    float as = sin(-uTime * (2.0 - st) * 0.5);
    p.x = temp.x * ac - temp.z * as; p.z = temp.x * as + temp.z * ac;
    vDistance = mt;
    vec4 mvp = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvp;
    gl_PointSize = (10.0 * size * uSize) / -mvp.z;
  }
`

const galaxyFragmentShader = `
  precision highp float;
  #define PI 3.14159265359
  uniform vec3 uColorInn; uniform vec3 uColorOut; uniform sampler2D uAlphaMap;
  in float vDistance;
  out vec4 fragColor;
  void main() {
    vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
    float a = texture(uAlphaMap, uv).g; if (a < 0.1) discard;
    vec3 color = mix(uColorInn, uColorOut, vDistance);
    float c = step(0.99, (sin(gl_PointCoord.x * PI) + sin(gl_PointCoord.y * PI)) * 0.5);
    color = max(color, vec3(c));
    fragColor = vec4(color, a);
  }
`

const universeVertexShader = `
  precision highp float;
  in vec3 seed; in float size;
  uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix;
  uniform float uTime; uniform float uSize; uniform float uRadius;
  #define PI 3.14159265359
  #define PI2 6.28318530718
  #include <random, scatter>
  const float r = 3.0; const vec3 s = vec3(2.1, 1.3, 2.1);
  void main() {
    vec3 p = scatter(seed) * r * s;
    float q = random(seed.zx);
    for (int i = 0; i < 3; i++) q *= q;
    p *= q;
    float l = length(p) / (s.x * r);
    p = l < 0.001 ? (p / l) : p;
    vec3 temp = p; float ql = 1.0 - l;
    for (int i = 0; i < 3; i++) ql *= ql;
    float ac = cos(-uTime * ql); float as = sin(-uTime * ql);
    p.x = temp.x * ac - temp.z * as; p.z = temp.x * as + temp.z * ac;
    vec4 mvp = modelViewMatrix * vec4(p * uRadius, 1.0);
    gl_Position = projectionMatrix * mvp;
    l = (2.0 - l) * (2.0 - l);
    gl_PointSize = (r * size * uSize * l) / -mvp.z;
  }
`

const universeFragmentShader = `
  precision highp float;
  uniform sampler2D uAlphaMap;
  out vec4 fragColor;
  void main() {
    vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
    float a = texture(uAlphaMap, uv).g; if (a < 0.1) discard;
    fragColor = vec4(vec3(1.0), a);
  }
`

const stardustVertexShader = `
  precision highp float;
  in vec3 position; in float size;
  uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix;
  void main() {
    vec3 p = position;
    vec4 mvp = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvp;
    gl_PointSize = (6.0 * size) / -mvp.z;
  }
`

const stardustFragmentShader = `
  precision highp float;
  uniform sampler2D uAlphaMap;
  uniform float uOpacity;
  out vec4 fragColor;
  void main() {
    vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
    float a = texture(uAlphaMap, uv).g;
    if (a < 0.05) discard;
    fragColor = vec4(0.7, 0.8, 1.0, a * uOpacity);
  }
`

function makeAlphaMap(): THREE.CanvasTexture {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) throw new Error('无法创建 2D context')
  ctx.canvas.width = 32
  ctx.canvas.height = 32
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 32, 32)
  let grd = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  grd.addColorStop(0.0, '#fff')
  grd.addColorStop(1.0, '#000')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.rect(15, 0, 2, 32)
  ctx.fill()
  ctx.beginPath()
  ctx.rect(0, 15, 32, 2)
  ctx.fill()
  grd = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  grd.addColorStop(0.1, '#ffff')
  grd.addColorStop(0.6, '#0000')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(ctx.canvas)
}

function makeSupernovaTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 2D context')
  // 中性白径向渐变：色相完全交由每实例材质色（随机超新星颜色）决定，
  // 避免烘焙的固定橙色限制颜色范围（FP-04 根因：贴图烘焙色导致颜色不可随机）。
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.5, 'rgba(255,255,255,0.4)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

// 根因修复（FP-04）：贴图改为中性白后，色相完全由材质色决定。
// 此处生成「完全随机」色相（饱和度/亮度固定以保证观感），使每次超新星颜色随机。
export function 随机超新星颜色(): THREE.Color {
  return new THREE.Color().setHSL(Math.random(), 0.9, 0.6)
}

function makeNebulaTexture(r: number, g: number, b: number, a: number): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 2D context')
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')')
  grd.addColorStop(0.4, 'rgba(' + r + ',' + g + ',' + b + ',' + a * 0.5 + ')')
  grd.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

export function createStarryGalaxyScene(
  container: HTMLElement,
  options: StarryGalaxySceneOptions = {}
): StarryGalaxySceneApi {
  const dpr = Math.min(options.dpr ?? window.devicePixelRatio, 2)

  // 视差：背景容器固定为视口大小（inset-0），不放大、不露底。
  // 关键：相机本身倾斜俯视星空，若沿世界 Y 轴偏移，投影到屏幕会带斜向、不纯粹。
  // 因此改为沿「相机本地 up 向量」位移 —— 无论相机当前朝向如何，滚动都只产生纯上下运动、视角不变。
  let parallaxScroll = 0
  const PARALLAX_FACTOR = 0.00015
  const 视差向上向量 = new THREE.Vector3()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BACKGROUND_COLOR)

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100)
  const starryElevState = { elevation: 28 }
  const applyElevation = () => {
    const rad = (starryElevState.elevation * Math.PI) / 180
    const d = 3
    camera.position.set(0, d * Math.sin(rad), d * Math.cos(rad))
  }
  applyElevation()
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(dpr)
  renderer.setClearColor(BACKGROUND_COLOR, 1)
  container.appendChild(renderer.domElement)

  const starryControls = new OrbitControls(camera, renderer.domElement)
  starryControls.target.set(0, 0, 0)
  starryControls.enableDamping = true
  starryControls.dampingFactor = 0.08
  starryControls.enablePan = false
  // 禁用滚轮缩放：canvas 覆盖全屏，若开启会抢夺滚轮事件，
  // 与全局平滑滚动冲突导致页面无法滚动。
  // 相机距离仍可通过控制面板的「缩放」滑块调节。
  starryControls.enableZoom = false
  starryControls.minDistance = 2
  starryControls.maxDistance = 30
  starryControls.update()

  // 缩放（模拟鼠标滚轮：控制相机距离）。原在 GUI 块内，FP-05 抽离后留在场景内供 applyParams 调用。
  const camZoomState = { distance: 3 }
  const applyCamZoom = () => {
    const dir = new THREE.Vector3().copy(camera.position).normalize()
    if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1)
    camera.position.copy(dir.multiplyScalar(camZoomState.distance))
    starryControls.update()
  }

  const alphaMap = makeAlphaMap()

  const galaxyGeometry = new THREE.BufferGeometry()
  const galaxyPosition = new Float32Array(GALAXY_COUNT * 3)
  const galaxySeed = new Float32Array(GALAXY_COUNT * 3)
  const galaxySize = new Float32Array(GALAXY_COUNT)
  for (let i = 0; i < GALAXY_COUNT; i++) {
    galaxyPosition[i * 3] = i / GALAXY_COUNT
    galaxySeed[i * 3 + 0] = Math.random()
    galaxySeed[i * 3 + 1] = Math.random()
    galaxySeed[i * 3 + 2] = Math.random()
    galaxySize[i] = Math.random() * 2 + 0.5
  }
  galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(galaxyPosition, 3))
  galaxyGeometry.setAttribute('size', new THREE.BufferAttribute(galaxySize, 1))
  galaxyGeometry.setAttribute('seed', new THREE.BufferAttribute(galaxySeed, 3))

  const breathPurpleInn = new THREE.Color('#5900b3')
  const breathPurpleOut = new THREE.Color('#5ca3ff')
  const breathBlueInn = new THREE.Color('#2a4dff')
  const breathBlueOut = new THREE.Color('#66ccff')
  const currentInn = new THREE.Color()
  const currentOut = new THREE.Color()

  const galaxyUniforms: GalaxyUniforms = {
    uTime: { value: 0 },
    uSize: { value: 1.69 },
    uBranches: { value: 5 },
    uRadius: { value: 2.79 },
    uSpin: { value: 1.75 },
    uRandomness: { value: 1 },
    uAlphaMap: { value: alphaMap },
    uColorInn: { value: breathPurpleInn },
    uColorOut: { value: breathPurpleOut },
    uCycleSpeed: { value: 1.02 },
    uTwinkle: { value: 0 },
    uTwinkleSpeed: { value: 1 },
  }

  const galaxyMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: galaxyUniforms,
    vertexShader: galaxyVertexShader,
    fragmentShader: galaxyFragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const universeGeometry = new THREE.BufferGeometry()
  const universePosition = new Float32Array(UNIVERSE_COUNT * 3)
  const universeSeed = new Float32Array(UNIVERSE_COUNT * 3)
  const universeSize = new Float32Array(UNIVERSE_COUNT)
  for (let i = 0; i < UNIVERSE_COUNT; i++) {
    universeSeed[i * 3 + 0] = Math.random()
    universeSeed[i * 3 + 1] = Math.random()
    universeSeed[i * 3 + 2] = Math.random()
    universeSize[i] = Math.random() * 2 + 0.5
  }
  universeGeometry.setAttribute('position', new THREE.BufferAttribute(universePosition, 3))
  universeGeometry.setAttribute('seed', new THREE.BufferAttribute(universeSeed, 3))
  universeGeometry.setAttribute('size', new THREE.BufferAttribute(universeSize, 1))

  const universeUniforms: UniverseUniforms = {
    uTime: { value: 0 },
    uSize: galaxyUniforms.uSize,
    uRadius: galaxyUniforms.uRadius,
    uAlphaMap: galaxyUniforms.uAlphaMap,
  }

  const universeMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: universeUniforms,
    vertexShader: universeVertexShader,
    fragmentShader: universeFragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial)
  const universe = new THREE.Points(universeGeometry, universeMaterial)

  galaxy.material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <random, scatter>', shaderUtils)
    shader.vertexShader = shader.vertexShader.replace(
      'out float vDistance;',
      'out float vDistance; out float vTwinkleSeed;'
    )
    shader.vertexShader = shader.vertexShader.replace('vDistance = mt;', 'vDistance = mt; vTwinkleSeed = seed.x;')
    shader.fragmentShader = shader.fragmentShader.replace(
      'uniform vec3 uColorInn; uniform vec3 uColorOut; uniform sampler2D uAlphaMap;',
      'uniform vec3 uColorInn; uniform vec3 uColorOut; uniform sampler2D uAlphaMap; uniform float uTwinkle; uniform float uTwinkleSpeed; uniform float uTime;'
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      'in float vDistance;',
      'in float vDistance; in float vTwinkleSeed;'
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      'fragColor = vec4(color, a);',
      'float tf = 1.0 - uTwinkle * 0.5 * (1.0 + sin(uTwinkleSpeed * uTime * 3.0 + vTwinkleSeed * 6.2832)); fragColor = vec4(color, a * tf);'
    )
  }
  universe.material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <random, scatter>', shaderUtils)
  }

  scene.add(galaxy)
  scene.add(universe)

  const effState: EffectState = {
    colorBreath: { enabled: true },
    supernova: {
      enabled: true,
      frequency: DEFAULT_EFFECT_PARAMS.supernova.frequency,
      opacity: DEFAULT_EFFECT_PARAMS.supernova.opacity,
    },
    nebula: {
      enabled: true,
      count: DEFAULT_EFFECT_PARAMS.nebula.count,
      opacity: DEFAULT_EFFECT_PARAMS.nebula.opacity,
    },
    twinkle: {
      enabled: true,
      intensity: DEFAULT_EFFECT_PARAMS.twinkle.intensity,
      speed: DEFAULT_EFFECT_PARAMS.twinkle.speed,
    },
    stardust: { enabled: true, opacity: DEFAULT_EFFECT_PARAMS.stardust.opacity },
  }

  const supernovaTexture = makeSupernovaTexture()
  const supernovaList: SupernovaItem[] = []
  let supernovaNext = performance.now() + 3000

  function spawnSupernova() {
    const 颜色 = 随机超新星颜色()
    const mat = new THREE.SpriteMaterial({
      map: supernovaTexture,
      color: 颜色,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
    const sprite = new THREE.Sprite(mat)
    sprite.position.set(0, 0, 0)
    sprite.scale.set(0.1, 0.1, 1)
    scene.add(sprite)
    supernovaList.push({ obj: sprite, mat, t0: performance.now(), dur: 3000, color: 颜色 })
  }

  function updateSupernova(now: number) {
    if (!effState.supernova.enabled) return
    const freq = effState.supernova.frequency
    if (now >= supernovaNext) {
      spawnSupernova()
      supernovaNext = now + 2000 / freq + (Math.random() * 2000) / freq
    }
    for (let i = supernovaList.length - 1; i >= 0; i--) {
      const sn = supernovaList[i]
      const progress = (now - sn.t0) / sn.dur
      if (progress >= 1) {
        scene.remove(sn.obj)
        sn.mat.dispose()
        supernovaList.splice(i, 1)
        continue
      }
      const scale = 0.1 + progress * 8
      sn.obj.scale.set(scale, scale, 1)
      // 保留每实例随机色相，仅随生命周期淡出亮度；透明度另由 opacity 控制叠加淡出。
      sn.mat.color.copy(sn.color).multiplyScalar(1 - progress * 0.85)
      sn.mat.opacity = (1 - progress) * effState.supernova.opacity
    }
  }

  function clearSupernova() {
    for (let i = supernovaList.length - 1; i >= 0; i--) {
      scene.remove(supernovaList[i].obj)
      supernovaList[i].mat.dispose()
    }
    supernovaList.length = 0
  }

  const nebulaSprites: THREE.Sprite[] = []

  function createNebula(count: number) {
    removeNebula()
    for (let i = 0; i < count; i++) {
      const ci = i % NEBULA_COLORS.length
      const nc = NEBULA_COLORS[ci]
      const tex = makeNebulaTexture(nc.r, nc.g, nc.b, nc.a)
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: effState.nebula.opacity,
      })
      const sprite = new THREE.Sprite(mat)
      const angle = Math.random() * Math.PI * 2
      const radius = 5 + Math.random() * 5
      const height = (Math.random() - 0.5) * 4
      sprite.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius)
      const s = 2 + Math.random() * 3
      sprite.scale.set(s, s, 1)
      sprite.userData = {
        angle,
        radius,
        height,
        speed: 0.05 + Math.random() * 0.05,
        phase: Math.random() * 6.28,
      }
      scene.add(sprite)
      nebulaSprites.push(sprite)
    }
  }

  function removeNebula() {
    for (let i = nebulaSprites.length - 1; i >= 0; i--) {
      scene.remove(nebulaSprites[i])
      const mat = nebulaSprites[i].material
      mat.map?.dispose()
      mat.dispose()
    }
    nebulaSprites.length = 0
  }

  function updateNebula(time: number) {
    if (!effState.nebula.enabled) return
    for (let i = 0; i < nebulaSprites.length; i++) {
      const sp = nebulaSprites[i]
      const ud = sp.userData as {
        angle: number
        radius: number
        height: number
        speed: number
        phase: number
      }
      const t = time * ud.speed + ud.phase
      sp.position.x = Math.cos(t) * ud.radius
      sp.position.z = Math.sin(t * 0.7) * ud.radius
      sp.position.y = ud.height + Math.sin(t * 0.5) * 1.5
      sp.material.opacity = effState.nebula.opacity
    }
  }

  function updateTwinkle() {
    const e = effState.twinkle
    galaxyUniforms.uTwinkle.value = e.enabled ? e.intensity : 0
    galaxyUniforms.uTwinkleSpeed.value = e.speed
  }

  let stardustPoints: THREE.Points | null = null

  function createStardust() {
    removeStardust()
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(STARDUST_COUNT * 3)
    const sz = new Float32Array(STARDUST_COUNT)
    const seed = new Float32Array(STARDUST_COUNT * 3)
    for (let i = 0; i < STARDUST_COUNT; i++) {
      const theta = Math.random() * 6.2832
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 3 + Math.random() * 8
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      sz[i] = Math.random() * 3 + 1
      seed[i * 3] = Math.random()
      seed[i * 3 + 1] = Math.random()
      seed[i * 3 + 2] = Math.random()
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sz, 1))
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 3))

    const mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        uAlphaMap: { value: alphaMap },
        uOpacity: { value: effState.stardust.opacity },
      },
      vertexShader: stardustVertexShader,
      fragmentShader: stardustFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    stardustPoints = new THREE.Points(geo, mat)
    scene.add(stardustPoints)
  }

  function removeStardust() {
    if (stardustPoints) {
      scene.remove(stardustPoints)
      stardustPoints.geometry.dispose()
      if (Array.isArray(stardustPoints.material)) {
        stardustPoints.material.forEach((m) => m.dispose())
      } else {
        stardustPoints.material.dispose()
      }
      stardustPoints = null
    }
  }

  function updateStardust(time: number) {
    if (!effState.stardust.enabled || !stardustPoints) return
    const pos = stardustPoints.geometry.attributes.position.array
    for (let i = 0; i < pos.length; i += 3) {
      const t = time * 0.1 + i * 0.01
      pos[i] += Math.sin(t + i * 0.03) * 0.0005
      pos[i + 1] += Math.sin(t * 0.7 + i * 0.05) * 0.0003
      pos[i + 2] += Math.cos(t * 0.8 + i * 0.04) * 0.0005
    }
    stardustPoints.geometry.attributes.position.needsUpdate = true
    ;(stardustPoints.material as THREE.RawShaderMaterial).uniforms.uOpacity.value = effState.stardust.opacity
  }

  // --- 中心暗化 (Center Dim): 在背景中心区域压暗所有元素，形成暗井 ---
  // 不使用可见装饰球；用「黑色径向透明」贴图以 NormalBlending 叠在最上层，
  // 把该区域星点/星云/星尘的光线与颜色按比例压暗。整体压暗强度随时间做
  // 「深→浅→深」的循环呼吸（透明度渐变），而非固定不变。
  // 呼吸在两个绝对透明度之间循环：startOpacity=最浅端透明度，endOpacity=最深端透明度。
  const centerDimState = { enabled: true, startOpacity: 0.9, endOpacity: 1.0, radius: 0.6, period: 5.0 }
  let centerDim: THREE.Sprite | null = null

  // 固定最大 alpha=1 的径向渐变，实际压暗强度由 material.opacity 控制，
  // 以便逐帧做呼吸渐变而无需重建贴图。
  function createCenterDimTexture(): THREE.CanvasTexture {
    const S = 256
    const c = document.createElement('canvas')
    c.width = c.height = S
    const x = c.getContext('2d')
    if (!x) throw new Error('无法创建 2D context')
    const grd = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    grd.addColorStop(0.0, 'rgba(0,0,0,1)')
    grd.addColorStop(0.4, 'rgba(0,0,0,0.96)')
    grd.addColorStop(0.62, 'rgba(0,0,0,0.62)')
    grd.addColorStop(0.82, 'rgba(0,0,0,0.24)')
    grd.addColorStop(1.0, 'rgba(0,0,0,0)')
    x.fillStyle = grd
    x.fillRect(0, 0, S, S)
    return new THREE.CanvasTexture(c)
  }

  // 当前压暗强度随时间在 [intensity*minFactor, intensity] 间循环（深→浅→深）
  function applyCenterDim(time: number) {
    if (!centerDim) return
    const phase = (time / centerDimState.period) * Math.PI * 2
    const osc = (Math.sin(phase) + 1) / 2
    centerDim.material.opacity =
      centerDimState.startOpacity + (centerDimState.endOpacity - centerDimState.startOpacity) * osc
  }

  function createCenterDim() {
    if (centerDim) {
      scene.remove(centerDim)
      centerDim.material.map?.dispose()
      centerDim.material.dispose()
      centerDim = null
    }
    if (!centerDimState.enabled) return
    const tex = createCenterDimTexture()
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: centerDimState.startOpacity,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })
    centerDim = new THREE.Sprite(mat)
    centerDim.position.set(0, 0, 0)
    centerDim.scale.set(centerDimState.radius, centerDimState.radius, 1)
    // 高于星系/星云/星尘（renderOrder 0/10），确保把该区域所有元素压暗
    centerDim.renderOrder = 1000
    scene.add(centerDim)
  }

  // FP-05：GUI 已抽离为模块级 createStarryControlPanel()，场景不再构建它。
  // 场景只注册参数同步器（starryApplier），供 GUI 变更时把 starryGuiState 写入场景。

  // FP-05：参数同步器——把模块级 starryGuiState 写入场景内对象。
  // nebula/stardust 用本地 active 标记防止 create/remove 重复 add 导致场景对象泄漏。
  let nebulaActive = false
  let nebulaCount = -1
  let stardustActive = false
  const applyParams = () => {
    galaxyUniforms.uSize.value = starryGuiState.galaxy.uSize
    galaxyUniforms.uBranches.value = starryGuiState.galaxy.uBranches
    galaxyUniforms.uRadius.value = starryGuiState.galaxy.uRadius
    galaxyUniforms.uSpin.value = starryGuiState.galaxy.uSpin
    galaxyUniforms.uRandomness.value = starryGuiState.galaxy.uRandomness
    galaxyUniforms.uCycleSpeed.value = starryGuiState.galaxy.uCycleSpeed
    starryElevState.elevation = starryGuiState.elevation
    applyElevation()
    camZoomState.distance = starryGuiState.camZoom
    applyCamZoom()
    starryControls.update()
    effState.colorBreath.enabled = starryGuiState.colorBreath.enabled
    effState.supernova.enabled = starryGuiState.supernova.enabled
    effState.supernova.frequency = starryGuiState.supernova.frequency
    effState.supernova.opacity = starryGuiState.supernova.opacity
    effState.twinkle.enabled = starryGuiState.twinkle.enabled
    effState.twinkle.intensity = starryGuiState.twinkle.intensity
    effState.twinkle.speed = starryGuiState.twinkle.speed
    if (!starryGuiState.supernova.enabled) clearSupernova()
    effState.nebula.enabled = starryGuiState.nebula.enabled
    effState.nebula.count = starryGuiState.nebula.count
    effState.nebula.opacity = starryGuiState.nebula.opacity
    if (starryGuiState.nebula.enabled) {
      if (!nebulaActive) {
        createNebula(starryGuiState.nebula.count)
        nebulaActive = true
        nebulaCount = starryGuiState.nebula.count
      } else if (nebulaCount !== starryGuiState.nebula.count) {
        removeNebula()
        createNebula(starryGuiState.nebula.count)
        nebulaCount = starryGuiState.nebula.count
      }
    } else if (nebulaActive) {
      removeNebula()
      nebulaActive = false
    }
    effState.stardust.enabled = starryGuiState.stardust.enabled
    effState.stardust.opacity = starryGuiState.stardust.opacity
    if (starryGuiState.stardust.enabled && !stardustActive) {
      createStardust()
      stardustActive = true
    } else if (!starryGuiState.stardust.enabled && stardustActive) {
      removeStardust()
      stardustActive = false
    }
    centerDimState.enabled = starryGuiState.centerDim.enabled
    centerDimState.startOpacity = starryGuiState.centerDim.startOpacity
    centerDimState.endOpacity = starryGuiState.centerDim.endOpacity
    centerDimState.radius = starryGuiState.centerDim.radius
    centerDimState.period = starryGuiState.centerDim.period
    if (centerDim) {
      centerDim.visible = starryGuiState.centerDim.enabled
      centerDim.scale.set(starryGuiState.centerDim.radius, starryGuiState.centerDim.radius, 1)
    }
  }

  createCenterDim()
  applyParams()
  updateTwinkle()
  applyCamZoom()
  // 注册 applier：场景销毁时清空，GUI 变更时调用把状态同步进活动场景
  starryApplier = applyParams

  let lastFrameT = performance.now()
  let frames = 0
  let fpsLastT = performance.now()
  let currentFps = 0

  const resizeObserver = new ResizeObserver(() => {
    const width = container.clientWidth
    const height = container.clientHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  })
  resizeObserver.observe(container)

  const cycleStart = performance.now()

  renderer.setAnimationLoop(() => {
    const now = performance.now()
    const dt = Math.min((now - lastFrameT) / 1000, 0.1)
    lastFrameT = now
    const cycleTime = (now - cycleStart) / 1000

    galaxyUniforms.uTime.value += dt * 0.03
    universeUniforms.uTime.value += dt * 0.02

    const speed = galaxyUniforms.uCycleSpeed.value
    const factor = effState.colorBreath.enabled ? (Math.sin(cycleTime * speed) + 1) / 2 : 0
    currentInn.copy(breathPurpleInn).lerp(breathBlueInn, factor)
    currentOut.copy(breathPurpleOut).lerp(breathBlueOut, factor)
    galaxyUniforms.uColorInn.value.copy(currentInn)
    galaxyUniforms.uColorOut.value.copy(currentOut)

    updateSupernova(now)
    updateNebula(cycleTime)
    updateTwinkle()
    updateStardust(cycleTime)
    applyCenterDim(cycleTime)

    // 视差：保持相机视角不变，仅让星空沿「屏幕竖直方向」整体平移（纯上下，不倾斜）。
    // 用相机本地 up 向量作为位移方向，使无论相机当前朝向如何，滚动都只产生纯粹的上下运动。
    // 中心暗化(centerDim)与超新星(supernova)锚定在星球核心（最中间的白球），
    // 必须跟随同一偏移，否则滚动时它们会与原地固定的白球脱节。
    const 视差偏移 = parallaxScroll * PARALLAX_FACTOR
    视差向上向量.set(0, 1, 0).applyQuaternion(camera.quaternion).multiplyScalar(视差偏移)
    galaxy.position.copy(视差向上向量)
    universe.position.copy(视差向上向量)
    if (centerDim) centerDim.position.copy(视差向上向量)
    for (const sn of supernovaList) sn.obj.position.copy(视差向上向量)

    renderer.render(scene, camera)

    frames++
    if (now - fpsLastT >= 500) {
      currentFps = (frames * 1000) / (now - fpsLastT)
      frames = 0
      fpsLastT = now
    }
  })

  return {
    getFps() {
      return currentFps
    },
    setParallax(scroll: number) {
      parallaxScroll = scroll
    },
    destroy() {
      // FP-05：解绑 applier，让隐藏场景后的 GUI 变更只更新 starryGuiState 而不调场景。
      // FP-05：GUI（lil-gui）已抽离到 createStarryControlPanel，由它自行生命周期管理；场景不再销毁 GUI。
      starryApplier = null
      renderer.setAnimationLoop(null)
      resizeObserver.disconnect()
      clearSupernova()
      removeNebula()
      removeStardust()
      if (centerDim) {
        scene.remove(centerDim)
        centerDim.material.map?.dispose()
        centerDim.material.dispose()
        centerDim = null
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Points || obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else {
            obj.material.dispose()
          }
        } else if (obj instanceof THREE.Sprite) {
          obj.material.dispose()
        }
      })
      alphaMap.dispose()
      supernovaTexture.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    },
  }
}
