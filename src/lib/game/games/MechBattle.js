import { 配置 } from '../config.js';
import { 游戏基类 } from '../core/GameBase.js';
import { t } from '../i18n.js';
import { 创建元素, 防抖 } from '../utils.js';

export class MechBattle extends 游戏基类 {
  constructor(选项) {
    super(选项);
    this.画布 = null;
    this.上下文 = null;
    this.动画帧 = null;
    this.游戏配置 = 配置.游戏.mechBattle;
    this.绑定调整尺寸 = 防抖(() => this.调整尺寸(), 200);
    this.绑定处理指针移动 = (e) => this.处理指针移动(e);
    this.绑定处理键盘按下 = (e) => this.处理键盘按下(e);
    this.绑定处理键盘释放 = (e) => this.处理键盘释放(e);
    this.绑定模式切换 = () => this.切换模式();

    this.相机 = { x: 0 };
    this.世界滚动距离 = 0;
    this.缩放 = 1;
    this.设计高度 = 480;
    this.画布显示宽 = 0;
    this.画布显示高 = 0;
    this.屏幕宽 = 0;
    this.世界宽 = 0;
    this.玩家列表 = [];
    this.当前模式 = 'single';
    this.敌人列表 = [];
    this.敌人子弹列表 = [];
    this.玩家子弹列表 = [];
    this.导弹列表 = [];
    this.特效列表 = [];
    this.掉落列表 = [];
    this.屏幕震动 = { x: 0, y: 0, 强度: 0 };
    this.最后敌人生成时间 = 0;
    this.上一次时间戳 = 0;
    this.最高分 = 0;
    this.键盘状态 = {};
    this.当前皮肤 = null;

    this.技能条容器 = null;
    this.模式按钮 = null;
    this.模式标签 = null;
    this.游戏结束画面 = null;
  }

  async 初始化() {
    this.最高分 = this.状态管理器.读取(`各游戏最高分.${this.标识}`, 0);
    this.当前皮肤 = this.获取当前皮肤();
    this.渲染();
  }

  获取当前皮肤() {
    const 皮肤标识 = this.状态管理器.读取('设置.皮肤.mechBattle', this.游戏配置.玩家.默认皮肤);
    return (
      this.游戏配置.玩家.皮肤列表.find((皮肤) => 皮肤.标识 === 皮肤标识) ??
      this.游戏配置.玩家.皮肤列表[0]
    );
  }

  渲染() {
    this.容器.innerHTML = '';
    this.容器.className = 'game-instance mech-battle';

    this.渲染皮肤选择器();

    const 顶栏 = 创建元素('div', { class: 'mech-top-bar' });
    this.模式按钮 = 创建元素('button', {
      class: 'neon-btn pink mech-mode-btn',
      text: t('game.mechBattle.modeSwitchDouble')
    });
    this.模式按钮.addEventListener('click', this.绑定模式切换);
    this.模式标签 = 创建元素('div', {
      class: 'mech-mode-label',
      text: t('game.mechBattle.singleMode')
    });
    顶栏.appendChild(this.模式按钮);
    顶栏.appendChild(this.模式标签);
    this.容器.appendChild(顶栏);

    const 说明 = 创建元素('div', {
      class: 'game-instruction mech-instruction',
      text: t('game.mechBattle.instruction')
    });
    this.容器.appendChild(说明);

    this.画布包装器 = document.createElement('div');
    this.画布包装器.className = 'mech-battle-canvas-wrap';
    this.画布 = document.createElement('canvas');
    this.画布.setAttribute('aria-label', t('games.mechBattle.title'));
    this.画布包装器.appendChild(this.画布);
    this.容器.appendChild(this.画布包装器);

    this.上下文 = this.画布.getContext('2d');
    this.调整尺寸();

    this.技能条容器 = 创建元素('div', { class: 'mech-skill-bars' });
    this.容器.appendChild(this.技能条容器);

    this.游戏结束画面 = this.创建游戏结束画面();
    this.容器.appendChild(this.游戏结束画面);

    window.addEventListener('resize', this.绑定调整尺寸);
    this.画布.addEventListener('pointermove', this.绑定处理指针移动);
    document.addEventListener('keydown', this.绑定处理键盘按下);
    document.addEventListener('keyup', this.绑定处理键盘释放);
  }

