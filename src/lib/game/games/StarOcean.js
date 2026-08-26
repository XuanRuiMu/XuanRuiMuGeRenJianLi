import { 配置 } from '../config.js';
import { 游戏基类 } from '../core/GameBase.js';
import { t } from '../i18n.js';
import { 创建元素, 防抖 } from '../utils.js';

export class StarOcean extends 游戏基类 {
  constructor(选项) {
    super(选项);
    this.游戏配置 = 配置.游戏.starOcean;
    this.画布 = null;
    this.上下文 = null;
    this.动画帧 = null;
    this.绑定调整尺寸 = 防抖(() => this.调整尺寸(), 200);
    this.绑定处理指针移动 = (e) => this.处理指针移动(e);
    this.绑定处理指针按下 = (e) => this.处理指针按下(e);
    this.绑定处理指针释放 = () => this.处理指针释放();
    this.绑定处理键盘按下 = (e) => this.处理键盘按下(e);
    this.绑定处理键盘释放 = (e) => this.处理键盘释放(e);

    this.玩家 = { x: 0, y: 0, 无敌结束时间: 0 };
    this.星星碎片列表 = [];
    this.陨石列表 = [];
    this.敌机列表 = [];
    this.道具列表 = [];
    this.当前关卡 = 0;
    this.已收集 = 0;
    this.能量 = 100;
    this.最高分 = 0;
    this.等级 = 1;
    this.经验 = 0;
    this.升级所需经验 = this.获取升级所需经验(1);
    this.升级加成 = {
      速度: 0,
      最大能量: 0,
      磁铁半径: 0,
      护盾持续时间: 0
    };
    this.最后陨石生成时间 = 0;
    this.最后敌机生成时间 = 0;
    this.最后星星生成时间 = 0;
    this.最后道具生成时间 = 0;
    this.键盘状态 = {};
    this.指针按下 = false;
    this.指针目标 = { x: 0, y: 0 };
    this.道具状态 = {
      护盾结束时间: 0,
      磁铁结束时间: 0,
      减速结束时间: 0,
      倍分结束时间: 0
    };
    this.特效列表 = [];
    this.结算画面 = null;
  }

  async 初始化() {
    this.最高分 = this.状态管理器.读取(`各游戏最高分.${this.标识}`, 0);
    this.渲染();
  }

  渲染() {
    this.容器.innerHTML = '';
    this.容器.className = 'game-instance star-ocean';

    const 说明 = 创建元素('div', {
      class: 'game-instruction star-ocean-instruction',
      text: t('game.starOcean.instruction')
    });
    this.容器.appendChild(说明);

    const 画布容器 = 创建元素('div', { class: 'star-ocean-canvas-wrap' });
    this.画布 = document.createElement('canvas');
    this.画布.setAttribute('aria-label', t('games.starOcean.title'));
    画布容器.appendChild(this.画布);
    this.容器.appendChild(画布容器);

    this.上下文 = this.画布.getContext('2d');
    this.调整尺寸();

    this.结算画面 = this.创建结算画面();
    this.容器.appendChild(this.结算画面);

    window.addEventListener('resize', this.绑定调整尺寸);
    this.画布.addEventListener('pointerdown', this.绑定处理指针按下);
    this.画布.addEventListener('pointermove', this.绑定处理指针移动);
    this.画布.addEventListener('pointerup', this.绑定处理指针释放);
    this.画布.addEventListener('pointerleave', this.绑定处理指针释放);
    document.addEventListener('keydown', this.绑定处理键盘按下);
    document.addEventListener('keyup', this.绑定处理键盘释放);
  }

  创建结算画面() {
    const 画面 = 创建元素('div', { class: 'star-ocean-game-over hidden' });
    const 标题 = 创建元素('h2', { class: 'star-ocean-game-over-title', text: '' });
    const 结果 = 创建元素('div', { class: 'star-ocean-game-over-result', text: '' });
    const 按钮组 = 创建元素('div', { class: 'star-ocean-game-over-buttons' });
    const 下一关按钮 = 创建元素('button', {
      class: 'neon-btn cyan star-ocean-next-btn',
      text: t('game.starOcean.nextLevel')
    });
    const 重新开始按钮 = 创建元素('button', {
      class: 'neon-btn pink star-ocean-restart-btn',
      text: t('game.starOcean.restart')
    });
    下一关按钮.addEventListener('click', () => this.下一关());
    重新开始按钮.addEventListener('click', () => this.重新开始());
    按钮组.appendChild(下一关按钮);
    按钮组.appendChild(重新开始按钮);
    画面.appendChild(标题);
    画面.appendChild(结果);
    画面.appendChild(按钮组);
    return 画面;
  }

