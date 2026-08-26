import { 配置 } from './config.js';
import { 安全读存储 } from './utils.js';

const SVG命名空间 = 'http://www.w3.org/2000/svg';

let 射击层实例 = null;

export function 获取点击射击层() {
  if (!射击层实例) {
    射击层实例 = new 点击射击层();
  }
  return 射击层实例;
}

export function 销毁点击射击层() {
  if (!射击层实例) return;
  射击层实例.销毁();
  射击层实例 = null;
}

function 随机范围(最小, 最大) {
  return 最小 + Math.random() * (最大 - 最小);
}

export class 点击射击层 {
  constructor() {
    this.启用中 = 配置.功能.点击射击 === true;
    this.音效上下文 = null;
    this.噪声缓冲 = null;
    this.容器 = null;
    this.弹孔池 = [];
    this.活跃计数 = 0;
    this.处理按下 = this.处理按下.bind(this);
    if (this.启用中) this.启动();
  }

  启动() {
    if (this.容器 || !this.启用中) return;
    this.容器 = document.createElement('div');
    this.容器.className = 'shot-layer';
    document.body.appendChild(this.容器);
    document.addEventListener('pointerdown', this.处理按下, {
      capture: true,
      passive: true
    });
  }

  处理按下(事件) {
    if (事件.pointerType === 'touch') return;
    const 弹孔 = this.取弹孔();
    if (!弹孔) return;
    // 使用页面坐标（含滚动偏移），使弹孔锚定文档内容、随页面滚动而移动
    const 页面X = 事件.clientX + window.scrollX;
    const 页面Y = 事件.clientY + window.scrollY;
    this.放置弹孔(弹孔, 页面X, 页面Y);
    this.播放枪声();
  }

  取弹孔() {
    if (this.弹孔池.length > 0) return this.弹孔池.pop();
    if (this.活跃计数 >= 配置.点击射击.最大并发弹孔) return null;
    const 新弹孔 = { 元素: this.构建弹孔(), 裂纹: null, 代际: 0 };
    新弹孔.裂纹 = 新弹孔.元素.querySelector('.shot-cracks');
    return 新弹孔;
  }

  构建弹孔() {
    const 组 = document.createElement('div');
    组.className = 'shot-hole';
    组.setAttribute('aria-hidden', 'true');

    const 闪光 = document.createElement('span');
    闪光.className = 'shot-flash';

    const 冲击环 = document.createElement('span');
    冲击环.className = 'shot-ring';

    const 核心 = document.createElement('span');
    核心.className = 'shot-core';

    const 裂纹 = document.createElementNS(SVG命名空间, 'svg');
    裂纹.classList.add('shot-cracks');

    组.appendChild(闪光);
    组.appendChild(冲击环);
    组.appendChild(裂纹);
    组.appendChild(核心);
    for (let i = 0; i < 配置.点击射击.火花数量; i++) {
      const 火花 = document.createElement('span');
      火花.className = 'shot-spark';
      组.appendChild(火花);
    }
    return 组;
  }

  放置弹孔(弹孔, x, y) {
    const 射击配置 = 配置.点击射击;
    const 组 = 弹孔.元素;
    组.style.setProperty('--shot-size', `${射击配置.弹孔尺寸}px`);
    组.style.setProperty('--shot-fade-dur', `${射击配置.复原时长}ms`);
    this.重绘裂纹(弹孔.裂纹, 射击配置.弹孔尺寸);
    for (const 子 of 组.children) {
      if (!子.classList.contains('shot-spark')) continue;
      const 角度 = Math.random() * Math.PI * 2;
      const 距离 = 随机范围(射击配置.弹孔尺寸 * 1.1, 射击配置.弹孔尺寸 * 2.6);
      子.style.setProperty('--sx', `${(Math.cos(角度) * 距离).toFixed(1)}px`);
      子.style.setProperty('--sy', `${(Math.sin(角度) * 距离).toFixed(1)}px`);
      子.style.animationDelay = `${Math.floor(随机范围(0, 60))}ms`;
    }
    组.style.left = `${x}px`;
    组.style.top = `${y}px`;
    组.style.display = '';
    void 组.offsetWidth;
    this.容器.appendChild(组);
    this.活跃计数++;
    弹孔.代际++;
    const 本轮 = 弹孔.代际;
    setTimeout(() => {
      if (弹孔.代际 === 本轮) 组.classList.add('shot-fading');
    }, 配置.点击射击.停留时长);
    setTimeout(() => {
      if (弹孔.代际 === 本轮) this.回收弹孔(弹孔);
    }, 配置.点击射击.停留时长 + 配置.点击射击.复原时长 + 100);
  }

