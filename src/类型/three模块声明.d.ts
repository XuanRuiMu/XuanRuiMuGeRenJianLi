/**
 * Three.js WebGPU / TSL 子模块类型声明
 * three 的 package.json 中 exports 将 './webgpu' 映射到 build/three.webgpu.js，
 * './tsl' 映射到 build/three.tsl.js。此处补充对应的 TypeScript 模块声明，
 * 使 R3F 中异步创建 WebGPURenderer 与 TSL 节点编程通过类型检查。
 */

import type * as THREE from 'three'

declare module 'three/webgpu' {
  export class WebGPURenderer {
    constructor(parameters?: THREE.WebGLRendererParameters)
    init(): Promise<void>
    render(scene: THREE.Object3D, camera: THREE.Camera): void
    setSize(width: number, height: number, updateStyle?: boolean): void
    setPixelRatio(ratio: number): void
    dispose(): void
  }

  export class PointsNodeMaterial extends THREE.PointsMaterial {
    colorNode?: unknown
    sizeNode?: unknown
    opacityNode?: unknown
    positionNode?: unknown
    constructor(
      parameters?: THREE.PointsMaterialParameters & {
        colorNode?: unknown
        sizeNode?: unknown
        opacityNode?: unknown
        positionNode?: unknown
      }
    )
  }
}

export interface TSL节点 {
  value: number | { set?: (x: number, y: number) => void; x?: number; y?: number } | unknown
  x: TSL节点
  y: TSL节点
  z: TSL节点
  w: TSL节点
  xy: TSL节点
  xz: TSL节点
  yz: TSL节点
  xyz: TSL节点
}

declare module 'three/tsl' {
  export const time: TSL节点
  export function attribute(name: string, type: string): TSL节点
  export function add(...args: (TSL节点 | number)[]): TSL节点
  export function sub(a: TSL节点 | number, b: TSL节点 | number): TSL节点
  export function mul(...args: (TSL节点 | number)[]): TSL节点
  export function div(a: TSL节点 | number, b: TSL节点 | number): TSL节点
  export function sin(arg: TSL节点 | number): TSL节点
  export function cos(arg: TSL节点 | number): TSL节点
  export function pow(a: TSL节点 | number, b: TSL节点 | number): TSL节点
  export function exp(arg: TSL节点 | number): TSL节点
  export function log(arg: TSL节点 | number): TSL节点
  export function atan(y: TSL节点 | number, x: TSL节点 | number): TSL节点
  export function length(arg: TSL节点): TSL节点
  export function distance(a: TSL节点, b: TSL节点): TSL节点
  export function smoothstep(edge0: TSL节点 | number, edge1: TSL节点 | number, x: TSL节点 | number): TSL节点
  export function mix(a: TSL节点, b: TSL节点, t: TSL节点 | number): TSL节点
  export function clamp(x: TSL节点 | number, min: TSL节点 | number, max: TSL节点 | number): TSL节点
  export function fract(arg: TSL节点 | number): TSL节点
  export function mod(a: TSL节点 | number, b: TSL节点 | number): TSL节点
  export function normalize(arg: TSL节点): TSL节点
  export function max(a: TSL节点 | number, b: TSL节点 | number): TSL节点
  export function min(a: TSL节点 | number, b: TSL节点 | number): TSL节点
  export function float(arg: number | TSL节点): TSL节点
  export function vec2(x: number | TSL节点, y: number | TSL节点): TSL节点
  export function vec3(x: number | TSL节点, y?: number | TSL节点, z?: number | TSL节点): TSL节点
  export function vec4(x: number | TSL节点, y?: number | TSL节点, z?: number | TSL节点, w?: number | TSL节点): TSL节点
  export function uniform(node: TSL节点): TSL节点
  export function color(value: string): TSL节点
  export const positionLocal: TSL节点
  export const modelViewMatrix: TSL节点
  export const projectionMatrix: TSL节点
}