  调整尺寸() {
    if (!this.画布 || !this.上下文) return;
    const { width, height } = this.画布.parentElement.getBoundingClientRect();
    const css宽 = Math.max(1, Math.floor(width));
    const css高 = Math.max(1, Math.floor(height));
    const dpr = window.devicePixelRatio || 1;

    this.画布.width = css宽 * dpr;
    this.画布.height = css高 * dpr;

    this.上下文.setTransform(1, 0, 0, 1, 0, 0);
    this.上下文.scale(dpr, dpr);

    this.玩家.x = css宽 / 2;
    this.玩家.y = css高 / 2;
  }

  async 启动() {
    if (this.动画帧) {
      cancelAnimationFrame(this.动画帧);
      this.动画帧 = null;
    }
    this.运行中 = true;
    this.已暂停 = false;
    this.当前关卡 = 0;
    this.重置分数();
    this.重置成长();
    this.能量 = this.获取最大能量();
    this.加载关卡(this.当前关卡);
    this.结算画面.classList.add('hidden');
    this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
  }

  加载关卡(关卡索引) {
    const 关卡 = this.游戏配置.关卡列表[关卡索引];
    if (!关卡) return;

    this.已收集 = 0;
    this.星星碎片列表 = [];
    this.陨石列表 = [];
    this.敌机列表 = [];
    this.道具列表 = [];
    this.道具状态 = {
      护盾结束时间: 0,
      磁铁结束时间: 0,
      减速结束时间: 0,
      倍分结束时间: 0
    };
    this.最后陨石生成时间 = performance.now();
    this.最后敌机生成时间 = performance.now();
    this.最后星星生成时间 = performance.now();
    this.最后道具生成时间 = performance.now();

    const { width, height } = this.画布.getBoundingClientRect();
    this.玩家.x = width / 2;
    this.玩家.y = height / 2;
    this.玩家.无敌结束时间 = 0;

    this.生成初始星星碎片(关卡.目标碎片);
  }

  生成初始星星碎片(数量) {
    const { width, height } = this.画布.getBoundingClientRect();
    const 半径 = this.游戏配置.星星碎片.半径;
    for (let i = 0; i < 数量; i++) {
      this.星星碎片列表.push({
        x: this.随机范围(半径 * 3, width - 半径 * 3),
        y: this.随机范围(半径 * 3, height - 半径 * 3),
        半径: 半径,
        已收集: false
      });
    }
  }

  async 暂停() {
    this.已暂停 = true;
    this.暂停开始时间 = performance.now();
  }