  回收弹孔(弹孔) {
    const 组 = 弹孔.元素;
    if (组.parentNode) 组.parentNode.removeChild(组);
    组.classList.remove('shot-fading');
    this.活跃计数--;
    if (this.弹孔池.length < 配置.点击射击.最大并发弹孔) {
      this.弹孔池.push(弹孔);
    }
  }

  重绘裂纹(svg, 尺寸) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', `${-尺寸} ${-尺寸} ${尺寸 * 2} ${尺寸 * 2}`);
    const 数量 = 配置.点击射击.裂纹数量;
    let 路径数据 = '';
    for (let i = 0; i < 数量; i++) {
      let 当前角度 = (i / 数量) * Math.PI * 2 + 随机范围(-0.3, 0.3);
      let x = 0;
      let y = 0;
      const 段数 = 3;
      const 步长 = (配置.点击射击.裂纹最长长度 / 段数) * 随机范围(0.7, 1.15);
      路径数据 += 'M0 0';
      for (let s = 0; s < 段数; s++) {
        当前角度 += 随机范围(-0.35, 0.35);
        x += Math.cos(当前角度) * 步长;
        y += Math.sin(当前角度) * 步长;
        路径数据 += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
    const 路径 = document.createElementNS(SVG命名空间, 'path');
    路径.setAttribute('d', 路径数据);
    路径.setAttribute('pathLength', '100');
    svg.appendChild(路径);
  }

  确保音效上下文() {
    if (!this.音效上下文) {
      const 构造器 = window.AudioContext || window.webkitAudioContext;
      if (!构造器) return null;
      this.音效上下文 = new 构造器();
      const 长度 = Math.floor(this.音效上下文.sampleRate * 0.2);
      this.噪声缓冲 = this.音效上下文.createBuffer(
        1,
        长度,
        this.音效上下文.sampleRate
      );
      const 数据 = this.噪声缓冲.getChannelData(0);
      for (let i = 0; i < 长度; i++) {
        数据[i] = Math.random() * 2 - 1;
      }
    }
    if (this.音效上下文.state === 'suspended') this.音效上下文.resume();
    return this.音效上下文;
  }

  播放枪声() {
    if (安全读存储('soundEnabled', 'true') === 'false') return;
    const 上下文 = this.确保音效上下文();
    if (!上下文) return;
    const 音量 = 配置.点击射击.音量;
    const 现在 = 上下文.currentTime;

    const 主增益 = 上下文.createGain();
    主增益.gain.value = 音量;
    主增益.connect(上下文.destination);

    const 噪声源 = 上下文.createBufferSource();
    噪声源.buffer = this.噪声缓冲;
    const 带通 = 上下文.createBiquadFilter();
    带通.type = 'bandpass';
    带通.frequency.value = 1600;
    带通.Q.value = 0.7;
    const 噪声增益 = 上下文.createGain();
    噪声增益.gain.setValueAtTime(0.9, 现在);
    噪声增益.gain.exponentialRampToValueAtTime(0.001, 现在 + 0.16);
    噪声源.connect(带通).connect(噪声增益).connect(主增益);
    噪声源.start(现在);
    噪声源.stop(现在 + 0.2);

    const 低频 = 上下文.createOscillator();
    低频.type = 'sine';
    低频.frequency.setValueAtTime(150, 现在);
    低频.frequency.exponentialRampToValueAtTime(40, 现在 + 0.12);
    const 低频增益 = 上下文.createGain();
    低频增益.gain.setValueAtTime(0.8, 现在);
    低频增益.gain.exponentialRampToValueAtTime(0.001, 现在 + 0.14);
    低频.connect(低频增益).connect(主增益);
    低频.start(现在);
    低频.stop(现在 + 0.15);

    const 高频 = 上下文.createBufferSource();
    高频.buffer = this.噪声缓冲;
    const 高通 = 上下文.createBiquadFilter();
    高通.type = 'highpass';
    高通.frequency.value = 4500;
    const 高频增益 = 上下文.createGain();
    高频增益.gain.setValueAtTime(0.4, 现在);
    高频增益.gain.exponentialRampToValueAtTime(0.001, 现在 + 0.04);
    高频.connect(高通).connect(高频增益).connect(主增益);
    高频.start(现在);
    高频.stop(现在 + 0.05);
  }

  开关() {
    this.启用中 = !this.启用中;
    if (this.启用中) {
      this.启动();
    } else {
      this.销毁();
    }
    return this.启用中;
  }

  销毁() {
    document.removeEventListener('pointerdown', this.处理按下, {
      capture: true
    });
    if (this.容器) {
      this.容器.remove();
      this.容器 = null;
    }
    this.弹孔池 = [];
    this.活跃计数 = 0;
  }
}
