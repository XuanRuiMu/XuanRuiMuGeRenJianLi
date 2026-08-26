import { 配置 } from '../config.js';
import { 游戏基类 } from '../core/GameBase.js';
import { t } from '../i18n.js';
import { 创建元素, 防抖 } from '../utils.js';

export class LightningShooter extends 游戏基类 {
  constructor(选项) {
    super(选项);
    this.画布 = null;
    this.上下文 = null;
    this.动画帧 = null;
    this.游戏配置 = 配置.游戏.lightningShooter;
    this.绑定调整尺寸 = 防抖(() => this.调整尺寸(), 200);
    this.绑定处理指针移动 = (e) => this.处理指针移动(e);
    this.绑定处理键盘按下 = (e) => this.处理键盘按下(e);
    this.绑定处理键盘释放 = (e) => this.处理键盘释放(e);

    this.玩家 = { x: 0, y: 0, 倾斜: 0, 引擎相位: 0 };
    this.绘制缩放 = 1.8; // 视觉放大，不影响碰撞判定
    this.子弹列表 = [];
    this.敌机列表 = [];
    this.敌弹列表 = [];
    this.道具列表 = [];
    this.尾迹列表 = [];
    this.星空列表 = [];
    this.最后射击时间 = 0;
    this.最后敌机生成时间 = 0;
    this.最高分 = 0;
    this.键盘状态 = {};
    this.当前皮肤 = null;
    this.护盾结束时间 = 0;
    this.火力结束时间 = 0;
    this.枪口闪光 = 0;
    this.倾斜速度 = 0;
    this.子弹精灵 = {}; // 预渲染的子弹精灵缓存（性能优化）
  }

  async 初始化() {
    this.最高分 = this.状态管理器.读取(`各游戏最高分.${this.标识}`, 0);
    this.当前皮肤 = this.获取当前皮肤();
    this.渲染();
  }

  获取当前皮肤() {
    const 皮肤标识 = this.状态管理器.读取('设置.皮肤.lightningShooter', this.游戏配置.默认皮肤);
    return (
      this.游戏配置.皮肤列表.find((皮肤) => 皮肤.标识 === 皮肤标识) ?? this.游戏配置.皮肤列表[0]
    );
  }

  渲染() {
    this.容器.innerHTML = '';
    this.容器.className = 'game-instance lightning-shooter';

    this.渲染皮肤选择器();

    const 说明 = 创建元素('div', {
      class: 'game-instruction lightning-instruction',
      text: t('game.lightningShooter.instruction')
    });
    this.容器.appendChild(说明);

    this.画布包装器 = document.createElement('div');
    this.画布包装器.className = 'lightning-shooter-canvas-wrap';
    this.画布 = document.createElement('canvas');
    this.画布.setAttribute('aria-label', t('games.lightningShooter.title'));
    this.画布包装器.appendChild(this.画布);
    this.容器.appendChild(this.画布包装器);

    this.上下文 = this.画布.getContext('2d');
    this.调整尺寸();

    window.addEventListener('resize', this.绑定调整尺寸);
    this.画布.addEventListener('pointermove', this.绑定处理指针移动);
    document.addEventListener('keydown', this.绑定处理键盘按下);
    document.addEventListener('keyup', this.绑定处理键盘释放);
  }

  渲染皮肤选择器() {
    const 面板 = 创建元素('div', { class: 'skin-selector' });
    面板.appendChild(
      创建元素('span', { class: 'skin-label', text: t('game.lightningShooter.skinLabel') })
    );

    this.游戏配置.皮肤列表.forEach((皮肤) => {
      const 按钮 = 创建元素('button', {
        class: `skin-btn${皮肤.标识 === this.当前皮肤.标识 ? ' active' : ''}`,
        text: t(皮肤.名称键),
        attrs: { 'data-skin': 皮肤.标识, type: 'button' }
      });
      按钮.style.setProperty('--skin-color', 皮肤.玩家颜色);
      按钮.addEventListener('click', () => this.切换皮肤(皮肤.标识));
      面板.appendChild(按钮);
    });

    this.容器.appendChild(面板);
  }

  切换皮肤(标识) {
    const 皮肤 = this.游戏配置.皮肤列表.find((s) => s.标识 === 标识);
    if (!皮肤 || 皮肤.标识 === this.当前皮肤.标识) return;
    this.当前皮肤 = 皮肤;
    this.状态管理器.写入('设置.皮肤.lightningShooter', 标识);
    this.容器.querySelectorAll('.skin-btn').forEach((按钮) => {
      按钮.classList.toggle('active', 按钮.dataset.skin === 标识);
    });
  }

