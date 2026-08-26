import { 配置 } from './config.js';
import { 是触摸设备 } from './utils.js';

let 全局实例 = null;

export function 获取自定义光标() {
  if (!全局实例) {
    全局实例 = new 自定义光标();
  }
  return 全局实例;
}

export function 销毁自定义光标() {
  if (!全局实例) return;
  全局实例.销毁();
  全局实例 = null;
}

export class 自定义光标 {
  constructor() {
    this.启用中 = 配置.功能.自定义光标 && !是触摸设备();
    this.光标元素 = null;
    this.点元素 = null;
    this.鼠标X = 0;
    this.鼠标Y = 0;
    this.光标X = 0;
    this.光标Y = 0;
    this.运行中 = false;
    this.动画帧 = null;
    this.处理鼠标移动 = this.处理鼠标移动.bind(this);
    this.处理可见性变化 = this.处理可见性变化.bind(this);
    this.处理悬停进入 = this.处理悬停进入.bind(this);
    this.处理悬停离开 = this.处理悬停离开.bind(this);
    this.初始化();
  }

  初始化() {
    if (!this.启用中) {
      document.body.style.cursor = 'auto';
      return;
    }

    document.body.style.cursor = 'none';
    this.光标元素 = document.createElement('div');
    this.光标元素.className = 'cursor';
    this.点元素 = document.createElement('div');
    this.点元素.className = 'cursor-dot';
    document.body.appendChild(this.光标元素);
    document.body.appendChild(this.点元素);

    document.addEventListener('mousemove', this.处理鼠标移动);
    document.addEventListener('visibilitychange', this.处理可见性变化);
    document.addEventListener('mouseenter', this.处理悬停进入, true);
    document.addEventListener('mouseleave', this.处理悬停离开, true);
    this.启动();
  }

  处理鼠标移动(e) {
    this.鼠标X = e.clientX;
    this.鼠标Y = e.clientY;
    if (this.点元素) {
      this.点元素.style.left = `${this.鼠标X}px`;
      this.点元素.style.top = `${this.鼠标Y}px`;
    }
  }

  处理悬停进入(e) {
    if (!e.target || typeof e.target.closest !== 'function') return;
    const 目标 = e.target.closest('button, .card, a');
    if (目标 && this.光标元素) {
      this.光标元素.classList.add('hover');
    }
  }

  处理悬停离开(e) {
    if (!e.target || typeof e.target.closest !== 'function') return;
    const 目标 = e.target.closest('button, .card, a');
    if (目标 && this.光标元素) {
      this.光标元素.classList.remove('hover');
    }
  }

  启动() {
    if (this.运行中 || !this.启用中) return;
    this.运行中 = true;
    this.渲染循环();
  }

  暂停() {
    this.运行中 = false;
    if (this.动画帧) {
      cancelAnimationFrame(this.动画帧);
      this.动画帧 = null;
    }
  }

  渲染循环() {
    if (!this.运行中) return;
    const 系数 = 配置.功能.减少动画 ? 1 : 配置.光标.平滑系数;
    this.光标X += (this.鼠标X - this.光标X) * 系数;
    this.光标Y += (this.鼠标Y - this.光标Y) * 系数;
    if (this.光标元素) {
      this.光标元素.style.left = `${this.光标X}px`;
      this.光标元素.style.top = `${this.光标Y}px`;
    }
    this.动画帧 = requestAnimationFrame(() => this.渲染循环());
  }

  处理可见性变化() {
    if (document.hidden) {
      this.暂停();
    } else {
      this.启动();
    }
  }

  开关() {
    this.启用中 = !this.启用中;
    if (this.启用中) {
      this.初始化();
    } else {
      this.销毁();
      document.body.style.cursor = 'auto';
    }
    return this.启用中;
  }

  销毁() {
    this.暂停();
    document.removeEventListener('mousemove', this.处理鼠标移动);
    document.removeEventListener('visibilitychange', this.处理可见性变化);
    document.removeEventListener('mouseenter', this.处理悬停进入, true);
    document.removeEventListener('mouseleave', this.处理悬停离开, true);
    if (this.光标元素) {
      this.光标元素.remove();
      this.光标元素 = null;
    }
    if (this.点元素) {
      this.点元素.remove();
      this.点元素 = null;
    }
  }
}
