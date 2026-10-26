import * as THREE from 'three'
import GUI from 'three/addons/libs/lil-gui.module.min.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { t as translate } from '../../国际化/翻译'
import { useXingKongKaiGuan } from '../../状态/星空开关仓库'
import { useBianQianFengLi, 风力下限, 风力上限 } from '../../状态/便签风力仓库'

export interface 星空星系场景选项 {
  dpr?: number
}

export interface 星空星系场景接口 {
  获取帧率: () => number
  destroy: () => void

  设置视差: (滚动: number) => void
}

export const 默认特效参数 = {
  supernova: { frequency: 0.5, opacity: 0.25 },
  nebula: { count: 6, opacity: 0.5 },
  twinkle: { intensity: 0.6, speed: 1.85 },
  stardust: { opacity: 1 },
} as const

interface 星系统一变量表 extends Record<string, THREE.IUniform> {
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

interface 宇宙统一变量表 extends Record<string, THREE.IUniform> {
  uTime: THREE.IUniform<number>
  uSize: THREE.IUniform<number>
  uRadius: THREE.IUniform<number>
  uAlphaMap: THREE.IUniform<THREE.Texture>
}

interface 特效状态 {
  色彩呼吸: { 启用: boolean }
  超新星: { 启用: boolean; 频率: number; opacity: number }
  星云: { 启用: boolean; count: number; opacity: number }
  闪烁: { 启用: boolean; 强度: number; 速度: number }
  星尘: { 启用: boolean; opacity: number }
}

interface 超新星项 {
  对象: THREE.Sprite
  矩阵: THREE.SpriteMaterial
  t0: number
  持续时间: number
  颜色: THREE.Color
}

export interface 星空面板状态 {
  星系: { uSize: number; uBranches: number; uRadius: number; uSpin: number; uRandomness: number; uCycleSpeed: number }
  仰角: number
  镜头缩放: number
  色彩呼吸: { 启用: boolean }
  超新星: { 启用: boolean; 频率: number; opacity: number }
  星云: { 启用: boolean; count: number; opacity: number }
  闪烁: { 启用: boolean; 强度: number; 速度: number }
  星尘: { 启用: boolean; opacity: number }
  中心变暗: { 启用: boolean; 起始不透明度: number; 结束不透明度: number; 半径: number; 周期: number }
}

const 星空面板状态值: 星空面板状态 = {
  星系: { uSize: 1.69, uBranches: 5, uRadius: 2.79, uSpin: 1.75, uRandomness: 1, uCycleSpeed: 1.02 },
  仰角: 28,
  镜头缩放: 3,
  色彩呼吸: { 启用: true },
  超新星: {
    启用: true,
    频率: 默认特效参数.supernova.frequency,
    opacity: 默认特效参数.supernova.opacity,
  },
  星云: { 启用: true, count: 默认特效参数.nebula.count, opacity: 默认特效参数.nebula.opacity },
  闪烁: {
    启用: true,
    强度: 默认特效参数.twinkle.intensity,
    速度: 默认特效参数.twinkle.speed,
  },
  星尘: { 启用: true, opacity: 默认特效参数.stardust.opacity },
  中心变暗: { 启用: true, 起始不透明度: 0.9, 结束不透明度: 1.0, 半径: 0.6, 周期: 5.0 },
}

let 星空应用器: ((s: 星空面板状态) => void) | null = null
let 星空面板控制台: GUI | null = null

export function 创建星空控制面板(): void {
  if (typeof document === 'undefined') return
  if (星空面板控制台) return
  const 翻译 = translate
  const 控制面板容器 = document.getElementById('starry-gui-slot')
  const 星空面板触发器 = document.getElementById('starry-gui-trigger')
  if (!控制面板容器) return
  控制面板容器.setAttribute('data-lenis-prevent', '')
  const 控制面板 = new GUI({ title: 翻译('starryBg.title'), width: 300, container: 控制面板容器 })
  星空面板控制台 = 控制面板
  const 控制面板样式 = 控制面板.domElement.style
  控制面板样式.position = 'relative'
  控制面板样式.width = '100%'
  控制面板样式.maxHeight = 'calc(100vh - 80px)'
  控制面板样式.overflowY = 'auto'

  const 面板安全边距 = 12
  const 夹取 = (v: number, 下限: number, 上限: number) => Math.min(Math.max(v, 下限), 上限)
  let 星空面板打开 = false
  let 上次点击X = 0
  let 上次点击Y = 0
  const 定位星图面板 = (点击X: number, 点击Y: number) => {
    控制面板容器.classList.remove('hidden')
    const 面板宽 = 控制面板容器.offsetWidth || 300
    const 面板高 = 控制面板容器.offsetHeight || 0
    控制面板容器.style.left = `${夹取(点击X, 面板安全边距, window.innerWidth - 面板宽 - 面板安全边距)}px`
    控制面板容器.style.top = `${夹取(点击Y, 面板安全边距, window.innerHeight - 面板高 - 面板安全边距)}px`
  }
  const 设置星空面板 = (open: boolean) => {
    星空面板打开 = open
    if (open) 定位星图面板(上次点击X, 上次点击Y)
    else 控制面板容器.classList.add('hidden')
    星空面板触发器?.setAttribute('aria-expanded', String(open))
  }
  const 星图文档点击 = (e: MouseEvent) => {
    const target = e.target as Node
    if (星空面板触发器 && 星空面板触发器.contains(target)) {
      e.stopPropagation()
      上次点击X = e.clientX
      上次点击Y = e.clientY
      设置星空面板(!星空面板打开)
      return
    }
    if (控制面板容器.contains(target)) return
    if (星空面板打开) 设置星空面板(false)
  }
  if (星空面板触发器) document.addEventListener('click', 星图文档点击)

  let 星空拖拽把手 = 控制面板容器.querySelector<HTMLElement>('.starry-drag-handle')
  if (!星空拖拽把手) {
    星空拖拽把手 = document.createElement('div')
    星空拖拽把手.className = 'starry-drag-handle'
    星空拖拽把手.style.cssText =
      'position:sticky;top:0;height:30px;display:flex;align-items:center;justify-content:center;cursor:grab;user-select:none;border-bottom:1px solid rgba(255,255,255,.12);font-size:12px;letter-spacing:.04em;color:#e6e8ee;background:rgba(11,14,22,.96);z-index:1'

    const 把手文字 = document.createElement('span')
    把手文字.textContent = 翻译('starryBg.dragHandle')
    星空拖拽把手.appendChild(把手文字)
    控制面板容器.insertBefore(星空拖拽把手, 控制面板容器.firstChild)
  }
  let 拖拽中 = false
  let 拖拽起始横坐标 = 0
  let 拖拽起始纵坐标 = 0
  let 面板左边界 = 0
  let 面板上边界 = 0
  const 拖拽移动 = (e: MouseEvent) => {
    if (!拖拽中) return
    控制面板容器.style.left = `${面板左边界 + e.clientX - 拖拽起始横坐标}px`
    控制面板容器.style.top = `${面板上边界 + e.clientY - 拖拽起始纵坐标}px`
  }
  const 拖拽结束 = () => {
    拖拽中 = false
    window.removeEventListener('mousemove', 拖拽移动)
    window.removeEventListener('mouseup', 拖拽结束)
  }
  星空拖拽把手.addEventListener('mousedown', (e: MouseEvent) => {
    拖拽中 = true
    拖拽起始横坐标 = e.clientX
    拖拽起始纵坐标 = e.clientY
    const 矩形 = 控制面板容器.getBoundingClientRect()
    面板左边界 = 矩形.left
    面板上边界 = 矩形.top
    window.addEventListener('mousemove', 拖拽移动)
    window.addEventListener('mouseup', 拖拽结束)
  })

  const apply = () => 星空应用器?.(星空面板状态值)

  const 星系文件夹 = 控制面板.addFolder(翻译('starryBg.galaxy'))
  星系文件夹.add(星空面板状态值.星系, 'uSize', 0, 4, 0.01).name(翻译('starryBg.particleSize')).onChange(apply)
  星系文件夹.add(星空面板状态值.星系, 'uBranches', 1, 5, 1).name(翻译('starryBg.branches')).onChange(apply)
  星系文件夹.add(星空面板状态值.星系, 'uRadius', 0, 8, 0.01).name(翻译('starryBg.radius')).onChange(apply)
  星系文件夹.add(星空面板状态值.星系, 'uSpin', -12.57, 12.57, 0.01).name(翻译('starryBg.spin')).onChange(apply)
  星系文件夹.add(星空面板状态值.星系, 'uRandomness', 0, 1, 0.01).name(翻译('starryBg.randomness')).onChange(apply)
  星系文件夹.add(星空面板状态值, '仰角', 0, 90, 1).name(翻译('starryBg.viewAngle')).onChange(apply)
  星系文件夹.add(星空面板状态值, '镜头缩放', 1.5, 25, 0.01).name(翻译('starryBg.zoom')).onChange(apply)
  星系文件夹.open()

  const 呼吸文件夹 = 控制面板.addFolder(翻译('starryBg.colorBreath'))
  呼吸文件夹.add(星空面板状态值.色彩呼吸, '启用').name(翻译('starryBg.enabled')).onChange(apply)
  呼吸文件夹.add(星空面板状态值.星系, 'uCycleSpeed', 0.1, 5, 0.01).name(翻译('starryBg.cycleSpeed')).onChange(apply)

  const 超新星文件夹 = 控制面板.addFolder(翻译('starryBg.supernova'))
  超新星文件夹.add(星空面板状态值.超新星, '启用').name(翻译('starryBg.enabled')).onChange(apply)
  超新星文件夹.add(星空面板状态值.超新星, '频率', 0.1, 3, 0.1).name(翻译('starryBg.frequency')).onChange(apply)
  超新星文件夹.add(星空面板状态值.超新星, 'opacity', 0, 1, 0.01).name(翻译('starryBg.opacity')).onChange(apply)

  const 星云文件夹 = 控制面板.addFolder(翻译('starryBg.nebula'))
  星云文件夹.add(星空面板状态值.星云, '启用').name(翻译('starryBg.enabled')).onChange(apply)
  星云文件夹.add(星空面板状态值.星云, 'count', 1, 6, 1).name(翻译('starryBg.count')).onChange(apply)
  星云文件夹.add(星空面板状态值.星云, 'opacity', 0, 1, 0.01).name(翻译('starryBg.opacity')).onChange(apply)

  const 闪烁文件夹 = 控制面板.addFolder(翻译('starryBg.twinkle'))
  闪烁文件夹.add(星空面板状态值.闪烁, '启用').name(翻译('starryBg.enabled')).onChange(apply)
  闪烁文件夹.add(星空面板状态值.闪烁, '强度', 0, 1, 0.01).name(翻译('starryBg.intensity')).onChange(apply)
  闪烁文件夹.add(星空面板状态值.闪烁, '速度', 0.1, 3, 0.01).name(翻译('starryBg.speed')).onChange(apply)

  const 星尘文件夹 = 控制面板.addFolder(翻译('starryBg.stardust'))
  星尘文件夹.add(星空面板状态值.星尘, '启用').name(翻译('starryBg.enabled')).onChange(apply)
  星尘文件夹.add(星空面板状态值.星尘, 'opacity', 0, 1, 0.01).name(翻译('starryBg.opacity')).onChange(apply)

  const 中心变暗文件夹 = 控制面板.addFolder(翻译('starryBg.centerDim'))
  中心变暗文件夹.add(星空面板状态值.中心变暗, '启用').name(翻译('starryBg.enabled')).onChange(apply)
  中心变暗文件夹
    .add(星空面板状态值.中心变暗, '起始不透明度', 0, 1, 0.01)
    .name(翻译('starryBg.startOpacity'))
    .onChange(apply)
  中心变暗文件夹
    .add(星空面板状态值.中心变暗, '结束不透明度', 0, 1, 0.01)
    .name(翻译('starryBg.endOpacity'))
    .onChange(apply)
  中心变暗文件夹.add(星空面板状态值.中心变暗, '半径', 0.05, 1.5, 0.01).name(翻译('starryBg.radius')).onChange(apply)
  中心变暗文件夹.add(星空面板状态值.中心变暗, '周期', 0.5, 20, 0.1).name(翻译('starryBg.period')).onChange(apply)

  const 显示文件夹 = 控制面板.addFolder(翻译('starryBg.display'))
  const 墨迹代理 = { on: useXingKongKaiGuan.getState().墨迹启用 }
  显示文件夹
    .add(墨迹代理, 'on')
    .name(翻译('starryBg.inkScreen'))
    .onChange((v) => useXingKongKaiGuan.getState().设置墨迹启用(Boolean(v)))
  const 隐藏代理 = { on: useXingKongKaiGuan.getState().星空隐藏 }
  显示文件夹
    .add(隐藏代理, 'on')
    .name(翻译('starryBg.hideStarry'))
    .onChange((v) => {
      const 启用 = Boolean(v)
      useXingKongKaiGuan.getState().设置星空隐藏(启用)
    })
  显示文件夹.open()

  const 风力文件夹 = 控制面板.addFolder(翻译('projects.wind.title'))
  const 风力代理 = { 风力: useBianQianFengLi.getState().风力强度 }
  风力文件夹
    .add(风力代理, '风力', 风力下限, 风力上限, 0.05)
    .name(翻译('projects.wind.strength'))
    .onChange((v: number) => useBianQianFengLi.getState().设置风力强度(v))
}

const 星系数量 = 128 ** 2
const 宇宙数量 = 星系数量 / 2
const 星尘数量 = 500
const 背景颜色 = 0x05060f

const 星云颜色表 = [
  { r: 180, g: 60, b: 220, a: 0.6 },
  { r: 60, g: 120, b: 255, a: 0.5 },
  { r: 255, g: 80, b: 120, a: 0.4 },
  { r: 80, g: 220, b: 200, a: 0.5 },
  { r: 220, g: 160, b: 60, a: 0.4 },
  { r: 140, g: 60, b: 255, a: 0.5 },
] as const

const 着色器工具 = `
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

const 星系顶点着色器 = `
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

const 星系片元着色器 = `
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

const 宇宙顶点着色器 = `
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

const 宇宙片元着色器 = `
  precision highp float;
  uniform sampler2D uAlphaMap;
  out vec4 fragColor;
  void main() {
    vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
    float a = texture(uAlphaMap, uv).g; if (a < 0.1) discard;
    fragColor = vec4(vec3(1.0), a);
  }
`

const 星尘顶点着色器 = `
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

const 星尘片元着色器 = `
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

function 生成透明度贴图(): THREE.CanvasTexture {
  const 上下文 = document.createElement('canvas').getContext('2d')
  if (!上下文) throw new Error('无法创建 2D context')
  上下文.canvas.width = 32
  上下文.canvas.height = 32
  上下文.fillStyle = '#000'
  上下文.fillRect(0, 0, 32, 32)
  let 渐变 = 上下文.createRadialGradient(16, 16, 0, 16, 16, 16)
  渐变.addColorStop(0.0, '#fff')
  渐变.addColorStop(1.0, '#000')
  上下文.fillStyle = 渐变
  上下文.beginPath()
  上下文.rect(15, 0, 2, 32)
  上下文.fill()
  上下文.beginPath()
  上下文.rect(0, 15, 32, 2)
  上下文.fill()
  渐变 = 上下文.createRadialGradient(16, 16, 0, 16, 16, 16)
  渐变.addColorStop(0.1, '#ffff')
  渐变.addColorStop(0.6, '#0000')
  上下文.fillStyle = 渐变
  上下文.fillRect(0, 0, 32, 32)
  return new THREE.CanvasTexture(上下文.canvas)
}

function 生成超新星贴图(): THREE.CanvasTexture {
  const 尺寸 = 64
  const 画布 = document.createElement('canvas')
  画布.width = 尺寸
  画布.height = 尺寸
  const 上下文 = 画布.getContext('2d')
  if (!上下文) throw new Error('无法创建 2D context')

  const 渐变 = 上下文.createRadialGradient(尺寸 / 2, 尺寸 / 2, 0, 尺寸 / 2, 尺寸 / 2, 尺寸 / 2)
  渐变.addColorStop(0, 'rgba(255,255,255,1)')
  渐变.addColorStop(0.5, 'rgba(255,255,255,0.4)')
  渐变.addColorStop(1, 'rgba(255,255,255,0)')
  上下文.fillStyle = 渐变
  上下文.fillRect(0, 0, 尺寸, 尺寸)
  return new THREE.CanvasTexture(画布)
}

export function 随机超新星颜色(): THREE.Color {
  return new THREE.Color().setHSL(Math.random(), 0.9, 0.6)
}

function 生成星云贴图(r: number, g: number, b: number, a: number): THREE.CanvasTexture {
  const 尺寸 = 128
  const 画布 = document.createElement('canvas')
  画布.width = 尺寸
  画布.height = 尺寸
  const 上下文 = 画布.getContext('2d')
  if (!上下文) throw new Error('无法创建 2D context')
  const 渐变 = 上下文.createRadialGradient(尺寸 / 2, 尺寸 / 2, 0, 尺寸 / 2, 尺寸 / 2, 尺寸 / 2)
  渐变.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')')
  渐变.addColorStop(0.4, 'rgba(' + r + ',' + g + ',' + b + ',' + a * 0.5 + ')')
  渐变.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)')
  上下文.fillStyle = 渐变
  上下文.fillRect(0, 0, 尺寸, 尺寸)
  return new THREE.CanvasTexture(画布)
}