  调整尺寸() {
    if (!this.画布 || !this.上下文 || !this.画布包装器) return;
    const { width, height } = this.画布包装器.getBoundingClientRect();
    const css宽 = Math.max(1, Math.floor(width));
    const css高 = Math.max(1, Math.floor(height));
    const 基础DPR = window.devicePixelRatio || 1;
    const dpr = Math.min(3, 基础DPR * 1.8);

    this.画布.width = Math.floor(css宽 * dpr);
    this.画布.height = Math.floor(css高 * dpr);

    this.上下文.setTransform(1, 0, 0, 1, 0, 0);
    this.上下文.scale(dpr, dpr);

    this.玩家.x = css宽 / 2;
    this.玩家.y = css高 - this.游戏配置.玩家尺寸 - 24;
  }

  async 启动() {
    this.运行中 = true;
    this.已暂停 = false;
    this.重置分数();
    this.子弹列表 = [];
    this.敌机列表 = [];
    this.敌弹列表 = [];
    this.道具列表 = [];
    this.尾迹列表 = [];
    this.枪口闪光 = 0;
    this.最后敌弹生成时间 = performance.now();
    this.玩家.倾斜 = 0;
    this.玩家.引擎相位 = 0;
    this.初始化星空();
    this.最后射击时间 = performance.now();
    this.最后敌机生成时间 = performance.now();
    this.最高分 = this.状态管理器.读取(`各游戏最高分.${this.标识}`, 0);
    this.键盘状态 = {};
    this.护盾结束时间 = 0;
    this.火力结束时间 = 0;

    const { width, height } = this.画布.getBoundingClientRect();
    this.玩家.x = width / 2;
    this.玩家.y = height - this.游戏配置.玩家尺寸 - 24;

    this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
  }

  async 暂停() {
    this.已暂停 = true;
  }

  async 恢复() {
    this.已暂停 = false;
  }

  async 停止() {
    this.运行中 = false;
    this.已暂停 = false;
    if (this.动画帧) {
      cancelAnimationFrame(this.动画帧);
      this.动画帧 = null;
    }
  }

  async 销毁() {
    await this.停止();
    if (this.画布) {
      this.画布.removeEventListener('pointermove', this.绑定处理指针移动);
    }
    window.removeEventListener('resize', this.绑定调整尺寸);
    document.removeEventListener('keydown', this.绑定处理键盘按下);
    document.removeEventListener('keyup', this.绑定处理键盘释放);
    this.容器.innerHTML = '';
    this.画布 = null;
    this.上下文 = null;
    this.子弹列表 = [];
    this.敌机列表 = [];
    this.敌弹列表 = [];
    this.道具列表 = [];
  }

  结束游戏() {
    this.停止();
    super.结束游戏();
  }

  渲染循环(时间戳) {
    if (!this.运行中 || !this.上下文 || !this.画布) return;

    const { width, height } = this.画布.getBoundingClientRect();
    this.上下文.clearRect(0, 0, width, height);

    if (!this.已暂停) {
      this.更新玩家();
      this.更新子弹();
      this.更新敌机();
      this.更新敌弹();
      this.更新道具();
      this.更新尾迹();
      this.更新星空();
      this.更新效果(时间戳);

      const 射击间隔 = this.获取当前射击间隔();
      if (时间戳 - this.最后射击时间 >= 射击间隔) {
        this.发射子弹();
        this.最后射击时间 = 时间戳;
      }

      if (时间戳 - this.最后敌机生成时间 >= this.计算敌机生成间隔()) {
        this.生成敌机();
        this.最后敌机生成时间 = 时间戳;
      }

      this.检测碰撞();
    }

    this.绘制星空();
    this.绘制尾迹();
    this.绘制道具();
    this.绘制玩家();
    this.绘制子弹();
    this.绘制敌机();
    this.绘制敌弹();
    this.绘制HUD();

    this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
  }

  处理指针移动(e) {
    if (!this.运行中 || this.已暂停) return;
    const rect = this.画布.getBoundingClientRect();
    const 尺寸 = this.游戏配置.玩家尺寸;
    this.玩家.x = Math.max(尺寸, Math.min(rect.width - 尺寸, e.clientX - rect.left));
    this.玩家.y = Math.max(尺寸, Math.min(rect.height - 尺寸, e.clientY - rect.top));
  }

  处理键盘按下(e) {
    this.键盘状态[e.key] = true;
  }

  处理键盘释放(e) {
    this.键盘状态[e.key] = false;
  }