  渲染皮肤选择器() {
    const 面板 = 创建元素('div', { class: 'skin-selector mech-skin-selector' });
    面板.appendChild(
      创建元素('span', { class: 'skin-label', text: t('game.mechBattle.skinLabel') })
    );

    this.游戏配置.玩家.皮肤列表.forEach((皮肤) => {
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
    const 皮肤 = this.游戏配置.玩家.皮肤列表.find((s) => s.标识 === 标识);
    if (!皮肤 || 皮肤.标识 === this.当前皮肤.标识) return;
    this.当前皮肤 = 皮肤;
    this.状态管理器.写入('设置.皮肤.mechBattle', 标识);
    this.容器.querySelectorAll('.mech-skin-selector .skin-btn').forEach((按钮) => {
      按钮.classList.toggle('active', 按钮.dataset.skin === 标识);
    });
    this.玩家列表.forEach((玩家) => {
      玩家.颜色 = 皮肤.玩家颜色;
    });
  }

  创建游戏结束画面() {
    const 画面 = 创建元素('div', { class: 'mech-game-over hidden' });
    const 标题 = 创建元素('h2', {
      class: 'mech-game-over-title',
      text: t('games.mechBattle.title')
    });
    const 分数 = 创建元素('div', {
      class: 'mech-game-over-score',
      text: t('game.mechBattle.gameOver', { score: 0 })
    });
    const 按钮 = 创建元素('button', {
      class: 'neon-btn pink mech-restart-btn',
      text: t('game.mechBattle.restart')
    });
    按钮.addEventListener('click', () => this.重新开始());
    画面.appendChild(标题);
    画面.appendChild(分数);
    画面.appendChild(按钮);
    return 画面;
  }

  创建技能条(玩家) {
    const 条 = 创建元素('div', { class: 'mech-skill-bar' });
    const 标题 = 创建元素('div', {
      class: 'mech-skill-player',
      text: t(`game.mechBattle.${玩家.标识}`)
    });
    条.appendChild(标题);

    Object.values(this.游戏配置.技能).forEach((技能) => {
      const 状态 = 玩家.技能状态[技能.标识];
      const 槽 = 创建元素('div', { class: 'mech-skill-slot', attrs: { 'data-skill': 技能.标识 } });
      const 图标 = 创建元素('div', { class: 'mech-skill-icon', text: 技能.名称 });
      const 键 = 创建元素('div', {
        class: 'mech-skill-key',
        text: this.获取玩家技能首键(玩家, 技能.标识)
      });
      const 覆盖层 = 创建元素('div', { class: 'mech-skill-overlay' });
      槽.appendChild(图标);
      槽.appendChild(键);
      槽.appendChild(覆盖层);
      槽.addEventListener('click', () => this.尝试使用技能(玩家, 技能.标识));
      状态.元素 = 槽;
      状态.覆盖层 = 覆盖层;
      条.appendChild(槽);
    });
    return 条;
  }

  切换模式() {
    this.当前模式 = this.当前模式 === 'single' ? 'double' : 'single';
    this.更新模式按钮();
    if (this.运行中) {
      this.重新开始();
    }
  }

  更新模式按钮() {
    if (!this.模式按钮 || !this.模式标签) return;
    const 是单人 = this.当前模式 === 'single';
    this.模式按钮.textContent = t(
      是单人 ? 'game.mechBattle.modeSwitchDouble' : 'game.mechBattle.modeSwitchSingle'
    );
    this.模式标签.textContent = t(
      是单人 ? 'game.mechBattle.singleMode' : 'game.mechBattle.doubleMode'
    );
  }

  调整尺寸() {
    if (!this.画布 || !this.上下文 || !this.画布包装器) return;
    const { width, height } = this.画布包装器.getBoundingClientRect();
    const css宽 = Math.max(1, Math.floor(width));
    const css高 = Math.max(1, Math.floor(height));
    const dpr = window.devicePixelRatio || 1;

    this.画布.width = css宽 * dpr;
    this.画布.height = css高 * dpr;

    this.设计高度 = this.游戏配置.世界.设计高度;
    this.缩放 = css高 / this.设计高度;
    this.画布显示宽 = css宽;
    this.画布显示高 = css高;

    this.上下文.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  async 启动() {
    this.运行中 = true;
    this.已暂停 = false;
    this.重置分数();
    this.相机.x = 0;
    this.世界滚动距离 = 0;
    this.敌人列表 = [];
    this.敌人子弹列表 = [];
    this.玩家子弹列表 = [];
    this.导弹列表 = [];
    this.特效列表 = [];
    this.掉落列表 = [];
    this.键盘状态 = {};
    this.屏幕震动.强度 = 0;
    this.最后敌人生成时间 = performance.now();
    this.下次Boss分数 = this.游戏配置.boss.分数间隔;
    this.上一次时间戳 = performance.now();

    const { width } = this.画布.getBoundingClientRect();
    const 世界宽 = width / this.缩放;
    this.玩家列表 = [];

    if (this.当前模式 === 'single') {
      this.玩家列表.push(
        this.创建玩家({
          标识: 'player1',
          颜色: this.游戏配置.玩家.玩家1颜色,
          控制: this.游戏配置.玩家1控制,
          x: 世界宽 * 0.25
        })
      );
    } else {
      this.玩家列表.push(
        this.创建玩家({
          标识: 'player1',
          颜色: this.游戏配置.玩家.玩家1颜色,
          控制: this.游戏配置.玩家1控制,
          x: 世界宽 * 0.2
        })
      );
      this.玩家列表.push(
        this.创建玩家({
          标识: 'player2',
          颜色: this.游戏配置.玩家.玩家2颜色,
          控制: this.游戏配置.玩家2控制,
          x: 世界宽 * 0.35
        })
      );
    }

    this.玩家列表.forEach((玩家) => {
      玩家.y = this.设计高度 - this.游戏配置.世界.地面高度;
    });

    this.技能条容器.innerHTML = '';
    this.玩家列表.forEach((玩家) => {
      this.初始化玩家技能状态(玩家);
      const 条 = this.创建技能条(玩家);
      玩家.技能条 = 条;
      this.技能条容器.appendChild(条);
    });

    if (this.游戏结束画面) {
      this.游戏结束画面.classList.add('hidden');
    }

    this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
  }

  创建玩家(配置项) {
    const 配置玩家 = this.游戏配置.玩家;
    const 皮肤颜色 = 配置项.标识 === 'player1' ? this.当前皮肤.玩家颜色 : 配置项.颜色;
    return {
      标识: 配置项.标识,
      颜色: 皮肤颜色,
      控制: 配置项.控制,
      x: 配置项.x || 0,
      y: 0,
      vx: 0,
      vy: 0,
      宽度: 配置玩家.宽度,
      高度: 配置玩家.高度,
      朝向: 1,
      蹲下: false,
      grounded: false,
      跳跃按下: false,
      生命: 配置玩家.最大生命,
      能量: 配置玩家.最大能量,
      护盾结束时间: 0,
      最后受击时间: Number.NEGATIVE_INFINITY,
      攻击冷却: 0,
      技能状态: {},
      技能条: null
    };
  }

  初始化玩家技能状态(玩家) {
    Object.values(this.游戏配置.技能).forEach((技能) => {
      玩家.技能状态[技能.标识] = {
        最后使用时间: Number.NEGATIVE_INFINITY,
        元素: null,
        覆盖层: null
      };
    });
  }

  async 暂停() {
    this.已暂停 = true;
  }

  async 恢复() {
    if (!this.运行中) return;
    this.已暂停 = false;
    this.上一次时间戳 = performance.now();
    this.最后敌人生成时间 = performance.now();
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
    if (this.模式按钮) {
      this.模式按钮.removeEventListener('click', this.绑定模式切换);
    }
    this.容器.innerHTML = '';
    this.画布 = null;
    this.上下文 = null;
    this.玩家列表 = [];
    this.敌人列表 = [];
    this.敌人子弹列表 = [];
    this.玩家子弹列表 = [];
    this.导弹列表 = [];
    this.特效列表 = [];
    this.技能条容器 = null;
    this.模式按钮 = null;
    this.模式标签 = null;
    this.游戏结束画面 = null;
  }

  结束游戏() {
    if (!this.运行中) return;
    this.停止();
    this.更新最高分();
    this.显示游戏结束画面();
    super.结束游戏();
  }

  重新开始() {
    if (this.游戏结束画面) {
      this.游戏结束画面.classList.add('hidden');
    }
    this.启动();
  }

  显示游戏结束画面() {
    if (!this.游戏结束画面) return;
    const 分数文本 = this.游戏结束画面.querySelector('.mech-game-over-score');
    if (分数文本) {
      分数文本.textContent = t('game.mechBattle.gameOver', { score: this.分数 });
    }
    this.游戏结束画面.classList.remove('hidden');
    const 按钮 = this.游戏结束画面.querySelector('.mech-restart-btn');
    if (按钮) 按钮.focus();
  }

  渲染循环(时间戳) {
    if (!this.运行中 || !this.上下文 || !this.画布) return;

    const { width, height } = this.画布.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const 时间差 = Math.min(0.032, (时间戳 - this.上一次时间戳) / 1000);
    this.上一次时间戳 = 时间戳;

    this.屏幕宽 = width;
    this.世界宽 = width / this.缩放;
    const 世界高 = this.设计高度;

    // 首次打开或 flex 布局 settle 后，显示尺寸可能变化，需要及时重新计算缩放
    if (this.画布显示宽 !== width || this.画布显示高 !== height) {
      this.调整尺寸();
      this.画布显示宽 = width;
      this.画布显示高 = height;
    }

    this.上下文.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.上下文.clearRect(0, 0, width, height);

    this.上下文.save();
    const 震动X = this.屏幕震动.强度 > 0 ? this.屏幕震动.x : 0;
    const 震动Y = this.屏幕震动.强度 > 0 ? this.屏幕震动.y : 0;
    this.上下文.translate(震动X, 震动Y);
    this.上下文.scale(this.缩放, this.缩放);

    // 开场动画覆盖层存在时只渲染，不推进游戏逻辑，避免玩家还没看到画面敌人都跑出来了
    const 开场中 = this.容器 && this.容器.querySelector('.game-intro') !== null;

    if (!this.已暂停 && !开场中) {
      this.更新相机(时间差, this.世界宽);
      this.玩家列表.forEach((玩家) => this.更新玩家(玩家, 时间差, this.世界宽, 世界高));
      this.更新敌人生成(时间戳, this.世界宽, 世界高);
      this.更新敌人(时间差, this.世界宽, 世界高);
      this.更新敌人子弹(时间差, this.世界宽);
      this.更新玩家子弹(时间差, this.世界宽);
      this.更新导弹(时间差, this.世界宽);
      this.更新特效(时间差);
      this.更新掉落(时间差, 世界高);
      this.更新玩家回血回能(时间差);
      this.更新屏幕震动();
      this.检测碰撞();
    }

    this.绘制背景(this.世界宽, 世界高);
    this.绘制地面(this.世界宽, 世界高);
    this.绘制导弹();
    this.绘制敌人子弹();
    this.绘制玩家子弹();
    this.绘制敌人(this.世界宽);
    this.绘制玩家();
    this.绘制特效();
    this.绘制掉落();
    this.上下文.restore();

    this.绘制HUD(width, height);
    this.更新技能条(时间戳);

    this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
  }

  更新相机(_时间差, 宽度) {
    if (this.玩家列表.length === 0) return;
    let 目标X = this.玩家列表[0].x;
    if (this.玩家列表.length > 1) {
      目标X = (this.玩家列表[0].x + this.玩家列表[1].x) / 2;
    }
    this.相机.x = 目标X - 宽度 / 2;
    this.世界滚动距离 = this.相机.x;
  }

  更新玩家(玩家, 时间差, _宽度, 高度) {
    if (玩家.生命 <= 0) return;
    const 配置玩家 = this.游戏配置.玩家;
    const 控制 = 玩家.控制;
    const 左 = this.键是否按下(控制.左);
    const 右 = this.键是否按下(控制.右);
    const 跳 = this.键是否按下(控制.跳);
    const 蹲 = this.键是否按下(控制.蹲);
    const 地面Y = 高度 - this.游戏配置.世界.地面高度;

    let 速度 = 配置玩家.移动速度;
    if (蹲 && 玩家.grounded) {
      速度 *= 配置玩家.下蹲速度系数;
      玩家.蹲下 = true;
      玩家.高度 = 配置玩家.蹲下高度;
    } else {
      玩家.蹲下 = false;
      玩家.高度 = 配置玩家.高度;
    }

    let 输入X = 0;
    if (左) {
      输入X -= 1;
      玩家.朝向 = -1;
    }
    if (右) {
      输入X += 1;
      玩家.朝向 = 1;
    }
    玩家.vx = 输入X * 速度;

    玩家.vy += this.游戏配置.世界.重力 * 时间差;

    if (跳) {
      if (!玩家.跳跃按下 && 玩家.grounded) {
        玩家.vy = -配置玩家.跳跃速度;
        玩家.grounded = false;
      }
      玩家.跳跃按下 = true;
    } else {
      玩家.跳跃按下 = false;
    }

    玩家.x += 玩家.vx * 时间差;
    玩家.y += 玩家.vy * 时间差;

    if (玩家.y >= 地面Y) {
      玩家.y = 地面Y;
      玩家.vy = 0;
      玩家.grounded = true;
    } else {
      玩家.grounded = false;
    }

    if (玩家.攻击冷却 > 0) {
      玩家.攻击冷却 -= 时间差 * 1000;
    }

    if (this.键是否按下(控制.攻击) && 玩家.攻击冷却 <= 0) {
      this.执行普通攻击(玩家);
      玩家.攻击冷却 = 配置玩家.攻击.冷却;
    }
  }

  执行普通攻击(玩家) {
    const 配置攻击 = this.游戏配置.玩家.攻击;
    const 角度 = 玩家.朝向 === 1 ? 0 : Math.PI;
    const 子弹颜色 = 玩家.标识 === 'player1' ? this.当前皮肤.子弹颜色 : 配置攻击.子弹颜色;
    this.玩家子弹列表.push({
      x: 玩家.x + 玩家.朝向 * 玩家.宽度 * 0.6,
      y: 玩家.y - 玩家.高度 * 0.45,
      角度,
      速度: 配置攻击.子弹速度,
      宽度: 配置攻击.子弹宽度,
      高度: 配置攻击.子弹高度,
      伤害: 配置攻击.伤害,
      颜色: 子弹颜色,
      生存时间: 配置攻击.生存时间
    });
    玩家.最后攻击时间 = performance.now();
  }

  更新敌人生成(时间戳, 宽度, 高度) {
    if (this.分数 >= this.下次Boss分数 && !this.敌人列表.some((e) => e.类型 === 'boss')) {
      this.生成Boss(宽度, 高度);
      this.下次Boss分数 += this.游戏配置.boss.分数间隔;
      return;
    }
    if (时间戳 - this.最后敌人生成时间 >= this.计算敌人生成间隔()) {
      this.生成敌人(宽度, 高度);
      this.最后敌人生成时间 = 时间戳;
    }
  }

  生成敌人(宽度, 高度) {
    const 类型键 = this.选择敌人类型();
    const 类型配置 = this.游戏配置.敌人.类型[类型键];
    const 难度加成 = 1 + this.计算难度等级() * 0.08;
    const 地面Y = 高度 - this.游戏配置.世界.地面高度;
    const x = this.相机.x + 宽度 + 类型配置.宽度;
    let y;
    if (类型键 === 'drone') {
      y = 地面Y - this.游戏配置.玩家.高度 - (类型配置.飞行高度 || 100);
    } else {
      y = 地面Y - 类型配置.高度 / 2;
    }

    this.敌人列表.push({
      类型: 类型键,
      x,
      y,
      vx: 0,
      vy: 0,
      宽度: 类型配置.宽度,
      高度: 类型配置.高度,
      速度: 类型配置.速度 * (1 + this.计算难度等级() * 0.05),
      生命: Math.floor(类型配置.生命 * 难度加成),
      最大生命: Math.floor(类型配置.生命 * 难度加成),
      得分: 类型配置.得分,
      颜色: 类型配置.颜色,
      攻击范围: 类型配置.攻击范围,
      攻击冷却: 类型配置.攻击冷却,
      最后攻击时间: performance.now(),
      伤害: 类型配置.伤害
    });
  }

  选择敌人类型() {
    const 类型 = this.游戏配置.敌人.类型;
    const 总权重 = Object.values(类型).reduce((和, t) => 和 + t.生成权重, 0);
    let 随机 = Math.random() * 总权重;
    for (const [键, 配置项] of Object.entries(类型)) {
      随机 -= 配置项.生成权重;
      if (随机 <= 0) return 键;
    }
    return 'drone';
  }

  计算难度等级() {
    return Math.floor(this.分数 / this.游戏配置.敌人.难度分数间隔);
  }

  计算敌人生成间隔() {
    const 等级 = this.计算难度等级();
    return Math.max(this.游戏配置.敌人.最小生成间隔, this.游戏配置.敌人.基础生成间隔 - 等级 * 120);
  }

  更新敌人(时间差, _宽度, 高度) {
    const 地面Y = 高度 - this.游戏配置.世界.地面高度;
    this.敌人列表 = this.敌人列表.filter((敌人) => {
      const 目标 = this.寻找最近玩家(敌人.x, 敌人.y);
      let 方向X = -1;
      let 方向Y = 0;

      if (目标) {
        const dx = 目标.x - 敌人.x;
        const dy = 目标.y - 目标.高度 / 2 - 敌人.y;
        const 距离 = Math.sqrt(dx * dx + dy * dy);
        if (距离 > 敌人.攻击范围) {
          方向X = Math.sign(dx);
        } else {
          方向X = 0;
          if (performance.now() - 敌人.最后攻击时间 >= 敌人.攻击冷却) {
            this.敌人攻击(敌人, 目标);
            敌人.最后攻击时间 = performance.now();
          }
        }
        if (敌人.类型 === 'drone') {
          方向Y = Math.sign(dy);
        }
      }

      const 基础速度 = 敌人.速度;
      敌人.x += (方向X === 0 ? -基础速度 * 0.3 : 方向X * 基础速度) * 时间差;
      敌人.y += 方向Y * 基础速度 * 时间差;

      if (敌人.类型 !== 'drone') {
        敌人.y = 地面Y - 敌人.高度 / 2;
      }

      return 敌人.生命 > 0 && 敌人.x > this.相机.x - 200;
    });
  }

  生成Boss(宽度, 高度) {
    const 配置 = this.游戏配置.boss;
    const 难度加成 = 1 + this.计算难度等级() * 0.08;
    const 地面Y = 高度 - this.游戏配置.世界.地面高度;
    this.敌人列表.push({
      类型: 'boss',
      x: this.相机.x + 宽度 + 配置.宽度,
      y: 地面Y - 配置.高度 / 2,
      vx: 0,
      vy: 0,
      宽度: 配置.宽度,
      高度: 配置.高度,
      速度: 配置.速度,
      生命: Math.floor(配置.生命 * 难度加成),
      最大生命: Math.floor(配置.生命 * 难度加成),
      得分: 配置.得分,
      颜色: 配置.颜色,
      攻击范围: 600,
      攻击冷却: 配置.攻击冷却,
      最后攻击时间: performance.now(),
      伤害: 配置.接触伤害
    });
  }

  敌人攻击(敌人, 目标) {
    if (敌人.类型 === 'shooter') {
      const 配置 = this.游戏配置.敌人.类型.shooter;
      const 角度 = Math.atan2(目标.y - 目标.高度 / 2 - 敌人.y, 目标.x - 敌人.x);
      this.敌人子弹列表.push({
        x: 敌人.x,
        y: 敌人.y,
        角度,
        速度: 配置.子弹速度,
        宽度: 配置.子弹宽度,
        高度: 配置.子弹高度,
        伤害: 配置.伤害
      });
    } else if (敌人.类型 === 'archer') {
      const 配置 = this.游戏配置.敌人.类型.archer;
      const 水平距离 = 目标.x - 敌人.x;
      const 方向 = Math.sign(水平距离) || -1;
      const 角度 = 方向 === 1 ? -Math.PI / 5 : -(Math.PI - Math.PI / 5);
      this.敌人子弹列表.push({
        x: 敌人.x,
        y: 敌人.y,
        角度,
        速度: 配置.子弹速度,
        宽度: 配置.子弹宽度,
        高度: 配置.子弹高度,
        伤害: 配置.伤害,
        重力: 配置.重力,
        类型: 'archer'
      });
    } else if (敌人.类型 === 'boss') {
      const 配置 = this.游戏配置.boss;
      const 基准角度 = Math.atan2(目标.y - 目标.高度 / 2 - 敌人.y, 目标.x - 敌人.x);
      for (let i = 0; i < 配置.弹幕数; i++) {
        const 角度 = 基准角度 + (i - (配置.弹幕数 - 1) / 2) * 0.28;
        this.敌人子弹列表.push({
          x: 敌人.x,
          y: 敌人.y,
          角度,
          速度: 配置.弹幕速度,
          宽度: 9,
          高度: 9,
          伤害: 配置.子弹伤害
        });
      }
    } else if (目标) {
      this.伤害玩家(目标, 敌人.伤害);
    }
  }

  更新敌人子弹(时间差, 宽度) {
    this.敌人子弹列表 = this.敌人子弹列表.filter((子弹) => {
      if (子弹.类型 === 'archer') {
        if (子弹.vx === undefined) {
          子弹.vx = Math.cos(子弹.角度) * 子弹.速度;
          子弹.vy = Math.sin(子弹.角度) * 子弹.速度;
        }
        子弹.vy += (子弹.重力 || 0) * 时间差;
        子弹.x += 子弹.vx * 时间差;
        子弹.y += 子弹.vy * 时间差;
        子弹.角度 = Math.atan2(子弹.vy, 子弹.vx);
      } else {
        子弹.x += Math.cos(子弹.角度) * 子弹.速度 * 时间差;
        子弹.y += Math.sin(子弹.角度) * 子弹.速度 * 时间差;
      }
      return 子弹.x > this.相机.x - 50 && 子弹.x < this.相机.x + 宽度 + 100;
    });
  }

  更新玩家子弹(时间差, 宽度) {
    this.玩家子弹列表 = this.玩家子弹列表.filter((子弹) => {
      子弹.x += Math.cos(子弹.角度) * 子弹.速度 * 时间差;
      子弹.y += Math.sin(子弹.角度) * 子弹.速度 * 时间差;
      子弹.生存时间 -= 时间差;
      return 子弹.生存时间 > 0 && 子弹.x > this.相机.x - 50 && 子弹.x < this.相机.x + 宽度 + 100;
    });
  }

  更新导弹(时间差, 宽度) {
    this.导弹列表 = this.导弹列表.filter((导弹) => {
      const 目标 = this.寻找最近敌人(导弹.x, 导弹.y);
      if (目标) {
        const 目标角度 = Math.atan2(目标.y - 导弹.y, 目标.x - 导弹.x);
        let 角度差 = 目标角度 - 导弹.角度;
        while (角度差 > Math.PI) 角度差 -= Math.PI * 2;
        while (角度差 < -Math.PI) 角度差 += Math.PI * 2;
        导弹.角度 +=
          Math.sign(角度差) *
          Math.min(Math.abs(角度差), this.游戏配置.技能.missile.转向速率 * 时间差);
      }
      导弹.x += Math.cos(导弹.角度) * 导弹.速度 * 时间差;
      导弹.y += Math.sin(导弹.角度) * 导弹.速度 * 时间差;
      导弹.生存时间 -= 时间差;
      return 导弹.生存时间 > 0 && 导弹.x > this.相机.x - 200 && 导弹.x < this.相机.x + 宽度 + 200;
    });
  }

  更新特效(时间差) {
    this.特效列表 = this.特效列表.filter((特效) => {
      特效.经过时间 += 时间差 * 1000;
      if (特效.类型 === 'emp') {
        特效.半径 += (特效.最大半径 / 特效.持续时间) * 时间差 * 1000;
      }
      return 特效.经过时间 < 特效.持续时间;
    });
  }

  更新玩家回血回能(时间差) {
    const 现在 = performance.now();
    const 配置玩家 = this.游戏配置.玩家;
    this.玩家列表.forEach((玩家) => {
      if (玩家.生命 <= 0) return;
      if (玩家.能量 < 配置玩家.最大能量) {
        玩家.能量 = Math.min(配置玩家.最大能量, 玩家.能量 + 配置玩家.能量恢复每秒 * 时间差);
      }
      if (现在 - 玩家.最后受击时间 >= 配置玩家.受击后恢复延迟 && 玩家.生命 < 配置玩家.最大生命) {
        玩家.生命 = Math.min(配置玩家.最大生命, 玩家.生命 + 配置玩家.生命恢复每秒 * 时间差);
      }
    });
  }

  更新屏幕震动() {
    if (this.屏幕震动.强度 <= 0.1) {
      this.屏幕震动.x = 0;
      this.屏幕震动.y = 0;
      this.屏幕震动.强度 = 0;
      return;
    }
    const 角度 = Math.random() * Math.PI * 2;
    const 最大偏移 = this.游戏配置.屏幕震动.最大偏移;
    this.屏幕震动.x = Math.cos(角度) * Math.min(this.屏幕震动.强度, 最大偏移);
    this.屏幕震动.y = Math.sin(角度) * Math.min(this.屏幕震动.强度, 最大偏移);
    this.屏幕震动.强度 *= this.游戏配置.屏幕震动.衰减;
  }

  应用屏幕震动() {
    if (this.屏幕震动.强度 > 0) {
      this.上下文.translate(this.屏幕震动.x, this.屏幕震动.y);
    }
  }

  触发屏幕震动() {
    this.屏幕震动.强度 = this.游戏配置.屏幕震动.强度;
  }

  检测碰撞() {
    const 现在 = performance.now();

    this.导弹列表 = this.导弹列表.filter((导弹) => {
      let 命中 = false;
      for (const 敌人 of this.敌人列表) {
        if (
          this.矩形相交(
            导弹.x - 4,
            导弹.y - 4,
            8,
            8,
            敌人.x - 敌人.宽度 / 2,
            敌人.y - 敌人.高度 / 2,
            敌人.宽度,
            敌人.高度
          )
        ) {
          this.伤害敌人(敌人, 导弹.伤害, 导弹.x, 导弹.y);
          命中 = true;
          break;
        }
      }
      return !命中;
    });

    for (const 特效 of this.特效列表) {
      if (特效.类型 !== 'slash' || 特效.已触发) continue;
      特效.已触发 = true;
      for (const 敌人 of this.敌人列表) {
        if (this.点在扇形内(敌人.x, 敌人.y, 特效.x, 特效.y, 特效.角度, 特效.角度范围, 特效.长度)) {
          this.伤害敌人(敌人, 特效.伤害, 敌人.x, 敌人.y);
        }
      }
    }

    for (const 特效 of this.特效列表) {
      if (特效.类型 !== 'emp' || 特效.已触发) continue;
      if (特效.半径 >= 特效.最大半径 * 0.5) {
        特效.已触发 = true;
        for (const 敌人 of this.敌人列表) {
          const dx = 敌人.x - 特效.x;
          const dy = 敌人.y - 特效.y;
          if (Math.sqrt(dx * dx + dy * dy) <= 特效.最大半径) {
            this.伤害敌人(敌人, 特效.伤害, 敌人.x, 敌人.y);
          }
        }
      }
    }

    this.玩家子弹列表 = this.玩家子弹列表.filter((子弹) => {
      for (const 敌人 of this.敌人列表) {
        if (
          this.矩形相交(
            子弹.x - 子弹.宽度 / 2,
            子弹.y - 子弹.高度 / 2,
            子弹.宽度,
            子弹.高度,
            敌人.x - 敌人.宽度 / 2,
            敌人.y - 敌人.高度 / 2,
            敌人.宽度,
            敌人.高度
          )
        ) {
          this.伤害敌人(敌人, 子弹.伤害, 敌人.x, 敌人.y);
          this.粒子系统?.生成爆炸(子弹.x, 子弹.y);
          return false;
        }
      }
      return true;
    });

    this.敌人子弹列表 = this.敌人子弹列表.filter((子弹) => {
      for (const 玩家 of this.玩家列表) {
        if (玩家.生命 <= 0) continue;
        const 护盾激活 = 现在 < 玩家.护盾结束时间;
        const 中心Y = 玩家.y - 玩家.高度 / 2;
        const dx = 子弹.x - 玩家.x;
        const dy = 子弹.y - 中心Y;
        const 半径 = 玩家.宽度 / 2 + 4;
        if (Math.sqrt(dx * dx + dy * dy) < 半径 + Math.max(子弹.宽度, 子弹.高度) / 2) {
          if (!护盾激活) {
            this.伤害玩家(玩家, 子弹.伤害);
          }
          return false;
        }
      }
      return true;
    });

    this.敌人列表 = this.敌人列表.filter((敌人) => {
      for (const 玩家 of this.玩家列表) {
        if (玩家.生命 <= 0) continue;
        const 护盾激活 = 现在 < 玩家.护盾结束时间;
        const 中心Y = 玩家.y - 玩家.高度 / 2;
        const dx = 敌人.x - 玩家.x;
        const dy = 敌人.y - 中心Y;
        const 距离 = Math.sqrt(dx * dx + dy * dy);
        const 碰撞距离 = 玩家.宽度 / 2 + Math.min(敌人.宽度, 敌人.高度) / 2;
        if (距离 < 碰撞距离) {
          if (!护盾激活) {
            this.伤害玩家(玩家, 敌人.伤害);
          }
          if (敌人.类型 !== 'boss') {
            this.伤害敌人(敌人, 9999, 敌人.x, 敌人.y);
          }
        }
      }
      return 敌人.生命 > 0;
    });
  }

  伤害敌人(敌人, 伤害, x, y) {
    敌人.生命 -= 伤害;
    if (敌人.生命 <= 0) {
      this.生成掉落(敌人.x, 敌人.y);
      this.增加分数(敌人.得分);
      this.更新最高分();
      this.粒子系统?.生成爆炸(x, y);
      this.触发屏幕震动();
    }
  }

  伤害玩家(玩家, 伤害) {
    if (performance.now() < 玩家.护盾结束时间) return;
    玩家.生命 -= 伤害;
    玩家.最后受击时间 = performance.now();
    this.触发屏幕震动();
    if (玩家.生命 <= 0) {
      玩家.生命 = 0;
      if (this.玩家列表.every((p) => p.生命 <= 0)) {
        this.结束游戏();
      }
    }
  }

  生成掉落(x, y) {
    const 设置 = this.游戏配置.掉落;
    const 随机 = Math.random();
    let 累计 = 0;
    let 类型 = null;
    for (const [键, 配置项] of Object.entries(设置)) {
      累计 += 配置项.概率;
      if (随机 <= 累计) {
        类型 = 键;
        break;
      }
    }
    if (!类型) return;
    this.掉落列表.push({
      x,
      y,
      类型,
      半径: 设置[类型].半径,
      颜色: 设置[类型].颜色,
      生命: 12,
      漂移: Math.random() * Math.PI * 2
    });
  }

  更新掉落(时间差, 高度) {
    const 地面Y = 高度 - this.游戏配置.世界.地面高度;
    this.掉落列表 = this.掉落列表.filter((掉落) => {
      掉落.生命 -= 时间差;
      if (掉落.生命 <= 0) return false;
      掉落.漂移 += 时间差 * 3;
      const 目标Y = 地面Y - 掉落.半径;
      if (掉落.y < 目标Y) {
        掉落.y += 240 * 时间差;
        if (掉落.y > 目标Y) 掉落.y = 目标Y;
      }
      for (const 玩家 of this.玩家列表) {
        if (玩家.生命 <= 0) continue;
        const dx = 玩家.x - 掉落.x;
        const dy = 玩家.y - 玩家.高度 / 2 - 掉落.y;
        if (Math.sqrt(dx * dx + dy * dy) < 玩家.宽度 / 2 + 掉落.半径 + 6) {
          this.拾取掉落(掉落, 玩家);
          return false;
        }
      }
      return true;
    });
  }

  拾取掉落(掉落, 玩家) {
    const 配置项 = this.游戏配置.掉落[掉落.类型];
    if (掉落.类型 === '回血') {
      玩家.生命 = Math.min(this.游戏配置.玩家.最大生命, 玩家.生命 + 配置项.恢复量);
    } else if (掉落.类型 === '能量') {
      玩家.能量 = Math.min(this.游戏配置.玩家.最大能量, 玩家.能量 + 配置项.恢复量);
    } else if (掉落.类型 === '分数') {
      this.增加分数(配置项.分数);
    }
  }

  绘制掉落() {
    this.上下文.save();
    for (const 掉落 of this.掉落列表) {
      const 屏幕X = 掉落.x - this.相机.x;
      const 脉冲 = 1 + Math.sin(掉落.漂移) * 0.15;
      this.上下文.beginPath();
      this.上下文.arc(屏幕X, 掉落.y, 掉落.半径 * 脉冲, 0, Math.PI * 2);
      this.上下文.fillStyle = 掉落.颜色;
      this.上下文.shadowBlur = 15;
      this.上下文.shadowColor = 掉落.颜色;
      this.上下文.fill();
      this.上下文.shadowBlur = 0;
      this.上下文.fillStyle = '#fff';
      this.上下文.font = 'bold 9px "Courier New", monospace';
      this.上下文.textAlign = 'center';
      this.上下文.textBaseline = 'middle';
      const 符号 = 掉落.类型 === '回血' ? '+' : 掉落.类型 === '能量' ? '⚡' : '★';
      this.上下文.fillText(符号, 屏幕X, 掉落.y);
    }
    this.上下文.restore();
  }

  使用护盾(玩家) {
    const 技能 = this.游戏配置.技能.shield;
    玩家.护盾结束时间 = performance.now() + 技能.持续时间;
  }

  使用导弹(玩家) {
    const 技能 = this.游戏配置.技能.missile;
    const 数量 = 技能.数量;
    const 基础角度 = 玩家.朝向 === 1 ? 0 : Math.PI;
    for (let i = 0; i < 数量; i++) {
      const 角度 = 基础角度 + (i - (数量 - 1) / 2) * 0.25;
      this.导弹列表.push({
        x: 玩家.x + 玩家.朝向 * 玩家.宽度,
        y: 玩家.y - 玩家.高度 / 2,
        角度,
        速度: 技能.速度,
        伤害: 技能.伤害,
        生存时间: 4
      });
    }
    this.触发屏幕震动();
  }

  使用EMP(玩家) {
    const 技能 = this.游戏配置.技能.emp;
    this.特效列表.push({
      类型: 'emp',
      持续时间: 技能.持续时间,
      经过时间: 0,
      半径: 0,
      最大半径: 技能.半径,
      伤害: 技能.伤害,
      x: 玩家.x,
      y: 玩家.y - 玩家.高度 / 2,
      颜色: 技能.颜色
    });
    this.触发屏幕震动();
  }

  使用斩击(玩家) {
    const 技能 = this.游戏配置.技能.slash;
    const 起点X = 玩家.x + 玩家.朝向 * (玩家.宽度 / 2 + 技能.长度 / 2);
    const 起点Y = 玩家.y - 玩家.高度 / 2;
    this.特效列表.push({
      类型: 'slash',
      持续时间: 技能.持续时间,
      经过时间: 0,
      x: 起点X,
      y: 起点Y,
      角度: 玩家.朝向 === 1 ? 0 : Math.PI,
      长度: 技能.长度,
      角度范围: 技能.角度,
      伤害: 技能.伤害,
      颜色: 技能.颜色
    });
    this.触发屏幕震动();
  }

  尝试使用技能(玩家, 技能标识) {
    if (!this.运行中 || this.已暂停) return;
    const 技能 = this.游戏配置.技能[技能标识];
    if (!技能) return;

    const 状态 = 玩家.技能状态[技能标识];
    const 现在 = performance.now();
    if (现在 - 状态.最后使用时间 < 技能.冷却) return;
    if (玩家.能量 < 技能.消耗) return;

    玩家.能量 = Math.max(0, 玩家.能量 - 技能.消耗);
    状态.最后使用时间 = 现在;

    switch (技能标识) {
      case 'shield':
        this.使用护盾(玩家);
        break;
      case 'missile':
        this.使用导弹(玩家);
        break;
      case 'emp':
        this.使用EMP(玩家);
        break;
      case 'slash':
        this.使用斩击(玩家);
        break;
    }
  }

  处理键盘按下(e) {
    this.键盘状态[e.key] = true;
    if (this.是游戏键(e.key)) {
      e.preventDefault();
    }
    if (!this.运行中 || this.已暂停) return;

    for (const 玩家 of this.玩家列表) {
      if (玩家.生命 <= 0) continue;
      const 控制 = 玩家.控制;
      for (const [技能标识, 按键列表] of Object.entries(控制.技能)) {
        if (this.键在列表中(e.key, 按键列表)) {
          this.尝试使用技能(玩家, 技能标识);
          return;
        }
      }
    }
  }

  处理键盘释放(e) {
    this.键盘状态[e.key] = false;
  }

  处理指针移动() {}

  键是否按下(键列表) {
    if (!Array.isArray(键列表)) return !!this.键盘状态[键列表];
    return 键列表.some((键) => this.键盘状态[键]);
  }

  键在列表中(键, 键列表) {
    if (!Array.isArray(键列表)) return 键 === 键列表;
    return 键列表.includes(键);
  }

  是游戏键(键) {
    const 控制列表 = [this.游戏配置.玩家1控制, this.游戏配置.玩家2控制];
    for (const 控制 of 控制列表) {
      if (this.键在列表中(键, 控制.左)) return true;
      if (this.键在列表中(键, 控制.右)) return true;
      if (this.键在列表中(键, 控制.跳)) return true;
      if (this.键在列表中(键, 控制.蹲)) return true;
      if (this.键在列表中(键, 控制.攻击)) return true;
      for (const 列表 of Object.values(控制.技能)) {
        if (this.键在列表中(键, 列表)) return true;
      }
    }
    return false;
  }

  寻找最近玩家(x, y) {
    let 最近 = null;
    let 最小距离 = Number.POSITIVE_INFINITY;
    for (const 玩家 of this.玩家列表) {
      if (玩家.生命 <= 0) continue;
      const dx = 玩家.x - x;
      const dy = 玩家.y - 玩家.高度 / 2 - y;
      const 距离 = dx * dx + dy * dy;
      if (距离 < 最小距离) {
        最小距离 = 距离;
        最近 = 玩家;
      }
    }
    return 最近;
  }

  寻找最近敌人(x, y) {
    let 最近 = null;
    let 最小距离 = Number.POSITIVE_INFINITY;
    for (const 敌人 of this.敌人列表) {
      const dx = 敌人.x - x;
      const dy = 敌人.y - y;
      const 距离 = dx * dx + dy * dy;
      if (距离 < 最小距离) {
        最小距离 = 距离;
        最近 = 敌人;
      }
    }
    return 最近;
  }

  获取玩家技能首键(玩家, 技能标识) {
    const 列表 = 玩家.控制.技能[技能标识];
    if (!Array.isArray(列表)) return '';
    const 键 = 列表[0] || '';
    return 键.replace('Numpad', '');
  }

  更新技能条(时间戳) {
    if (!this.技能条容器) return;
    this.玩家列表.forEach((玩家) => {
      Object.entries(玩家.技能状态).forEach(([标识, 状态]) => {
        if (!状态.元素 || !状态.覆盖层) return;
        const 技能 = this.游戏配置.技能[标识];
        const 经过 = 时间戳 - 状态.最后使用时间;
        const 冷却中 = 经过 < 技能.冷却;
        const 能量不足 = 玩家.能量 < 技能.消耗;
        const 进度 = Math.min(1, 经过 / 技能.冷却);
        状态.覆盖层.style.height = `${(1 - 进度) * 100}%`;
        状态.元素.classList.toggle('ready', !冷却中 && !能量不足);
        状态.元素.classList.toggle('cooldown', 冷却中);
        状态.元素.classList.toggle('no-energy', !冷却中 && 能量不足);
      });
    });
  }

  绘制背景(宽度, 高度) {
    this.上下文.save();
    const 网格大小 = this.游戏配置.世界.网格大小;
    const 偏移 = -(this.相机.x % 网格大小);

    // 稀疏垂直景深线
    this.上下文.strokeStyle = 'rgba(0, 240, 255, 0.035)';
    this.上下文.lineWidth = 1;
    for (let x = 偏移; x <= 宽度; x += 网格大小 * 2) {
      this.上下文.beginPath();
      this.上下文.moveTo(x, 0);
      this.上下文.lineTo(x, 高度);
      this.上下文.stroke();
    }

    // 三条水平参考线
    this.上下文.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    const 水平线 = [高度 * 0.35, 高度 * 0.62];
    for (const y of 水平线) {
      this.上下文.beginPath();
      this.上下文.moveTo(0, y);
      this.上下文.lineTo(宽度, y);
      this.上下文.stroke();
    }
    this.上下文.restore();
  }

  绘制地面(宽度, 高度) {
    const 地面Y = 高度 - this.游戏配置.世界.地面高度;
    this.上下文.save();

    // 底部暗色渐变带，只占很小高度
    const 渐变 = this.上下文.createLinearGradient(0, 地面Y, 0, 高度);
    渐变.addColorStop(0, 'rgba(0, 240, 255, 0.06)');
    渐变.addColorStop(1, 'rgba(0, 240, 255, 0.02)');
    this.上下文.fillStyle = 渐变;
    this.上下文.fillRect(0, 地面Y, 宽度, this.游戏配置.世界.地面高度);

    // 霓虹地平线
    this.上下文.shadowBlur = 8;
    this.上下文.shadowColor = 配置.颜色.霓虹青;
    this.上下文.strokeStyle = 配置.颜色.霓虹青;
    this.上下文.lineWidth = 1.5;
    this.上下文.beginPath();
    this.上下文.moveTo(0, 地面Y);
    this.上下文.lineTo(宽度, 地面Y);
    this.上下文.stroke();

    // 地面流动刻度灯
    this.上下文.fillStyle = 'rgba(0, 240, 255, 0.25)';
    const 网格大小 = this.游戏配置.世界.网格大小;
    const 刻度间距 = 网格大小;
    const 刻度偏移 = -(this.相机.x % 刻度间距);
    const 刻度高 = Math.min(4, this.游戏配置.世界.地面高度 * 0.45);
    for (let x = 刻度偏移; x <= 宽度; x += 刻度间距) {
      this.上下文.fillRect(x + 刻度间距 * 0.35, 地面Y + 刻度高, 刻度间距 * 0.3, 刻度高);
    }

    this.上下文.restore();
  }

  颜色亮度(hex, 系数) {
    const h = String(hex).replace('#', '');
    const r = Math.min(255, Math.round(Number.parseInt(h.slice(0, 2), 16) * 系数));
    const g = Math.min(255, Math.round(Number.parseInt(h.slice(2, 4), 16) * 系数));
    const b = Math.min(255, Math.round(Number.parseInt(h.slice(4, 6), 16) * 系数));
    return `rgb(${r},${g},${b})`;
  }

  带透明度(hex, a) {
    const h = String(hex).replace('#', '');
    const r = Number.parseInt(h.slice(0, 2), 16);
    const g = Number.parseInt(h.slice(2, 4), 16);
    const b = Number.parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  圆角矩形路径(x, y, w, h, r) {
    const ctx = this.上下文;
    const 半径 = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + 半径, y);
    ctx.arcTo(x + w, y, x + w, y + h, 半径);
    ctx.arcTo(x + w, y + h, x, y + h, 半径);
    ctx.arcTo(x, y + h, x, y, 半径);
    ctx.arcTo(x, y, x + w, y, 半径);
    ctx.closePath();
  }

  绘制玩家() {
    const 现在 = performance.now();
    for (const 玩家 of this.玩家列表) {
      if (玩家.生命 <= 0) continue;
      const 屏幕X = 玩家.x - this.相机.x;
      const 中心Y = 玩家.y - 玩家.高度 / 2;
      const 护盾激活 = 现在 < 玩家.护盾结束时间;
      const 主色 = 玩家.颜色;
      const 亮色 = this.颜色亮度(主色, 1.6);
      const 暗色 = this.颜色亮度(主色, 0.4);
      const 移动中 = Math.abs(玩家.vx || 0) > 5;
      const 摆动 = 移动中 ? Math.sin(现在 / 90) * 4 : 0;
      const bob = 玩家.grounded ? Math.sin(现在 / 220) * 1.2 : 0;

      this.上下文.save();

      // 地面投影
      this.上下文.save();
      this.上下文.translate(屏幕X, 玩家.y);
      this.上下文.scale(1, 0.35);
      const 阴影半径 = 玩家.宽度 * 0.75;
      const 阴影渐变 = this.上下文.createRadialGradient(0, 0, 0, 0, 0, 阴影半径);
      阴影渐变.addColorStop(0, 'rgba(0,0,0,0.4)');
      阴影渐变.addColorStop(1, 'rgba(0,0,0,0)');
      this.上下文.fillStyle = 阴影渐变;
      this.上下文.beginPath();
      this.上下文.arc(0, 0, 阴影半径, 0, Math.PI * 2);
      this.上下文.fill();
      this.上下文.restore();

      if (护盾激活) {
        const 剩余时间 = 玩家.护盾结束时间 - 现在;
        const 进度 = 1 - 剩余时间 / this.游戏配置.技能.shield.持续时间;
        const 脉冲 = 1 + Math.sin(进度 * Math.PI * 8) * 0.06;
        this.上下文.beginPath();
        this.上下文.arc(屏幕X, 中心Y, (Math.max(玩家.宽度, 玩家.高度) + 12) * 脉冲, 0, Math.PI * 2);
        this.上下文.strokeStyle = this.游戏配置.技能.shield.颜色;
        this.上下文.lineWidth = 2;
        this.上下文.shadowBlur = 20;
        this.上下文.shadowColor = this.游戏配置.技能.shield.颜色;
        this.上下文.stroke();
        this.上下文.globalAlpha = 0.12 + 0.08 * Math.sin(进度 * Math.PI * 4);
        this.上下文.fillStyle = this.游戏配置.技能.shield.颜色;
        this.上下文.fill();
        this.上下文.globalAlpha = 1;
      }

      this.上下文.translate(屏幕X, 中心Y + bob);
      this.上下文.scale(玩家.朝向, 1);

      // ===== 腿 =====
      const 腿绘制 = (偏移, 摆) => {
        this.上下文.strokeStyle = 暗色;
        this.上下文.lineWidth = 6;
        this.上下文.lineCap = 'round';
        this.上下文.shadowBlur = 8;
        this.上下文.shadowColor = 主色;
        this.上下文.beginPath();
        this.上下文.moveTo(偏移 * 3, 2);
        this.上下文.lineTo(偏移 * 3 + 摆, 14);
        this.上下文.lineTo(偏移 * 3 + 摆 * 1.4, 25);
        this.上下文.stroke();
        this.上下文.fillStyle = 主色;
        this.上下文.fillRect(偏移 * 3 + 摆 * 1.4 - 5, 23, 12, 4);
      };
      腿绘制(-1, -摆动);
      腿绘制(1, 摆动);

      // ===== 躯干 =====
      this.上下文.shadowBlur = 18;
      this.上下文.shadowColor = 主色;
      const 躯干渐变 = this.上下文.createLinearGradient(0, -10, 0, 12);
      躯干渐变.addColorStop(0, 亮色);
      躯干渐变.addColorStop(0.5, 主色);
      躯干渐变.addColorStop(1, 暗色);
      this.上下文.fillStyle = 躯干渐变;
      this.圆角矩形路径(-11, -10, 22, 22, 5);
      this.上下文.fill();

      // 胸口装甲线
      this.上下文.strokeStyle = 亮色;
      this.上下文.lineWidth = 1.5;
      this.上下文.shadowBlur = 6;
      this.上下文.beginPath();
      this.上下文.moveTo(0, -10);
      this.上下文.lineTo(0, 12);
      this.上下文.moveTo(-11, 2);
      this.上下文.lineTo(11, 2);
      this.上下文.stroke();

      // 反应堆核心
      const 核心脉冲 = 0.6 + Math.sin(现在 / 150) * 0.4;
      this.上下文.shadowBlur = 22 * 核心脉冲;
      this.上下文.shadowColor = 亮色;
      this.上下文.fillStyle = '#ffffff';
      this.上下文.beginPath();
      this.上下文.arc(0, 1, 4 + 核心脉冲 * 1.5, 0, Math.PI * 2);
      this.上下文.fill();

      // ===== 肩甲 =====
      this.上下文.fillStyle = 暗色;
      this.上下文.shadowBlur = 12;
      this.上下文.shadowColor = 主色;
      [-1, 1].forEach((s) => {
        this.上下文.beginPath();
        this.上下文.moveTo(s * 9, -10);
        this.上下文.lineTo(s * 14, -8);
        this.上下文.lineTo(s * 13, -2);
        this.上下文.lineTo(s * 8, -2);
        this.上下文.closePath();
        this.上下文.fill();
      });

      // ===== 头 =====
      this.上下文.fillStyle = 主色;
      this.上下文.shadowBlur = 14;
      this.圆角矩形路径(-7, -24, 14, 13, 4);
      this.上下文.fill();
      // 面罩眼缝
      this.上下文.fillStyle = 亮色;
      this.上下文.shadowBlur = 16;
      this.上下文.shadowColor = 亮色;
      this.上下文.fillRect(1, -20, 7, 3);
      // 天线
      this.上下文.strokeStyle = 亮色;
      this.上下文.lineWidth = 1.5;
      this.上下文.shadowBlur = 8;
      this.上下文.beginPath();
      this.上下文.moveTo(-6, -24);
      this.上下文.lineTo(-9, -29);
      this.上下文.stroke();
      this.上下文.fillStyle = '#fff';
      this.上下文.beginPath();
      this.上下文.arc(-9, -29, 1.6, 0, Math.PI * 2);
      this.上下文.fill();

      // ===== 前臂与武器 =====
      this.上下文.strokeStyle = 暗色;
      this.上下文.lineWidth = 5;
      this.上下文.lineCap = 'round';
      this.上下文.shadowBlur = 8;
      this.上下文.shadowColor = 主色;
      this.上下文.beginPath();
      this.上下文.moveTo(9, -4);
      this.上下文.lineTo(13, 4);
      this.上下文.stroke();
      this.上下文.fillStyle = 亮色;
      this.上下文.shadowBlur = 10;
      this.上下文.shadowColor = 亮色;
      this.上下文.fillRect(13, 1, 14, 4);

      // 攻击闪光
      const 攻击闪光 = 玩家.最后攻击时间 && 现在 - 玩家.最后攻击时间 < 110;
      if (攻击闪光) {
        const f = 1 - (现在 - 玩家.最后攻击时间) / 110;
        this.上下文.fillStyle = `rgba(255,255,255,${0.7 * f})`;
        this.上下文.beginPath();
        this.上下文.moveTo(27, 3);
        this.上下文.lineTo(27 + 16 * f, 0);
        this.上下文.lineTo(27, -1);
        this.上下文.closePath();
        this.上下文.fill();
      }

      // ===== 推进器尾焰 =====
      const 尾焰强度 = 玩家.grounded ? (移动中 ? 0.6 : 0.25) : 1;
      if (尾焰强度 > 0) {
        const 焰长 = (移动中 ? 9 : 5) * (0.6 + Math.random() * 0.4) * 尾焰强度;
        this.上下文.save();
        this.上下文.globalAlpha = 0.85;
        const 焰渐变 = this.上下文.createLinearGradient(0, 27, 0, 27 + 焰长);
        焰渐变.addColorStop(0, 亮色);
        焰渐变.addColorStop(1, 'rgba(255,255,255,0)');
        this.上下文.fillStyle = 焰渐变;
        this.上下文.beginPath();
        this.上下文.moveTo(-5, 27);
        this.上下文.lineTo(0, 27 + 焰长);
        this.上下文.lineTo(5, 27);
        this.上下文.closePath();
        this.上下文.fill();
        this.上下文.restore();
      }

      this.上下文.restore();
    }
  }

  绘制敌人(世界宽) {
    const 现在 = performance.now();
    const 右边界 = 世界宽 + 120 / this.缩放;
    for (const 敌人 of this.敌人列表) {
      const 屏幕X = 敌人.x - this.相机.x;
      if (屏幕X < -120 / this.缩放 || 屏幕X > 右边界) continue;

      const 主色 = 敌人.颜色;
      const 亮色 = this.颜色亮度(主色, 1.7);
      const 暗色 = this.颜色亮度(主色, 0.4);

      this.上下文.save();
      this.上下文.translate(屏幕X, 敌人.y);

      if (敌人.类型 === 'drone') {
        this.绘制无人机(敌人, 主色, 亮色, 暗色, 现在);
      } else if (敌人.类型 === 'tank') {
        this.绘制坦克(敌人, 主色, 亮色, 暗色, 现在);
      } else if (敌人.类型 === 'shooter') {
        this.绘制射手机器人(敌人, 主色, 亮色, 暗色, 现在);
      } else if (敌人.类型 === 'archer') {
        this.绘制弓箭机器人(敌人, 主色, 亮色, 暗色, 现在);
      } else if (敌人.类型 === 'boss') {
        this.绘制Boss机甲(敌人, 主色, 亮色, 暗色, 现在);
      } else {
        this.上下文.shadowBlur = 15;
        this.上下文.shadowColor = 主色;
        this.上下文.fillStyle = 主色;
        this.上下文.beginPath();
        this.上下文.arc(0, 0, 敌人.宽度 / 2, 0, Math.PI * 2);
        this.上下文.fill();
      }

      // 生命条
      const 生命比例 = Math.max(0, 敌人.生命 / 敌人.最大生命);
      const 条宽 = 敌人.宽度;
      const 条上 = -敌人.高度 / 2 - 10;
      this.上下文.shadowBlur = 0;
      this.上下文.fillStyle = 'rgba(0,0,0,0.6)';
      this.上下文.fillRect(-条宽 / 2, 条上, 条宽, 4);
      this.上下文.fillStyle = 生命比例 > 0.5 ? '#39ff88' : 生命比例 > 0.25 ? '#ffd23f' : '#ff3b46';
      this.上下文.fillRect(-条宽 / 2, 条上, 条宽 * 生命比例, 4);

      this.上下文.restore();
    }
  }

  绘制无人机(敌人, 主色, 亮色, _暗色, 现在) {
    const 半宽 = 敌人.宽度 / 2;
    const 半高 = 敌人.高度 / 2;
    const 浮动 = Math.sin(现在 / 300 + 敌人.x * 0.01) * 3;
    this.上下文.translate(0, 浮动);

    // 旋翼
    this.上下文.strokeStyle = 亮色;
    this.上下文.lineWidth = 2;
    this.上下文.shadowBlur = 10;
    this.上下文.shadowColor = 亮色;
    const 旋速 = 现在 / 40;
    [-1, 1].forEach((s) => {
      this.上下文.save();
      this.上下文.translate(s * 半宽, -半高 - 2);
      this.上下文.rotate(旋速 * s);
      this.上下文.beginPath();
      this.上下文.moveTo(-6, 0);
      this.上下文.lineTo(6, 0);
      this.上下文.stroke();
      this.上下文.restore();
    });

    // 机身
    this.上下文.fillStyle = 主色;
    this.上下文.shadowBlur = 16;
    this.上下文.shadowColor = 主色;
    this.上下文.beginPath();
    this.上下文.moveTo(0, -半高);
    this.上下文.lineTo(半宽, -2);
    this.上下文.lineTo(半宽 * 0.5, 半高);
    this.上下文.lineTo(-半宽 * 0.5, 半高);
    this.上下文.lineTo(-半宽, -2);
    this.上下文.closePath();
    this.上下文.fill();

    // 核心眼
    const 眼脉冲 = 0.6 + Math.sin(现在 / 200) * 0.4;
    this.上下文.fillStyle = '#fff';
    this.上下文.shadowBlur = 14 * 眼脉冲;
    this.上下文.shadowColor = 亮色;
    this.上下文.beginPath();
    this.上下文.arc(0, 0, 3 + 眼脉冲 * 1.5, 0, Math.PI * 2);
    this.上下文.fill();
  }

  绘制坦克(敌人, 主色, 亮色, 暗色, 现在) {
    const 半宽 = 敌人.宽度 / 2;
    const 半高 = 敌人.高度 / 2;

    // 履带
    this.上下文.fillStyle = 暗色;
    this.上下文.shadowBlur = 8;
    this.上下文.shadowColor = 主色;
    this.圆角矩形路径(-半宽, 半高 - 8, 敌人.宽度, 10, 4);
    this.上下文.fill();
    // 履带轮
    this.上下文.fillStyle = 亮色;
    [-半宽 + 6, 0, 半宽 - 6].forEach((wx) => {
      this.上下文.beginPath();
      this.上下文.arc(wx, 半高 - 3, 3, 0, Math.PI * 2);
      this.上下文.fill();
    });

    // 车体
    const 车体渐变 = this.上下文.createLinearGradient(0, -半高, 0, 半高);
    车体渐变.addColorStop(0, 亮色);
    车体渐变.addColorStop(0.5, 主色);
    车体渐变.addColorStop(1, 暗色);
    this.上下文.fillStyle = 车体渐变;
    this.上下文.shadowBlur = 16;
    this.上下文.shadowColor = 主色;
    this.圆角矩形路径(-半宽 + 2, -半高, 敌人.宽度 - 10, 半高 + 6, 6);
    this.上下文.fill();

    // 装甲缝
    this.上下文.strokeStyle = 暗色;
    this.上下文.lineWidth = 2;
    this.上下文.beginPath();
    this.上下文.moveTo(-半宽 + 4, -2);
    this.上下文.lineTo(半宽 - 12, -2);
    this.上下文.stroke();

    // 炮管（朝左）
    this.上下文.fillStyle = 亮色;
    this.上下文.shadowBlur = 10;
    this.上下文.shadowColor = 亮色;
    this.上下文.fillRect(-半宽 - 8, -4, 12, 6);

    // 传感器眼
    const 眼脉冲 = 0.6 + Math.sin(现在 / 240) * 0.4;
    this.上下文.fillStyle = '#fff';
    this.上下文.shadowBlur = 12 * 眼脉冲;
    this.上下文.beginPath();
    this.上下文.arc(-半宽 + 8, -半高 + 6, 3, 0, Math.PI * 2);
    this.上下文.fill();
  }

  绘制射手机器人(敌人, 主色, 亮色, 暗色, 现在) {
    const 半宽 = 敌人.宽度 / 2;
    const 半高 = 敌人.高度 / 2;

    // 底座
    this.上下文.fillStyle = 暗色;
    this.上下文.shadowBlur = 8;
    this.上下文.shadowColor = 主色;
    this.圆角矩形路径(-半宽 + 2, 半高 - 8, 敌人.宽度 - 4, 9, 3);
    this.上下文.fill();

    // 炮塔
    this.上下文.fillStyle = 主色;
    this.上下文.shadowBlur = 14;
    this.上下文.shadowColor = 主色;
    this.上下文.beginPath();
    this.上下文.arc(0, -2, 半宽 - 2, 0, Math.PI * 2);
    this.上下文.fill();

    // 旋转炮管
    const 摆动角 = Math.sin(现在 / 400) * 0.15 - 0.1;
    this.上下文.save();
    this.上下文.translate(-半宽 + 4, -2);
    this.上下文.rotate(摆动角);
    this.上下文.fillStyle = 亮色;
    this.上下文.shadowBlur = 10;
    this.上下文.shadowColor = 亮色;
    this.上下文.fillRect(-敌人.宽度 * 0.7, -3, 敌人.宽度 * 0.7, 6);
    this.上下文.restore();

    // 核心
    const 眼脉冲 = 0.6 + Math.sin(现在 / 200) * 0.4;
    this.上下文.fillStyle = '#fff';
    this.上下文.shadowBlur = 12 * 眼脉冲;
    this.上下文.beginPath();
    this.上下文.arc(2, -2, 3.5, 0, Math.PI * 2);
    this.上下文.fill();
  }

  绘制弓箭机器人(敌人, 主色, 亮色, _暗色, 现在) {
    const 半宽 = 敌人.宽度 / 2;
    const 半高 = 敌人.高度 / 2;

    // 身体
    this.上下文.fillStyle = 主色;
    this.上下文.shadowBlur = 14;
    this.上下文.shadowColor = 主色;
    this.圆角矩形路径(-8, -半高 + 6, 16, 半高 + 2, 5);
    this.上下文.fill();
    // 头
    this.圆角矩形路径(-6, -半高, 12, 9, 3);
    this.上下文.fill();
    // 眼
    this.上下文.fillStyle = 亮色;
    this.上下文.shadowBlur = 12;
    this.上下文.shadowColor = 亮色;
    this.上下文.fillRect(-5, -半高 + 3, 8, 2.5);

    // 能量弓（朝左的弧）
    const 弓半径 = 半高 - 4;
    const 起 = Math.PI - Math.PI / 2.2;
    const 止 = Math.PI + Math.PI / 2.2;
    this.上下文.strokeStyle = 亮色;
    this.上下文.lineWidth = 3;
    this.上下文.shadowBlur = 14;
    this.上下文.shadowColor = 亮色;
    this.上下文.beginPath();
    this.上下文.arc(-半宽 + 2, 0, 弓半径, 起, 止);
    this.上下文.stroke();
    // 弓弦
    this.上下文.strokeStyle = this.带透明度(亮色, 0.7);
    this.上下文.lineWidth = 1.5;
    this.上下文.shadowBlur = 6;
    this.上下文.beginPath();
    this.上下文.moveTo(-半宽 + 2 + 弓半径 * Math.cos(起), 弓半径 * Math.sin(起));
    this.上下文.lineTo(-半宽 + 2 + 弓半径 * Math.cos(止), 弓半径 * Math.sin(止));
    this.上下文.stroke();
    // 蓄能箭
    const 蓄能 = 0.5 + Math.sin(现在 / 180) * 0.5;
    this.上下文.fillStyle = '#fff';
    this.上下文.shadowBlur = 10 * 蓄能;
    this.上下文.beginPath();
    this.上下文.arc(-半宽 + 5, 0, 2.5 + 蓄能 * 1.5, 0, Math.PI * 2);
    this.上下文.fill();
  }

  绘制Boss机甲(敌人, 主色, 亮色, 暗色, 现在) {
    const 半宽 = 敌人.宽度 / 2;
    const 半高 = 敌人.高度 / 2;

    // 旋转光环
    const 环脉冲 = 0.5 + Math.sin(现在 / 250) * 0.5;
    this.上下文.strokeStyle = this.带透明度(亮色, 0.4 + 环脉冲 * 0.4);
    this.上下文.lineWidth = 3;
    this.上下文.shadowBlur = 20;
    this.上下文.shadowColor = 亮色;
    this.上下文.save();
    this.上下文.rotate(现在 / 600);
    this.上下文.beginPath();
    this.上下文.arc(0, 0, 半宽 + 10, 0, Math.PI * 2);
    this.上下文.stroke();
    this.上下文.restore();

    // 主体
    const 主体渐变 = this.上下文.createLinearGradient(0, -半高, 0, 半高);
    主体渐变.addColorStop(0, 亮色);
    主体渐变.addColorStop(0.5, 主色);
    主体渐变.addColorStop(1, 暗色);
    this.上下文.fillStyle = 主体渐变;
    this.上下文.shadowBlur = 28;
    this.上下文.shadowColor = 主色;
    this.圆角矩形路径(-半宽, -半高, 敌人.宽度, 敌人.高度, 12);
    this.上下文.fill();

    // 装甲分割线
    this.上下文.strokeStyle = 暗色;
    this.上下文.lineWidth = 3;
    this.上下文.beginPath();
    this.上下文.moveTo(0, -半高);
    this.上下文.lineTo(0, 半高);
    this.上下文.moveTo(-半宽, 0);
    this.上下文.lineTo(半宽, 0);
    this.上下文.stroke();

    // 肩部炮（朝左）
    this.上下文.fillStyle = 亮色;
    this.上下文.shadowBlur = 14;
    this.上下文.shadowColor = 亮色;
    [-1, 1].forEach((s) => {
      this.上下文.fillRect(-半宽 - 14, s * 18 - 5, 18, 10);
    });

    // 多眼
    this.上下文.fillStyle = '#fff';
    this.上下文.shadowBlur = 16;
    [-半宽 + 14, -半宽 + 28, 0].forEach((ex) => {
      this.上下文.beginPath();
      this.上下文.arc(ex, -半高 + 16, 4, 0, Math.PI * 2);
      this.上下文.fill();
    });

    // 核心
    const 核心脉冲 = 0.6 + Math.sin(现在 / 160) * 0.4;
    this.上下文.fillStyle = '#fff';
    this.上下文.shadowBlur = 26 * 核心脉冲;
    this.上下文.shadowColor = 亮色;
    this.上下文.beginPath();
    this.上下文.arc(0, 4, 8 + 核心脉冲 * 4, 0, Math.PI * 2);
    this.上下文.fill();
  }

  绘制敌人子弹() {
    this.上下文.save();
    this.上下文.shadowBlur = 10;
    this.上下文.shadowColor = '#f00';
    this.上下文.fillStyle = '#ff4444';

    for (const 子弹 of this.敌人子弹列表) {
      const 屏幕X = 子弹.x - this.相机.x;
      this.上下文.save();
      this.上下文.translate(屏幕X, 子弹.y);
      this.上下文.rotate(子弹.角度);
      this.上下文.fillRect(-子弹.宽度 / 2, -子弹.高度 / 2, 子弹.宽度, 子弹.高度);
      this.上下文.restore();
    }

    this.上下文.restore();
  }

  绘制玩家子弹() {
    this.上下文.save();

    for (const 子弹 of this.玩家子弹列表) {
      const 屏幕X = 子弹.x - this.相机.x;
      this.上下文.save();
      this.上下文.translate(屏幕X, 子弹.y);
      this.上下文.rotate(子弹.角度);
      this.上下文.shadowBlur = 15;
      this.上下文.shadowColor = 子弹.颜色;
      this.上下文.fillStyle = 子弹.颜色;
      this.上下文.fillRect(-子弹.宽度 / 2, -子弹.高度 / 2, 子弹.宽度, 子弹.高度);
      this.上下文.restore();
    }

    this.上下文.restore();
  }

  绘制导弹() {
    const 颜色 = this.游戏配置.技能.missile.颜色;
    this.上下文.save();

    for (const 导弹 of this.导弹列表) {
      const 屏幕X = 导弹.x - this.相机.x;
      this.上下文.save();
      this.上下文.translate(屏幕X, 导弹.y);
      this.上下文.rotate(导弹.角度);

      this.上下文.shadowBlur = 15;
      this.上下文.shadowColor = 颜色;
      this.上下文.fillStyle = 颜色;
      this.上下文.beginPath();
      this.上下文.moveTo(0, -6);
      this.上下文.lineTo(4, 5);
      this.上下文.lineTo(0, 2);
      this.上下文.lineTo(-4, 5);
      this.上下文.closePath();
      this.上下文.fill();

      this.上下文.restore();
    }

    this.上下文.restore();
  }

  绘制特效() {
    this.上下文.save();

    for (const 特效 of this.特效列表) {
      const 屏幕X = 特效.x - this.相机.x;
      if (特效.类型 === 'emp') {
        this.上下文.beginPath();
        this.上下文.arc(屏幕X, 特效.y, 特效.半径, 0, Math.PI * 2);
        this.上下文.strokeStyle = 特效.颜色;
        this.上下文.lineWidth = 4;
        this.上下文.shadowBlur = 30;
        this.上下文.shadowColor = 特效.颜色;
        this.上下文.globalAlpha = 1 - 特效.经过时间 / 特效.持续时间;
        this.上下文.stroke();
        this.上下文.globalAlpha = 0.1 * (1 - 特效.经过时间 / 特效.持续时间);
        this.上下文.fillStyle = 特效.颜色;
        this.上下文.fill();
        this.上下文.globalAlpha = 1;
      } else if (特效.类型 === 'slash') {
        const 进度 = 特效.经过时间 / 特效.持续时间;
        this.上下文.save();
        this.上下文.translate(屏幕X, 特效.y);
        this.上下文.rotate(特效.角度);
        this.上下文.beginPath();
        this.上下文.moveTo(0, 0);
        this.上下文.arc(0, 0, 特效.长度, -特效.角度范围 / 2, 特效.角度范围 / 2);
        this.上下文.closePath();
        this.上下文.fillStyle = 特效.颜色;
        this.上下文.globalAlpha = 0.4 * (1 - 进度);
        this.上下文.shadowBlur = 25;
        this.上下文.shadowColor = 特效.颜色;
        this.上下文.fill();
        this.上下文.globalAlpha = 1;
        this.上下文.restore();
      }
    }

    this.上下文.restore();
  }

  绘制HUD(宽度) {
    this.上下文.save();

    const 生命条宽 = 140;
    const 生命条高 = 10;
    const 能量条高 = 8;
    const 配置玩家 = this.游戏配置.玩家;

    this.玩家列表.forEach((玩家, 索引) => {
      const x = 15;
      const y = 15 + 索引 * 55;
      const 生命比例 = 玩家.生命 / 配置玩家.最大生命;
      const 能量比例 = 玩家.能量 / 配置玩家.最大能量;

      this.上下文.fillStyle = 'rgba(0,0,0,0.5)';
      this.上下文.fillRect(x, y, 生命条宽, 生命条高);
      this.上下文.fillStyle = 生命比例 > 0.5 ? '#00f0ff' : '#ff2a9d';
      this.上下文.shadowBlur = 10;
      this.上下文.shadowColor = this.上下文.fillStyle;
      this.上下文.fillRect(x, y, 生命条宽 * 生命比例, 生命条高);

      this.上下文.fillStyle = 'rgba(0,0,0,0.5)';
      this.上下文.fillRect(x, y + 18, 生命条宽, 能量条高);
      this.上下文.fillStyle = '#faff00';
      this.上下文.shadowColor = '#faff00';
      this.上下文.fillRect(x, y + 18, 生命条宽 * 能量比例, 能量条高);

      this.上下文.fillStyle = '#fff';
      this.上下文.font = 'bold 11px "Courier New", monospace';
      this.上下文.textAlign = 'left';
      this.上下文.textBaseline = 'top';
      this.上下文.shadowBlur = 0;
      this.上下文.fillText(
        `${t(`game.mechBattle.${玩家.标识}`)} ${t('game.mechBattle.hp')} ${Math.ceil(玩家.生命)}`,
        x,
        y + 28
      );
      this.上下文.fillText(`${t('game.mechBattle.energy')} ${Math.floor(玩家.能量)}`, x, y + 40);
    });

    this.上下文.font = 'bold 18px "Courier New", monospace';
    this.上下文.textAlign = 'right';
    this.上下文.shadowBlur = 10;
    this.上下文.shadowColor = '#fff';
    this.上下文.fillStyle = '#fff';
    this.上下文.fillText(t('game.mechBattle.score', { score: this.分数 }), 宽度 - 15, 15);

    if (this.敌人列表.some((e) => e.类型 === 'boss')) {
      this.上下文.textAlign = 'center';
      this.上下文.fillStyle = '#ff3b46';
      this.上下文.shadowBlur = 12;
      this.上下文.shadowColor = '#ff3b46';
      this.上下文.font = 'bold 18px "Courier New", monospace';
      this.上下文.fillText('⚠ BOSS', 宽度 / 2, 34);
      this.上下文.shadowBlur = 0;
    }

    this.上下文.restore();
  }

  矩形相交(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  点在扇形内(px, py, cx, cy, 角度, 角度范围, 半径) {
    const dx = px - cx;
    const dy = py - cy;
    const 距离 = Math.sqrt(dx * dx + dy * dy);
    if (距离 > 半径) return false;
    const 点角度 = Math.atan2(dy, dx);
    let 角度差 = 点角度 - 角度;
    while (角度差 > Math.PI) 角度差 -= Math.PI * 2;
    while (角度差 < -Math.PI) 角度差 += Math.PI * 2;
    return Math.abs(角度差) <= 角度范围 / 2;
  }

  点在矩形内(px, py, x, y, w, h) {
    return px >= x && px <= x + w && py >= y && py <= y + h;
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