  async 恢复() {
    if (!this.运行中) return;
    const 现在 = performance.now();
    const 暂停时长 = 现在 - this.暂停开始时间;
    this.最后陨石生成时间 += 暂停时长;
    this.最后敌机生成时间 += 暂停时长;
    this.最后星星生成时间 += 暂停时长;
    this.最后道具生成时间 += 暂停时长;
    this.玩家.无敌结束时间 += 暂停时长;
    this.道具状态.护盾结束时间 += 暂停时长;
    this.道具状态.磁铁结束时间 += 暂停时长;
    this.道具状态.减速结束时间 += 暂停时长;
    this.道具状态.倍分结束时间 += 暂停时长;
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
      this.画布.removeEventListener('pointerdown', this.绑定处理指针按下);
      this.画布.removeEventListener('pointermove', this.绑定处理指针移动);
      this.画布.removeEventListener('pointerup', this.绑定处理指针释放);
      this.画布.removeEventListener('pointerleave', this.绑定处理指针释放);
    }
    window.removeEventListener('resize', this.绑定调整尺寸);
    document.removeEventListener('keydown', this.绑定处理键盘按下);
    document.removeEventListener('keyup', this.绑定处理键盘释放);
    this.容器.innerHTML = '';
    this.画布 = null;
    this.上下文 = null;
  }

  结束游戏() {
    this.停止();
    super.结束游戏();
  }

  处理指针按下(e) {
    if (!this.运行中 || this.已暂停) return;
    this.指针按下 = true;
    this.更新指针目标(e);
  }

  处理指针移动(e) {
    if (!this.运行中 || this.已暂停) return;
    this.更新指针目标(e);
  }

  处理指针释放() {
    this.指针按下 = false;
  }

  更新指针目标(e) {
    const rect = this.画布.getBoundingClientRect();
    this.指针目标.x = e.clientX - rect.left;
    this.指针目标.y = e.clientY - rect.top;
  }

  处理键盘按下(e) {
    this.键盘状态[e.key] = true;
    if (this.是移动键(e.key)) e.preventDefault();
  }

  处理键盘释放(e) {
    this.键盘状态[e.key] = false;
  }

  是移动键(键) {
    return [
      'w',
      'W',
      'a',
      'A',
      's',
      'S',
      'd',
      'D',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight'
    ].includes(键);
  }

  渲染循环(时间戳) {
    if (!this.运行中 || !this.上下文 || !this.画布) return;

    if (!this.已暂停) {
      this.更新玩家();
      this.更新星星碎片();
      this.更新陨石();
      this.更新敌机();
      this.更新道具();
      this.更新特效(时间戳);
      this.检测碰撞();
      this.生成物体(时间戳);
      this.检查关卡完成();
    }

    this.绘制(时间戳);
    this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
  }

  更新玩家() {
    const 配置玩家 = this.游戏配置.玩家;
    let 速度 = this.获取玩家速度();
    const 现在 = performance.now();

    if (现在 < this.道具状态.减速结束时间) {
      速度 *= this.游戏配置.道具.减速.速度倍率;
    }

    const dt = 1 / 60;
    let dx = 0;
    let dy = 0;

    if (this.键盘状态.ArrowLeft || this.键盘状态.a || this.键盘状态.A) dx -= 1;
    if (this.键盘状态.ArrowRight || this.键盘状态.d || this.键盘状态.D) dx += 1;
    if (this.键盘状态.ArrowUp || this.键盘状态.w || this.键盘状态.W) dy -= 1;
    if (this.键盘状态.ArrowDown || this.键盘状态.s || this.键盘状态.S) dy += 1;

    if (this.指针按下) {
      const 到指针X = this.指针目标.x - this.玩家.x;
      const 到指针Y = this.指针目标.y - this.玩家.y;
      const 距离 = Math.sqrt(到指针X * 到指针X + 到指针Y * 到指针Y);
      if (距离 > 5) {
        dx = 到指针X / 距离;
        dy = 到指针Y / 距离;
      } else {
        dx = 0;
        dy = 0;
      }
    }

    if (dx !== 0 || dy !== 0) {
      const 长度 = Math.sqrt(dx * dx + dy * dy);
      if (长度 > 1) {
        dx /= 长度;
        dy /= 长度;
      }
      this.玩家.x += dx * 速度 * dt;
      this.玩家.y += dy * 速度 * dt;
    }

    const { width, height } = this.画布.getBoundingClientRect();
    const 半径 = 配置玩家.半径;
    this.玩家.x = Math.max(半径, Math.min(width - 半径, this.玩家.x));
    this.玩家.y = Math.max(半径, Math.min(height - 半径, this.玩家.y));
  }

  更新星星碎片() {
    const 现在 = performance.now();
    const 磁铁激活 = 现在 < this.道具状态.磁铁结束时间;

    this.星星碎片列表.forEach((碎片) => {
      if (磁铁激活) {
        const dx = this.玩家.x - 碎片.x;
        const dy = this.玩家.y - 碎片.y;
        const 距离 = Math.sqrt(dx * dx + dy * dy);
        if (距离 < this.获取磁铁半径() && 距离 > 5) {
          碎片.x += (dx / 距离) * 200 * (1 / 60);
          碎片.y += (dy / 距离) * 200 * (1 / 60);
        }
      }
    });
  }

  更新陨石() {
    const 关卡 = this.游戏配置.关卡列表[this.当前关卡];
    const 速度倍率 = 关卡?.速度倍率 || 1;
    const { height } = this.画布.getBoundingClientRect();

    this.陨石列表 = this.陨石列表.filter((陨石) => {
      陨石.y += 陨石.速度 * 速度倍率 * (1 / 60);
      陨石.旋转 += 陨石.旋转速度 * (1 / 60);
      return 陨石.y < height + 陨石.半径 * 2;
    });
  }

  更新敌机() {
    const 关卡 = this.游戏配置.关卡列表[this.当前关卡];
    const 速度倍率 = 关卡?.速度倍率 || 1;
    const { width, height } = this.画布.getBoundingClientRect();

    this.敌机列表 = this.敌机列表.filter((敌机) => {
      const dx = this.玩家.x - 敌机.x;
      const dy = this.玩家.y - 敌机.y;
      const 距离 = Math.sqrt(dx * dx + dy * dy);
      if (距离 > 0) {
        敌机.x += (dx / 距离) * 敌机.速度 * 速度倍率 * (1 / 60);
        敌机.y += (dy / 距离) * 敌机.速度 * 速度倍率 * (1 / 60);
      }
      return 敌机.x > -50 && 敌机.x < width + 50 && 敌机.y > -50 && 敌机.y < height + 50;
    });
  }

  更新道具() {
    const { height } = this.画布.getBoundingClientRect();
    this.道具列表 = this.道具列表.filter((道具) => {
      道具.y += 道具.速度 * (1 / 60);
      return 道具.y < height + 30;
    });
  }

  生成物体(时间戳) {
    const 关卡 = this.游戏配置.关卡列表[this.当前关卡];
    if (!关卡) return;

    if (时间戳 - this.最后陨石生成时间 >= 关卡.陨石生成间隔) {
      this.生成陨石();
      this.最后陨石生成时间 = 时间戳;
    }

    if (时间戳 - this.最后敌机生成时间 >= 关卡.敌机生成间隔) {
      this.生成敌机();
      this.最后敌机生成时间 = 时间戳;
    }

    if (时间戳 - this.最后道具生成时间 >= 8000 && Math.random() < this.游戏配置.道具.生成概率) {
      this.生成道具();
      this.最后道具生成时间 = 时间戳;
    }
  }

  生成陨石() {
    const { width } = this.画布.getBoundingClientRect();
    const 配置陨石 = this.游戏配置.陨石;
    const 类型 = this.随机加权类型(this.游戏配置.关卡列表[this.当前关卡].陨石类型权重);
    const 类型配置 = 配置陨石.类型[类型];
    const 半径 = this.随机范围(配置陨石.最小半径, 配置陨石.最大半径) * 类型配置.半径倍率;
    this.陨石列表.push({
      x: this.随机范围(半径, width - 半径),
      y: -半径 * 2,
      半径: 半径,
      速度: 配置陨石.基础速度 * 类型配置.速度倍率 * (0.8 + Math.random() * 0.4),
      伤害倍率: 类型配置.伤害倍率,
      分数: 类型配置.分数,
      类型: 类型,
      旋转: Math.random() * Math.PI * 2,
      旋转速度: (Math.random() - 0.5) * 4
    });
  }

  生成敌机() {
    const { width, height } = this.画布.getBoundingClientRect();
    const 配置敌机 = this.游戏配置.敌机;
    const 类型 = this.随机加权类型(this.游戏配置.关卡列表[this.当前关卡].敌机类型权重);
    const 类型配置 = 配置敌机.类型[类型];
    const 边 = Math.floor(Math.random() * 4);
    let x;
    let y;
    switch (边) {
      case 0:
        x = Math.random() * width;
        y = -40;
        break;
      case 1:
        x = width + 40;
        y = Math.random() * height;
        break;
      case 2:
        x = Math.random() * width;
        y = height + 40;
        break;
      default:
        x = -40;
        y = Math.random() * height;
        break;
    }
    this.敌机列表.push({
      x,
      y,
      宽度: 配置敌机.宽度 * 类型配置.生命倍率,
      高度: 配置敌机.高度 * 类型配置.生命倍率,
      速度: 配置敌机.基础速度 * 类型配置.速度倍率 * (0.9 + Math.random() * 0.2),
      伤害倍率: 类型配置.伤害倍率,
      分数: 类型配置.分数,
      类型: 类型,
      颜色: 类型配置.颜色 || 配置敌机.颜色
    });
  }

  生成道具() {
    const { width } = this.画布.getBoundingClientRect();
    const 类型列表 = ['护盾', '磁铁', '减速', '能量', '倍分', '清屏'];
    const 类型 = 类型列表[Math.floor(Math.random() * 类型列表.length)];
    const 配置道具 = this.游戏配置.道具[类型];
    this.道具列表.push({
      x: this.随机范围(20, width - 20),
      y: -30,
      类型: 类型,
      半径: 12,
      速度: 80,
      颜色: 配置道具.颜色
    });
  }

  检测碰撞() {
    const 配置玩家 = this.游戏配置.玩家;
    const 现在 = performance.now();
    const 无敌 = 现在 < this.玩家.无敌结束时间 || 现在 < this.道具状态.护盾结束时间;

    this.星星碎片列表 = this.星星碎片列表.filter((碎片) => {
      const dx = this.玩家.x - 碎片.x;
      const dy = this.玩家.y - 碎片.y;
      if (Math.sqrt(dx * dx + dy * dy) < 配置玩家.半径 + 碎片.半径 + 5) {
        this.已收集++;
        this.增加分数(10);
        this.增加经验(this.游戏配置.星星碎片.经验);
        return false;
      }
      return true;
    });

    if (!无敌) {
      this.陨石列表 = this.陨石列表.filter((陨石) => {
        const dx = this.玩家.x - 陨石.x;
        const dy = this.玩家.y - 陨石.y;
        if (Math.sqrt(dx * dx + dy * dy) < 配置玩家.半径 + 陨石.半径 * 0.7) {
          this.受击(this.游戏配置.陨石.碰撞伤害 * (陨石.伤害倍率 || 1));
          return false;
        }
        return true;
      });

      this.敌机列表 = this.敌机列表.filter((敌机) => {
        const dx = this.玩家.x - 敌机.x;
        const dy = this.玩家.y - 敌机.y;
        const 距离 = Math.sqrt(dx * dx + dy * dy);
        if (距离 < 配置玩家.半径 + Math.max(敌机.宽度, 敌机.高度) * 0.4) {
          this.受击(this.游戏配置.敌机.碰撞伤害 * (敌机.伤害倍率 || 1));
          return false;
        }
        return true;
      });
    }

    this.道具列表 = this.道具列表.filter((道具) => {
      const dx = this.玩家.x - 道具.x;
      const dy = this.玩家.y - 道具.y;
      if (Math.sqrt(dx * dx + dy * dy) < 配置玩家.半径 + 道具.半径 + 5) {
        this.激活道具(道具.类型);
        return false;
      }
      return true;
    });
  }

  受击(伤害) {
    this.能量 -= 伤害;
    this.玩家.无敌结束时间 = performance.now() + this.游戏配置.玩家.无敌时间;
    if (this.能量 <= 0) {
      this.能量 = 0;
      this.显示结算(false);
      this.结束游戏();
    }
  }

  增加分数(数量) {
    const 现在 = performance.now();
    const 倍分激活 = 现在 < this.道具状态.倍分结束时间;
    const 倍数 = 倍分激活 ? this.游戏配置.道具.倍分.倍数 : 1;
    super.增加分数(Math.floor(数量 * 倍数));
  }

  激活道具(类型) {
    const 现在 = performance.now();
    const 配置道具 = this.游戏配置.道具;
    if (类型 === '护盾') {
      this.道具状态.护盾结束时间 = 现在 + this.获取护盾持续时间();
    } else if (类型 === '磁铁') {
      this.道具状态.磁铁结束时间 = 现在 + 配置道具.磁铁.持续时间;
    } else if (类型 === '减速') {
      this.道具状态.减速结束时间 = 现在 + 配置道具.减速.持续时间;
    } else if (类型 === '能量') {
      this.能量 = Math.min(this.能量 + 配置道具.能量.恢复量, this.获取最大能量());
    } else if (类型 === '倍分') {
      this.道具状态.倍分结束时间 = 现在 + 配置道具.倍分.持续时间;
    } else if (类型 === '清屏') {
      this.清屏();
    }
  }

  清屏() {
    let 清屏分数 = 0;
    for (const 陨石 of this.陨石列表) {
      清屏分数 += 陨石.分数 || 0;
    }
    for (const 敌机 of this.敌机列表) {
      清屏分数 += 敌机.分数 || 0;
    }
    if (清屏分数 > 0) this.增加分数(清屏分数);
    this.陨石列表 = [];
    this.敌机列表 = [];
    this.添加特效({ x: this.玩家.x, y: this.玩家.y, 类型: 'screenClear' });
  }

  检查关卡完成() {
    const 关卡 = this.游戏配置.关卡列表[this.当前关卡];
    if (!关卡) return;
    if (this.已收集 >= 关卡.目标碎片) {
      this.增加分数(50);
      this.增加经验(关卡.目标碎片);
      if (this.当前关卡 >= this.游戏配置.关卡列表.length - 1) {
        this.显示结算(true);
        this.结束游戏();
      } else {
        this.显示关卡完成();
      }
    }
  }

  显示关卡完成() {
    if (!this.结算画面) return;
    const 标题 = this.结算画面.querySelector('.star-ocean-game-over-title');
    const 结果 = this.结算画面.querySelector('.star-ocean-game-over-result');
    const 下一关按钮 = this.结算画面.querySelector('.star-ocean-next-btn');
    if (标题) 标题.textContent = t('game.starOcean.levelComplete', { level: this.当前关卡 + 1 });
    if (结果) 结果.textContent = t('game.starOcean.score', { score: this.分数 });
    if (下一关按钮) 下一关按钮.style.display = '';
    this.结算画面.classList.remove('hidden');
    this.停止();
  }

  显示结算(通关) {
    if (!this.结算画面) return;
    const 标题 = this.结算画面.querySelector('.star-ocean-game-over-title');
    const 结果 = this.结算画面.querySelector('.star-ocean-game-over-result');
    const 下一关按钮 = this.结算画面.querySelector('.star-ocean-next-btn');
    const 总数 = this.游戏配置.关卡列表.length;

    if (通关) {
      if (标题) 标题.textContent = t('game.starOcean.allLevelsComplete', { total: 总数 });
      if (结果)
        结果.textContent = t('game.starOcean.finalStats', { score: this.分数, level: 总数 });
    } else {
      if (标题) 标题.textContent = t('game.starOcean.gameOver', { score: this.分数 });
      if (结果)
        结果.textContent = t('game.starOcean.finalStats', {
          score: this.分数,
          level: this.当前关卡 + 1
        });
    }

    if (下一关按钮) 下一关按钮.style.display = 'none';
    this.结算画面.classList.remove('hidden');

    if (this.分数 > this.最高分) {
      this.最高分 = this.分数;
      this.状态管理器.写入(`各游戏最高分.${this.标识}`, this.最高分);
    }
  }

  下一关() {
    this.结算画面.classList.add('hidden');
    this.当前关卡++;
    if (this.当前关卡 < this.游戏配置.关卡列表.length) {
      this.加载关卡(this.当前关卡);
      this.运行中 = true;
      this.已暂停 = false;
      this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
    }
  }

  重新开始() {
    this.结算画面.classList.add('hidden');
    this.启动();
  }

  绘制(时间戳) {
    if (!this.画布 || !this.上下文) return;
    const { width, height } = this.画布.getBoundingClientRect();

    this.上下文.clearRect(0, 0, width, height);
    this.绘制背景();
    this.绘制星星碎片(时间戳);
    this.绘制陨石();
    this.绘制敌机();
    this.绘制道具(时间戳);
    this.绘制玩家(时间戳);
    this.绘制特效(时间戳);
    this.绘制HUD();
  }

  绘制背景() {
    const { width, height } = this.画布.getBoundingClientRect();
    this.上下文.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.上下文.fillRect(0, 0, width, height);

    this.上下文.save();
    this.上下文.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    this.上下文.lineWidth = 1;
    for (let i = 0; i < width; i += 60) {
      this.上下文.beginPath();
      this.上下文.moveTo(i, 0);
      this.上下文.lineTo(i, height);
      this.上下文.stroke();
    }
    for (let i = 0; i < height; i += 60) {
      this.上下文.beginPath();
      this.上下文.moveTo(0, i);
      this.上下文.lineTo(width, i);
      this.上下文.stroke();
    }
    this.上下文.restore();
  }

  绘制星星碎片(时间戳) {
    const 配置 = this.游戏配置.星星碎片;
    const 脉冲 = 1 + Math.sin(时间戳 / 配置.脉冲速度) * 0.2;

    this.上下文.save();
    this.上下文.shadowBlur = 15;
    this.上下文.shadowColor = 配置.颜色;
    this.上下文.fillStyle = 配置.颜色;

    this.星星碎片列表.forEach((碎片) => {
      this.上下文.beginPath();
      this.上下文.arc(碎片.x, 碎片.y, 碎片.半径 * 脉冲, 0, Math.PI * 2);
      this.上下文.fill();
    });

    this.上下文.restore();
  }

  绘制陨石() {
    const 配置 = this.游戏配置.陨石;
    this.上下文.save();
    this.上下文.strokeStyle = 配置.颜色;
    this.上下文.lineWidth = 2;
    this.上下文.shadowBlur = 10;
    this.上下文.shadowColor = 配置.颜色;

    this.陨石列表.forEach((陨石) => {
      this.上下文.save();
      this.上下文.translate(陨石.x, 陨石.y);
      this.上下文.rotate(陨石.旋转);
      this.上下文.beginPath();
      const 边数 = 6;
      for (let i = 0; i < 边数; i++) {
        const 角度 = (i / 边数) * Math.PI * 2;
        const r = 陨石.半径 * (0.7 + Math.random() * 0.3);
        const x = Math.cos(角度) * r;
        const y = Math.sin(角度) * r;
        if (i === 0) this.上下文.moveTo(x, y);
        else this.上下文.lineTo(x, y);
      }
      this.上下文.closePath();
      this.上下文.stroke();
      this.上下文.restore();
    });

    this.上下文.restore();
  }

  绘制敌机() {
    this.上下文.save();

    this.敌机列表.forEach((敌机) => {
      this.上下文.save();
      this.上下文.shadowBlur = 15;
      this.上下文.shadowColor = 敌机.颜色;
      this.上下文.strokeStyle = 敌机.颜色;
      this.上下文.lineWidth = 2;

      const dx = this.玩家.x - 敌机.x;
      const dy = this.玩家.y - 敌机.y;
      const 角度 = Math.atan2(dy, dx);
      this.上下文.translate(敌机.x, 敌机.y);
      this.上下文.rotate(角度);

      this.上下文.beginPath();
      this.上下文.moveTo(敌机.宽度 / 2, 0);
      this.上下文.lineTo(-敌机.宽度 / 2, -敌机.高度 / 2);
      this.上下文.lineTo(-敌机.宽度 / 3, 0);
      this.上下文.lineTo(-敌机.宽度 / 2, 敌机.高度 / 2);
      this.上下文.closePath();
      this.上下文.stroke();

      this.上下文.restore();
    });

    this.上下文.restore();
  }

  绘制道具(时间戳) {
    this.上下文.save();
    this.道具列表.forEach((道具) => {
      const 脉冲 = 1 + Math.sin(时间戳 / 200) * 0.15;
      this.上下文.fillStyle = 道具.颜色;
      this.上下文.shadowBlur = 15;
      this.上下文.shadowColor = 道具.颜色;
      this.上下文.beginPath();
      this.上下文.arc(道具.x, 道具.y, 道具.半径 * 脉冲, 0, Math.PI * 2);
      this.上下文.fill();

      this.上下文.fillStyle = '#fff';
      this.上下文.font = 'bold 10px "Courier New", monospace';
      this.上下文.textAlign = 'center';
      this.上下文.textBaseline = 'middle';
      const 标签映射 = {
        护盾: 'S',
        磁铁: 'M',
        减速: 'T',
        能量: 'E',
        倍分: 'x2',
        清屏: 'C'
      };
      const 标签 = 标签映射[道具.类型] || '?';
      this.上下文.fillText(标签, 道具.x, 道具.y);
    });
    this.上下文.restore();
  }

  绘制玩家(时间戳) {
    const 配置 = this.游戏配置.玩家;
    const 现在 = performance.now();
    const 无敌 = 现在 < this.玩家.无敌结束时间;
    const 护盾激活 = 现在 < this.道具状态.护盾结束时间;

    this.上下文.save();
    this.上下文.translate(this.玩家.x, this.玩家.y);

    if (护盾激活) {
      this.上下文.strokeStyle = this.游戏配置.道具.护盾.颜色;
      this.上下文.lineWidth = 2;
      this.上下文.shadowBlur = 20;
      this.上下文.shadowColor = this.游戏配置.道具.护盾.颜色;
      this.上下文.beginPath();
      this.上下文.arc(0, 0, 配置.半径 + 10, 0, Math.PI * 2);
      this.上下文.stroke();
    }

    if (!无敌 || Math.floor(时间戳 / 100) % 2 === 0) {
      this.上下文.fillStyle = 配置.颜色;
      this.上下文.shadowBlur = 20;
      this.上下文.shadowColor = 配置.颜色;

      this.上下文.beginPath();
      this.上下文.moveTo(0, -配置.半径 * 1.3);
      this.上下文.lineTo(-配置.半径, 配置.半径);
      this.上下文.lineTo(0, 配置.半径 * 0.5);
      this.上下文.lineTo(配置.半径, 配置.半径);
      this.上下文.closePath();
      this.上下文.fill();

      this.上下文.fillStyle = '#fff';
      this.上下文.beginPath();
      this.上下文.arc(0, -配置.半径 * 0.3, 3, 0, Math.PI * 2);
      this.上下文.fill();
    }

    this.上下文.restore();
  }

  更新特效(时间戳) {
    this.特效列表 = this.特效列表.filter((特效) => 时间戳 - 特效.开始时间 < 特效.持续时间);
  }

  绘制特效(时间戳) {
    this.上下文.save();
    for (const 特效 of this.特效列表) {
      const 进度 = Math.min(1, (时间戳 - 特效.开始时间) / 特效.持续时间);
      const 半径 = 20 + 进度 * 80;
      const 透明度 = 1 - 进度;
      this.上下文.strokeStyle =
        特效.类型 === 'levelUp' ? `rgba(250, 255, 0, ${透明度})` : `rgba(0, 240, 255, ${透明度})`;
      this.上下文.lineWidth = 2;
      this.上下文.shadowBlur = 20;
      this.上下文.shadowColor = 特效.类型 === 'levelUp' ? '#faff00' : '#00f0ff';
      this.上下文.beginPath();
      this.上下文.arc(特效.x, 特效.y, 半径, 0, Math.PI * 2);
      this.上下文.stroke();
    }
    this.上下文.restore();
  }

  绘制HUD() {
    const { width } = this.画布.getBoundingClientRect();
    const 关卡 = this.游戏配置.关卡列表[this.当前关卡];
    const 目标 = 关卡?.目标碎片 || 0;

    this.上下文.save();
    this.上下文.fillStyle = '#fff';
    this.上下文.font = 'bold 14px "Courier New", monospace';
    this.上下文.textAlign = 'left';
    this.上下文.textBaseline = 'top';
    this.上下文.shadowBlur = 10;
    this.上下文.shadowColor = '#fff';

    this.上下文.fillText(
      t('game.starOcean.level', { level: this.当前关卡 + 1, total: this.游戏配置.关卡列表.length }),
      15,
      15
    );
    this.上下文.fillText(
      t('game.starOcean.fragments', { current: this.已收集, total: 目标 }),
      15,
      38
    );
    this.上下文.fillText(t('game.starOcean.score', { score: this.分数 }), 15, 61);
    this.上下文.fillText(
      t('game.starOcean.playerLevel', {
        level: this.等级,
        exp: this.经验,
        required: this.升级所需经验
      }),
      15,
      84
    );

    const 现在 = performance.now();
    if (现在 < this.道具状态.倍分结束时间) {
      this.上下文.fillStyle = this.游戏配置.道具.倍分.颜色;
      this.上下文.fillText(
        t('game.starOcean.scoreMultiplier', {
          time: Math.ceil((this.道具状态.倍分结束时间 - 现在) / 1000)
        }),
        15,
        107
      );
      this.上下文.fillStyle = '#fff';
    }

    const 能量条宽度 = 120;
    const 能量条高度 = 10;
    const 能量比例 = Math.max(0, this.能量 / this.获取最大能量());
    this.上下文.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.上下文.fillRect(width - 能量条宽度 - 15, 15, 能量条宽度, 能量条高度);
    this.上下文.fillStyle = 能量比例 > 0.5 ? '#00f0ff' : 能量比例 > 0.25 ? '#faff00' : '#ff2a9d';
    this.上下文.shadowColor = this.上下文.fillStyle;
    this.上下文.fillRect(width - 能量条宽度 - 15, 15, 能量条宽度 * 能量比例, 能量条高度);
    this.上下文.fillStyle = '#fff';
    this.上下文.textAlign = 'right';
    this.上下文.fillText(
      t('game.starOcean.energy', { current: Math.floor(this.能量) }),
      width - 15,
      30
    );

    this.上下文.restore();
  }

  获取升级所需经验(等级) {
    return this.游戏配置.玩家.经验每级 * 等级;
  }

  重置成长() {
    this.等级 = 1;
    this.经验 = 0;
    this.升级所需经验 = this.获取升级所需经验(1);
    this.升级加成 = {
      速度: 0,
      最大能量: 0,
      磁铁半径: 0,
      护盾持续时间: 0
    };
  }

  增加经验(数量) {
    if (this.等级 >= this.游戏配置.玩家.最大等级) return;
    this.经验 += 数量;
    while (this.经验 >= this.升级所需经验 && this.等级 < this.游戏配置.玩家.最大等级) {
      this.经验 -= this.升级所需经验;
      this.升级();
    }
  }

  升级() {
    const 配置升级 = this.游戏配置.玩家.升级;
    this.等级++;
    this.升级加成.速度 += 配置升级.速度加成;
    this.升级加成.最大能量 += 配置升级.能量加成;
    this.升级加成.磁铁半径 += 配置升级.磁铁半径加成;
    this.升级加成.护盾持续时间 += 配置升级.护盾持续时间加成;
    this.升级所需经验 = this.获取升级所需经验(this.等级);
    this.能量 = Math.min(this.能量 + 配置升级.能量加成, this.获取最大能量());
    this.添加特效({ x: this.玩家.x, y: this.玩家.y, 类型: 'levelUp' });
  }

  获取玩家速度() {
    return this.游戏配置.玩家.速度 + this.升级加成.速度;
  }

  获取最大能量() {
    return this.游戏配置.玩家.最大能量 + this.升级加成.最大能量;
  }

  获取磁铁半径() {
    return this.游戏配置.道具.磁铁.吸引半径 + this.升级加成.磁铁半径;
  }

  获取护盾持续时间() {
    return this.游戏配置.道具.护盾.持续时间 + this.升级加成.护盾持续时间;
  }

  添加特效(特效) {
    this.特效列表.push({
      x: 特效.x,
      y: 特效.y,
      类型: 特效.类型,
      开始时间: performance.now(),
      持续时间: 特效.持续时间 || 1000
    });
  }

  随机加权类型(权重表) {
    const 条目 = Object.entries(权重表);
    const 总权重 = 条目.reduce((和, [, 权重]) => 和 + 权重, 0);
    if (总权重 <= 0) return 条目[0]?.[0];
    let 随机 = Math.random() * 总权重;
    for (const [类型, 权重] of 条目) {
      随机 -= 权重;
      if (随机 <= 0) return 类型;
    }
    return 条目[条目.length - 1]?.[0];
  }

  随机范围(最小, 最大) {
    return Math.random() * (最大 - 最小) + 最小;
  }
}