  更新玩家() {
    const 速度 = this.游戏配置.玩家速度;
    const { width, height } = this.画布.getBoundingClientRect();
    const 尺寸 = this.游戏配置.玩家尺寸;
    let 横向 = 0;

    if (this.键盘状态.ArrowLeft || this.键盘状态.a || this.键盘状态.A) {
      this.玩家.x -= 速度;
      横向 -= 1;
    }
    if (this.键盘状态.ArrowRight || this.键盘状态.d || this.键盘状态.D) {
      this.玩家.x += 速度;
      横向 += 1;
    }
    if (this.键盘状态.ArrowUp || this.键盘状态.w || this.键盘状态.W) {
      this.玩家.y -= 速度;
    }
    if (this.键盘状态.ArrowDown || this.键盘状态.s || this.键盘状态.S) {
      this.玩家.y += 速度;
    }

    this.玩家.x = Math.max(尺寸, Math.min(width - 尺寸, this.玩家.x));
    this.玩家.y = Math.max(尺寸, Math.min(height - 尺寸, this.玩家.y));

    // 侧倾：根据水平移动方向平滑过渡，营造飞行姿态
    const 目标倾斜 = 横向 * 0.42;
    this.玩家.倾斜 += (目标倾斜 - this.玩家.倾斜) * 0.2;

    // 引擎尾焰粒子（位于机尾）
    const 现在 = performance.now();
    if (!this.尾迹节流 || 现在 - this.尾迹节流 > 16) {
      this.尾迹节流 = 现在;
      const 尾长 = this.游戏配置.玩家尺寸 * this.绘制缩放 * 0.85;
      for (let i = 0; i < 2; i++) {
        this.尾迹列表.push({
          x: this.玩家.x + this.随机范围(-3, 3),
          y: this.玩家.y + 尾长,
          vx: this.随机范围(-0.3, 0.3),
          vy: this.随机范围(1.2, 2.6),
          生命: 1,
          衰减: this.随机范围(0.04, 0.07),
          尺寸: this.随机范围(2, 4)
        });
      }
    }
    this.玩家.引擎相位 += 0.3;
  }

  获取当前射击间隔() {
    if (performance.now() < this.火力结束时间) {
      return this.游戏配置.射击间隔 * this.游戏配置.道具.火力.射击间隔倍数;
    }
    return this.游戏配置.射击间隔;
  }

  发射子弹() {
    const 配置 = this.游戏配置;
    const 子弹数 = performance.now() < this.火力结束时间 ? 配置.道具.火力.子弹数量 : 1;
    const 间距 = 配置.子弹宽度 + 10;
    const 起始X = this.玩家.x - ((子弹数 - 1) * 间距) / 2;
    this.枪口闪光 = performance.now();

    for (let i = 0; i < 子弹数; i++) {
      const 横向偏移 = 子弹数 > 1 ? (i === 0 ? -1 : 1) * 0.12 : 0;
      this.子弹列表.push({
        x: 起始X + i * 间距,
        y: this.玩家.y - 配置.玩家尺寸 * this.绘制缩放 * 1.55,
        宽度: 配置.子弹宽度,
        高度: 配置.子弹高度,
        速度: 配置.子弹速度,
        偏移: 横向偏移,
        阶段: Math.random() * Math.PI * 2
      });
    }
  }

  更新子弹() {
    this.子弹列表 = this.子弹列表.filter((子弹) => {
      子弹.y -= 子弹.速度;
      if (子弹.偏移) 子弹.x += 子弹.偏移 * 1.6;
      子弹.阶段 += 0.4;
      return 子弹.y + 子弹.高度 > 0;
    });
  }

  生成敌机() {
    const { width } = this.画布.getBoundingClientRect();
    const 宽度 = this.随机范围(this.游戏配置.敌机最小宽度, this.游戏配置.敌机最大宽度);
    const 高度 = this.随机范围(this.游戏配置.敌机最小高度, this.游戏配置.敌机最大高度);
    const 颜色列表 = this.游戏配置.敌机颜色;
    const 颜色 = 颜色列表[Math.floor(Math.random() * 颜色列表.length)];

    this.敌机列表.push({
      x: Math.random() * (width - 宽度) + 宽度 / 2,
      y: -高度,
      宽度,
      高度,
      速度: this.计算敌机速度(),
      颜色,
      下次开火: performance.now() + this.随机范围(700, 1600),
      炮口闪光: 0
    });
  }

  计算难度等级() {
    return Math.floor(this.分数 / this.游戏配置.难度分数间隔);
  }

  计算敌机速度() {
    const 等级 = this.计算难度等级();
    return Math.min(this.游戏配置.敌机最大速度, this.游戏配置.敌机基础速度 + 等级 * 0.5);
  }

  计算敌机生成间隔() {
    const 等级 = this.计算难度等级();
    return Math.max(this.游戏配置.敌机最小生成间隔, this.游戏配置.敌机基础生成间隔 - 等级 * 100);
  }

