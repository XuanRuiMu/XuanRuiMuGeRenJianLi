import { 配置 } from '../config.js';
import { 游戏基类 } from '../core/GameBase.js';
import { t } from '../i18n.js';
import { 创建元素, 防抖 } from '../utils.js';

export class NeonDefense extends 游戏基类 {
  constructor(选项) {
    super(选项);
    this.游戏配置 = 配置.游戏.neonDefense;
    this.画布 = null;
    this.上下文 = null;
    this.动画帧 = null;
    this.绑定调整尺寸 = 防抖(() => this.调整尺寸(), 200);
    this.绑定处理指针按下 = (e) => this.处理指针按下(e);
    this.绑定处理指针移动 = (e) => this.处理指针移动(e);
    this.绑定处理键盘按下 = (e) => this.处理键盘按下(e);

    this.敌人列表 = [];
    this.塔列表 = [];
    this.子弹列表 = [];
    this.粒子列表 = [];
    this.闪电列表 = [];
    this.浮动文本列表 = [];
    this.当前波次 = 0;
    this.核心能量 = 0;
    this.数据币 = 0;
    this.波次进行中 = false;
    this.已生成敌人 = 0;
    this.最后生成时间 = 0;
    this.当前塔类型 = 'laser';
    this.悬停格子 = { x: -1, y: -1 };
    this.结算画面 = null;
    this.波次按钮 = null;
    this.开始按钮 = null;
    this.塔按钮 = {};
    this.技能按钮 = {};
    this.无尽模式按钮 = null;
    this.无尽模式 = false;
    this.全局技能 = {
      airstrike: { 冷却结束时间: 0 },
      emp: { 冷却结束时间: 0 },
      repair: { 冷却结束时间: 0 }
    };
    this.最后利息时间 = 0;
    this.缩放比例 = 1;
    this.偏移X = 0;
    this.偏移Y = 0;
    this.选中塔 = null;
    this.升级面板 = null;
    this.升级按钮 = null;
    this.出售按钮 = null;
    this.精英波次 = false;
    this.连击 = 0;
    this.震动强度 = 0;
    this.震动X = 0;
    this.震动Y = 0;
    this.时间缩放 = 1;
    this.游戏时钟 = 0;
    this.上次帧时间 = 0;
    this.暂停按钮 = null;
    this.速度按钮 = {};
  }

  async 初始化() {
    this.最高分 = this.状态管理器.读取(`各游戏最高分.${this.标识}`, 0);
    this.渲染();
  }

  渲染() {
    this.容器.innerHTML = '';
    this.容器.className = 'game-instance neon-defense';

    const 说明 = 创建元素('div', {
      class: 'game-instruction neon-defense-instruction',
      text: t('game.neonDefense.instruction')
    });
    this.容器.appendChild(说明);

    const 画布容器 = 创建元素('div', { class: 'neon-defense-canvas-wrap' });
    this.画布 = document.createElement('canvas');
    this.画布.setAttribute('aria-label', t('games.neonDefense.title'));
    画布容器.appendChild(this.画布);
    this.升级面板 = this.创建升级面板();
    this.容器.appendChild(this.升级面板);
    this.容器.appendChild(画布容器);

    this.上下文 = this.画布.getContext('2d');
    this.调整尺寸();

    const 塔栏 = this.创建塔栏();
    this.容器.appendChild(塔栏);

    const 控制栏 = this.创建控制栏();
    this.容器.appendChild(控制栏);

    this.结算画面 = this.创建结算画面();
    this.容器.appendChild(this.结算画面);

    this.开始按钮 = this.创建开始按钮();
    this.容器.appendChild(this.开始按钮);

    window.addEventListener('resize', this.绑定调整尺寸);
    this.画布.addEventListener('pointerdown', this.绑定处理指针按下);
    this.画布.addEventListener('pointermove', this.绑定处理指针移动);
    document.addEventListener('keydown', this.绑定处理键盘按下);
  }

  创建塔栏() {
    const 栏 = 创建元素('div', { class: 'neon-defense-tower-bar' });
    const 类型列表 = ['laser', 'pulse', 'ice', 'blast', 'sniper', 'poison', 'chain', 'flame'];
    类型列表.forEach((类型, 索引) => {
      const 塔配置 = this.游戏配置.塔列表[类型];
      const 按钮 = 创建元素('button', {
        class: `neon-defense-tower-btn ${类型 === this.当前塔类型 ? 'active' : ''}`,
        text: `${索引 + 1}.${塔配置.名称}`
      });
      按钮.dataset.type = 类型;
      const 造价 = 创建元素('span', {
        class: 'neon-defense-tower-cost',
        text: t('game.neonDefense.cost', { cost: 塔配置.造价 })
      });
      按钮.appendChild(造价);
      按钮.addEventListener('click', () => this.选择塔类型(类型));
      this.塔按钮[类型] = 按钮;
      栏.appendChild(按钮);
    });
    return 栏;
  }

  创建控制栏() {
    const 栏 = 创建元素('div', { class: 'neon-defense-control-bar' });

    this.波次按钮 = 创建元素('button', {
      class: 'neon-btn cyan neon-defense-wave-btn',
      text: t('game.neonDefense.startWave')
    });
    this.波次按钮.addEventListener('click', () => this.开始波次());
    栏.appendChild(this.波次按钮);

    this.无尽模式按钮 = 创建元素('button', {
      class: 'neon-btn purple neon-defense-endless-btn',
      text: t('game.neonDefense.endlessMode')
    });
    this.无尽模式按钮.addEventListener('click', () => this.开始无尽模式());
    栏.appendChild(this.无尽模式按钮);

    const 技能栏 = 创建元素('div', { class: 'neon-defense-skill-bar' });
    const 技能列表 = ['airstrike', 'emp', 'repair'];
    技能列表.forEach((技能) => {
      const 技能配置 = this.游戏配置.全局技能[技能];
      const 按钮 = 创建元素('button', {
        class: `neon-defense-skill-btn ${技能}`,
        text: `${技能配置.名称} (${技能配置.造价})`
      });
      按钮.dataset.skill = 技能;
      按钮.addEventListener('click', () => this.使用全局技能(技能));
      this.技能按钮[技能] = 按钮;
      技能栏.appendChild(按钮);
    });
    栏.appendChild(技能栏);

    const 速度栏 = 创建元素('div', { class: 'neon-defense-speed-bar' });
    [1, 2, 3].forEach((倍率) => {
      const 按钮 = 创建元素('button', {
        class: `neon-btn cyan neon-defense-speed-btn ${倍率 === 1 ? 'active' : ''}`,
        text: `${倍率}x`
      });
      按钮.dataset.speed = String(倍率);
      按钮.addEventListener('click', () => this.设置速度(倍率));
      this.速度按钮[倍率] = 按钮;
      速度栏.appendChild(按钮);
    });
    this.暂停按钮 = 创建元素('button', {
      class: 'neon-btn pink neon-defense-pause-btn',
      text: t('game.neonDefense.pause')
    });
    this.暂停按钮.addEventListener('click', () => this.切换暂停());
    速度栏.appendChild(this.暂停按钮);
    栏.appendChild(速度栏);

    return 栏;
  }

  创建升级面板() {
    const 面板 = 创建元素('div', { class: 'neon-defense-upgrade-panel hidden' });
    const 信息 = 创建元素('div', { class: 'neon-defense-upgrade-info' });
    const 按钮组 = 创建元素('div', { class: 'neon-defense-upgrade-buttons' });
    const 升级按钮 = 创建元素('button', {
      class: 'neon-btn cyan neon-defense-upgrade-btn',
      text: t('game.neonDefense.upgrade')
    });
    const 出售按钮 = 创建元素('button', {
      class: 'neon-btn pink neon-defense-sell-btn',
      text: t('game.neonDefense.sell')
    });
    升级按钮.addEventListener('click', () => this.升级选中塔());
    出售按钮.addEventListener('click', () => this.出售选中塔());
    this.升级按钮 = 升级按钮;
    this.出售按钮 = 出售按钮;
    按钮组.appendChild(升级按钮);
    按钮组.appendChild(出售按钮);
    面板.appendChild(信息);
    面板.appendChild(按钮组);
    return 面板;
  }

  创建结算画面() {
    const 画面 = 创建元素('div', { class: 'neon-defense-game-over hidden' });
    const 标题 = 创建元素('h2', { class: 'neon-defense-game-over-title', text: '' });
    const 结果 = 创建元素('div', { class: 'neon-defense-game-over-result', text: '' });
    const 按钮组 = 创建元素('div', { class: 'neon-defense-game-over-buttons' });
    const 下一波按钮 = 创建元素('button', {
      class: 'neon-btn cyan neon-defense-next-wave-btn',
      text: t('game.neonDefense.startWave')
    });
    const 重新开始按钮 = 创建元素('button', {
      class: 'neon-btn pink neon-defense-restart-btn',
      text: t('game.neonDefense.restart')
    });
    下一波按钮.addEventListener('click', () => this.下一波());
    重新开始按钮.addEventListener('click', () => this.重新开始());
    按钮组.appendChild(下一波按钮);
    按钮组.appendChild(重新开始按钮);
    画面.appendChild(标题);
    画面.appendChild(结果);
    画面.appendChild(按钮组);
    return 画面;
  }

  创建开始按钮() {
    const 按钮 = 创建元素('button', {
      class: 'neon-btn cyan neon-defense-start-overlay',
      text: t('game.neonDefense.startWave')
    });
    按钮.addEventListener('click', () => this.继续());
    return 按钮;
  }

