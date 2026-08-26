import { 配置 } from './config.js';

export class 粒子系统 {
  constructor(canvas, 粒子配置 = 配置.粒子) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.粒子配置 = 粒子配置;
    this.池 = [];
    this.当前颜色 = 配置.颜色.霓虹青;
    this.运行中 = false;
    this.动画帧 = null;
    this.调整尺寸 = this.调整尺寸.bind(this);
    this.处理可见性变化 = this.处理可见性变化.bind(this);
    this.初始化();
  }

  初始化() {
    this.调整尺寸();
    window.addEventListener('resize', this.调整尺寸);
    document.addEventListener('visibilitychange', this.处理可见性变化);

    for (let i = 0; i < this.粒子配置.池容量; i++) {
      this.池.push({
        活跃: false,
        类型: '环境',
        x: 0,
        y: 0,
        尺寸: 0,
        速度X: 0,
        速度Y: 0,
        不透明度: 0,
        颜色: this.当前颜色
      });
    }

    const 数量 = this.粒子配置.环境数量();
    for (let i = 0; i < 数量; i++) {
      this.生成环境粒子(i);
    }

    this.启动();
  }

  调整尺寸() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  生成环境粒子(索引) {
    const p = this.池[索引];
    p.活跃 = true;
    p.类型 = '环境';
    p.x = Math.random() * this.canvas.width;
    p.y = Math.random() * this.canvas.height;
    p.尺寸 = this.随机范围(this.粒子配置.最小尺寸, this.粒子配置.最大尺寸);
    p.速度Y = this.随机范围(this.粒子配置.最小上升速度, this.粒子配置.最大上升速度);
    p.速度X = this.随机范围(-this.粒子配置.横向漂移范围, this.粒子配置.横向漂移范围);
    p.不透明度 = this.随机范围(this.粒子配置.最小不透明度, this.粒子配置.最大不透明度);
    p.颜色 = this.当前颜色;
    return p;
  }

  生成爆炸(x, y) {
    const 颜色列表 = [配置.颜色.霓虹粉, 配置.颜色.霓虹青, 配置.颜色.霓虹黄, 配置.颜色.霓虹紫];
    for (let i = 0; i < this.粒子配置.爆炸数量; i++) {
      const p = this.获取可用粒子();
      if (!p) continue;
      p.活跃 = true;
      p.类型 = '爆炸';
      p.x = x;
      p.y = y;
      p.尺寸 = this.随机范围(2, 5);
      const 角度 = Math.random() * Math.PI * 2;
      const 速度 = this.随机范围(2, 7);
      p.速度X = Math.cos(角度) * 速度;
      p.速度Y = Math.sin(角度) * 速度;
      p.不透明度 = 1;
      p.颜色 = 颜色列表[Math.floor(Math.random() * 颜色列表.length)];
    }
    this.限制粒子总数();
  }

  获取可用粒子() {
    const 空闲 = this.池.find((p) => !p.活跃);
    if (空闲) return 空闲;
    const 最老爆炸 = this.池.find((p) => p.类型 === '爆炸');
    return 最老爆炸 || null;
  }

  限制粒子总数() {
    const 活跃粒子 = this.池.filter((p) => p.活跃);
    if (活跃粒子.length > this.粒子配置.最大总数) {
      const 爆炸粒子 = 活跃粒子.filter((p) => p.类型 === '爆炸');
      const 移除数量 = 活跃粒子.length - this.粒子配置.最大总数;
      for (let i = 0; i < 移除数量 && i < 爆炸粒子.length; i++) {
        this.重置粒子(爆炸粒子[i]);
      }
    }
  }

  重置粒子(p) {
    p.活跃 = false;
    p.类型 = '环境';
    p.不透明度 = 0;
  }

  更新粒子(p) {
    if (配置.功能.减少动画) return;

    if (p.类型 === '环境') {
      p.y -= p.速度Y;
      p.x += p.速度X;
      if (p.y < -10) {
        p.y = this.canvas.height + 10;
        p.x = Math.random() * this.canvas.width;
      }
    } else if (p.类型 === '爆炸') {
      p.x += p.速度X;
      p.y += p.速度Y;
      p.速度Y += this.粒子配置.重力;
      p.不透明度 -= this.粒子配置.爆炸衰减;
      if (p.不透明度 <= 0) {
        this.重置粒子(p);
      }
    }
  }

  绘制粒子(p) {
    if (!p.活跃 || p.不透明度 <= 0) return;
    this.ctx.save();
    this.ctx.globalAlpha = p.不透明度;
    this.ctx.fillStyle = p.颜色;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = p.颜色;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.尺寸, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  渲染循环() {
    if (!this.运行中) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.池.forEach((p) => {
      this.更新粒子(p);
      this.绘制粒子(p);
    });
    this.动画帧 = requestAnimationFrame(() => this.渲染循环());
  }

  启动() {
    if (this.运行中) return;
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

  处理可见性变化() {
    if (document.hidden) {
      this.暂停();
    } else {
      this.启动();
    }
  }

  设置颜色(颜色) {
    this.当前颜色 = 颜色;
    this.池.forEach((p) => {
      if (p.活跃 && p.类型 === '环境') {
        p.颜色 = 颜色;
      }
    });
  }

  随机范围(最小, 最大) {
    return Math.random() * (最大 - 最小) + 最小;
  }

  销毁() {
    this.暂停();
    window.removeEventListener('resize', this.调整尺寸);
    document.removeEventListener('visibilitychange', this.处理可见性变化);
  }
}