  更新敌机() {
    const { height } = this.画布.getBoundingClientRect();
    const 现在 = performance.now();
    const 配置 = this.游戏配置;
    this.敌机列表 = this.敌机列表.filter((敌机) => {
      敌机.y += 敌机.速度;

      // 敌机回射：进入画面后按间隔朝玩家方向小角度发射慢速弹幕
      if (敌机.y > 0 && 现在 >= 敌机.下次开火 && Math.random() < 配置.敌机开火概率) {
        敌机.下次开火 = 现在 + 配置.敌弹间隔 * this.随机范围(0.85, 1.2);
        if (this.敌弹列表.length < this.游戏配置.敌弹上限) {
          敌机.炮口闪光 = 现在;
          const 横向差 = this.玩家.x - 敌机.x;
          const 横偏 = Math.max(-配置.敌弹最大横偏, Math.min(配置.敌弹最大横偏, 横向差 * 0.004));
          this.敌弹列表.push({
            x: 敌机.x,
            y: 敌机.y + 敌机.高度,
            宽度: 配置.敌弹宽度,
            高度: 配置.敌弹高度,
            速度: 配置.敌弹速度,
            横偏,
            阶段: Math.random() * Math.PI * 2
          });
        }
      }

      return 敌机.y < height + 敌机.高度;
    });
  }

  更新敌弹() {
    const { height } = this.画布.getBoundingClientRect();
    this.敌弹列表 = this.敌弹列表.filter((敌弹) => {
      敌弹.y += 敌弹.速度;
      敌弹.x += 敌弹.横偏;
      敌弹.阶段 += 0.3;
      return 敌弹.y - 敌弹.高度 < height;
    });
  }

  更新道具() {
    const { height } = this.画布.getBoundingClientRect();
    this.道具列表 = this.道具列表.filter((道具) => {
      道具.y += this.游戏配置.道具.下落速度;
      return 道具.y < height + this.游戏配置.道具.半径;
    });
  }

  更新效果(时间戳) {
    if (时间戳 >= this.护盾结束时间) this.护盾结束时间 = 0;
    if (时间戳 >= this.火力结束时间) this.火力结束时间 = 0;
  }

  检测碰撞() {
    const 玩家半径 = this.游戏配置.玩家尺寸;
    const 护盾生效 = performance.now() < this.护盾结束时间;

    this.敌机列表 = this.敌机列表.filter((敌机) => {
      for (let i = 0; i < this.子弹列表.length; i++) {
        const 子弹 = this.子弹列表[i];
        if (
          this.矩形相交(
            子弹.x - 子弹.宽度 / 2,
            子弹.y,
            子弹.宽度,
            子弹.高度,
            敌机.x - 敌机.宽度 / 2,
            敌机.y,
            敌机.宽度,
            敌机.高度
          )
        ) {
          this.子弹列表.splice(i, 1);
          this.增加分数(this.游戏配置.每击分数);
          this.粒子系统?.生成爆炸(敌机.x, 敌机.y + 敌机.高度 / 2);
          this.尝试生成道具(敌机);
          this.更新最高分();
          return false;
        }
      }

      const 敌机中心X = 敌机.x;
      const 敌机中心Y = 敌机.y + 敌机.高度 / 2;
      const dx = 敌机中心X - this.玩家.x;
      const dy = 敌机中心Y - this.玩家.y;
      const 距离 = Math.sqrt(dx * dx + dy * dy);
      if (距离 < 玩家半径 + Math.min(敌机.宽度, 敌机.高度) / 2) {
        if (护盾生效) {
          this.粒子系统?.生成爆炸(敌机.x, 敌机.y + 敌机.高度 / 2);
          return false;
        }
        this.结束游戏();
        return false;
      }

      return true;
    });

    // 敌弹命中玩家
    this.敌弹列表 = this.敌弹列表.filter((敌弹) => {
      const 弹心X = 敌弹.x;
      const 弹心Y = 敌弹.y + 敌弹.高度 / 2;
      const dx = 弹心X - this.玩家.x;
      const dy = 弹心Y - this.玩家.y;
      const 距离 = Math.sqrt(dx * dx + dy * dy);
      if (距离 < 玩家半径 * 0.8 + Math.min(敌弹.宽度, 敌弹.高度) / 2) {
        this.粒子系统?.生成爆炸(弹心X, 弹心Y);
        if (护盾生效) {
          return false;
        }
        this.结束游戏();
        return false;
      }
      return true;
    });

    this.道具列表 = this.道具列表.filter((道具) => {
      const dx = 道具.x - this.玩家.x;
      const dy = 道具.y - this.玩家.y;
      const 距离 = Math.sqrt(dx * dx + dy * dy);
      if (距离 < 玩家半径 + this.游戏配置.道具.半径) {
        this.激活道具(道具);
        return false;
      }
      return true;
    });
  }

  尝试生成道具(敌机) {
    if (Math.random() > this.游戏配置.道具.掉落概率) return;
    const 类型列表 = ['护盾', '火力', '清屏'];
    const 类型 = 类型列表[Math.floor(Math.random() * 类型列表.length)];
    this.道具列表.push({
      x: 敌机.x,
      y: 敌机.y + 敌机.高度 / 2,
      类型,
      颜色: this.游戏配置.道具[类型].颜色
    });
  }