  设置开始按钮(可见, 文本) {
    if (!this.开始按钮) return;
    this.开始按钮.style.display = 可见 ? '' : 'none';
    if (文本) this.开始按钮.textContent = 文本;
  }

  继续() {
    if (this.结算画面) this.结算画面.classList.add('hidden');
    this.开始波次();
  }

  调整尺寸() {
    if (!this.画布 || !this.上下文) return;
    const 地图 = this.游戏配置.地图;
    const 逻辑宽 = 地图.列数 * 地图.格子尺寸;
    const 逻辑高 = 地图.行数 * 地图.格子尺寸;
    const 容器 = this.画布.parentElement;
    const 容器尺寸 = 容器.getBoundingClientRect();
    const css宽 = 容器尺寸.width;
    const css高 = 容器尺寸.height;
    const dpr = window.devicePixelRatio || 1;
    const 缩放 = Math.min(css宽 / 逻辑宽, css高 / 逻辑高);
    this.缩放比例 = 缩放;
    this.偏移X = (css宽 - 逻辑宽 * 缩放) / 2;
    this.偏移Y = (css高 - 逻辑高 * 缩放) / 2;

    this.画布.width = Math.round(css宽 * dpr);
    this.画布.height = Math.round(css高 * dpr);

    this.上下文.setTransform(1, 0, 0, 1, 0, 0);
    this.上下文.clearRect(0, 0, this.画布.width, this.画布.height);
    this.上下文.setTransform(dpr * 缩放, 0, 0, dpr * 缩放, dpr * this.偏移X, dpr * this.偏移Y);
  }

