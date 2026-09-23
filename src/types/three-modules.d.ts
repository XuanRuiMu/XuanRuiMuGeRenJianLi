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

export interface TSLNode {
  value: number | { set?: (x: number, y: number) => void; x?: number; y?: number } | unknown
  x: TSLNode
  y: TSLNode
  z: TSLNode
  w: TSLNode
  xy: TSLNode
  xz: TSLNode
  yz: TSLNode
  xyz: TSLNode
}

declare module 'three/tsl' {
  export const time: TSLNode
  export function attribute(name: string, type: string): TSLNode
  export function add(...args: (TSLNode | number)[]): TSLNode
  export function sub(a: TSLNode | number, b: TSLNode | number): TSLNode
  export function mul(...args: (TSLNode | number)[]): TSLNode
  export function div(a: TSLNode | number, b: TSLNode | number): TSLNode
  export function sin(arg: TSLNode | number): TSLNode
  export function cos(arg: TSLNode | number): TSLNode
  export function pow(a: TSLNode | number, b: TSLNode | number): TSLNode
  export function exp(arg: TSLNode | number): TSLNode
  export function log(arg: TSLNode | number): TSLNode
  export function atan(y: TSLNode | number, x: TSLNode | number): TSLNode
  export function length(arg: TSLNode): TSLNode
  export function distance(a: TSLNode, b: TSLNode): TSLNode
  export function smoothstep(edge0: TSLNode | number, edge1: TSLNode | number, x: TSLNode | number): TSLNode
  export function mix(a: TSLNode, b: TSLNode, t: TSLNode | number): TSLNode
  export function clamp(x: TSLNode | number, min: TSLNode | number, max: TSLNode | number): TSLNode
  export function fract(arg: TSLNode | number): TSLNode
  export function mod(a: TSLNode | number, b: TSLNode | number): TSLNode
  export function normalize(arg: TSLNode): TSLNode
  export function max(a: TSLNode | number, b: TSLNode | number): TSLNode
  export function min(a: TSLNode | number, b: TSLNode | number): TSLNode
  export function float(arg: number | TSLNode): TSLNode
  export function vec2(x: number | TSLNode, y: number | TSLNode): TSLNode
  export function vec3(x: number | TSLNode, y?: number | TSLNode, z?: number | TSLNode): TSLNode
  export function vec4(x: TSLNode | number, y?: TSLNode | number, z?: TSLNode | number, w?: TSLNode | number): TSLNode
  export function uniform(node: TSLNode): TSLNode
  export function color(value: string): TSLNode
  export const positionLocal: TSLNode
  export const modelViewMatrix: TSLNode
  export const projectionMatrix: TSLNode
}