  激活道具(道具) {
    const 时间戳 = performance.now();
    switch (道具.类型) {
      case '护盾':
        this.护盾结束时间 = 时间戳 + this.游戏配置.道具.护盾.持续时间;
        break;
      case '火力':
        this.火力结束时间 = 时间戳 + this.游戏配置.道具.火力.持续时间;
        break;
      case '清屏':
        this.敌机列表.forEach((敌机) => {
          this.粒子系统?.生成爆炸(敌机.x, 敌机.y + 敌机.高度 / 2);
        });
        this.分数 += this.敌机列表.length * this.游戏配置.每击分数;
        this.敌机列表 = [];
        this.敌弹列表 = [];
        this.更新最高分();
        break;
      default:
        break;
    }
  }

  矩形相交(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  初始化星空() {
    const { width, height } = this.画布包装器.getBoundingClientRect();
    const 数量 = Math.floor((width * height) / 6000);
    this.星空列表 = [];
    for (let i = 0; i < 数量; i++) {
      this.星空列表.push({
        x: Math.random() * width,
        y: Math.random() * height,
        半径: this.随机范围(0.4, 1.8),
        速度: this.随机范围(0.2, 1.4),
        亮度: this.随机范围(0.2, 0.9)
      });
    }
  }

  更新星空() {
    const { height } = this.画布.getBoundingClientRect();
    const 加速 = 1 + this.计算难度等级() * 0.15;
    for (const 星 of this.星空列表) {
      星.y += 星.速度 * 加速;
      if (星.y > height) {
        星.y = -2;
        星.x = Math.random() * this.画布包装器.getBoundingClientRect().width;
      }
    }
  }

  绘制星空() {
    const { width, height } = this.画布.getBoundingClientRect();
    const 上下文 = this.上下文;
    上下文.save();
    // 深空渐变底色
    const 渐变 = 上下文.createLinearGradient(0, 0, 0, height);
    渐变.addColorStop(0, 'rgba(8, 4, 24, 1)');
    渐变.addColorStop(1, 'rgba(20, 6, 40, 1)');
    上下文.fillStyle = 渐变;
    上下文.fillRect(0, 0, width, height);
    // 星点
    for (const 星 of this.星空列表) {
      上下文.globalAlpha = 星.亮度;
      上下文.fillStyle = '#cfe8ff';
      上下文.beginPath();
      上下文.arc(星.x, 星.y, 星.半径, 0, Math.PI * 2);
      上下文.fill();
    }
    上下文.globalAlpha = 1;
    上下文.restore();
  }

  更新尾迹() {
    this.尾迹列表 = this.尾迹列表.filter((粒子) => {
      粒子.x += 粒子.vx;
      粒子.y += 粒子.vy;
      粒子.生命 -= 粒子.衰减;
      return 粒子.生命 > 0;
    });
  }

  绘制尾迹() {
    const 上下文 = this.上下文;
    const 颜色 = this.当前皮肤.玩家颜色;
    上下文.save();
    for (const 粒子 of this.尾迹列表) {
      const a = Math.max(0, 粒子.生命);
      上下文.globalAlpha = a * 0.8;
      上下文.fillStyle = a > 0.5 ? '#ffffff' : 颜色;
      上下文.shadowBlur = 8;
      上下文.shadowColor = 颜色;
      上下文.beginPath();
      上下文.arc(粒子.x, 粒子.y, 粒子.尺寸 * a, 0, Math.PI * 2);
      上下文.fill();
    }
    上下文.globalAlpha = 1;
    上下文.shadowBlur = 0;
    上下文.restore();
  }

  绘制玩家() {
    const { x, y, 倾斜, 引擎相位 } = this.玩家;
    const 尺寸 = this.游戏配置.玩家尺寸;
    const 颜色 = this.当前皮肤.玩家颜色;
    const s = 尺寸 * this.绘制缩放;

    this.上下文.save();
    this.上下文.translate(x, y);
    this.上下文.rotate(倾斜);

    // 护盾环
    if (performance.now() < this.护盾结束时间) {
      this.上下文.save();
      this.上下文.rotate(-倾斜);
      this.上下文.beginPath();
      this.上下文.arc(0, 0, s * 1.3, 0, Math.PI * 2);
      this.上下文.strokeStyle = this.游戏配置.道具.护盾.颜色;
      this.上下文.lineWidth = 2.5;
      this.上下文.globalAlpha = 0.6;
      this.上下文.stroke();
      this.上下文.globalAlpha = 0.12;
      this.上下文.fillStyle = this.游戏配置.道具.护盾.颜色;
      this.上下文.fill();
      this.上下文.globalAlpha = 1;
      this.上下文.restore();
    }

    this.绘制喷气机外形(this.上下文, s, 颜色, 引擎相位);
    this.上下文.restore();

    // 枪口闪光（开火瞬间）
    const 距开火 = performance.now() - this.枪口闪光;
    if (距开火 < 90) {
      const 衰减 = 1 - 距开火 / 90;
      this.上下文.save();
      this.上下文.globalCompositeOperation = 'lighter';
      this.上下文.globalAlpha = 衰减;
      this.上下文.fillStyle = 颜色;
      this.上下文.shadowBlur = 20;
      this.上下文.shadowColor = 颜色;
      this.上下文.beginPath();
      this.上下文.arc(x, y - 尺寸 * this.绘制缩放 * 1.6, 尺寸 * 0.5 * 衰减 + 3, 0, Math.PI * 2);
      this.上下文.fill();
      this.上下文.restore();
    }
  }

  // 通用喷气机外形（机头朝上，本地坐标系）。玩家与敌机共用。
  绘制喷气机外形(上下文, s, 颜色, 引擎相位) {
    // 引擎尾焰（随相位脉动）
    const 火焰强度 = 0.6 + 0.4 * Math.sin(引擎相位);
    const 火焰长 = s * (1.1 + 0.5 * 火焰强度);
    上下文.save();
    上下文.globalCompositeOperation = 'lighter';
    const 焰色 = ['rgba(120,230,255,0.9)', 'rgba(80,140,255,0.7)', 'rgba(255,255,255,0.9)'];
    for (let i = 0; i < 2; i++) {
      const 焰x = (i === 0 ? -1 : 1) * s * 0.22;
      const 渐变 = 上下文.createLinearGradient(焰x, s * 0.9, 焰x, s * 0.9 + 火焰长);
      渐变.addColorStop(0, 'rgba(255,255,255,0.95)');
      渐变.addColorStop(0.4, 焰色[0]);
      渐变.addColorStop(1, 'rgba(80,140,255,0)');
      上下文.fillStyle = 渐变;
      上下文.beginPath();
      上下文.moveTo(焰x - s * 0.11, s * 0.85);
      上下文.lineTo(焰x + s * 0.11, s * 0.85);
      上下文.lineTo(焰x, s * 0.9 + 火焰长);
      上下文.closePath();
      上下文.fill();
    }
    上下文.restore();

    // 机身渐变
    const 机身渐变 = 上下文.createLinearGradient(0, -s * 1.5, 0, s * 1.1);
    机身渐变.addColorStop(0, '#ffffff');
    机身渐变.addColorStop(0.35, 颜色);
    机身渐变.addColorStop(1, 'rgba(10,10,30,0.95)');

    上下文.shadowBlur = 18;
    上下文.shadowColor = 颜色;

    // 后掠三角翼
    上下文.fillStyle = 机身渐变;
    上下文.beginPath();
    上下文.moveTo(-s * 0.42, -s * 0.1);
    上下文.lineTo(-s * 1.15, s * 0.95);
    上下文.lineTo(-s * 0.5, s * 0.55);
    上下文.lineTo(-s * 0.2, s * 0.7);
    上下文.closePath();
    上下文.fill();
    上下文.beginPath();
    上下文.moveTo(s * 0.42, -s * 0.1);
    上下文.lineTo(s * 1.15, s * 0.95);
    上下文.lineTo(s * 0.5, s * 0.55);
    上下文.lineTo(s * 0.2, s * 0.7);
    上下文.closePath();
    上下文.fill();

    // 中央机身（尖头）
    上下文.beginPath();
    上下文.moveTo(0, -s * 1.5);
    上下文.lineTo(-s * 0.45, -s * 0.2);
    上下文.lineTo(-s * 0.28, s * 0.95);
    上下文.lineTo(s * 0.28, s * 0.95);
    上下文.lineTo(s * 0.45, -s * 0.2);
    上下文.closePath();
    上下文.fill();

    // 尾翼
    上下文.beginPath();
    上下文.moveTo(-s * 0.28, s * 0.4);
    上下文.lineTo(-s * 0.62, s * 1.05);
    上下文.lineTo(-s * 0.18, s * 0.85);
    上下文.closePath();
    上下文.fill();
    上下文.beginPath();
    上下文.moveTo(s * 0.28, s * 0.4);
    上下文.lineTo(s * 0.62, s * 1.05);
    上下文.lineTo(s * 0.18, s * 0.85);
    上下文.closePath();
    上下文.fill();

    // 座舱罩
    上下文.shadowBlur = 12;
    上下文.shadowColor = '#7fe9ff';
    const 座舱渐变 = 上下文.createLinearGradient(0, -s * 0.6, 0, s * 0.1);
    座舱渐变.addColorStop(0, '#eafcff');
    座舱渐变.addColorStop(1, 'rgba(60,180,255,0.5)');
    上下文.fillStyle = 座舱渐变;
    上下文.beginPath();
    上下文.ellipse(0, -s * 0.35, s * 0.22, s * 0.42, 0, 0, Math.PI * 2);
    上下文.fill();

    // 霓虹描边
    上下文.shadowBlur = 10;
    上下文.shadowColor = 颜色;
    上下文.strokeStyle = '#ffffff';
    上下文.lineWidth = 1.5;
    上下文.globalAlpha = 0.9;
    上下文.beginPath();
    上下文.moveTo(0, -s * 1.5);
    上下文.lineTo(-s * 0.45, -s * 0.2);
    上下文.lineTo(-s * 0.28, s * 0.95);
    上下文.lineTo(s * 0.28, s * 0.95);
    上下文.lineTo(s * 0.45, -s * 0.2);
    上下文.closePath();
    上下文.stroke();
    上下文.globalAlpha = 1;

    // 机首灯
    上下文.shadowBlur = 14;
    上下文.shadowColor = '#ffffff';
    上下文.fillStyle = '#ffffff';
    上下文.beginPath();
    上下文.arc(0, -s * 1.5, s * 0.12, 0, Math.PI * 2);
    上下文.fill();
  }

  获取子弹精灵(类型) {
    const 配置 = this.游戏配置;
    const 是敌弹 = 类型 === '敌机';
    const 颜色 = 是敌弹 ? 配置.敌弹颜色 : this.当前皮肤.子弹颜色;
    const 键 = `${类型}|${颜色}`;
    if (this.子弹精灵[键]) return this.子弹精灵[键];

    const w = 是敌弹 ? 配置.敌弹宽度 : 配置.子弹宽度;
    const h = 是敌弹 ? 配置.敌弹高度 : 配置.子弹高度;
    const 拖尾因子 = 是敌弹 ? 3.2 : 2.6;
    const PAD = 16;
    const SW = Math.ceil(w * 2.2) + PAD * 2;
    const SH = Math.ceil(h * (1 + 拖尾因子)) + PAD * 2;
    const 画布 = document.createElement('canvas');
    画布.width = SW;
    画布.height = SH;
    const g = 画布.getContext('2d');
    const cx = SW / 2;
    // 玩家子弹弹头在上，敌弹弹头在下
    const 头端 = 是敌弹 ? SH - PAD : PAD;
    const 光尾 = 是敌弹 ? PAD : SH - PAD;

    g.save();
    g.globalCompositeOperation = 'lighter';

    // 外发光环（烘焙一次）
    g.globalAlpha = 0.35;
    g.fillStyle = 颜色;
    g.shadowBlur = 12;
    g.shadowColor = 颜色;
    g.beginPath();
    g.arc(cx, 头端, w * 0.95, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    // 能量拖尾（渐变长条）
    const 渐变 = g.createLinearGradient(cx, 光尾, cx, 头端);
    渐变.addColorStop(0, 'rgba(255,255,255,0)');
    渐变.addColorStop(0.55, 颜色);
    渐变.addColorStop(1, '#ffffff');
    g.fillStyle = 渐变;
    g.beginPath();
    g.moveTo(cx - w * 0.5, 头端);
    g.lineTo(cx + w * 0.5, 头端);
    g.lineTo(cx + w * 0.9, 光尾);
    g.lineTo(cx - w * 0.9, 光尾);
    g.closePath();
    g.fill();

    // 亮核
    g.shadowBlur = 8;
    g.fillStyle = '#ffffff';
    const 核高 = h * 1.6;
    const 核顶 = 是敌弹 ? 头端 - 核高 : 头端;
    g.fillRect(cx - w * 0.24, 核顶, w * 0.48, 核高);

    // 弹头亮点
    g.beginPath();
    g.arc(cx, 头端, w * 0.5, 0, Math.PI * 2);
    g.fill();

    g.restore();

    this.子弹精灵[键] = { 画布, SW, SH, PAD, 拖尾因子, h, w };
    return this.子弹精灵[键];
  }

  绘制子弹() {
    const 上下文 = this.上下文;
    const 精灵 = this.获取子弹精灵('玩家');
    const { 画布, SW, PAD } = 精灵;
    上下文.save();
    上下文.globalCompositeOperation = 'lighter';
    for (const 子弹 of this.子弹列表) {
      上下文.drawImage(画布, 子弹.x - SW / 2, 子弹.y - PAD);
    }
    上下文.restore();
  }

  绘制敌机() {
    const 现在 = performance.now();
    this.敌机列表.forEach((敌机) => {
      const s = Math.min(敌机.宽度 / 2.3, 敌机.高度 / 2.55);
      const cx = 敌机.x;
      const cy = 敌机.y + 敌机.高度 / 2;

      this.上下文.save();
      this.上下文.translate(cx, cy);
      this.上下文.scale(1, -1); // 机头朝下
      this.绘制喷气机外形(this.上下文, s, 敌机.颜色, 现在 / 110);
      this.上下文.restore();

      // 炮口闪光（开火瞬间，机头位于 cy + s*1.5 的屏幕位置）
      const 距开火 = 现在 - 敌机.炮口闪光;
      if (距开火 < 90) {
        const 衰减 = 1 - 距开火 / 90;
        this.上下文.save();
        this.上下文.globalCompositeOperation = 'lighter';
        this.上下文.globalAlpha = 衰减;
        this.上下文.fillStyle = 敌机.颜色;
        this.上下文.shadowBlur = 18;
        this.上下文.shadowColor = 敌机.颜色;
        this.上下文.beginPath();
        this.上下文.arc(cx, cy + s * 1.5, 敌机.宽度 * 0.28 * 衰减 + 2, 0, Math.PI * 2);
        this.上下文.fill();
        this.上下文.restore();
      }
    });
  }

  绘制敌弹() {
    const 上下文 = this.上下文;
    const 精灵 = this.获取子弹精灵('敌机');
    const { 画布, SW, PAD, 拖尾因子, h } = 精灵;
    上下文.save();
    上下文.globalCompositeOperation = 'lighter';
    for (const 敌弹 of this.敌弹列表) {
      const 脉冲 = 0.85 + 0.15 * Math.sin(敌弹.阶段);
      上下文.globalAlpha = 脉冲;
      上下文.drawImage(画布, 敌弹.x - SW / 2, 敌弹.y - PAD - h * 拖尾因子);
    }
    上下文.restore();
  }

  绘制道具() {
    const 半径 = this.游戏配置.道具.半径;
    this.道具列表.forEach((道具) => {
      this.上下文.save();
      this.上下文.shadowBlur = 15;
      this.上下文.shadowColor = 道具.颜色;
      this.上下文.strokeStyle = 道具.颜色;
      this.上下文.lineWidth = 2;
      this.上下文.beginPath();
      this.上下文.arc(道具.x, 道具.y, 半径, 0, Math.PI * 2);
      this.上下文.stroke();
      this.上下文.globalAlpha = 0.25;
      this.上下文.fillStyle = 道具.颜色;
      this.上下文.fill();
      this.上下文.globalAlpha = 1;
      this.上下文.fillStyle = 道具.颜色;
      const 道具字号 = Math.max(10, Math.floor(this.画布.getBoundingClientRect().height * 0.018));
      this.上下文.font = `bold ${道具字号}px "Courier New", monospace`;
      this.上下文.textAlign = 'center';
      this.上下文.textBaseline = 'middle';
      const 道具键 = { 护盾: 'shield', 火力: 'fire', 清屏: 'clear' };
      this.上下文.fillText(
        t(`game.lightningShooter.powerups.${道具键[道具.类型]}`),
        道具.x,
        道具.y
      );
      this.上下文.restore();
    });
  }

  绘制HUD() {
    const { height } = this.画布.getBoundingClientRect();
    const 字号 = Math.max(16, Math.floor(height * 0.038));
    const 效果字号 = Math.max(12, Math.floor(height * 0.026));

    this.上下文.save();
    this.上下文.fillStyle = '#fff';
    this.上下文.font = `bold ${字号}px "Courier New", monospace`;
    this.上下文.textAlign = 'left';
    this.上下文.textBaseline = 'top';
    this.上下文.shadowBlur = 10;
    this.上下文.shadowColor = '#fff';
    this.上下文.fillText(
      t('game.lightningShooter.score', { score: this.分数 }),
      字号 * 0.75,
      字号 * 0.75
    );

    const 效果 = [];
    const 现在 = performance.now();
    if (现在 < this.护盾结束时间) {
      效果.push(t('game.lightningShooter.powerups.shield'));
    }
    if (现在 < this.火力结束时间) {
      效果.push(t('game.lightningShooter.powerups.fire'));
    }
    if (效果.length > 0) {
      this.上下文.fillStyle = this.游戏配置.道具.火力.颜色;
      this.上下文.shadowColor = this.游戏配置.道具.火力.颜色;
      this.上下文.font = `bold ${效果字号}px "Courier New", monospace`;
      this.上下文.fillText(`[${效果.join('/')}]`, 字号 * 0.75, 字号 * 1.85);
    }

    this.上下文.restore();
  }

  随机范围(最小, 最大) {
    return Math.random() * (最大 - 最小) + 最小;
  }

  更新最高分() {
    if (this.分数 > this.最高分) {
      this.最高分 = this.分数;
      this.状态管理器.写入(`各游戏最高分.${this.标识}`, this.最高分);
    }
  }
}