  async 启动() {
    if (this.动画帧) {
      cancelAnimationFrame(this.动画帧);
      this.动画帧 = null;
    }
    this.运行中 = true;
    this.已暂停 = false;
    this.当前波次 = 0;
    this.重置分数();
    this.核心能量 = this.游戏配置.核心.最大能量;
    this.数据币 = this.游戏配置.初始数据币;
    this.敌人列表 = [];
    this.塔列表 = [];
    this.子弹列表 = [];
    this.粒子列表 = [];
    this.闪电列表 = [];
    this.浮动文本列表 = [];
    this.波次进行中 = false;
    this.已生成敌人 = 0;
    this.最后生成时间 = 0;
    this.当前塔类型 = 'laser';
    this.选中塔 = null;
    this.精英波次 = false;
    this.连击 = 0;
    this.震动强度 = 0;
    this.震动X = 0;
    this.震动Y = 0;
    this.时间缩放 = 1;
    this.游戏时钟 = 0;
    this.上次帧时间 = 0;
    this.隐藏升级面板();
    this.无尽模式 = false;
    this.全局技能 = {
      airstrike: { 冷却结束时间: 0 },
      emp: { 冷却结束时间: 0 },
      repair: { 冷却结束时间: 0 }
    };
    this.最后利息时间 = 0;
    this.更新塔栏();
    this.更新技能按钮();
    this.设置速度(1);
    if (this.暂停按钮) this.暂停按钮.textContent = t('game.neonDefense.pause');
    this.结算画面.classList.add('hidden');
    if (this.波次按钮) this.波次按钮.style.display = '';
    if (this.无尽模式按钮) this.无尽模式按钮.style.display = '';
    if (this.开始按钮) this.设置开始按钮(true, t('game.neonDefense.startWave'));
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
      this.画布.removeEventListener('pointerdown', this.绑定处理指针按下);
      this.画布.removeEventListener('pointermove', this.绑定处理指针移动);
    }
    window.removeEventListener('resize', this.绑定调整尺寸);
    document.removeEventListener('keydown', this.绑定处理键盘按下);
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
    const rect = this.画布.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const 格子 = this.屏幕坐标转格子(x, y);
    const 已有塔 = this.塔列表.find((塔) => 塔.x === 格子.x && 塔.y === 格子.y);
    if (已有塔) {
      this.选中塔 = 已有塔;
      this.显示升级面板();
      return;
    }
    if (this.可放置塔(格子.x, 格子.y)) {
      this.放置塔(格子.x, 格子.y, this.当前塔类型);
    } else {
      this.选中塔 = null;
      this.隐藏升级面板();
    }
  }

  处理指针移动(e) {
    if (!this.运行中) return;
    const rect = this.画布.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.悬停格子 = this.屏幕坐标转格子(x, y);
  }

  处理键盘按下(e) {
    if (!this.运行中 || this.已暂停) return;
    const 键映射 = {
      1: 'laser',
      2: 'pulse',
      3: 'ice',
      4: 'blast',
      5: 'sniper',
      6: 'poison',
      7: 'chain',
      8: 'flame'
    };
    if (键映射[e.key]) {
      this.选择塔类型(键映射[e.key]);
      return;
    }

    const 技能映射 = {
      q: 'airstrike',
      Q: 'airstrike',
      w: 'emp',
      W: 'emp',
      e: 'repair',
      E: 'repair'
    };
    if (技能映射[e.key]) {
      this.使用全局技能(技能映射[e.key]);
      return;
    }

    if (e.key === ' ' && !this.波次进行中) {
      e.preventDefault();
      if (this.无尽模式) this.开始波次();
      else this.开始无尽模式();
    }

    if (e.key === 'p' || e.key === 'P') {
      this.切换暂停();
      return;
    }

    if (e.key === 'u' || e.key === 'U') {
      this.升级选中塔();
      return;
    }
    if (e.key === 'x' || e.key === 'X') {
      this.出售选中塔();
      return;
    }
  }

  选择塔类型(类型) {
    this.当前塔类型 = 类型;
    this.更新塔栏();
  }

  更新塔栏() {
    Object.keys(this.塔按钮).forEach((类型) => {
      const 按钮 = this.塔按钮[类型];
      if (类型 === this.当前塔类型) 按钮.classList.add('active');
      else 按钮.classList.remove('active');
    });
  }

  设置速度(倍率) {
    this.时间缩放 = 倍率;
    Object.keys(this.速度按钮).forEach((键) => {
      const 按钮 = this.速度按钮[键];
      if (Number(键) === 倍率) 按钮.classList.add('active');
      else 按钮.classList.remove('active');
    });
  }

  切换暂停() {
    if (!this.运行中) return;
    if (this.已暂停) {
      this.恢复();
      if (this.暂停按钮) this.暂停按钮.textContent = t('game.neonDefense.pause');
    } else {
      this.暂停();
      if (this.暂停按钮) this.暂停按钮.textContent = t('game.neonDefense.resume');
    }
  }

  更新技能按钮() {
    const 现在 = this.游戏时钟;
    Object.keys(this.技能按钮).forEach((技能) => {
      const 按钮 = this.技能按钮[技能];
      const 技能配置 = this.游戏配置.全局技能[技能];
      const 冷却中 = 现在 < this.全局技能[技能].冷却结束时间;
      按钮.disabled = 冷却中 || this.数据币 < 技能配置.造价;
    });
  }

  屏幕坐标转格子(x, y) {
    const 格子尺寸 = this.游戏配置.地图.格子尺寸;
    return {
      x: Math.floor((x - this.偏移X) / this.缩放比例 / 格子尺寸),
      y: Math.floor((y - this.偏移Y) / this.缩放比例 / 格子尺寸)
    };
  }

  是路径格子(x, y) {
    return this.游戏配置.地图.路径.some((点) => 点.x === x && 点.y === y);
  }

  可放置塔(x, y) {
    const 地图 = this.游戏配置.地图;
    if (x < 0 || x >= 地图.列数 || y < 0 || y >= 地图.行数) return false;
    if (this.是路径格子(x, y)) return false;
    if (this.塔列表.some((塔) => 塔.x === x && 塔.y === y)) return false;
    const 造价 = this.游戏配置.塔列表[this.当前塔类型].造价;
    return this.数据币 >= 造价;
  }

  放置塔(x, y, 类型) {
    const 塔配置 = this.游戏配置.塔列表[类型];
    this.数据币 -= 塔配置.造价;
    this.塔列表.push({
      x,
      y,
      类型,
      等级: 1,
      已投资: 塔配置.造价,
      最后攻击时间: 0,
      目标: null
    });
  }

  获取当前波次配置() {
    if (!this.无尽模式) return this.游戏配置.波次列表[this.当前波次];

    const 无尽配置 = this.游戏配置.无尽模式;
    const 基础波次 = this.游戏配置.波次列表[this.游戏配置.波次列表.length - 1];
    const 层数 = Math.max(0, this.当前波次 - this.游戏配置.波次列表.length + 1);
    const 生命倍率 = 无尽配置.初始生命倍率 + 层数 * 无尽配置.生命成长;
    const 速度倍率 = 1 + 层数 * 无尽配置.速度成长;
    const 奖励倍率 = 1 + 层数 * 无尽配置.奖励成长;
    const 数量 = 基础波次.数量 + 层数 * 无尽配置.每波数量增量;
    const 间隔 = Math.max(无尽配置.最小间隔, 基础波次.间隔 - 层数 * 无尽配置.每波间隔减量);

    const 类型权重 = { ...基础波次.类型权重 };
    if (层数 >= 无尽配置.类型权重进化.触发波次) {
      无尽配置.类型权重进化.新增类型.forEach((类型) => {
        if (!类型权重[类型]) 类型权重[类型] = 0.15;
      });
    }

    return {
      ...基础波次,
      数量,
      间隔,
      生命倍率,
      速度倍率,
      奖励倍率,
      类型权重,
      词缀: null,
      Boss: false,
      精英: this.精英波次
    };
  }

  开始波次() {
    if (this.波次进行中) return;
    if (!this.无尽模式 && this.当前波次 >= this.游戏配置.波次列表.length) return;
    this.精英波次 = this.无尽模式 && (this.当前波次 + 1) % this.游戏配置.里程碑.精英间隔 === 0;
    this.波次进行中 = true;
    this.已生成敌人 = 0;
    this.最后生成时间 = this.游戏时钟;
    this.结算画面.classList.add('hidden');
    if (this.波次按钮) this.波次按钮.style.display = 'none';
    if (this.无尽模式按钮) this.无尽模式按钮.style.display = 'none';
    if (this.开始按钮) this.开始按钮.style.display = 'none';
  }

  开始无尽模式() {
    if (this.波次进行中) return;
    this.无尽模式 = true;
    this.当前波次 = this.游戏配置.波次列表.length;
    this.开始波次();
  }

  下一波() {
    this.结算画面.classList.add('hidden');
    this.开始波次();
  }

  渲染循环(时间戳) {
    if (!this.运行中 || !this.上下文 || !this.画布) return;

    if (this.上次帧时间 === 0) this.上次帧时间 = 时间戳;
    const 真实帧时长 = Math.min(50, 时间戳 - this.上次帧时间);
    this.上次帧时间 = 时间戳;

    if (!this.已暂停) {
      this.游戏时钟 += 真实帧时长 * this.时间缩放;
      const 时钟 = this.游戏时钟;
      this.生成敌人(时钟);
      this.更新敌人();
      this.更新塔(时钟);
      this.更新子弹();
      this.更新粒子();
      this.更新闪电();
      this.更新浮动文本();
      this.更新全局技能(时钟);
      this.检测波次完成();
    }

    this.绘制();
    this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
  }

  生成敌人(时间戳) {
    if (!this.波次进行中) return;
    const 波次 = this.获取当前波次配置();
    if (this.已生成敌人 >= 波次.数量) return;

    if (时间戳 - this.最后生成时间 >= 波次.间隔) {
      const 类型 = this.随机敌人类型(波次.类型权重);
      const 基础配置 = this.游戏配置.敌人[类型];
      const 路径 = this.游戏配置.地图.路径;
      const 起点 = 路径[0];
      const 格子尺寸 = this.游戏配置.地图.格子尺寸;

      let 生命倍率 = 波次.生命倍率;
      let 速度倍率 = 波次.速度倍率;
      const 奖励倍率 = 波次.奖励倍率;
      let 半径 = this.游戏配置.敌人.半径;
      const 精英 = !!波次.精英;

      if (波次.词缀 === 'fast') {
        速度倍率 *= 1.25;
        生命倍率 *= 0.85;
      } else if (波次.词缀 === 'tanky') {
        速度倍率 *= 0.75;
        生命倍率 *= 1.4;
      }

      if (精英) {
        生命倍率 *= this.游戏配置.里程碑.精英生命倍率;
        速度倍率 *= this.游戏配置.里程碑.精英速度倍率;
      }

      if (类型 === 'boss') {
        半径 *= 2.2;
        this.触发震动(12);
        const 地图 = this.游戏配置.地图;
        this.添加浮动文本(
          地图.列数 * 地图.格子尺寸 * 0.5,
          地图.行数 * 地图.格子尺寸 * 0.5 - 40,
          '⚠ 母体病毒来袭',
          配置.颜色.霓虹粉,
          20
        );
      }

      const 敌人 = {
        x: 起点.x * 格子尺寸 + 格子尺寸 / 2,
        y: 起点.y * 格子尺寸 + 格子尺寸 / 2,
        类型,
        精英,
        最大生命: 基础配置.生命 * 生命倍率,
        生命: 基础配置.生命 * 生命倍率,
        基础速度: 基础配置.速度 * 速度倍率,
        速度倍率: 1,
        路径索引: 0,
        奖励: Math.floor(基础配置.奖励 * (精英 ? this.游戏配置.里程碑.精英奖励倍率 : 奖励倍率)),
        减速结束时间: 0,
        眩晕结束时间: 0,
        隐身结束时间: 0,
        下次隐身时间: 0,
        护盾值: 基础配置.护盾值 || 0,
        最大护盾值: 基础配置.护盾值 || 0,
        护盾恢复时间: 0,
        中毒结束时间: 0,
        下次中毒时间: 0,
        半径
      };

      if (类型 === 'shield') {
        敌人.护盾恢复时间 = 时间戳 + 基础配置.护盾冷却;
      }
      if (类型 === 'stealth') {
        敌人.下次隐身时间 = 时间戳 + 基础配置.隐身间隔;
      }

      this.敌人列表.push(敌人);
      this.已生成敌人++;
      this.最后生成时间 = 时间戳;
    }
  }

  随机敌人类型(权重) {
    const 类型列表 = Object.keys(权重);
    const 总值 = 类型列表.reduce((和, 类型) => 和 + 权重[类型], 0);
    if (总值 <= 0) return 'normal';
    let 随机 = Math.random() * 总值;
    for (const 类型 of 类型列表) {
      随机 -= 权重[类型];
      if (随机 <= 0) return 类型;
    }
    return 类型列表[0];
  }

  更新敌人() {
    const 现在 = this.游戏时钟;
    const dt = (1 / 60) * this.时间缩放;
    const 格子尺寸 = this.游戏配置.地图.格子尺寸;
    const 路径 = this.游戏配置.地图.路径;
    const 新敌人列表 = [];

    for (const 敌人 of this.敌人列表) {
      if (敌人.类型 === 'regenerator' && 敌人.生命 < 敌人.最大生命 && 敌人.生命 > 0) {
        const 配置项 = this.游戏配置.敌人.regenerator;
        敌人.生命 = Math.min(敌人.最大生命, 敌人.生命 + 配置项.每秒恢复 * dt);
      }

      if (敌人.类型 === 'shield' && 敌人.护盾值 < 敌人.最大护盾值 && 现在 >= 敌人.护盾恢复时间) {
        const 配置项 = this.游戏配置.敌人.shield;
        敌人.护盾值 = Math.min(敌人.最大护盾值, 敌人.护盾值 + 配置项.护盾值 * dt);
      }

      if (敌人.类型 === 'stealth') {
        if (现在 >= 敌人.隐身结束时间 && 现在 >= 敌人.下次隐身时间 && 敌人.下次隐身时间 > 0) {
          敌人.隐身结束时间 = 现在 + this.游戏配置.敌人.stealth.隐身持续时间;
          敌人.下次隐身时间 = 现在 + this.游戏配置.敌人.stealth.隐身间隔;
        }
      }

      if (敌人.中毒结束时间 > 0 && 现在 < 敌人.中毒结束时间) {
        if (现在 >= 敌人.下次中毒时间) {
          this.伤害敌人(敌人, this.游戏配置.塔列表.poison.中毒伤害, true);
          敌人.下次中毒时间 = 现在 + this.游戏配置.塔列表.poison.中毒间隔;
        }
      } else if (敌人.中毒结束时间 > 0 && 现在 >= 敌人.中毒结束时间) {
        敌人.中毒结束时间 = 0;
        敌人.下次中毒时间 = 0;
      }

      const 减速中 = 现在 < 敌人.减速结束时间;
      const 眩晕中 = 现在 < 敌人.眩晕结束时间;
      const 隐身中 = 敌人.隐身结束时间 > 0 && 现在 < 敌人.隐身结束时间;
      const 当前速度 = 眩晕中 ? 0 : 敌人.基础速度 * 敌人.速度倍率 * (减速中 ? 0.6 : 1);

      if (敌人.路径索引 < 路径.length - 1) {
        const 目标点 = 路径[敌人.路径索引 + 1];
        const 目标X = 目标点.x * 格子尺寸 + 格子尺寸 / 2;
        const 目标Y = 目标点.y * 格子尺寸 + 格子尺寸 / 2;
        const dx = 目标X - 敌人.x;
        const dy = 目标Y - 敌人.y;
        const 距离 = Math.sqrt(dx * dx + dy * dy);

        if (距离 < 2) {
          敌人.路径索引++;
        } else {
          敌人.x += (dx / 距离) * 当前速度 * dt;
          敌人.y += (dy / 距离) * 当前速度 * dt;
        }
        新敌人列表.push(敌人);
      } else {
        if (!隐身中) {
          this.核心能量--;
          this.连击 = 0;
          this.触发震动(6);
          const 地图 = this.游戏配置.地图;
          const 终点 = 地图.路径[地图.路径.length - 1];
          const 核心X = 终点.x * 地图.格子尺寸 + 地图.格子尺寸 / 2;
          const 核心Y = 终点.y * 地图.格子尺寸 + 地图.格子尺寸 / 2;
          this.添加浮动文本(核心X, 核心Y - 20, '核心 -1', 配置.颜色.霓虹红, 14);
          if (this.核心能量 <= 0) {
            this.核心能量 = 0;
            this.显示结算(false);
            this.结束游戏();
            return;
          }
        }
      }
    }

    this.敌人列表 = 新敌人列表;
  }

  更新塔(时间戳) {
    const 格子尺寸 = this.游戏配置.地图.格子尺寸;
    const 升级配置 = this.游戏配置.升级;

    this.塔列表.forEach((塔) => {
      const 塔配置 = this.游戏配置.塔列表[塔.类型];
      const 等级 = 塔.等级 || 1;
      const 射程 = 塔配置.射程 * 升级配置.射程倍率[等级 - 1];
      const 攻击间隔 = 塔配置.攻击间隔 * 升级配置.攻速倍率[等级 - 1];
      const 塔中心X = 塔.x * 格子尺寸 + 格子尺寸 / 2;
      const 塔中心Y = 塔.y * 格子尺寸 + 格子尺寸 / 2;

      let 目标 = null;
      let 最近距离 = Number.POSITIVE_INFINITY;
      this.敌人列表.forEach((敌人) => {
        const dx = 敌人.x - 塔中心X;
        const dy = 敌人.y - 塔中心Y;
        const 距离 = Math.sqrt(dx * dx + dy * dy);
        if (距离 <= 射程 && 距离 < 最近距离 && !this.敌人隐身无法瞄准(敌人, 时间戳)) {
          最近距离 = 距离;
          目标 = 敌人;
        }
      });

      塔.目标 = 目标;

      if (目标 && 时间戳 - 塔.最后攻击时间 >= 攻击间隔) {
        if (塔.类型 === 'sniper') {
          this.狙击命中(塔, 目标);
          塔.最后攻击时间 = 时间戳;
        } else if (塔.类型 === 'chain') {
          this.发射连锁闪电(塔, 目标, 等级, 塔中心X, 塔中心Y);
          塔.最后攻击时间 = 时间戳;
        } else if (塔.类型 === 'flame') {
          this.烈焰打击(塔, 等级, 塔中心X, 塔中心Y);
          塔.最后攻击时间 = 时间戳;
        } else {
          this.发射子弹(塔, 目标);
          塔.最后攻击时间 = 时间戳;
        }
      }
    });
  }

  敌人隐身无法瞄准(敌人, timestamp) {
    return 敌人.隐身结束时间 > 0 && timestamp < 敌人.隐身结束时间;
  }

  狙击命中(塔, 目标) {
    const 塔配置 = this.游戏配置.塔列表[塔.类型];
    const 升级配置 = this.游戏配置.升级;
    const 等级 = 塔.等级 || 1;
    const 有效伤害 = 塔配置.伤害 * 升级配置.伤害倍率[等级 - 1];
    const 格子尺寸 = this.游戏配置.地图.格子尺寸;
    const 塔中心X = 塔.x * 格子尺寸 + 格子尺寸 / 2;
    const 塔中心Y = 塔.y * 格子尺寸 + 格子尺寸 / 2;

    this.伤害敌人(目标, 有效伤害);
    this.生成爆炸((塔中心X + 目标.x) / 2, (塔中心Y + 目标.y) / 2, 塔配置.颜色, 6);
  }

  发射子弹(塔, 目标) {
    const 格子尺寸 = this.游戏配置.地图.格子尺寸;
    const 塔配置 = this.游戏配置.塔列表[塔.类型];
    const 升级配置 = this.游戏配置.升级;
    const 等级 = 塔.等级 || 1;
    const 有效伤害 = 塔配置.伤害 * 升级配置.伤害倍率[等级 - 1];
    const 塔中心X = 塔.x * 格子尺寸 + 格子尺寸 / 2;
    const 塔中心Y = 塔.y * 格子尺寸 + 格子尺寸 / 2;
    const dx = 目标.x - 塔中心X;
    const dy = 目标.y - 塔中心Y;
    const 距离 = Math.sqrt(dx * dx + dy * dy);

    this.子弹列表.push({
      x: 塔中心X,
      y: 塔中心Y,
      目标,
      目标X: 目标.x,
      目标Y: 目标.y,
      速度X: (dx / 距离) * this.游戏配置.子弹.速度,
      速度Y: (dy / 距离) * this.游戏配置.子弹.速度,
      类型: 塔.类型,
      伤害: 有效伤害,
      射程: 塔配置.射程 * 升级配置.射程倍率[等级 - 1],
      起始X: 塔中心X,
      起始Y: 塔中心Y,
      已飞行: 0
    });
  }

  发射连锁闪电(_塔, 主目标, 等级, 塔中心X, 塔中心Y) {
    const 塔配置 = this.游戏配置.塔列表.chain;
    const 升级配置 = this.游戏配置.升级;
    const 有效伤害 = 塔配置.伤害 * 升级配置.伤害倍率[等级 - 1];
    const 跳跃数 = 塔配置.跳跃数;
    const 跳跃距离 = 塔配置.跳跃距离;
    const 点 = [{ x: 塔中心X, y: 塔中心Y }];
    const 已命中 = new Set();
    let 当前 = 主目标;

    for (let i = 0; i < 跳跃数 && 当前; i++) {
      点.push({ x: 当前.x, y: 当前.y });
      this.伤害敌人(当前, 有效伤害);
      已命中.add(当前);
      let 下一 = null;
      let 最近 = 跳跃距离;
      for (const 敌人 of this.敌人列表) {
        if (已命中.has(敌人)) continue;
        const d = Math.hypot(敌人.x - 当前.x, 敌人.y - 当前.y);
        if (d <= 最近) {
          最近 = d;
          下一 = 敌人;
        }
      }
      当前 = 下一;
    }

    this.闪电列表.push({
      点,
      颜色: 塔配置.颜色,
      生命: 0.18,
      最大生命: 0.18
    });
  }

  烈焰打击(_塔, 等级, 塔中心X, 塔中心Y) {
    const 塔配置 = this.游戏配置.塔列表.flame;
    const 升级配置 = this.游戏配置.升级;
    const 有效伤害 = 塔配置.伤害 * 升级配置.伤害倍率[等级 - 1];
    const 射程 = 塔配置.射程 * 升级配置.射程倍率[等级 - 1];
    const 现在 = this.游戏时钟;
    this.敌人列表.forEach((敌人) => {
      const d = Math.hypot(敌人.x - 塔中心X, 敌人.y - 塔中心Y);
      if (d <= 射程) {
        this.伤害敌人(敌人, 有效伤害);
        敌人.减速结束时间 = Math.max(敌人.减速结束时间, 现在 + 300);
      }
    });
    this.生成爆炸(塔中心X, 塔中心Y, 塔配置.颜色, 6);
  }

  更新子弹() {
    const dt = (1 / 60) * this.时间缩放;
    const 新子弹列表 = [];

    this.子弹列表.forEach((子弹) => {
      if (!this.敌人列表.includes(子弹.目标)) {
        return;
      }

      const dx = 子弹.目标.x - 子弹.x;
      const dy = 子弹.目标.y - 子弹.y;
      const 距离 = Math.sqrt(dx * dx + dy * dy);
      const 步长 = this.游戏配置.子弹.速度 * dt;

      if (距离 <= 步长 + 子弹.目标.半径) {
        this.命中(子弹);
        return;
      }

      子弹.x += (dx / 距离) * 步长;
      子弹.y += (dy / 距离) * 步长;
      子弹.已飞行 += 步长;

      if (子弹.已飞行 > 子弹.射程 * 1.5) return;
      新子弹列表.push(子弹);
    });

    this.子弹列表 = 新子弹列表;
  }

  命中(子弹) {
    const 塔配置 = this.游戏配置.塔列表[子弹.类型];
    const 现在 = this.游戏时钟;

    if (子弹.类型 === 'pulse') {
      this.敌人列表.forEach((敌人) => {
        const dx = 敌人.x - 子弹.x;
        const dy = 敌人.y - 子弹.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 塔配置.溅射半径) {
          this.伤害敌人(敌人, 子弹.伤害);
        }
      });
      this.生成爆炸(子弹.x, 子弹.y, 塔配置.颜色, 塔配置.溅射半径);
    } else {
      this.伤害敌人(子弹.目标, 子弹.伤害);
      if (子弹.类型 === 'ice') {
        子弹.目标.减速结束时间 = 现在 + 塔配置.减速时间;
      } else if (子弹.类型 === 'poison') {
        子弹.目标.中毒结束时间 = 现在 + 塔配置.中毒时间;
        子弹.目标.下次中毒时间 = 现在 + 塔配置.中毒间隔;
      }
      this.生成爆炸(子弹.x, 子弹.y, 塔配置.颜色, 8);
    }
  }

  伤害敌人(敌人, 伤害, 是无视护盾 = false) {
    let 实际伤害 = 伤害;
    if (!是无视护盾 && 敌人.护盾值 > 0) {
      const 护盾承受 = Math.min(敌人.护盾值, 实际伤害);
      敌人.护盾值 -= 护盾承受;
      实际伤害 -= 护盾承受;
      if (敌人.类型 === 'shield') {
        敌人.护盾恢复时间 = this.游戏时钟 + this.游戏配置.敌人.shield.护盾冷却;
      }
    }

    敌人.生命 -= 实际伤害;
    if (实际伤害 >= 10) {
      this.添加浮动文本(
        敌人.x,
        敌人.y - 敌人.半径 - 4,
        String(Math.round(实际伤害)),
        '#ffffff',
        11
      );
    }
    if (敌人.生命 <= 0) {
      this.击败敌人(敌人);
    }
  }

  击败敌人(敌人) {
    this.数据币 += 敌人.奖励;
    this.增加分数(敌人.奖励);
    this.生成爆炸(敌人.x, 敌人.y, this.游戏配置.敌人[敌人.类型].颜色, 12);
    this.添加浮动文本(敌人.x, 敌人.y - 敌人.半径 - 8, `+${敌人.奖励}`, 配置.颜色.霓虹黄, 13);

    if (敌人.类型 === 'split') {
      const 分裂配置 = this.游戏配置.敌人.split;
      for (let i = 0; i < 分裂配置.分裂数量; i++) {
        this.敌人列表.push({
          x: 敌人.x,
          y: 敌人.y,
          类型: 'normal',
          最大生命: 敌人.最大生命 * 分裂配置.分裂生命比例,
          生命: 敌人.最大生命 * 分裂配置.分裂生命比例,
          基础速度: 敌人.基础速度 * 1.2,
          速度倍率: 1,
          路径索引: 敌人.路径索引,
          奖励: Math.floor(敌人.奖励 * 0.5),
          减速结束时间: 0,
          眩晕结束时间: 0,
          隐身结束时间: 0,
          下次隐身时间: 0,
          护盾值: 0,
          最大护盾值: 0,
          护盾恢复时间: 0,
          中毒结束时间: 0,
          下次中毒时间: 0,
          半径: this.游戏配置.敌人.半径 * 0.7
        });
      }
    }

    this.敌人列表 = this.敌人列表.filter((e) => e !== 敌人);
  }

  使用全局技能(技能) {
    if (!this.运行中 || this.已暂停) return;
    const 现在 = this.游戏时钟;
    const 技能配置 = this.游戏配置.全局技能[技能];
    if (现在 < this.全局技能[技能].冷却结束时间 || this.数据币 < 技能配置.造价) return;

    this.数据币 -= 技能配置.造价;
    this.全局技能[技能].冷却结束时间 = 现在 + 技能配置.冷却;

    if (技能 === 'airstrike') {
      this.执行空袭(技能配置);
      this.触发震动(10);
    } else if (技能 === 'emp') {
      this.执行EMP(技能配置);
      this.触发震动(8);
    } else if (技能 === 'repair') {
      this.执行修复(技能配置);
      this.触发震动(4);
    }

    const 地图 = this.游戏配置.地图;
    this.添加浮动文本(
      地图.列数 * 地图.格子尺寸 * 0.5,
      地图.行数 * 地图.格子尺寸 * 0.5 - 70,
      技能配置.名称,
      技能配置.颜色,
      18
    );

    this.更新技能按钮();
  }

  执行空袭(技能配置) {
    if (this.敌人列表.length === 0) return;
    let 目标X = 0;
    let 目标Y = 0;
    this.敌人列表.forEach((敌人) => {
      目标X += 敌人.x;
      目标Y += 敌人.y;
    });
    目标X /= this.敌人列表.length;
    目标Y /= this.敌人列表.length;

    this.敌人列表.forEach((敌人) => {
      const dx = 敌人.x - 目标X;
      const dy = 敌人.y - 目标Y;
      if (Math.sqrt(dx * dx + dy * dy) <= 技能配置.半径) {
        this.伤害敌人(敌人, 技能配置.伤害);
      }
    });
    this.生成爆炸(目标X, 目标Y, 技能配置.颜色, 技能配置.半径);
  }

  执行EMP(技能配置) {
    const 现在 = this.游戏时钟;
    const 地图 = this.游戏配置.地图;
    const 中心X = (地图.列数 * 地图.格子尺寸) / 2;
    const 中心Y = (地图.行数 * 地图.格子尺寸) / 2;
    this.敌人列表.forEach((敌人) => {
      const dx = 敌人.x - 中心X;
      const dy = 敌人.y - 中心Y;
      if (Math.sqrt(dx * dx + dy * dy) <= 技能配置.半径) {
        敌人.眩晕结束时间 = 现在 + 技能配置.眩晕时间;
        敌人.隐身结束时间 = 0;
      }
    });
    this.生成爆炸(中心X, 中心Y, 技能配置.颜色, 技能配置.半径);
  }

  执行修复(技能配置) {
    this.核心能量 = Math.min(this.游戏配置.核心.最大能量, this.核心能量 + 技能配置.恢复量);
  }

  更新全局技能(timestamp) {
    if (!this.波次进行中) {
      // 准备阶段不累计利息，重置计时避免开局一次性结算大额利息
      this.最后利息时间 = timestamp;
      this.更新技能按钮();
      return;
    }
    if (timestamp - this.最后利息时间 >= this.游戏配置.利息.间隔) {
      const 收益 = Math.min(
        this.游戏配置.利息.最大收益,
        Math.floor(this.数据币 * this.游戏配置.利息.利率)
      );
      this.数据币 += 收益;
      this.最后利息时间 = timestamp;
    }
    this.更新技能按钮();
  }

  检测波次完成() {
    if (!this.波次进行中) return;
    if (this.已生成敌人 >= this.获取当前波次配置().数量 && this.敌人列表.length === 0) {
      this.波次进行中 = false;
      this.当前波次++;
      this.连击++;
      const 连击奖励 = Math.min(60, this.连击 * 5);
      if (连击奖励 > 0) this.数据币 += 连击奖励;
      if (this.连击 > 1) {
        const 地图 = this.游戏配置.地图;
        this.添加浮动文本(
          地图.列数 * 地图.格子尺寸 * 0.5,
          地图.行数 * 地图.格子尺寸 - 140,
          `连击 x${this.连击}!  +${连击奖励}`,
          配置.颜色.霓虹黄,
          18
        );
      }
      if (!this.无尽模式 && this.当前波次 >= this.游戏配置.波次列表.length) {
        this.显示结算(true);
        this.结束游戏();
      } else {
        this.显示波次完成();
      }
    }
  }

  显示波次完成() {
    if (!this.结算画面) return;
    const 标题 = this.结算画面.querySelector('.neon-defense-game-over-title');
    const 结果 = this.结算画面.querySelector('.neon-defense-game-over-result');
    const 下一波按钮 = this.结算画面.querySelector('.neon-defense-next-wave-btn');
    const 重新开始按钮 = this.结算画面.querySelector('.neon-defense-restart-btn');
    if (标题) 标题.textContent = t('game.neonDefense.waveComplete', { wave: this.当前波次 });
    if (结果) 结果.textContent = t('game.neonDefense.score', { score: this.分数 });
    if (下一波按钮) 下一波按钮.style.display = 'none';
    this.设置开始按钮(
      true,
      this.无尽模式
        ? t('game.neonDefense.nextEndlessWave', { wave: this.当前波次 + 1 })
        : t('game.neonDefense.startWave')
    );
    if (重新开始按钮) 重新开始按钮.style.display = 'none';
    this.结算画面.classList.remove('hidden');
  }

  显示结算(通关) {
    if (!this.结算画面) return;
    this.设置开始按钮(false);
    this.选中塔 = null;
    this.隐藏升级面板();
    const 标题 = this.结算画面.querySelector('.neon-defense-game-over-title');
    const 结果 = this.结算画面.querySelector('.neon-defense-game-over-result');
    const 下一波按钮 = this.结算画面.querySelector('.neon-defense-next-wave-btn');
    const 重新开始按钮 = this.结算画面.querySelector('.neon-defense-restart-btn');
    const 总数 = this.游戏配置.波次列表.length;

    if (通关) {
      if (标题) 标题.textContent = t('game.neonDefense.allWavesComplete', { total: 总数 });
      if (结果)
        结果.textContent = t('game.neonDefense.finalStats', { score: this.分数, wave: 总数 });
    } else {
      if (标题) 标题.textContent = t('game.neonDefense.gameOver', { score: this.分数 });
      if (结果)
        结果.textContent = t('game.neonDefense.finalStats', {
          score: this.分数,
          wave: this.当前波次
        });
    }

    if (下一波按钮) 下一波按钮.style.display = 'none';
    if (重新开始按钮) 重新开始按钮.style.display = '';
    this.结算画面.classList.remove('hidden');

    if (this.分数 > this.最高分) {
      this.最高分 = this.分数;
      this.状态管理器.写入(`各游戏最高分.${this.标识}`, this.最高分);
    }
  }

  重新开始() {
    this.结算画面.classList.add('hidden');
    this.启动();
  }

  显示升级面板() {
    const 塔 = this.选中塔;
    const 面板 = this.升级面板;
    if (!塔 || !面板) return;
    const 升级配置 = this.游戏配置.升级;
    const 塔配置 = this.游戏配置.塔列表[塔.类型];
    const 等级 = 塔.等级 || 1;
    const 格子尺寸 = this.游戏配置.地图.格子尺寸;
    const cx = 塔.x * 格子尺寸 + 格子尺寸 / 2;
    const cy = 塔.y * 格子尺寸 + 格子尺寸 / 2;
    const 屏幕X = this.偏移X + cx * this.缩放比例;
    const 屏幕Y = this.偏移Y + cy * this.缩放比例;
    const rect = this.画布.getBoundingClientRect();
    const 信息 = 面板.querySelector('.neon-defense-upgrade-info');
    信息.innerHTML = `<div class="nd-up-name">${塔配置.名称} · Lv.${等级}</div>`;
    if (等级 < 升级配置.最大等级) {
      const 成本 = 升级配置.成本[等级 - 1];
      信息.innerHTML += `<div class="nd-up-stat">伤害 ×${升级配置.伤害倍率[等级].toFixed(
        2
      )} · 射程 ×${升级配置.射程倍率[等级].toFixed(2)}</div>`;
      信息.innerHTML += `<div class="nd-up-next">${t('game.neonDefense.nextLevel')} ${成本} ${t(
        'game.neonDefense.coinsShort'
      )}</div>`;
    } else {
      信息.innerHTML += `<div class="nd-up-next">${t('game.neonDefense.maxLevel')}</div>`;
    }
    const 返还 = Math.floor(塔.已投资 * 升级配置.出售比例);
    this.出售按钮.textContent = `${t('game.neonDefense.sell')} (+${返还})`;
    面板.classList.remove('hidden');
    const 面板宽 = 面板.offsetWidth || 180;
    const 面板高 = 面板.offsetHeight || 90;
    const 左 = Math.max(
      面板宽 / 2 + 8,
      Math.min(window.innerWidth - 面板宽 / 2 - 8, rect.left + 屏幕X)
    );
    const 上 = Math.max(面板高 + 8, rect.top + 屏幕Y - (格子尺寸 * this.缩放比例) / 2 - 14);
    面板.style.left = `${Math.round(左)}px`;
    面板.style.top = `${Math.round(上)}px`;
    this.刷新升级面板();
  }

  隐藏升级面板() {
    if (this.升级面板) this.升级面板.classList.add('hidden');
  }

  刷新升级面板() {
    const 塔 = this.选中塔;
    const 面板 = this.升级面板;
    if (!塔 || !面板 || 面板.classList.contains('hidden')) return;
    const 升级配置 = this.游戏配置.升级;
    const 等级 = 塔.等级 || 1;
    if (等级 < 升级配置.最大等级) {
      const 成本 = 升级配置.成本[等级 - 1];
      this.升级按钮.textContent = `${t('game.neonDefense.upgrade')} (${成本})`;
      this.升级按钮.disabled = this.数据币 < 成本;
      this.升级按钮.style.display = '';
    } else {
      this.升级按钮.style.display = 'none';
    }
    const 返还 = Math.floor(塔.已投资 * 升级配置.出售比例);
    this.出售按钮.textContent = `${t('game.neonDefense.sell')} (+${返还})`;
  }

  升级选中塔() {
    const 塔 = this.选中塔;
    if (!塔) return;
    const 升级配置 = this.游戏配置.升级;
    if (塔.等级 >= 升级配置.最大等级) return;
    const 成本 = 升级配置.成本[塔.等级 - 1];
    if (this.数据币 < 成本) return;
    this.数据币 -= 成本;
    塔.已投资 += 成本;
    塔.等级++;
    this.显示升级面板();
  }

  出售选中塔() {
    const 塔 = this.选中塔;
    if (!塔) return;
    const 升级配置 = this.游戏配置.升级;
    const 返还 = Math.floor(塔.已投资 * 升级配置.出售比例);
    this.数据币 += 返还;
    this.塔列表 = this.塔列表.filter((t) => t !== 塔);
    this.选中塔 = null;
    this.隐藏升级面板();
  }

  触发震动(强度) {
    this.震动强度 = Math.max(this.震动强度, 强度);
  }

  添加浮动文本(x, y, 文本, 颜色, 大小 = 12) {
    this.浮动文本列表.push({ x, y, 文本, 颜色, 大小, 生命: 1, 最大生命: 1 });
    if (this.浮动文本列表.length > 140) this.浮动文本列表.shift();
  }

  更新浮动文本() {
    const dt = (1 / 60) * this.时间缩放;
    this.浮动文本列表 = this.浮动文本列表.filter((项) => {
      项.y -= 26 * dt;
      项.生命 -= dt / 0.9;
      return 项.生命 > 0;
    });
  }

  更新闪电() {
    const dt = (1 / 60) * this.时间缩放;
    this.闪电列表 = this.闪电列表.filter((闪电) => {
      闪电.生命 -= dt;
      return 闪电.生命 > 0;
    });
  }

  生成爆炸(x, y, 颜色, 半径) {
    for (let i = 0; i < 8; i++) {
      const 角度 = (Math.PI * 2 * i) / 8;
      this.粒子列表.push({
        x,
        y,
        速度X: Math.cos(角度) * 半径 * 2,
        速度Y: Math.sin(角度) * 半径 * 2,
        生命: 0.3,
        颜色,
        半径: 2
      });
    }
  }

  更新粒子() {
    const dt = (1 / 60) * this.时间缩放;
    this.粒子列表 = this.粒子列表.filter((粒子) => {
      粒子.x += 粒子.速度X * dt;
      粒子.y += 粒子.速度Y * dt;
      粒子.生命 -= dt;
      return 粒子.生命 > 0;
    });
  }

  应用基础变换() {
    const dpr = window.devicePixelRatio || 1;
    this.上下文.setTransform(
      dpr * this.缩放比例,
      0,
      0,
      dpr * this.缩放比例,
      dpr * this.偏移X,
      dpr * this.偏移Y
    );
  }

  绘制() {
    if (!this.画布 || !this.上下文) return;

    this.上下文.setTransform(1, 0, 0, 1, 0, 0);
    this.上下文.clearRect(0, 0, this.画布.width, this.画布.height);
    this.应用基础变换();

    if (this.震动强度 > 0.5) {
      this.震动X = (Math.random() * 2 - 1) * this.震动强度;
      this.震动Y = (Math.random() * 2 - 1) * this.震动强度;
      this.震动强度 *= 0.85;
    } else {
      this.震动X = 0;
      this.震动Y = 0;
      this.震动强度 = 0;
    }

    this.上下文.save();
    this.上下文.translate(this.震动X, this.震动Y);
    this.绘制背景();
    this.绘制路径();
    this.绘制核心();
    this.绘制塔();
    this.绘制敌人();
    this.绘制子弹();
    this.绘制闪电();
    this.绘制粒子();
    this.绘制浮动文本();
    this.绘制放置预览();
    this.上下文.restore();

    this.应用基础变换();
    this.绘制HUD();
    this.刷新升级面板();
  }

  绘制背景() {
    const 地图 = this.游戏配置.地图;
    this.上下文.save();
    this.上下文.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.上下文.fillRect(0, 0, 地图.列数 * 地图.格子尺寸, 地图.行数 * 地图.格子尺寸);

    this.上下文.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    this.上下文.lineWidth = 1;
    for (let x = 0; x <= 地图.列数; x++) {
      this.上下文.beginPath();
      this.上下文.moveTo(x * 地图.格子尺寸, 0);
      this.上下文.lineTo(x * 地图.格子尺寸, 地图.行数 * 地图.格子尺寸);
      this.上下文.stroke();
    }
    for (let y = 0; y <= 地图.行数; y++) {
      this.上下文.beginPath();
      this.上下文.moveTo(0, y * 地图.格子尺寸);
      this.上下文.lineTo(地图.列数 * 地图.格子尺寸, y * 地图.格子尺寸);
      this.上下文.stroke();
    }
    this.上下文.restore();
  }

  绘制路径() {
    const 地图 = this.游戏配置.地图;
    const 格子尺寸 = 地图.格子尺寸;
    this.上下文.save();
    this.上下文.strokeStyle = 'rgba(255, 42, 157, 0.4)';
    this.上下文.lineWidth = 格子尺寸 * 0.6;
    this.上下文.lineCap = 'round';
    this.上下文.lineJoin = 'round';
    this.上下文.shadowBlur = 15;
    this.上下文.shadowColor = 'rgba(255, 42, 157, 0.5)';

    this.上下文.beginPath();
    地图.路径.forEach((点, 索引) => {
      const x = 点.x * 格子尺寸 + 格子尺寸 / 2;
      const y = 点.y * 格子尺寸 + 格子尺寸 / 2;
      if (索引 === 0) this.上下文.moveTo(x, y);
      else this.上下文.lineTo(x, y);
    });
    this.上下文.stroke();
    this.上下文.restore();
  }

  绘制核心() {
    const 地图 = this.游戏配置.地图;
    const 终点 = 地图.路径[地图.路径.length - 1];
    const 格子尺寸 = 地图.格子尺寸;
    const x = 终点.x * 格子尺寸 + 格子尺寸 / 2;
    const y = 终点.y * 格子尺寸 + 格子尺寸 / 2;
    const 比例 = this.核心能量 / this.游戏配置.核心.最大能量;

    this.上下文.save();
    const 颜色 = 比例 > 0.3 ? this.游戏配置.核心.颜色 : 配置.颜色.霓虹红;
    this.上下文.fillStyle = 颜色;
    this.上下文.shadowBlur = 20;
    this.上下文.shadowColor = 颜色;
    this.上下文.beginPath();
    this.上下文.arc(x, y, 格子尺寸 * 0.35, 0, Math.PI * 2);
    this.上下文.fill();
    this.上下文.strokeStyle = 'rgba(255,255,255,0.6)';
    this.上下文.lineWidth = 2;
    this.上下文.beginPath();
    this.上下文.arc(x, y, 格子尺寸 * 0.35 * (1 - 比例) + 2, 0, Math.PI * 2);
    this.上下文.stroke();
    this.上下文.restore();
  }

  绘制塔() {
    const 格子尺寸 = this.游戏配置.地图.格子尺寸;
    this.塔列表.forEach((塔) => {
      const 塔配置 = this.游戏配置.塔列表[塔.类型];
      const x = 塔.x * 格子尺寸 + 格子尺寸 / 2;
      const y = 塔.y * 格子尺寸 + 格子尺寸 / 2;
      const 等级 = 塔.等级 || 1;

      this.上下文.save();
      this.上下文.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.上下文.fillRect(塔.x * 格子尺寸 + 2, 塔.y * 格子尺寸 + 2, 格子尺寸 - 4, 格子尺寸 - 4);

      this.上下文.strokeStyle = 塔配置.颜色;
      this.上下文.lineWidth = 2;
      this.上下文.shadowBlur = 15;
      this.上下文.shadowColor = 塔配置.颜色;
      this.上下文.strokeRect(塔.x * 格子尺寸 + 4, 塔.y * 格子尺寸 + 4, 格子尺寸 - 8, 格子尺寸 - 8);

      if (塔.类型 === 'flame') {
        const 射程 = 塔配置.射程 * this.游戏配置.升级.射程倍率[等级 - 1];
        this.上下文.strokeStyle = 'rgba(255, 59, 70, 0.12)';
        this.上下文.lineWidth = 1;
        this.上下文.beginPath();
        this.上下文.arc(x, y, 射程, 0, Math.PI * 2);
        this.上下文.stroke();
      }

      this.绘制塔形(塔.类型, x, y, 格子尺寸, 塔配置.颜色);

      if (塔.目标) {
        this.上下文.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.上下文.lineWidth = 1;
        this.上下文.beginPath();
        this.上下文.moveTo(x, y);
        this.上下文.lineTo(塔.目标.x, 塔.目标.y);
        this.上下文.stroke();
      }

      if (塔 === this.选中塔) {
        const 升级配置 = this.游戏配置.升级;
        const 射程 = 塔配置.射程 * 升级配置.射程倍率[等级 - 1];
        this.上下文.save();
        this.上下文.strokeStyle = 'rgba(0, 240, 255, 0.55)';
        this.上下文.lineWidth = 1.5;
        this.上下文.setLineDash([5, 5]);
        this.上下文.beginPath();
        this.上下文.arc(x, y, 射程, 0, Math.PI * 2);
        this.上下文.stroke();
        this.上下文.setLineDash([]);
        this.上下文.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        this.上下文.lineWidth = 2;
        this.上下文.strokeRect(
          塔.x * 格子尺寸 + 2,
          塔.y * 格子尺寸 + 2,
          格子尺寸 - 4,
          格子尺寸 - 4
        );
        this.上下文.restore();
      }

      this.上下文.fillStyle = 'rgba(255, 255, 255, 0.9)';
      for (let i = 0; i < 等级; i++) {
        this.上下文.beginPath();
        this.上下文.arc(
          塔.x * 格子尺寸 + 6 + i * 6,
          塔.y * 格子尺寸 + 格子尺寸 - 6,
          2,
          0,
          Math.PI * 2
        );
        this.上下文.fill();
      }
      this.上下文.restore();
    });
  }

  绘制塔形(类型, x, y, s, 颜色) {
    const r = s * 0.26;
    this.上下文.save();
    this.上下文.strokeStyle = 颜色;
    this.上下文.fillStyle = 颜色;
    this.上下文.lineWidth = 2;
    this.上下文.shadowBlur = 12;
    this.上下文.shadowColor = 颜色;

    if (类型 === 'laser') {
      this.上下文.beginPath();
      this.上下文.moveTo(x, y - r);
      this.上下文.lineTo(x + r * 0.8, y + r * 0.7);
      this.上下文.lineTo(x - r * 0.8, y + r * 0.7);
      this.上下文.closePath();
      this.上下文.stroke();
      this.上下文.beginPath();
      this.上下文.arc(x, y, 2.5, 0, Math.PI * 2);
      this.上下文.fill();
    } else if (类型 === 'pulse') {
      this.上下文.beginPath();
      this.上下文.arc(x, y, r, 0, Math.PI * 2);
      this.上下文.stroke();
      this.上下文.beginPath();
      this.上下文.arc(x, y, r * 0.55, 0, Math.PI * 2);
      this.上下文.stroke();
    } else if (类型 === 'ice') {
      this.上下文.beginPath();
      this.上下文.moveTo(x, y - r);
      this.上下文.lineTo(x, y + r);
      this.上下文.moveTo(x - r, y);
      this.上下文.lineTo(x + r, y);
      this.上下文.moveTo(x - r * 0.7, y - r * 0.7);
      this.上下文.lineTo(x + r * 0.7, y + r * 0.7);
      this.上下文.moveTo(x + r * 0.7, y - r * 0.7);
      this.上下文.lineTo(x - r * 0.7, y + r * 0.7);
      this.上下文.stroke();
    } else if (类型 === 'blast') {
      this.上下文.beginPath();
      for (let i = 0; i < 6; i++) {
        const 角度 = (Math.PI / 3) * i - Math.PI / 2;
        const px = x + Math.cos(角度) * r;
        const py = y + Math.sin(角度) * r;
        if (i === 0) this.上下文.moveTo(px, py);
        else this.上下文.lineTo(px, py);
      }
      this.上下文.closePath();
      this.上下文.stroke();
    } else if (类型 === 'sniper') {
      this.上下文.beginPath();
      this.上下文.arc(x, y, r * 0.7, 0, Math.PI * 2);
      this.上下文.stroke();
      this.上下文.beginPath();
      this.上下文.moveTo(x - r, y);
      this.上下文.lineTo(x + r, y);
      this.上下文.moveTo(x, y - r);
      this.上下文.lineTo(x, y + r);
      this.上下文.stroke();
    } else if (类型 === 'poison') {
      for (let i = 0; i < 3; i++) {
        const 角度 = (i * Math.PI * 2) / 3 - Math.PI / 2;
        const px = x + Math.cos(角度) * r * 0.7;
        const py = y + Math.sin(角度) * r * 0.7;
        this.上下文.beginPath();
        this.上下文.arc(px, py, 3, 0, Math.PI * 2);
        this.上下文.fill();
      }
    } else if (类型 === 'chain') {
      this.上下文.beginPath();
      this.上下文.moveTo(x - r * 0.6, y - r);
      this.上下文.lineTo(x + r * 0.2, y - r * 0.2);
      this.上下文.lineTo(x - r * 0.2, y + r * 0.1);
      this.上下文.lineTo(x + r * 0.6, y + r);
      this.上下文.stroke();
    } else if (类型 === 'flame') {
      this.上下文.beginPath();
      this.上下文.moveTo(x, y - r);
      this.上下文.quadraticCurveTo(x + r * 0.8, y, x, y + r);
      this.上下文.quadraticCurveTo(x - r * 0.8, y, x, y - r);
      this.上下文.stroke();
    }

    this.上下文.restore();
  }

  绘制敌人() {
    const 现在 = this.游戏时钟;
    this.敌人列表.forEach((敌人) => {
      const 敌人配置 = this.游戏配置.敌人[敌人.类型];
      const 半径 = 敌人.半径;
      const 生命比例 = Math.max(0, 敌人.生命 / 敌人.最大生命);
      const 隐身中 = 敌人.隐身结束时间 > 0 && 现在 < 敌人.隐身结束时间;
      const 眩晕中 = 现在 < 敌人.眩晕结束时间;

      this.上下文.save();
      this.上下文.globalAlpha = 隐身中 ? 0.35 : 1;
      this.上下文.fillStyle = 敌人配置.颜色;
      this.上下文.shadowBlur = 12;
      this.上下文.shadowColor = 敌人配置.颜色;

      if (敌人.类型 === 'boss') {
        this.绘制Boss(敌人, 半径, 现在);
      } else {
        this.上下文.beginPath();
        this.上下文.arc(敌人.x, 敌人.y, 半径, 0, Math.PI * 2);
        this.上下文.fill();
        this.绘制敌人装饰(敌人, 半径);
      }

      if (敌人.精英) {
        this.上下文.strokeStyle = 配置.颜色.霓虹黄;
        this.上下文.lineWidth = 2;
        this.上下文.shadowBlur = 14;
        this.上下文.shadowColor = 配置.颜色.霓虹黄;
        this.上下文.beginPath();
        this.上下文.arc(敌人.x, 敌人.y, 半径 + 5, 0, Math.PI * 2);
        this.上下文.stroke();
        this.上下文.shadowBlur = 12;
        this.上下文.shadowColor = 敌人配置.颜色;
      }

      if (敌人.护盾值 > 0) {
        const 护盾比例 = 敌人.护盾值 / 敌人.最大护盾值;
        this.上下文.strokeStyle = 'rgba(0, 240, 255, 0.9)';
        this.上下文.lineWidth = 2;
        this.上下文.beginPath();
        this.上下文.arc(
          敌人.x,
          敌人.y,
          半径 + 3,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * 护盾比例
        );
        this.上下文.stroke();
      }

      this.上下文.fillStyle = 'rgba(255, 0, 0, 0.6)';
      this.上下文.fillRect(敌人.x - 半径, 敌人.y - 半径 - 6, 半径 * 2, 3);
      this.上下文.fillStyle = 眩晕中 ? 'rgba(255, 255, 0, 0.8)' : '#0f0';
      this.上下文.fillRect(敌人.x - 半径, 敌人.y - 半径 - 6, 半径 * 2 * 生命比例, 3);
      this.上下文.restore();
    });
  }

  绘制敌人装饰(敌人, 半径) {
    this.上下文.save();
    this.上下文.strokeStyle = 'rgba(0,0,0,0.35)';
    this.上下文.lineWidth = 1.5;
    if (敌人.类型 === 'normal') {
      const 尖刺 = 8;
      this.上下文.beginPath();
      for (let i = 0; i < 尖刺; i++) {
        const 角度 = (i * Math.PI * 2) / 尖刺;
        this.上下文.moveTo(
          敌人.x + Math.cos(角度) * 半径 * 0.7,
          敌人.y + Math.sin(角度) * 半径 * 0.7
        );
        this.上下文.lineTo(
          敌人.x + Math.cos(角度) * 半径 * 1.15,
          敌人.y + Math.sin(角度) * 半径 * 1.15
        );
      }
      this.上下文.stroke();
    } else if (敌人.类型 === 'fast') {
      this.上下文.beginPath();
      this.上下文.moveTo(敌人.x - 半径 * 0.5, 敌人.y - 半径 * 0.5);
      this.上下文.lineTo(敌人.x + 半径 * 0.6, 敌人.y);
      this.上下文.lineTo(敌人.x - 半径 * 0.5, 敌人.y + 半径 * 0.5);
      this.上下文.stroke();
    } else if (敌人.类型 === 'tank') {
      this.上下文.beginPath();
      this.上下文.arc(敌人.x, 敌人.y, 半径 * 0.6, 0, Math.PI * 2);
      this.上下文.stroke();
    } else if (敌人.类型 === 'split') {
      this.上下文.beginPath();
      this.上下文.moveTo(敌人.x, 敌人.y - 半径 * 0.7);
      this.上下文.lineTo(敌人.x, 敌人.y + 半径 * 0.7);
      this.上下文.stroke();
    } else if (敌人.类型 === 'stealth') {
      this.上下文.setLineDash([3, 3]);
      this.上下文.beginPath();
      this.上下文.arc(敌人.x, 敌人.y, 半径 * 0.6, 0, Math.PI * 2);
      this.上下文.stroke();
      this.上下文.setLineDash([]);
    } else if (敌人.类型 === 'regenerator') {
      this.上下文.beginPath();
      this.上下文.moveTo(敌人.x - 半径 * 0.5, 敌人.y);
      this.上下文.lineTo(敌人.x + 半径 * 0.5, 敌人.y);
      this.上下文.moveTo(敌人.x, 敌人.y - 半径 * 0.5);
      this.上下文.lineTo(敌人.x, 敌人.y + 半径 * 0.5);
      this.上下文.stroke();
    }
    this.上下文.restore();
  }

  绘制Boss(敌人, 半径, 现在) {
    const 敌人配置 = this.游戏配置.敌人.boss;
    this.上下文.save();
    this.上下文.fillStyle = 敌人配置.颜色;
    this.上下文.shadowBlur = 18;
    this.上下文.shadowColor = 敌人配置.颜色;
    this.上下文.beginPath();
    this.上下文.arc(敌人.x, 敌人.y, 半径, 0, Math.PI * 2);
    this.上下文.fill();
    this.上下文.strokeStyle = 'rgba(255,255,255,0.85)';
    this.上下文.lineWidth = 2;
    this.上下文.beginPath();
    this.上下文.arc(敌人.x, 敌人.y, 半径 * 0.7, 0, Math.PI * 2);
    this.上下文.stroke();
    const 旋转 = 现在 * 0.002;
    this.上下文.strokeStyle = 配置.颜色.霓虹黄;
    this.上下文.lineWidth = 2;
    this.上下文.beginPath();
    this.上下文.arc(敌人.x, 敌人.y, 半径 * 1.25, 旋转, 旋转 + Math.PI);
    this.上下文.stroke();
    this.上下文.fillStyle = 配置.颜色.霓虹黄;
    this.上下文.beginPath();
    for (let i = 0; i < 3; i++) {
      const 角度 = -Math.PI / 2 + (i * Math.PI * 2) / 3;
      const cx = 敌人.x + Math.cos(角度) * 半径 * 0.9;
      const cy = 敌人.y - 半径 - Math.sin(角度) * 半径 * 0.4 - 半径 * 0.2;
      this.上下文.moveTo(cx - 5, cy + 6);
      this.上下文.lineTo(cx, cy);
      this.上下文.lineTo(cx + 5, cy + 6);
    }
    this.上下文.fill();
    this.上下文.restore();
  }

  绘制子弹() {
    this.子弹列表.forEach((子弹) => {
      const 塔配置 = this.游戏配置.塔列表[子弹.类型];
      this.上下文.save();
      this.上下文.fillStyle = 塔配置.颜色;
      this.上下文.shadowBlur = 8;
      this.上下文.shadowColor = 塔配置.颜色;
      this.上下文.beginPath();
      const 子弹半径 =
        子弹.类型 === 'sniper' ? this.游戏配置.子弹.半径 * 1.5 : this.游戏配置.子弹.半径;
      this.上下文.arc(子弹.x, 子弹.y, 子弹半径, 0, Math.PI * 2);
      this.上下文.fill();
      this.上下文.restore();
    });
  }

  绘制闪电() {
    this.闪电列表.forEach((闪电) => {
      const 比例 = 闪电.生命 / 闪电.最大生命;
      this.上下文.save();
      this.上下文.globalAlpha = 比例;
      this.上下文.strokeStyle = 闪电.颜色;
      this.上下文.shadowBlur = 14;
      this.上下文.shadowColor = 闪电.颜色;
      this.上下文.lineWidth = 2.5;
      for (let s = 0; s < 闪电.点.length - 1; s++) {
        const a = 闪电.点[s];
        const b = 闪电.点[s + 1];
        this.上下文.beginPath();
        this.上下文.moveTo(a.x, a.y);
        const 段数 = 4;
        for (let i = 1; i < 段数; i++) {
          const t = i / 段数;
          const jx = (Math.random() * 2 - 1) * 6;
          const jy = (Math.random() * 2 - 1) * 6;
          this.上下文.lineTo(a.x + (b.x - a.x) * t + jx, a.y + (b.y - a.y) * t + jy);
        }
        this.上下文.lineTo(b.x, b.y);
        this.上下文.stroke();
      }
      this.上下文.restore();
    });
  }

  绘制粒子() {
    this.粒子列表.forEach((粒子) => {
      this.上下文.save();
      this.上下文.globalAlpha = 粒子.生命 / 0.3;
      this.上下文.fillStyle = 粒子.颜色;
      this.上下文.beginPath();
      this.上下文.arc(粒子.x, 粒子.y, 粒子.半径, 0, Math.PI * 2);
      this.上下文.fill();
      this.上下文.restore();
    });
  }

  绘制浮动文本() {
    this.上下文.save();
    this.上下文.textAlign = 'center';
    this.上下文.textBaseline = 'middle';
    this.浮动文本列表.forEach((项) => {
      this.上下文.globalAlpha = Math.max(0, Math.min(1, 项.生命));
      this.上下文.fillStyle = 项.颜色;
      this.上下文.shadowBlur = 8;
      this.上下文.shadowColor = 项.颜色;
      this.上下文.font = `bold ${项.大小}px "Courier New", monospace`;
      this.上下文.fillText(项.文本, 项.x, 项.y);
    });
    this.上下文.restore();
  }

  绘制放置预览() {
    const 格子 = this.悬停格子;
    if (格子.x < 0) return;
    const 格子尺寸 = this.游戏配置.地图.格子尺寸;
    const 可放置 = this.可放置塔(格子.x, 格子.y);

    this.上下文.save();
    this.上下文.strokeStyle = 可放置 ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
    this.上下文.lineWidth = 2;
    this.上下文.strokeRect(
      格子.x * 格子尺寸 + 2,
      格子.y * 格子尺寸 + 2,
      格子尺寸 - 4,
      格子尺寸 - 4
    );

    if (可放置) {
      const 塔配置 = this.游戏配置.塔列表[this.当前塔类型];
      this.上下文.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      this.上下文.beginPath();
      this.上下文.arc(
        格子.x * 格子尺寸 + 格子尺寸 / 2,
        格子.y * 格子尺寸 + 格子尺寸 / 2,
        塔配置.射程,
        0,
        Math.PI * 2
      );
      this.上下文.stroke();
    }
    this.上下文.restore();
  }

  绘制HUD() {
    const 地图 = this.游戏配置.地图;
    const 逻辑宽 = 地图.列数 * 地图.格子尺寸;
    const 底 = 地图.行数 * 地图.格子尺寸;
    const y = 底 - 86;

    this.上下文.save();
    this.上下文.fillStyle = '#fff';
    this.上下文.font = 'bold 14px "Courier New", monospace';
    this.上下文.textAlign = 'left';
    this.上下文.textBaseline = 'top';
    this.上下文.shadowBlur = 10;
    this.上下文.shadowColor = '#fff';

    const 波次文本 = this.无尽模式
      ? t('game.neonDefense.endlessWave', { wave: this.当前波次 + 1 })
      : t('game.neonDefense.wave', {
          current: this.当前波次 + 1,
          total: this.游戏配置.波次列表.length
        });
    this.上下文.fillText(波次文本, 10, y);
    this.上下文.fillText(t('game.neonDefense.coins', { coins: this.数据币 }), 10, y + 22);
    this.上下文.fillText(t('game.neonDefense.score', { score: this.分数 }), 10, y + 44);
    this.上下文.fillText(
      t('game.neonDefense.energy', { current: this.核心能量, max: this.游戏配置.核心.最大能量 }),
      10,
      y + 66
    );

    if (this.连击 > 1) {
      this.上下文.fillStyle = 配置.颜色.霓虹黄;
      this.上下文.shadowColor = 配置.颜色.霓虹黄;
      this.上下文.fillText(`连击 x${this.连击}`, 逻辑宽 - 120, y);
    }

    const 目标波次 = this.游戏配置.里程碑.目标波次;
    const 进度 = Math.min(this.当前波次 + 1, 目标波次);
    this.上下文.fillStyle = 'rgba(168, 85, 255, 0.9)';
    this.上下文.shadowColor = 配置.颜色.霓虹紫;
    this.上下文.fillText(
      `${t('game.neonDefense.milestone')} ${进度}/${目标波次}`,
      逻辑宽 - 120,
      y + 22
    );

    if (this.精英波次) {
      this.上下文.textAlign = 'center';
      this.上下文.fillStyle = 配置.颜色.霓虹黄;
      this.上下文.shadowBlur = 16;
      this.上下文.shadowColor = 配置.颜色.霓虹黄;
      this.上下文.font = 'bold 22px "Courier New", monospace';
      this.上下文.fillText('★ 精英波次 ★', 逻辑宽 / 2, y - 28);
    }

    if (this.已暂停) {
      this.上下文.textAlign = 'center';
      this.上下文.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.上下文.shadowBlur = 16;
      this.上下文.shadowColor = '#fff';
      this.上下文.font = 'bold 28px "Courier New", monospace';
      this.上下文.fillText('‖ 暂停中', 逻辑宽 / 2, 底 / 2 - 14);
    }

    this.上下文.restore();
  }
}