export function 创建星空星系场景(容器: HTMLElement, 选项: 星空星系场景选项 = {}): 星空星系场景接口 {
  const 像素比 = Math.min(选项.dpr ?? window.devicePixelRatio, 2)

  let 视差滚动 = 0
  const 视差系数 = 0.00015
  const 视差向上向量 = new THREE.Vector3()

  const 场景 = new THREE.Scene()
  场景.background = new THREE.Color(背景颜色)

  const 相机 = new THREE.PerspectiveCamera(60, 容器.clientWidth / 容器.clientHeight, 0.1, 100)
  const 星空仰角状态 = { elevation: 28 }
  const 应用仰角 = () => {
    const 弧度 = (星空仰角状态.elevation * Math.PI) / 180
    const d = 3
    相机.position.set(0, d * Math.sin(弧度), d * Math.cos(弧度))
  }
  应用仰角()
  相机.lookAt(0, 0, 0)

  const 渲染器 = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  渲染器.setSize(容器.clientWidth, 容器.clientHeight)
  渲染器.setPixelRatio(像素比)
  渲染器.setClearColor(背景颜色, 1)
  容器.appendChild(渲染器.domElement)

  const 星空控制器 = new OrbitControls(相机, 渲染器.domElement)
  星空控制器.target.set(0, 0, 0)
  星空控制器.enableDamping = true
  星空控制器.dampingFactor = 0.08
  星空控制器.enablePan = false

  星空控制器.enableZoom = false
  星空控制器.minDistance = 2
  星空控制器.maxDistance = 30
  星空控制器.update()

  const 镜头缩放状态 = { distance: 3 }
  const 应用镜头缩放 = () => {
    const dir = new THREE.Vector3().copy(相机.position).normalize()
    if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1)
    相机.position.copy(dir.multiplyScalar(镜头缩放状态.distance))
    星空控制器.update()
  }

  const 透明度贴图 = 生成透明度贴图()

  const 星系几何体 = new THREE.BufferGeometry()
  const 星系位置 = new Float32Array(星系数量 * 3)
  const 星系种子 = new Float32Array(星系数量 * 3)
  const 星系尺寸 = new Float32Array(星系数量)
  for (let i = 0; i < 星系数量; i++) {
    星系位置[i * 3] = i / 星系数量
    星系种子[i * 3 + 0] = Math.random()
    星系种子[i * 3 + 1] = Math.random()
    星系种子[i * 3 + 2] = Math.random()
    星系尺寸[i] = Math.random() * 2 + 0.5
  }
  星系几何体.setAttribute('position', new THREE.BufferAttribute(星系位置, 3))
  星系几何体.setAttribute('size', new THREE.BufferAttribute(星系尺寸, 1))
  星系几何体.setAttribute('seed', new THREE.BufferAttribute(星系种子, 3))

  const 紫色呼吸内 = new THREE.Color('#5900b3')
  const 紫色呼吸外 = new THREE.Color('#5ca3ff')
  const 蓝色呼吸内 = new THREE.Color('#2a4dff')
  const 蓝色呼吸外 = new THREE.Color('#66ccff')
  const 当前内色 = new THREE.Color()
  const 当前外色 = new THREE.Color()

  const 星系统一变量: 星系统一变量表 = {
    uTime: { value: 0 },
    uSize: { value: 1.69 },
    uBranches: { value: 5 },
    uRadius: { value: 2.79 },
    uSpin: { value: 1.75 },
    uRandomness: { value: 1 },
    uAlphaMap: { value: 透明度贴图 },
    uColorInn: { value: 紫色呼吸内 },
    uColorOut: { value: 紫色呼吸外 },
    uCycleSpeed: { value: 1.02 },
    uTwinkle: { value: 0 },
    uTwinkleSpeed: { value: 1 },
  }

  const 星系材质 = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: 星系统一变量,
    vertexShader: 星系顶点着色器,
    fragmentShader: 星系片元着色器,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const 宇宙几何体 = new THREE.BufferGeometry()
  const 宇宙位置 = new Float32Array(宇宙数量 * 3)
  const 宇宙种子 = new Float32Array(宇宙数量 * 3)
  const 宇宙尺寸 = new Float32Array(宇宙数量)
  for (let i = 0; i < 宇宙数量; i++) {
    宇宙种子[i * 3 + 0] = Math.random()
    宇宙种子[i * 3 + 1] = Math.random()
    宇宙种子[i * 3 + 2] = Math.random()
    宇宙尺寸[i] = Math.random() * 2 + 0.5
  }
  宇宙几何体.setAttribute('position', new THREE.BufferAttribute(宇宙位置, 3))
  宇宙几何体.setAttribute('seed', new THREE.BufferAttribute(宇宙种子, 3))
  宇宙几何体.setAttribute('size', new THREE.BufferAttribute(宇宙尺寸, 1))

  const 宇宙统一变量: 宇宙统一变量表 = {
    uTime: { value: 0 },
    uSize: 星系统一变量.uSize,
    uRadius: 星系统一变量.uRadius,
    uAlphaMap: 星系统一变量.uAlphaMap,
  }

  const 宇宙材质 = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: 宇宙统一变量,
    vertexShader: 宇宙顶点着色器,
    fragmentShader: 宇宙片元着色器,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const 星系 = new THREE.Points(星系几何体, 星系材质)
  const 宇宙 = new THREE.Points(宇宙几何体, 宇宙材质)

  星系.material.onBeforeCompile = (着色器) => {
    着色器.vertexShader = 着色器.vertexShader.replace('#include <random, scatter>', 着色器工具)
    着色器.vertexShader = 着色器.vertexShader.replace(
      'out float vDistance;',
      'out float vDistance; out float vTwinkleSeed;'
    )
    着色器.vertexShader = 着色器.vertexShader.replace('vDistance = mt;', 'vDistance = mt; vTwinkleSeed = seed.x;')
    着色器.fragmentShader = 着色器.fragmentShader.replace(
      'uniform vec3 uColorInn; uniform vec3 uColorOut; uniform sampler2D uAlphaMap;',
      'uniform vec3 uColorInn; uniform vec3 uColorOut; uniform sampler2D uAlphaMap; uniform float uTwinkle; uniform float uTwinkleSpeed; uniform float uTime;'
    )
    着色器.fragmentShader = 着色器.fragmentShader.replace(
      'in float vDistance;',
      'in float vDistance; in float vTwinkleSeed;'
    )
    着色器.fragmentShader = 着色器.fragmentShader.replace(
      'fragColor = vec4(color, a);',
      'float tf = 1.0 - uTwinkle * 0.5 * (1.0 + sin(uTwinkleSpeed * uTime * 3.0 + vTwinkleSeed * 6.2832)); fragColor = vec4(color, a * tf);'
    )
  }
  宇宙.material.onBeforeCompile = (着色器) => {
    着色器.vertexShader = 着色器.vertexShader.replace('#include <random, scatter>', 着色器工具)
  }

  场景.add(星系)
  场景.add(宇宙)

  const 特效状态值: 特效状态 = {
    色彩呼吸: { 启用: true },
    超新星: {
      启用: true,
      频率: 默认特效参数.supernova.frequency,
      opacity: 默认特效参数.supernova.opacity,
    },
    星云: {
      启用: true,
      count: 默认特效参数.nebula.count,
      opacity: 默认特效参数.nebula.opacity,
    },
    闪烁: {
      启用: true,
      强度: 默认特效参数.twinkle.intensity,
      速度: 默认特效参数.twinkle.speed,
    },
    星尘: { 启用: true, opacity: 默认特效参数.stardust.opacity },
  }

  const 超新星贴图 = 生成超新星贴图()
  const 超新星表: 超新星项[] = []
  let 下个超新星 = performance.now() + 3000

  function 生成超新星() {
    const 颜色 = 随机超新星颜色()
    const 矩阵 = new THREE.SpriteMaterial({
      map: 超新星贴图,
      color: 颜色,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
    const 精灵 = new THREE.Sprite(矩阵)
    精灵.position.set(0, 0, 0)
    精灵.scale.set(0.1, 0.1, 1)
    场景.add(精灵)
    超新星表.push({ 对象: 精灵, 矩阵: 矩阵, t0: performance.now(), 持续时间: 3000, 颜色: 颜色 })
  }

  function 更新超新星(当前时刻: number) {
    if (!特效状态值.超新星.启用) return
    const 频率 = 特效状态值.超新星.频率
    if (当前时刻 >= 下个超新星) {
      生成超新星()
      下个超新星 = 当前时刻 + 2000 / 频率 + (Math.random() * 2000) / 频率
    }
    for (let i = 超新星表.length - 1; i >= 0; i--) {
      const 序号 = 超新星表[i]
      const 进度 = (当前时刻 - 序号.t0) / 序号.持续时间
      if (进度 >= 1) {
        场景.remove(序号.对象)
        序号.矩阵.dispose()
        超新星表.splice(i, 1)
        continue
      }
      const 缩放 = 0.1 + 进度 * 8
      序号.对象.scale.set(缩放, 缩放, 1)

      序号.矩阵.color.copy(序号.颜色).multiplyScalar(1 - 进度 * 0.85)
      序号.矩阵.opacity = (1 - 进度) * 特效状态值.超新星.opacity
    }
  }

  function 清空超新星() {
    for (let i = 超新星表.length - 1; i >= 0; i--) {
      场景.remove(超新星表[i].对象)
      超新星表[i].矩阵.dispose()
    }
    超新星表.length = 0
  }

  const 星云精灵表: THREE.Sprite[] = []

  function 创建星云(数量: number) {
    移除星云()
    for (let i = 0; i < 数量; i++) {
      const 颜色下标 = i % 星云颜色表.length
      const nc = 星云颜色表[颜色下标]
      const 纹理 = 生成星云贴图(nc.r, nc.g, nc.b, nc.a)
      const 矩阵 = new THREE.SpriteMaterial({
        map: 纹理,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        opacity: 特效状态值.星云.opacity,
      })
      const 精灵 = new THREE.Sprite(矩阵)
      const 角度 = Math.random() * Math.PI * 2
      const 半径 = 5 + Math.random() * 5
      const height = (Math.random() - 0.5) * 4
      精灵.position.set(Math.cos(角度) * 半径, height, Math.sin(角度) * 半径)
      const s = 2 + Math.random() * 3
      精灵.scale.set(s, s, 1)
      精灵.userData = {
        angle: 角度,
        radius: 半径,
        height,
        speed: 0.05 + Math.random() * 0.05,
        phase: Math.random() * 6.28,
      }
      场景.add(精灵)
      星云精灵表.push(精灵)
    }
  }

  function 移除星云() {
    for (let i = 星云精灵表.length - 1; i >= 0; i--) {
      场景.remove(星云精灵表[i])
      const 矩阵 = 星云精灵表[i].material
      矩阵.map?.dispose()
      矩阵.dispose()
    }
    星云精灵表.length = 0
  }

  function 更新星云(时间: number) {
    if (!特效状态值.星云.启用) return
    for (let i = 0; i < 星云精灵表.length; i++) {
      const sp = 星云精灵表[i]
      const ud = sp.userData as {
        角度: number
        半径: number
        height: number
        速度: number
        相位: number
      }
      const t = 时间 * ud.速度 + ud.相位
      sp.position.x = Math.cos(t) * ud.半径
      sp.position.z = Math.sin(t * 0.7) * ud.半径
      sp.position.y = ud.height + Math.sin(t * 0.5) * 1.5
      sp.material.opacity = 特效状态值.星云.opacity
    }
  }

  function 更新闪烁() {
    const e = 特效状态值.闪烁
    星系统一变量.uTwinkle.value = e.启用 ? e.强度 : 0
    星系统一变量.uTwinkleSpeed.value = e.速度
  }

  let 星尘点集: THREE.Points | null = null

  function 创建星尘() {
    移除星尘()
    const 几何体 = new THREE.BufferGeometry()
    const 位置 = new Float32Array(星尘数量 * 3)
    const sz = new Float32Array(星尘数量)
    const 种子 = new Float32Array(星尘数量 * 3)
    for (let i = 0; i < 星尘数量; i++) {
      const theta = Math.random() * 6.2832
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 3 + Math.random() * 8
      位置[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      位置[i * 3 + 1] = (Math.random() - 0.5) * 6
      位置[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      sz[i] = Math.random() * 3 + 1
      种子[i * 3] = Math.random()
      种子[i * 3 + 1] = Math.random()
      种子[i * 3 + 2] = Math.random()
    }
    几何体.setAttribute('position', new THREE.BufferAttribute(位置, 3))
    几何体.setAttribute('size', new THREE.BufferAttribute(sz, 1))
    几何体.setAttribute('seed', new THREE.BufferAttribute(种子, 3))

    const 矩阵 = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        uAlphaMap: { value: 透明度贴图 },
        uOpacity: { value: 特效状态值.星尘.opacity },
      },
      vertexShader: 星尘顶点着色器,
      fragmentShader: 星尘片元着色器,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    星尘点集 = new THREE.Points(几何体, 矩阵)
    场景.add(星尘点集)
  }

  function 移除星尘() {
    if (星尘点集) {
      场景.remove(星尘点集)
      星尘点集.geometry.dispose()
      if (Array.isArray(星尘点集.material)) {
        星尘点集.material.forEach((m) => m.dispose())
      } else {
        星尘点集.material.dispose()
      }
      星尘点集 = null
    }
  }

  function 更新星尘(时间: number) {
    if (!特效状态值.星尘.启用 || !星尘点集) return
    const 位置 = 星尘点集.geometry.attributes.position.array
    for (let i = 0; i < 位置.length; i += 3) {
      const t = 时间 * 0.1 + i * 0.01
      位置[i] += Math.sin(t + i * 0.03) * 0.0005
      位置[i + 1] += Math.sin(t * 0.7 + i * 0.05) * 0.0003
      位置[i + 2] += Math.cos(t * 0.8 + i * 0.04) * 0.0005
    }
    星尘点集.geometry.attributes.position.needsUpdate = true
    ;(星尘点集.material as THREE.RawShaderMaterial).uniforms.uOpacity.value = 特效状态值.星尘.opacity
  }

  const 中心变暗状态 = { enabled: true, startOpacity: 0.9, endOpacity: 1.0, radius: 0.6, period: 5.0 }
  let 中心变暗: THREE.Sprite | null = null

  function 创建中心变暗贴图(): THREE.CanvasTexture {
    const S = 256
    const c = document.createElement('canvas')
    c.width = c.height = S
    const x = c.getContext('2d')
    if (!x) throw new Error('无法创建 2D context')
    const 渐变 = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    渐变.addColorStop(0.0, 'rgba(0,0,0,1)')
    渐变.addColorStop(0.4, 'rgba(0,0,0,0.96)')
    渐变.addColorStop(0.62, 'rgba(0,0,0,0.62)')
    渐变.addColorStop(0.82, 'rgba(0,0,0,0.24)')
    渐变.addColorStop(1.0, 'rgba(0,0,0,0)')
    x.fillStyle = 渐变
    x.fillRect(0, 0, S, S)
    return new THREE.CanvasTexture(c)
  }

  function 应用中心变暗(时间: number) {
    if (!中心变暗) return
    const 相位 = (时间 / 中心变暗状态.period) * Math.PI * 2
    const 振荡 = (Math.sin(相位) + 1) / 2
    中心变暗.material.opacity = 中心变暗状态.startOpacity + (中心变暗状态.endOpacity - 中心变暗状态.startOpacity) * 振荡
  }

  function 创建中心变暗() {
    if (中心变暗) {
      场景.remove(中心变暗)
      中心变暗.material.map?.dispose()
      中心变暗.material.dispose()
      中心变暗 = null
    }
    if (!中心变暗状态.enabled) return
    const 纹理 = 创建中心变暗贴图()
    const 矩阵 = new THREE.SpriteMaterial({
      map: 纹理,
      transparent: true,
      opacity: 中心变暗状态.startOpacity,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })
    中心变暗 = new THREE.Sprite(矩阵)
    中心变暗.position.set(0, 0, 0)
    中心变暗.scale.set(中心变暗状态.radius, 中心变暗状态.radius, 1)

    中心变暗.renderOrder = 1000
    场景.add(中心变暗)
  }

  let 星云活跃 = false
  let 星云数量 = -1
  let 星尘活跃 = false
  const 应用参数 = () => {
    星系统一变量.uSize.value = 星空面板状态值.星系.uSize
    星系统一变量.uBranches.value = 星空面板状态值.星系.uBranches
    星系统一变量.uRadius.value = 星空面板状态值.星系.uRadius
    星系统一变量.uSpin.value = 星空面板状态值.星系.uSpin
    星系统一变量.uRandomness.value = 星空面板状态值.星系.uRandomness
    星系统一变量.uCycleSpeed.value = 星空面板状态值.星系.uCycleSpeed
    星空仰角状态.elevation = 星空面板状态值.仰角
    应用仰角()
    镜头缩放状态.distance = 星空面板状态值.镜头缩放
    应用镜头缩放()
    星空控制器.update()
    特效状态值.色彩呼吸.启用 = 星空面板状态值.色彩呼吸.启用
    特效状态值.超新星.启用 = 星空面板状态值.超新星.启用
    特效状态值.超新星.频率 = 星空面板状态值.超新星.频率
    特效状态值.超新星.opacity = 星空面板状态值.超新星.opacity
    特效状态值.闪烁.启用 = 星空面板状态值.闪烁.启用
    特效状态值.闪烁.强度 = 星空面板状态值.闪烁.强度
    特效状态值.闪烁.速度 = 星空面板状态值.闪烁.速度
    if (!星空面板状态值.超新星.启用) 清空超新星()
    特效状态值.星云.启用 = 星空面板状态值.星云.启用
    特效状态值.星云.count = 星空面板状态值.星云.count
    特效状态值.星云.opacity = 星空面板状态值.星云.opacity
    if (星空面板状态值.星云.启用) {
      if (!星云活跃) {
        创建星云(星空面板状态值.星云.count)
        星云活跃 = true
        星云数量 = 星空面板状态值.星云.count
      } else if (星云数量 !== 星空面板状态值.星云.count) {
        移除星云()
        创建星云(星空面板状态值.星云.count)
        星云数量 = 星空面板状态值.星云.count
      }
    } else if (星云活跃) {
      移除星云()
      星云活跃 = false
    }
    特效状态值.星尘.启用 = 星空面板状态值.星尘.启用
    特效状态值.星尘.opacity = 星空面板状态值.星尘.opacity
    if (星空面板状态值.星尘.启用 && !星尘活跃) {
      创建星尘()
      星尘活跃 = true
    } else if (!星空面板状态值.星尘.启用 && 星尘活跃) {
      移除星尘()
      星尘活跃 = false
    }
    中心变暗状态.enabled = 星空面板状态值.中心变暗.启用
    中心变暗状态.startOpacity = 星空面板状态值.中心变暗.起始不透明度
    中心变暗状态.endOpacity = 星空面板状态值.中心变暗.结束不透明度
    中心变暗状态.radius = 星空面板状态值.中心变暗.半径
    中心变暗状态.period = 星空面板状态值.中心变暗.周期
    if (中心变暗) {
      中心变暗.visible = 星空面板状态值.中心变暗.启用
      中心变暗.scale.set(星空面板状态值.中心变暗.半径, 星空面板状态值.中心变暗.半径, 1)
    }
  }

  创建中心变暗()
  应用参数()
  更新闪烁()
  应用镜头缩放()

  星空应用器 = 应用参数

  let 上次帧时刻 = performance.now()
  let 帧表 = 0
  let 帧率上次时刻 = performance.now()
  let 当前帧率 = 0

  const 尺寸观察器 = new ResizeObserver(() => {
    const width = 容器.clientWidth
    const height = 容器.clientHeight
    相机.aspect = width / height
    相机.updateProjectionMatrix()
    渲染器.setSize(width, height)
  })
  尺寸观察器.observe(容器)

  const 周期起点 = performance.now()

  渲染器.setAnimationLoop(() => {
    const 当前时刻 = performance.now()
    const 帧间隔 = Math.min((当前时刻 - 上次帧时刻) / 1000, 0.1)
    上次帧时刻 = 当前时刻
    const 周期时长 = (当前时刻 - 周期起点) / 1000

    星系统一变量.uTime.value += 帧间隔 * 0.03
    宇宙统一变量.uTime.value += 帧间隔 * 0.02

    const 速度 = 星系统一变量.uCycleSpeed.value
    const 系数 = 特效状态值.色彩呼吸.启用 ? (Math.sin(周期时长 * 速度) + 1) / 2 : 0
    当前内色.copy(紫色呼吸内).lerp(蓝色呼吸内, 系数)
    当前外色.copy(紫色呼吸外).lerp(蓝色呼吸外, 系数)
    星系统一变量.uColorInn.value.copy(当前内色)
    星系统一变量.uColorOut.value.copy(当前外色)

    更新超新星(当前时刻)
    更新星云(周期时长)
    更新闪烁()
    更新星尘(周期时长)
    应用中心变暗(周期时长)

    const 视差偏移 = 视差滚动 * 视差系数
    视差向上向量.set(0, 1, 0).applyQuaternion(相机.quaternion).multiplyScalar(视差偏移)
    星系.position.copy(视差向上向量)
    宇宙.position.copy(视差向上向量)
    if (中心变暗) 中心变暗.position.copy(视差向上向量)
    for (const 序号 of 超新星表) 序号.对象.position.copy(视差向上向量)

    渲染器.render(场景, 相机)

    帧表++
    if (当前时刻 - 帧率上次时刻 >= 500) {
      当前帧率 = (帧表 * 1000) / (当前时刻 - 帧率上次时刻)
      帧表 = 0
      帧率上次时刻 = 当前时刻
    }
  })

  return {
    获取帧率() {
      return 当前帧率
    },
    设置视差(滚动: number) {
      视差滚动 = 滚动
    },
    destroy() {
      星空应用器 = null
      渲染器.setAnimationLoop(null)
      尺寸观察器.disconnect()
      清空超新星()
      移除星云()
      移除星尘()
      if (中心变暗) {
        场景.remove(中心变暗)
        中心变暗.material.map?.dispose()
        中心变暗.material.dispose()
        中心变暗 = null
      }
      场景.traverse((对象) => {
        if (对象 instanceof THREE.Points || 对象 instanceof THREE.Mesh) {
          对象.geometry.dispose()
          if (Array.isArray(对象.material)) {
            对象.material.forEach((m) => m.dispose())
          } else {
            对象.material.dispose()
          }
        } else if (对象 instanceof THREE.Sprite) {
          对象.material.dispose()
        }
      })
      透明度贴图.dispose()
      超新星贴图.dispose()
      渲染器.dispose()
      if (渲染器.domElement.parentNode === 容器) {
        容器.removeChild(渲染器.domElement)
      }
    },
  }
}
