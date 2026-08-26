import { 配置 } from '../config.js';
import { 游戏基类 } from '../core/GameBase.js';
import { t } from '../i18n.js';
import { 创建元素, 防抖 } from '../utils.js';

export class NeonArena extends 游戏基类 {
  constructor(选项) {
    super(选项);
    this.画布 = null;
    this.上下文 = null;
    this.动画帧 = null;
    this.游戏配置 = 配置.游戏.neonArena;
    this.绑定调整尺寸 = 防抖(() => this.调整尺寸(), 200);
    this.绑定处理键盘按下 = (e) => this.处理键盘按下(e);
    this.绑定处理键盘释放 = (e) => this.处理键盘释放(e);
    this.绑定模式切换 = () => this.切换模式();

    this.玩家列表 = [];
    this.当前模式 = 'single';
    this.游戏模式 = 'fighting';
    this.回合 = 1;
    this.回合比分 = { player1: 0, player2: 0 };
    this.回合状态 = 'waiting';
    this.回合开始时间 = 0;
    this.回合结束时间 = 0;
    this.回合胜者 = null;
    this.特效列表 = [];
    this.残影列表 = [];
    this.屏幕震动 = { x: 0, y: 0, 强度: 0 };
    this.顿帧 = 0;
    this.时间缩放 = 1;
    this.赛博时间 = 0;
    this.连击 = { 次数: 0, 结束时间: 0 };
    this.KO演出 = null;
    this.上一次时间戳 = 0;
    this.键盘状态 = {};
    this.缩放比 = 1;
    this.擂台偏移 = { x: 0, y: 0 };
    this.相机 = { x: 0, y: 0 };
    this.障碍列表 = [];
    this.子弹列表 = [];
    this.蓄力状态 = {
      player1: { 激活: false, 开始时间: 0 },
      player2: { 激活: false, 开始时间: 0 }
    };

    this.顶栏 = null;
    this.模式按钮 = null;
    this.模式标签 = null;
    this.模式选项卡组 = null;
    this.模式选项卡 = {};
    this.比分显示 = null;
    this.技能条容器 = null;
    this.回合提示 = null;
    this.结算画面 = null;
    this.说明元素 = null;
    this.PVE菜单 = null;
    this.PVE子模式 = null;
    this.PVE波次 = 1;
    this.PVE关卡 = 1;
    this.PVE最高波次 = 0;
    this.PVE最高关卡 = 0;
    this.AI类型 = null;
  }

  async 初始化() {
    this.PVE最高波次 = this.状态管理器.读取('neonArena.pve.endlessHighestWave', 0);
    this.PVE最高关卡 = this.状态管理器.读取('neonArena.pve.levelsHighestLevel', 0);
    this.渲染();
  }

  渲染() {
    this.容器.innerHTML = '';
    this.容器.className = 'game-instance neon-arena';

    this.顶栏 = 创建元素('div', { class: 'neon-arena-top-bar' });
    this.模式按钮 = 创建元素('button', {
      class: 'neon-btn pink neon-arena-mode-btn',
      text: t('game.neonArena.modeSwitchDouble')
    });
    this.模式按钮.addEventListener('click', this.绑定模式切换);
    this.模式标签 = 创建元素('div', {
      class: 'neon-arena-mode-label',
      text: t('game.neonArena.singleMode')
    });
    this.比分显示 = 创建元素('div', {
      class: 'neon-arena-score',
      text: t('game.neonArena.score', { p1Score: 0, p2Score: 0 })
    });
    this.模式选项卡组 = 创建元素('div', { class: 'neon-arena-mode-tabs' });
    const 模式顺序 = ['fighting', 'racing', 'shooting', 'pve'];
    模式顺序.forEach((模式) => {
      const 按钮 = 创建元素('button', {
        class: `neon-arena-mode-tab${模式 === this.游戏模式 ? ' active' : ''}`,
        text: t(`game.neonArena.modes.${模式}`),
        attrs: { 'data-mode': 模式 }
      });
      按钮.addEventListener('click', (e) => this.切换游戏模式(e));
      this.模式选项卡[模式] = 按钮;
      this.模式选项卡组.appendChild(按钮);
    });

    this.顶栏.appendChild(this.模式选项卡组);
    this.顶栏.appendChild(this.模式按钮);
    this.顶栏.appendChild(this.模式标签);
    this.顶栏.appendChild(this.比分显示);
    this.容器.appendChild(this.顶栏);

    this.说明元素 = 创建元素('div', {
      class: 'game-instruction neon-arena-instruction',
      text: this.获取当前说明()
    });
    this.容器.appendChild(this.说明元素);

    const 画布容器 = 创建元素('div', { class: 'neon-arena-canvas-wrap' });
    this.画布 = document.createElement('canvas');
    this.画布.setAttribute('aria-label', t('games.neonArena.title'));
    画布容器.appendChild(this.画布);
    this.PVE菜单 = this.创建PVE菜单();
    画布容器.appendChild(this.PVE菜单);
    this.容器.appendChild(画布容器);

    this.上下文 = this.画布.getContext('2d');
    this.调整尺寸();

    this.回合提示 = 创建元素('div', { class: 'neon-arena-round-overlay hidden' });
    this.容器.appendChild(this.回合提示);

    this.技能条容器 = 创建元素('div', { class: 'neon-arena-skill-bars' });
    this.容器.appendChild(this.技能条容器);

    this.结算画面 = this.创建结算画面();
    this.容器.appendChild(this.结算画面);

    window.addEventListener('resize', this.绑定调整尺寸);
    document.addEventListener('keydown', this.绑定处理键盘按下);
    document.addEventListener('keyup', this.绑定处理键盘释放);
  }

  创建结算画面() {
    const 画面 = 创建元素('div', { class: 'neon-arena-game-over hidden' });
    const 标题 = 创建元素('h2', {
      class: 'neon-arena-game-over-title',
      text: t('games.neonArena.title')
    });
    const 结果 = 创建元素('div', { class: 'neon-arena-game-over-result', text: '' });
    const 按钮 = 创建元素('button', {
      class: 'neon-btn pink neon-arena-restart-btn',
      text: t('game.neonArena.restart')
    });
    按钮.addEventListener('click', () => this.重新开始());
    画面.appendChild(标题);
    画面.appendChild(结果);
    画面.appendChild(按钮);
    return 画面;
  }

  创建PVE菜单() {
    const 菜单 = 创建元素('div', { class: 'neon-arena-pve-menu hidden' });
    const 无尽按钮 = 创建元素('button', {
      class: 'neon-btn cyan neon-arena-pve-btn',
      text: t('game.neonArena.pveEndless')
    });
    const 闯关按钮 = 创建元素('button', {
      class: 'neon-btn purple neon-arena-pve-btn',
      text: t('game.neonArena.pveLevels')
    });
    无尽按钮.addEventListener('click', () => this.选择PVE子模式('endless'));
    闯关按钮.addEventListener('click', () => this.选择PVE子模式('levels'));
    菜单.appendChild(无尽按钮);
    菜单.appendChild(闯关按钮);
    return 菜单;
  }

  显示PVE菜单() {
    if (this.PVE菜单) {
      this.PVE菜单.classList.remove('hidden');
    }
  }

  隐藏PVE菜单() {
    if (this.PVE菜单) {
      this.PVE菜单.classList.add('hidden');
    }
  }

  选择PVE子模式(子模式) {
    this.PVE子模式 = 子模式;
    this.PVE波次 = this.游戏配置.PVE.无尽挑战.初始波次;
    this.PVE关卡 = 1;
    this.隐藏PVE菜单();
    this.启动();
  }

  创建技能条(玩家) {
    const 条 = 创建元素('div', { class: 'neon-arena-skill-bar' });
    const 标题 = 创建元素('div', {
      class: 'neon-arena-skill-player',
      text: t(`game.neonArena.${玩家.标识}`)
    });
    条.appendChild(标题);

    Object.values(this.游戏配置.技能).forEach((技能) => {
      const 状态 = 玩家.技能状态[技能.标识];
      const 槽 = 创建元素('div', {
        class: 'neon-arena-skill-slot',
        attrs: { 'data-skill': 技能.标识 }
      });
      const 图标 = 创建元素('div', {
        class: 'neon-arena-skill-icon',
        text: t(`game.neonArena.skills.${技能.标识}`)
      });
      const 键 = 创建元素('div', {
        class: 'neon-arena-skill-key',
        text: this.获取玩家技能首键(玩家, 技能.标识)
      });
      const 覆盖层 = 创建元素('div', { class: 'neon-arena-skill-overlay' });
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
    if (this.游戏模式 === 'pve') return;
    this.当前模式 = this.当前模式 === 'single' ? 'double' : 'single';
    this.更新模式UI();
    if (this.运行中) {
      this.重新开始();
    }
  }

  切换游戏模式(e) {
    const 目标 = e?.target;
    if (!目标) return;
    const 新模式 = 目标.dataset.mode;
    if (!新模式 || 新模式 === this.游戏模式) return;

    if (this.游戏模式 === 'pve') {
      this.PVE子模式 = null;
      this.隐藏PVE菜单();
    }

    this.游戏模式 = 新模式;
    if (this.游戏模式 === 'pve') {
      this.当前模式 = 'single';
      this.PVE子模式 = null;
    }
    this.更新模式UI();
    if (this.游戏模式 === 'pve' || this.运行中) {
      this.重新开始();
    }
  }

  是格斗模式() {
    return this.游戏模式 === 'fighting' || this.游戏模式 === 'pve';
  }

  获取当前说明() {
    if (this.游戏模式 === 'racing') {
      return t('game.neonArena.raceInstruction');
    }
    if (this.游戏模式 === 'shooting') {
      return t('game.neonArena.shootingInstruction', { hits: this.游戏配置.射击.命中所需次数 });
    }
    if (this.游戏模式 === 'pve') {
      return t('game.neonArena.pveInstruction');
    }
    return t('game.neonArena.instruction');
  }

  更新模式UI() {
    if (!this.模式按钮 || !this.模式标签) return;
    const 是单人 = this.当前模式 === 'single';
    this.模式按钮.textContent = t(
      是单人 ? 'game.neonArena.modeSwitchDouble' : 'game.neonArena.modeSwitchSingle'
    );
    this.模式标签.textContent = t(
      是单人 ? 'game.neonArena.singleMode' : 'game.neonArena.doubleMode'
    );

    const 显示人数切换 =
      this.游戏模式 === 'fighting' || this.游戏模式 === 'racing' || this.游戏模式 === 'shooting';
    this.模式按钮.style.display = 显示人数切换 ? '' : 'none';
    this.模式标签.style.display = 显示人数切换 ? '' : 'none';

    Object.entries(this.模式选项卡).forEach(([模式, 按钮]) => {
      按钮.classList.toggle('active', 模式 === this.游戏模式);
    });

    if (this.说明元素) {
      this.说明元素.textContent = this.获取当前说明();
    }
  }

  更新比分显示() {
    if (!this.比分显示) return;
    if (this.游戏模式 === 'pve') {
      if (this.PVE子模式 === 'endless') {
        const 最高 = Math.max(this.PVE最高波次, this.PVE波次);
        this.比分显示.textContent = `${t('game.neonArena.pveWave', { wave: this.PVE波次 })} | ${t('game.neonArena.pveHighestWave', { wave: 最高 })}`;
      } else if (this.PVE子模式 === 'levels') {
        const 总数 = this.游戏配置.PVE.闯关挑战.关卡列表.length;
        const 关卡 = this.游戏配置.PVE.闯关挑战.关卡列表[this.PVE关卡 - 1];
        const 关卡名 = 关卡 ? t(`game.neonArena.aiTypes.${关卡.AI类型 || 'balanced'}`) : '';
        this.比分显示.textContent = `${t('game.neonArena.pveLevel', { level: this.PVE关卡 })} / ${t('game.neonArena.pveLevelProgress', { current: this.PVE关卡, total: 总数 })} · ${关卡名}`;
      } else {
        this.比分显示.textContent = '';
      }
      return;
    }
    this.比分显示.textContent = t('game.neonArena.score', {
      p1Score: this.回合比分.player1,
      p2Score: this.回合比分.player2
    });
  }

  调整尺寸() {
    if (!this.画布 || !this.上下文) return;
    const 容器矩形 = this.画布.parentElement.getBoundingClientRect();
    const css宽 = Math.max(1, Math.floor(容器矩形.width));
    const css高 = Math.max(1, Math.floor(容器矩形.height));
    const dpr = Math.min(3, (window.devicePixelRatio || 1) * 1.8);

    this.画布.width = css宽 * dpr;
    this.画布.height = css高 * dpr;

    const 擂台宽 = this.游戏配置.擂台.宽度;
    const 擂台高 = this.游戏配置.擂台.高度;
    this.缩放比 = Math.min(css宽 / 擂台宽, css高 / 擂台高);
    this.擂台偏移.x = (css宽 - 擂台宽 * this.缩放比) / 2;
    this.擂台偏移.y = (css高 - 擂台高 * this.缩放比) / 2;

    this.上下文.setTransform(1, 0, 0, 1, 0, 0);
    this.上下文.scale(dpr, dpr);
  }

  世界到屏幕(点) {
    return {
      x: this.擂台偏移.x + (点.x - this.相机.x) * this.缩放比,
      y: this.擂台偏移.y + (点.y - this.相机.y) * this.缩放比
    };
  }

  async 启动() {
    if (this.动画帧) {
      cancelAnimationFrame(this.动画帧);
      this.动画帧 = null;
    }

    if (this.游戏模式 === 'pve' && !this.PVE子模式) {
      this.运行中 = true;
      this.已暂停 = false;
      this.重置分数();
      this.回合 = 1;
      this.回合比分 = { player1: 0, player2: 0 };
      this.特效列表 = [];
      this.键盘状态 = {};
      this.屏幕震动.强度 = 0;
      this.相机.x = 0;
      this.相机.y = 0;
      this.障碍列表 = [];
      this.子弹列表 = [];
      this.蓄力状态.player1 = { 激活: false, 开始时间: 0 };
      this.蓄力状态.player2 = { 激活: false, 开始时间: 0 };
      this.更新模式UI();
      this.更新比分显示();
      if (this.结算画面) {
        this.结算画面.classList.add('hidden');
      }
      this.显示PVE菜单();
      return;
    }

    this.运行中 = true;
    this.已暂停 = false;
    this.重置分数();
    this.回合 = 1;
    this.回合比分 = { player1: 0, player2: 0 };
    this.回合状态 = 'waiting';
    this.回合胜者 = null;
    this.特效列表 = [];
    this.键盘状态 = {};
    this.屏幕震动.强度 = 0;
    this.上一次时间戳 = performance.now();
    this.相机.x = 0;
    this.相机.y = 0;
    this.障碍列表 = [];
    this.子弹列表 = [];
    this.蓄力状态.player1 = { 激活: false, 开始时间: 0 };
    this.蓄力状态.player2 = { 激活: false, 开始时间: 0 };

    if (this.游戏模式 === 'pve') {
      this.PVE波次 = this.游戏配置.PVE.无尽挑战.初始波次;
      this.PVE关卡 = 1;
    }

    this.更新模式UI();

    this.玩家列表 = [];
    const 配置玩家 = this.游戏配置.玩家;
    const 擂台宽 = this.游戏配置.擂台.宽度;
    const 地面Y = this.游戏配置.擂台.高度 - this.游戏配置.擂台.地面高度;

    this.玩家列表.push(
      this.创建玩家({
        标识: 'player1',
        颜色: 配置玩家.玩家1颜色,
        控制: this.游戏配置.玩家1控制,
        x: 擂台宽 * 0.25,
        y: 地面Y
      })
    );

    const PVEAI倍数 = this.游戏模式 === 'pve' ? this.获取PVEAI倍数() : null;
    const 默认AI类型 = this.当前模式 === 'single' ? 'balanced' : null;
    this.玩家列表.push(
      this.创建玩家({
        标识: 'player2',
        颜色: 配置玩家.玩家2颜色,
        控制: this.当前模式 === 'single' ? null : this.游戏配置.玩家2控制,
        x: 擂台宽 * 0.75,
        y: 地面Y,
        是AI: this.当前模式 === 'single',
        ...(PVEAI倍数 || {}),
        AI类型: PVEAI倍数?.AI类型 || 默认AI类型
      })
    );

    this.技能条容器.innerHTML = '';
    this.玩家列表.forEach((玩家) => {
      this.初始化玩家技能状态(玩家);
      const 条 = this.创建技能条(玩家);
      玩家.技能条 = 条;
      this.技能条容器.appendChild(条);
    });

    this.更新比分显示();
    if (this.结算画面) {
      this.结算画面.classList.add('hidden');
    }

    this.开始新回合();
    this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
  }

  创建玩家(配置项) {
    const 配置玩家 = this.游戏配置.玩家;
    return {
      标识: 配置项.标识,
      颜色: 配置项.颜色,
      控制: 配置项.控制,
      x: 配置项.x || 0,
      y: 配置项.y || 0,
      vx: 0,
      vy: 0,
      宽度: 配置玩家.宽度,
      高度: 配置玩家.高度,
      朝向: 配置项.标识 === 'player1' ? 1 : -1,
      蹲下: false,
      grounded: false,
      跳跃按下: false,
      生命: 配置玩家.最大生命,
      能量: 配置玩家.最大能量,
      攻击冷却: 0,
      技能状态: {},
      技能条: null,
      护盾结束时间: 0,
      冲刺结束时间: 0,
      时间过载结束时间: 0,
      眩晕结束时间: 0,
      攻击命中列表: [],
      是AI: 配置项.是AI || false,
      AI最后攻击时间: 0,
      AI最后技能时间: 0,
      AI移动目标时间: 0,
      AI移动方向: 0,
      AI跳跃标记: false,
      AI下蹲标记: false,
      AI攻击标记: false,
      生命倍数: 配置项.生命倍数 || 1,
      伤害倍数: 配置项.伤害倍数 || 1,
      速度倍数: 配置项.速度倍数 || 1,
      能量恢复倍数: 配置项.能量恢复倍数 || 1,
      攻击范围倍数: 配置项.攻击范围倍数 || 1,
      攻击冷却倍数: 配置项.攻击冷却倍数 || 1,
      反应延迟倍数: 配置项.反应延迟倍数 || 1,
      技能间隔倍数: 配置项.技能间隔倍数 || 1,
      AI类型: 配置项.AI类型 || 'balanced',
      最大生命: 配置玩家.最大生命
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

  开始新回合() {
    const 擂台宽 = this.游戏配置.擂台.宽度;
    const 地面Y = this.游戏配置.擂台.高度 - this.游戏配置.擂台.地面高度;
    const 配置玩家 = this.游戏配置.玩家;
    const 是竞速 = this.游戏模式 === 'racing';
    const 是射击 = this.游戏模式 === 'shooting';
    const 是PVE = this.游戏模式 === 'pve';

    this.子弹列表 = [];
    this.蓄力状态.player1 = { 激活: false, 开始时间: 0 };
    this.蓄力状态.player2 = { 激活: false, 开始时间: 0 };

    this.玩家列表.forEach((玩家) => {
      const 倍数 = 是PVE && 玩家.标识 === 'player2' ? this.获取PVEAI倍数() : null;
      if (倍数) {
        玩家.生命倍数 = 倍数.生命倍数;
        玩家.伤害倍数 = 倍数.伤害倍数;
        玩家.速度倍数 = 倍数.速度倍数;
        玩家.能量恢复倍数 = 倍数.能量恢复倍数;
        玩家.攻击范围倍数 = 倍数.攻击范围倍数 || 1;
        玩家.攻击冷却倍数 = 倍数.攻击冷却倍数 || 1;
        玩家.反应延迟倍数 = 倍数.反应延迟倍数 || 1;
        玩家.技能间隔倍数 = 倍数.技能间隔倍数 || 1;
        玩家.AI类型 = 倍数.AI类型 || 玩家.AI类型 || 'balanced';
        玩家.最大生命 = 配置玩家.最大生命 * 倍数.生命倍数;
        玩家.生命 = 玩家.最大生命;
        玩家.能量 = 配置玩家.最大能量;
      } else {
        玩家.生命 = 配置玩家.最大生命;
        玩家.能量 = 配置玩家.最大能量;
      }
      if (是PVE && 玩家.标识 === 'player1' && 倍数?.玩家生命恢复) {
        const 恢复量 = 配置玩家.最大生命 * 倍数.玩家生命恢复;
        玩家.生命 = Math.min(玩家.最大生命 || 配置玩家.最大生命, 玩家.生命 + 恢复量);
      }
      玩家.vx = 0;
      玩家.vy = 0;
      玩家.蹲下 = false;
      玩家.高度 = 配置玩家.高度;
      玩家.攻击冷却 = 0;
      玩家.护盾结束时间 = 0;
      玩家.冲刺结束时间 = 0;
      玩家.时间过载结束时间 = 0;
      玩家.眩晕结束时间 = 0;
      玩家.攻击命中列表 = [];
      if (是竞速) {
        玩家.朝向 = 1;
        玩家.x = 玩家.标识 === 'player1' ? 60 : 110;
      } else if (是射击) {
        玩家.朝向 = 玩家.标识 === 'player1' ? 1 : -1;
        玩家.x = 玩家.标识 === 'player1' ? 擂台宽 * 0.22 : 擂台宽 * 0.78;
      } else {
        玩家.朝向 = 玩家.标识 === 'player1' ? 1 : -1;
        玩家.x = 玩家.标识 === 'player1' ? 擂台宽 * 0.25 : 擂台宽 * 0.75;
      }
      玩家.y = 地面Y;
    });

    this.特效列表 = [];
    this.残影列表 = [];
    this.障碍列表 = [];
    this.相机.x = 0;
    this.回合胜者 = null;
    this.连击 = { 次数: 0, 结束时间: 0 };
    this.KO演出 = null;
    this.时间缩放 = 1;
    this.顿帧 = 0;
    this.回合状态 = 'intro';
    this.回合开始时间 = performance.now();

    if (this.游戏模式 === 'pve') {
      this.更新比分显示();
    }

    if (是竞速) {
      this.生成竞速障碍();
      this.显示回合提示(t('game.neonArena.raceRoundStart', { round: this.回合 }));
    } else if (是射击) {
      this.显示回合提示(t('game.neonArena.roundStart', { round: this.回合 }));
    } else {
      this.显示回合提示(t('game.neonArena.roundStart', { round: this.回合 }));
    }
  }

  显示回合提示(文本) {
    if (!this.回合提示) return;
    this.回合提示.textContent = 文本;
    this.回合提示.classList.remove('hidden');
  }

  隐藏回合提示() {
    if (!this.回合提示) return;
    this.回合提示.classList.add('hidden');
  }

  获取PVEAI倍数() {
    const PVE配置 = this.游戏配置.PVE;
    if (this.PVE子模式 === 'endless') {
      const 无尽 = PVE配置.无尽挑战;
      const 波次偏移 = this.PVE波次 - 无尽.初始波次;
      const 基础 = {
        生命倍数: 1 + 波次偏移 * 无尽.生命成长,
        伤害倍数: 1 + 波次偏移 * 无尽.伤害成长,
        速度倍数: 1 + 波次偏移 * 无尽.速度成长,
        能量恢复倍数: 1 + 波次偏移 * 无尽.能量恢复成长,
        攻击范围倍数: Math.min(
          无尽.最大攻击范围 / this.游戏配置.AI.攻击范围,
          1 + 波次偏移 * 无尽.攻击范围成长
        ),
        攻击冷却倍数: Math.max(
          无尽.最小攻击冷却 / this.游戏配置.AI.攻击冷却,
          1 + 波次偏移 * 无尽.攻击冷却成长
        ),
        反应延迟倍数: Math.max(
          无尽.最小反应延迟 / this.游戏配置.AI.移动反应延迟,
          1 + 波次偏移 * 无尽.反应延迟成长
        ),
        技能间隔倍数: Math.max(
          无尽.最小技能间隔 / this.游戏配置.AI.技能随机间隔,
          1 + 波次偏移 * 无尽.技能间隔成长
        ),
        AI类型: this.获取无尽波次AI类型(this.PVE波次)
      };
      if (this.PVE波次 > 0 && this.PVE波次 % 无尽.Boss波次间隔 === 0) {
        return this.应用PVE特殊倍数(基础, 无尽.Boss倍数);
      }
      if (this.PVE波次 > 0 && this.PVE波次 % 无尽.精英波次间隔 === 0) {
        return this.应用PVE特殊倍数(基础, 无尽.精英倍数);
      }
      return 基础;
    }
    if (this.PVE子模式 === 'levels') {
      const 关卡 = PVE配置.闯关挑战.关卡列表[this.PVE关卡 - 1];
      return 关卡
        ? {
            生命倍数: 关卡.生命倍数,
            伤害倍数: 关卡.伤害倍数,
            速度倍数: 关卡.速度倍数,
            能量恢复倍数: 关卡.能量恢复倍数,
            AI类型: 关卡.AI类型 || 'balanced',
            玩家生命恢复: 关卡.玩家生命恢复 || 0,
            攻击范围倍数: 1 + (关卡.生命倍数 - 1) * 0.3,
            攻击冷却倍数: Math.max(0.7, 1 - (关卡.伤害倍数 - 1) * 0.3),
            反应延迟倍数: Math.max(0.6, 1 - (关卡.速度倍数 - 1) * 0.5),
            技能间隔倍数: Math.max(0.6, 1 - (关卡.能量恢复倍数 - 1) * 0.5)
          }
        : {
            生命倍数: 1,
            伤害倍数: 1,
            速度倍数: 1,
            能量恢复倍数: 1,
            AI类型: 'balanced',
            玩家生命恢复: 0,
            攻击范围倍数: 1,
            攻击冷却倍数: 1,
            反应延迟倍数: 1,
            技能间隔倍数: 1
          };
    }
    return {
      生命倍数: 1,
      伤害倍数: 1,
      速度倍数: 1,
      能量恢复倍数: 1,
      AI类型: 'balanced',
      玩家生命恢复: 0,
      攻击范围倍数: 1,
      攻击冷却倍数: 1,
      反应延迟倍数: 1,
      技能间隔倍数: 1
    };
  }

  应用PVE特殊倍数(基础, 特殊) {
    return {
      ...基础,
      生命倍数: 基础.生命倍数 * 特殊.生命倍数,
      伤害倍数: 基础.伤害倍数 * 特殊.伤害倍数,
      速度倍数: 基础.速度倍数 * 特殊.速度倍数,
      能量恢复倍数: 基础.能量恢复倍数 * 特殊.能量恢复倍数
    };
  }

  获取无尽波次AI类型(波次) {
    const 类型列表 = this.游戏配置.AI.类型列表.map((t) => t.标识);
    if (波次 % 10 === 0) return 'aggressive';
    if (波次 % 5 === 0) return 'defensive';
    if (波次 % 3 === 0) return 'aggressive';
    return 类型列表[波次 % 类型列表.length];
  }

  async 暂停() {
    this.已暂停 = true;
  }

  async 恢复() {
    if (!this.运行中) return;
    this.已暂停 = false;
    this.上一次时间戳 = performance.now();
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
    window.removeEventListener('resize', this.绑定调整尺寸);
    document.removeEventListener('keydown', this.绑定处理键盘按下);
    document.removeEventListener('keyup', this.绑定处理键盘释放);
    if (this.模式按钮) {
      this.模式按钮.removeEventListener('click', this.绑定模式切换);
    }
    if (this.结算画面) {
      const 按钮 = this.结算画面.querySelector('.neon-arena-restart-btn');
      if (按钮) 按钮.replaceWith(按钮.cloneNode(true));
    }
    this.容器.innerHTML = '';
    this.画布 = null;
    this.上下文 = null;
    this.玩家列表 = [];
    this.特效列表 = [];
    this.技能条容器 = null;
    this.模式按钮 = null;
    this.模式标签 = null;
    this.比分显示 = null;
    this.回合提示 = null;
    this.结算画面 = null;
  }

  结束游戏() {
    if (!this.运行中) return;
    this.停止();
    this.显示结算画面();
    super.结束游戏();
  }

  重新开始() {
    if (this.结算画面) {
      this.结算画面.classList.add('hidden');
    }
    this.启动();
  }

  显示结算画面() {
    if (!this.结算画面) return;
    const 结果 = this.结算画面.querySelector('.neon-arena-game-over-result');

    if (this.游戏模式 === 'pve') {
      const 标题 = this.结算画面.querySelector('.neon-arena-game-over-title');
      if (标题) 标题.textContent = t('game.neonArena.pveFinalResult');
      if (结果) {
        if (this.PVE子模式 === 'endless') {
          结果.textContent = t('game.neonArena.pveGameOver', { wave: this.PVE波次 });
        } else if (this.回合胜者 === 'player1') {
          const 总数 = this.游戏配置.PVE.闯关挑战.关卡列表.length;
          结果.textContent = t('game.neonArena.pveAllLevelsComplete', { total: 总数 });
        } else {
          结果.textContent = t('game.neonArena.pveLevelFailed', { level: this.PVE关卡 });
        }
      }
      this.结算画面.classList.remove('hidden');
      const 按钮 = this.结算画面.querySelector('.neon-arena-restart-btn');
      if (按钮) 按钮.focus();
      return;
    }

    const 标题 = this.结算画面.querySelector('.neon-arena-game-over-title');
    if (标题) 标题.textContent = t('games.neonArena.title');
    const 胜者 = this.回合比分.player1 >= this.游戏配置.赛制.获胜所需回合 ? 'player1' : 'player2';
    let 文本键 = 'game.neonArena.finalWinner';
    if (this.游戏模式 === 'racing') 文本键 = 'game.neonArena.raceFinalWinner';
    if (this.游戏模式 === 'shooting') 文本键 = 'game.neonArena.shootingFinalWinner';
    if (结果) {
      结果.textContent = t(文本键, {
        player: t(`game.neonArena.${胜者}`)
      });
    }
    this.结算画面.classList.remove('hidden');
    const 按钮 = this.结算画面.querySelector('.neon-arena-restart-btn');
    if (按钮) 按钮.focus();
  }

  渲染循环(时间戳) {
    if (!this.运行中 || !this.上下文 || !this.画布) return;

    const 原始差 = Math.min(0.032, (时间戳 - this.上一次时间戳) / 1000);
    this.上一次时间戳 = 时间戳;
    this.赛博时间 += 原始差 * 1000;
    if (this.时间缩放 < 1) this.时间缩放 = Math.min(1, this.时间缩放 + 原始差 * 1.5);
    let 时间差 = 原始差;
    if (this.顿帧 > 0) {
      this.顿帧 -= 原始差 * 1000;
      时间差 = 0;
    } else {
      时间差 *= this.时间缩放;
    }

    this.上下文.save();
    const css宽 = this.画布.getBoundingClientRect().width;
    const css高 = this.画布.getBoundingClientRect().height;
    this.上下文.clearRect(0, 0, css宽, css高);
    this.应用屏幕震动();

    if (!this.已暂停) {
      this.更新回合状态(时间戳);
      if (this.回合状态 === 'fighting') {
        if (this.游戏模式 === 'racing') {
          this.玩家列表.forEach((玩家) => this.更新竞速玩家(玩家, 时间差, 时间戳));
          this.更新竞速AI(时间差, 时间戳);
          this.检测竞速碰撞();
          this.更新竞速相机();
        } else if (this.游戏模式 === 'shooting') {
          this.玩家列表.forEach((玩家) => this.更新射击玩家(玩家, 时间差, 时间戳));
          this.更新射击AI(时间差, 时间戳);
          this.更新子弹(时间差);
          this.检测射击碰撞();
        } else {
          this.玩家列表.forEach((玩家) => this.更新玩家(玩家, 时间差));
          this.更新AI(时间差, 时间戳);
          this.检测碰撞();
        }
        this.更新特效(时间差);
        this.更新能量恢复(时间差);
      } else if (this.KO演出 && this.回合状态 !== 'fighting') {
        this.更新特效(时间差);
      }
      this.更新屏幕震动();
    }

    if (this.游戏模式 === 'racing') {
      this.绘制竞速();
    } else {
      this.绘制擂台();
    }
    this.绘制特效();
    this.绘制玩家();
    this.绘制子弹();
    this.绘制瞄准线();
    if (this.游戏模式 === 'racing') {
      this.绘制竞速HUD();
    } else if (this.游戏模式 === 'shooting') {
      this.绘制射击HUD();
    } else {
      this.绘制HUD();
    }
    this.更新技能条(时间戳);
    this.绘制赛博氛围(css宽, css高);
    this.绘制连击HUD(css宽, css高);
    this.绘制KO演出(css宽, css高);

    this.上下文.restore();

    this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
  }

  更新回合状态(时间戳) {
    if (this.回合状态 === 'intro') {
      if (时间戳 - this.回合开始时间 >= this.游戏配置.赛制.回合开始延迟) {
        this.回合状态 = 'fighting';
        this.隐藏回合提示();
      }
      return;
    }

    if (this.回合状态 === 'fighting') {
      if (this.游戏模式 === 'racing') {
        const 赛道长 = this.游戏配置.竞速.赛道长度;
        const 领先玩家 = this.玩家列表
          .filter((p) => p.生命 > 0 && p.x >= 赛道长)
          .sort((a, b) => b.x - a.x)[0];
        if (领先玩家) {
          this.回合胜者 = 领先玩家.标识;
          this.结束回合();
        }
      } else {
        const 存活玩家 = this.玩家列表.filter((p) => p.生命 > 0);
        if (存活玩家.length <= 1) {
          this.回合胜者 = 存活玩家[0]?.标识 || 'player1';
          this.结束回合();
        }
      }
      return;
    }

    if (this.回合状态 === 'roundOver') {
      if (时间戳 - this.回合结束时间 >= this.游戏配置.赛制.回合结果停留) {
        if (this.游戏模式 === 'pve') {
          if (this.回合胜者 === 'player1') {
            if (this.PVE子模式 === 'levels') {
              const 总数 = this.游戏配置.PVE.闯关挑战.关卡列表.length;
              if (this.PVE关卡 >= 总数) {
                this.结束游戏();
                return;
              }
              this.PVE关卡 += 1;
            } else {
              this.PVE波次 += 1;
            }
            this.回合 += 1;
            this.开始新回合();
          } else {
            this.结束游戏();
          }
          return;
        }
        if (
          this.回合比分.player1 >= this.游戏配置.赛制.获胜所需回合 ||
          this.回合比分.player2 >= this.游戏配置.赛制.获胜所需回合
        ) {
          this.结束游戏();
        } else {
          this.回合 += 1;
          this.开始新回合();
        }
      }
    }
  }

  结束回合() {
    if (!this.回合胜者) return;

    if (this.游戏模式 === 'pve') {
      if (this.回合胜者 === 'player1') {
        this.增加分数(1);
        if (this.PVE子模式 === 'endless' && this.PVE波次 > this.PVE最高波次) {
          this.PVE最高波次 = this.PVE波次;
          this.状态管理器.写入('neonArena.pve.endlessHighestWave', this.PVE最高波次);
        }
        if (this.PVE子模式 === 'levels' && this.PVE关卡 > this.PVE最高关卡) {
          this.PVE最高关卡 = this.PVE关卡;
          this.状态管理器.写入('neonArena.pve.levelsHighestLevel', this.PVE最高关卡);
        }
        this.回合状态 = 'roundOver';
        this.回合结束时间 = performance.now();
        if (this.PVE子模式 === 'endless') {
          this.显示回合提示(t('game.neonArena.pveWaveComplete', { wave: this.PVE波次 }));
        } else {
          this.显示回合提示(t('game.neonArena.pveLevelComplete', { level: this.PVE关卡 }));
        }
        this.更新比分显示();
      } else {
        this.结束游戏();
      }
      return;
    }

    this.回合状态 = 'roundOver';
    this.回合结束时间 = performance.now();
    this.回合比分[this.回合胜者] += 1;
    this.更新比分显示();
    if (this.游戏模式 === 'racing') {
      this.显示回合提示(
        t('game.neonArena.raceRoundWinner', {
          player: t(`game.neonArena.${this.回合胜者}`)
        })
      );
    } else if (this.游戏模式 === 'shooting') {
      this.显示回合提示(
        t('game.neonArena.shootingRoundWinner', {
          player: t(`game.neonArena.${this.回合胜者}`),
          hits: this.游戏配置.射击.命中所需次数
        })
      );
    } else {
      this.显示回合提示(
        t('game.neonArena.roundWinner', {
          player: t(`game.neonArena.${this.回合胜者}`),
          round: this.回合
        })
      );
    }
  }

  更新玩家(玩家, 时间差) {
    if (玩家.生命 <= 0) return;
    const 配置玩家 = this.游戏配置.玩家;
    const 控制 = 玩家.控制;
    const 现在 = performance.now();

    const 时间过载激活 = 现在 < 玩家.时间过载结束时间;
    const 冲刺激活 = 现在 < 玩家.冲刺结束时间;

    let 速度 = 配置玩家.移动速度;
    if (玩家.是AI) 速度 *= 玩家.速度倍数 || 1;
    if (时间过载激活) 速度 *= 1 + this.游戏配置.技能.timeOverload.速度加成;

    let 左 = false;
    let 右 = false;
    let 跳 = false;
    let 蹲 = false;
    let 攻击 = false;

    if (玩家.是AI) {
      左 = 玩家.AI移动方向 < 0;
      右 = 玩家.AI移动方向 > 0;
      跳 = 玩家.AI跳跃标记;
      蹲 = 玩家.AI下蹲标记;
      攻击 = 玩家.AI攻击标记;
      玩家.AI跳跃标记 = false;
      玩家.AI下蹲标记 = false;
      玩家.AI攻击标记 = false;
    } else if (控制) {
      左 = this.键是否按下(控制.左);
      右 = this.键是否按下(控制.右);
      跳 = this.键是否按下(控制.跳);
      蹲 = this.键是否按下(控制.蹲);
      攻击 = this.键是否按下(控制.攻击);
    }

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
      if (!冲刺激活) 玩家.朝向 = -1;
    }
    if (右) {
      输入X += 1;
      if (!冲刺激活) 玩家.朝向 = 1;
    }

    if (冲刺激活) {
      玩家.vx = 玩家.朝向 * (配置玩家.移动速度 * 2.5);
    } else {
      玩家.vx = 输入X * 速度;
    }

    玩家.vy += this.游戏配置.擂台.重力 * 时间差;

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

    const 擂台宽 = this.游戏配置.擂台.宽度;
    const 地面Y = this.游戏配置.擂台.高度 - this.游戏配置.擂台.地面高度;

    if (玩家.y >= 地面Y) {
      玩家.y = 地面Y;
      玩家.vy = 0;
      玩家.grounded = true;
    } else {
      玩家.grounded = false;
    }

    const 半宽 = 玩家.宽度 / 2;
    if (玩家.x < 半宽) {
      玩家.x = 半宽;
      玩家.vx = 0;
    }
    if (玩家.x > 擂台宽 - 半宽) {
      玩家.x = 擂台宽 - 半宽;
      玩家.vx = 0;
    }

    if (玩家.攻击冷却 > 0) {
      let 衰减 = 时间差 * 1000;
      if (时间过载激活 && this.游戏配置.技能.timeOverload.冷却减半) 衰减 *= 2;
      玩家.攻击冷却 -= 衰减;
    }

    if (攻击 && 玩家.攻击冷却 <= 0) {
      this.执行近战攻击(玩家);
      玩家.攻击冷却 = 配置玩家.攻击.冷却;
    }
  }

  更新射击玩家(玩家, 时间差, 时间戳) {
    if (玩家.生命 <= 0) return;
    const 配置玩家 = this.游戏配置.玩家;
    const 控制 = 玩家.控制;
    const 蓄力状态 = this.蓄力状态[玩家.标识];

    let 左 = false;
    let 右 = false;
    let 跳 = false;

    if (玩家.是AI) {
      左 = 玩家.AI移动方向 < 0;
      右 = 玩家.AI移动方向 > 0;
      跳 = 玩家.AI跳跃标记;
      玩家.AI跳跃标记 = false;
    } else if (控制) {
      左 = this.键是否按下(控制.左);
      右 = this.键是否按下(控制.右);
      跳 = this.键是否按下(控制.跳);
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

    const 速度 = 配置玩家.移动速度;
    玩家.vx = 输入X * 速度;
    玩家.vy += this.游戏配置.擂台.重力 * 时间差;

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

    const 擂台宽 = this.游戏配置.擂台.宽度;
    const 地面Y = this.游戏配置.擂台.高度 - this.游戏配置.擂台.地面高度;

    if (玩家.y >= 地面Y) {
      玩家.y = 地面Y;
      玩家.vy = 0;
      玩家.grounded = true;
    } else {
      玩家.grounded = false;
    }

    const 半宽 = 玩家.宽度 / 2;
    if (玩家.x < 半宽) {
      玩家.x = 半宽;
      玩家.vx = 0;
    }
    if (玩家.x > 擂台宽 - 半宽) {
      玩家.x = 擂台宽 - 半宽;
      玩家.vx = 0;
    }

    const 有子弹飞行 = this.子弹列表.some((b) => b.来源 === 玩家.标识);
    let 攻击按下 = false;
    if (玩家.是AI) {
      攻击按下 = 玩家.AI攻击标记;
      玩家.AI攻击标记 = false;
    } else if (控制) {
      攻击按下 = this.键是否按下(控制.攻击);
    }

    if (攻击按下 && !蓄力状态.激活 && !有子弹飞行) {
      蓄力状态.激活 = true;
      蓄力状态.开始时间 = 时间戳;
    }

    if (!攻击按下 && 蓄力状态.激活) {
      const 蓄力时间 = 时间戳 - 蓄力状态.开始时间;
      this.发射子弹(玩家, 蓄力时间);
      蓄力状态.激活 = false;
      蓄力状态.开始时间 = 0;
    }
  }

  发射子弹(玩家, 蓄力时间) {
    const 射击配置 = this.游戏配置.射击;
    const 子弹配置 = 射击配置.子弹;
    const 最大蓄力 = 子弹配置.最大蓄力时间;
    const 蓄力比例 = Math.min(1, Math.max(0, 蓄力时间 / 最大蓄力));
    const 速度 = 子弹配置.初始速度 + (子弹配置.最大速度 - 子弹配置.初始速度) * 蓄力比例;
    const 角度 = 子弹配置.最小角度 + (子弹配置.最大角度 - 子弹配置.最小角度) * 蓄力比例;

    const 偏移X = (玩家.宽度 / 2 + 子弹配置.半径 + 2) * 玩家.朝向;
    const vx = Math.cos(角度) * 速度 * 玩家.朝向;
    const vy = -Math.sin(角度) * 速度;

    this.子弹列表.push({
      x: 玩家.x + 偏移X,
      y: 玩家.y - 玩家.高度 / 2,
      vx,
      vy,
      半径: 子弹配置.半径,
      来源: 玩家.标识,
      伤害: 子弹配置.命中伤害,
      颜色: 子弹配置.颜色,
      创建时间: performance.now()
    });

    this.触发屏幕震动(0.25);
  }

  更新子弹(时间差) {
    const 子弹配置 = this.游戏配置.射击.子弹;
    for (const 子弹 of this.子弹列表) {
      子弹.vy += 子弹配置.重力 * 时间差;
      子弹.x += 子弹.vx * 时间差;
      子弹.y += 子弹.vy * 时间差;
    }

    const 擂台宽 = this.游戏配置.擂台.宽度;
    const 地面Y = this.游戏配置.擂台.高度 - this.游戏配置.擂台.地面高度;
    this.子弹列表 = this.子弹列表.filter((子弹) => {
      return 子弹.x > -20 && 子弹.x < 擂台宽 + 20 && 子弹.y < 地面Y + 20 && 子弹.y > -100;
    });
  }

  检测射击碰撞() {
    const 已移除 = new Set();

    for (let i = 0; i < this.子弹列表.length; i++) {
      if (已移除.has(i)) continue;
      const 子弹 = this.子弹列表[i];
      for (const 玩家 of this.玩家列表) {
        if (玩家.标识 === 子弹.来源 || 玩家.生命 <= 0) continue;
        const px = 玩家.x - 玩家.宽度 / 2;
        const py = 玩家.y - 玩家.高度;
        if (this.圆与矩形相交(子弹.x, 子弹.y, 子弹.半径, px, py, 玩家.宽度, 玩家.高度)) {
          this.伤害玩家(玩家, 子弹.伤害);
          已移除.add(i);
          this.特效列表.push({
            类型: 'hit',
            经过时间: 0,
            持续时间: 250,
            x: 子弹.x,
            y: 子弹.y,
            颜色: 子弹.颜色
          });
          break;
        }
      }
    }

    if (已移除.size > 0) {
      this.子弹列表 = this.子弹列表.filter((_, i) => !已移除.has(i));
    }
  }

  圆与矩形相交(圆x, 圆y, 圆r, rx, ry, rw, rh) {
    const 最近x = Math.max(rx, Math.min(圆x, rx + rw));
    const 最近y = Math.max(ry, Math.min(圆y, ry + rh));
    const dx = 圆x - 最近x;
    const dy = 圆y - 最近y;
    return dx * dx + dy * dy <= 圆r * 圆r;
  }

  获取AI类型配置(标识) {
    return this.游戏配置.AI.类型列表.find((t) => t.标识 === 标识) || this.游戏配置.AI.类型列表[0];
  }

  更新AI(_时间差, 时间戳) {
    const AI = this.玩家列表.find((p) => p.是AI && p.生命 > 0);
    if (!AI) return;
    const 目标 = this.玩家列表.find((p) => p.标识 !== AI.标识 && p.生命 > 0);
    if (!目标) return;

    const AI配置 = this.游戏配置.AI;
    const 个性 = this.获取AI类型配置(AI.AI类型);
    const dx = 目标.x - AI.x;
    const 距离 = Math.abs(dx);
    const 方向 = Math.sign(dx);
    const 生命比例 = AI.生命 / AI.最大生命;
    const 目标生命比例 = 目标.生命 / (目标.最大生命 || this.游戏配置.玩家.最大生命);

    const 反应延迟 = Math.max(
      AI.AI类型 === 'aggressive' ? 30 : AI.AI类型 === 'defensive' ? 60 : AI配置.移动反应延迟,
      AI配置.移动反应延迟 * (AI.反应延迟倍数 || 1)
    );

    if (时间戳 - AI.AI移动目标时间 > 反应延迟) {
      AI.AI移动目标时间 = 时间戳;
      const 最佳距离 = 个性.最佳距离 * (AI.攻击范围倍数 || 1);
      const 追击阈值 = 个性.追击阈值;

      if (生命比例 < 个性.危险生命比例 && 目标生命比例 > 生命比例) {
        AI.AI移动方向 = -方向;
      } else if (距离 > 最佳距离 + 15) {
        AI.AI移动方向 = 距离 < 追击阈值 ? 方向 : 0;
      } else if (距离 < 最佳距离 - 15) {
        AI.AI移动方向 = -方向;
      } else {
        AI.AI移动方向 = 0;
      }

      if (AI.AI类型 === 'aggressive' && 距离 > 追击阈值 * 0.6) {
        AI.AI移动方向 = 方向;
      }
    }

    if (AI.grounded && Math.random() < AI配置.跳跃概率) {
      const 应跳跃 =
        目标.蹲下 ||
        (目标.攻击冷却 > 0 && 距离 < AI配置.攻击范围 * 1.5) ||
        (AI.AI类型 === 'aggressive' && 距离 < 个性.最佳距离);
      if (应跳跃) {
        AI.AI跳跃标记 = true;
      }
    }

    const 攻击范围 = AI配置.攻击范围 * (AI.攻击范围倍数 || 1);
    const 攻击冷却 =
      Math.max(120, AI配置.攻击冷却 * (AI.攻击冷却倍数 || 1)) / (1 + (AI.伤害倍数 - 1) * 0.3);
    if (距离 <= 攻击范围 && 时间戳 - AI.AI最后攻击时间 >= 攻击冷却) {
      AI.AI攻击标记 = true;
      AI.AI最后攻击时间 = 时间戳;
    }

    const 技能间隔 = Math.max(500, AI配置.技能随机间隔 * (AI.技能间隔倍数 || 1)) / 个性.技能频率;
    if (时间戳 - AI.AI最后技能时间 >= 技能间隔) {
      AI.AI最后技能时间 = 时间戳;
      this.AI尝试使用技能(AI, 目标, 距离, 个性);
    }
  }

  AI尝试使用技能(AI, 目标, 距离, 个性) {
    const 现在 = performance.now();
    const 技能列表 = Object.values(this.游戏配置.技能);
    const 生命比例 = AI.生命 / AI.最大生命;
    const 目标生命比例 = 目标.生命 / (目标.最大生命 || this.游戏配置.玩家.最大生命);

    const 可用技能 = 技能列表.filter((技能) => {
      const 状态 = AI.技能状态[技能.标识];
      return AI.能量 >= 技能.消耗 && 现在 - 状态.最后使用时间 >= 技能.冷却;
    });

    if (可用技能.length === 0) return;

    const 紧急防御 = 生命比例 < 个性.危险生命比例 && 目标.攻击冷却 <= 0;
    if (紧急防御 && 生命比例 < 0.35 && Math.random() < 个性.防御欲望 * 0.8) {
      const 有护盾 = 可用技能.find((s) => s.标识 === 'shield');
      if (有护盾) {
        this.尝试使用技能(AI, 'shield');
        return;
      }
    }

    const 技能权重 = 可用技能.map((技能) => {
      let 权重 = 1;
      switch (技能.标识) {
        case 'dash':
          if (距离 > 100 && AI.AI类型 !== 'defensive') 权重 = 3;
          if (距离 < 70 && 生命比例 < 0.4) 权重 = 2.5;
          if (AI.AI类型 === 'aggressive') 权重 *= 1.5;
          break;
        case 'shockwave':
          if (距离 <= 技能.半径 * 0.85) 权重 = 4;
          if (AI.AI类型 === 'defensive' && 距离 < 90) 权重 = 3;
          break;
        case 'timeOverload':
          if (距离 > 80 && 距离 < 200) 权重 = 2.5;
          if (目标生命比例 < 0.4 && AI.AI类型 === 'aggressive') 权重 = 3.5;
          break;
        case 'shield':
          if (生命比例 < 0.45 || (距离 < 70 && 目标.攻击冷却 <= 0)) 权重 = 3;
          if (AI.AI类型 === 'defensive') 权重 *= 1.6;
          break;
        default:
          break;
      }
      return { 技能, 权重 };
    });

    const 总权重 = 技能权重.reduce((sum, item) => sum + item.权重, 0);
    let 随机 = Math.random() * 总权重;
    for (const item of 技能权重) {
      随机 -= item.权重;
      if (随机 <= 0) {
        this.尝试使用技能(AI, item.技能.标识);
        return;
      }
    }
  }

  更新射击AI(_时间差, 时间戳) {
    const AI = this.玩家列表.find((p) => p.是AI && p.生命 > 0);
    if (!AI) return;
    const 目标 = this.玩家列表.find((p) => p.标识 !== AI.标识 && p.生命 > 0);
    if (!目标) return;

    const dx = 目标.x - AI.x;
    const 距离 = Math.abs(dx);
    const 方向 = Math.sign(dx);
    const 蓄力状态 = this.蓄力状态[AI.标识];
    const 有子弹飞行 = this.子弹列表.some((b) => b.来源 === AI.标识);

    if (蓄力状态.激活) {
      AI.AI移动方向 = 0;
      if (时间戳 - 蓄力状态.开始时间 >= 400 + Math.random() * 700) {
        AI.AI攻击标记 = true;
      }
      return;
    }

    if (有子弹飞行) {
      AI.AI移动方向 = 0;
      return;
    }

    if (时间戳 - AI.AI最后攻击时间 >= 1200 + Math.random() * 1400) {
      AI.AI最后攻击时间 = 时间戳;
      if (距离 > 120) {
        AI.AI移动方向 = 方向;
      } else if (距离 < 80) {
        AI.AI移动方向 = -方向;
      } else {
        AI.AI移动方向 = 0;
        AI.AI攻击标记 = true;
      }
    } else {
      if (距离 > 160) {
        AI.AI移动方向 = 方向;
      } else if (距离 < 60) {
        AI.AI移动方向 = -方向;
      } else {
        AI.AI移动方向 = 0;
      }
    }

    if (AI.grounded && Math.random() < 0.08) {
      AI.AI跳跃标记 = true;
    }
  }

  生成竞速障碍() {
    const 配置 = this.游戏配置.竞速;
    const 地面Y = this.游戏配置.擂台.高度 - this.游戏配置.擂台.地面高度;
    let x = 300;
    this.障碍列表 = [];
    while (x < 配置.赛道长度 - 200) {
      const 间距 = 配置.障碍间距最小 + Math.random() * (配置.障碍间距最大 - 配置.障碍间距最小);
      x += 间距;
      const r = Math.random();
      if (r < 0.33) {
        this.障碍列表.push({
          类型: 'low',
          x,
          y: 地面Y - 配置.激光高度,
          宽度: 配置.激光宽度,
          高度: 配置.激光高度
        });
      } else if (r < 0.66) {
        this.障碍列表.push({
          类型: 'high',
          x,
          y: 地面Y - 配置.高激光底部Y,
          宽度: 配置.激光宽度,
          高度: 配置.高激光高度
        });
      } else {
        this.障碍列表.push({ 类型: 'mine', x, y: 地面Y - 配置.地雷半径, 半径: 配置.地雷半径 });
      }
    }
  }

  更新竞速玩家(玩家, 时间差) {
    if (玩家.生命 <= 0) return;
    const 竞速配置 = this.游戏配置.竞速;
    const 配置玩家 = this.游戏配置.玩家;
    const 控制 = 玩家.控制;
    const 现在 = performance.now();
    const 时间过载激活 = 现在 < 玩家.时间过载结束时间;
    const 冲刺激活 = 现在 < 玩家.冲刺结束时间;
    const 眩晕 = 现在 < 玩家.眩晕结束时间;

    let 速度 = 竞速配置.移动速度;
    if (时间过载激活) 速度 *= 1 + 竞速配置.技能.timeOverload.速度加成;

    let 左 = false;
    let 右 = false;
    let 跳 = false;
    let 蹲 = false;

    if (玩家.是AI) {
      左 = 玩家.AI移动方向 < 0;
      右 = 玩家.AI移动方向 > 0;
      跳 = 玩家.AI跳跃标记;
      蹲 = 玩家.AI下蹲标记;
      玩家.AI跳跃标记 = false;
      玩家.AI下蹲标记 = false;
    } else if (控制 && !眩晕) {
      左 = this.键是否按下(控制.左);
      右 = this.键是否按下(控制.右);
      跳 = this.键是否按下(控制.跳);
      蹲 = this.键是否按下(控制.蹲);
    }

    if (蹲 && 玩家.grounded) {
      速度 *= 竞速配置.下蹲速度系数;
      玩家.蹲下 = true;
      玩家.高度 = 配置玩家.蹲下高度;
    } else {
      玩家.蹲下 = false;
      玩家.高度 = 配置玩家.高度;
    }

    let 输入X = 0;
    if (右) 输入X += 1;
    if (左) 输入X -= 1;

    if (冲刺激活) {
      玩家.vx = Math.max(玩家.vx, 竞速配置.移动速度 * 1.5);
    } else {
      玩家.vx = 输入X * 速度;
    }

    玩家.vy += 竞速配置.重力 * 时间差;

    if (跳 && !眩晕) {
      if (!玩家.跳跃按下 && 玩家.grounded) {
        玩家.vy = -竞速配置.跳跃速度;
        玩家.grounded = false;
      }
      玩家.跳跃按下 = true;
    } else {
      玩家.跳跃按下 = false;
    }

    玩家.x += 玩家.vx * 时间差;
    玩家.y += 玩家.vy * 时间差;

    const 地面Y = this.游戏配置.擂台.高度 - this.游戏配置.擂台.地面高度;
    if (玩家.y >= 地面Y) {
      玩家.y = 地面Y;
      玩家.vy = 0;
      玩家.grounded = true;
    } else {
      玩家.grounded = false;
    }

    const 半宽 = 玩家.宽度 / 2;
    const 最大X = 竞速配置.赛道长度 + 半宽;
    if (玩家.x < 半宽) {
      玩家.x = 半宽;
      玩家.vx = 0;
    }
    if (玩家.x > 最大X) {
      玩家.x = 最大X;
      玩家.vx = 0;
    }
  }

  更新竞速AI(_时间差, 时间戳) {
    const AI = this.玩家列表.find((p) => p.是AI && p.生命 > 0);
    if (!AI) return;
    const 对手 = this.玩家列表.find((p) => p.标识 !== AI.标识 && p.生命 > 0);
    const 竞速配置 = this.游戏配置.竞速;

    AI.AI移动方向 = 1;

    const 前方障碍 = this.障碍列表
      .filter((o) => o.x > AI.x && o.x - AI.x < 160)
      .sort((a, b) => a.x - b.x)[0];

    if (前方障碍 && AI.grounded) {
      if (前方障碍.类型 === 'high') {
        AI.AI下蹲标记 = true;
        AI.AI跳跃标记 = false;
      } else {
        AI.AI下蹲标记 = false;
        AI.AI跳跃标记 = true;
      }
    } else {
      AI.AI下蹲标记 = false;
      AI.AI跳跃标记 = false;
    }

    if (时间戳 - AI.AI最后技能时间 >= 1400) {
      AI.AI最后技能时间 = 时间戳;
      const 现在 = performance.now();
      const 可用技能 = Object.values(this.游戏配置.技能).filter((技能) => {
        const 状态 = AI.技能状态[技能.标识];
        return AI.能量 >= 技能.消耗 && 现在 - 状态.最后使用时间 >= 技能.冷却;
      });
      if (可用技能.length > 0) {
        const 技能 = 可用技能[Math.floor(Math.random() * 可用技能.length)];
        if (技能.标识 === 'dash' && 前方障碍 && 前方障碍.x - AI.x < 100) {
          this.尝试使用技能(AI, 'dash');
        } else if (技能.标识 === 'timeOverload') {
          this.尝试使用技能(AI, 'timeOverload');
        } else if (
          技能.标识 === 'shockwave' &&
          对手 &&
          对手.x - AI.x < 竞速配置.技能.shockwave.半径
        ) {
          this.尝试使用技能(AI, 'shockwave');
        } else if (技能.标识 === 'shield' && 前方障碍 && 前方障碍.x - AI.x < 80) {
          this.尝试使用技能(AI, 'shield');
        }
      }
    }
  }

  玩家与障碍相交(玩家, 障碍) {
    if (障碍.类型 === 'mine') {
      const dx = 玩家.x - 障碍.x;
      const dy = 玩家.y - 玩家.高度 / 2 - 障碍.y;
      const r = 障碍.半径 + Math.max(玩家.宽度, 玩家.高度) / 2;
      return dx * dx + dy * dy <= r * r;
    }
    const px = 玩家.x - 玩家.宽度 / 2;
    const py = 玩家.y - 玩家.高度;
    return this.矩形相交(
      px,
      py,
      玩家.宽度,
      玩家.高度,
      障碍.x - 障碍.宽度 / 2,
      障碍.y,
      障碍.宽度,
      障碍.高度
    );
  }

  检测竞速碰撞() {
    const 现在 = performance.now();
    const 竞速配置 = this.游戏配置.竞速;

    for (const 特效 of this.特效列表) {
      if (特效.类型 === 'shockwave' && !特效.已触发) {
        特效.已触发 = true;
        for (const 玩家 of this.玩家列表) {
          if (玩家.标识 === 特效.来源 || 玩家.生命 <= 0) continue;
          const dx = 玩家.x - 特效.x;
          const dy = 玩家.y - 玩家.高度 / 2 - 特效.y;
          if (Math.sqrt(dx * dx + dy * dy) <= 特效.半径) {
            玩家.眩晕结束时间 = 现在 + 特效.眩晕;
            const 击退方向 = Math.sign(dx) || 1;
            玩家.x -= 击退方向 * 特效.击退;
            const 半宽 = 玩家.宽度 / 2;
            玩家.x = Math.max(半宽, 玩家.x);
            this.触发屏幕震动(0.5);
          }
        }
      }
    }

    for (const 玩家 of this.玩家列表) {
      if (玩家.生命 <= 0) continue;
      if (现在 < 玩家.冲刺结束时间 || 现在 < 玩家.护盾结束时间) continue;
      for (const 障碍 of this.障碍列表) {
        if (this.玩家与障碍相交(玩家, 障碍)) {
          if (障碍.类型 === 'mine') {
            玩家.眩晕结束时间 = 现在 + 竞速配置.障碍效果.地雷眩晕;
          } else {
            玩家.眩晕结束时间 = 现在 + 竞速配置.障碍效果.激光眩晕;
            玩家.x -= 竞速配置.障碍效果.激光击退;
          }
          this.触发屏幕震动(0.4);
          this.特效列表.push({
            类型: 'hit',
            经过时间: 0,
            持续时间: 250,
            x: 障碍.x,
            y: 障碍.y,
            颜色: 配置.颜色.霓虹粉
          });
          break;
        }
      }
    }
  }

  更新竞速相机() {
    const 竞速配置 = this.游戏配置.竞速;
    const 擂台宽 = this.游戏配置.擂台.宽度;
    const 最大X = Math.max(0, 竞速配置.赛道长度 - 擂台宽);

    let 目标X;
    if (this.当前模式 === 'single') {
      const P1 = this.玩家列表.find((p) => p.标识 === 'player1');
      if (!P1) return;
      目标X = P1.x - 擂台宽 / 2;
    } else {
      const 领先者 = this.玩家列表.slice().sort((a, b) => b.x - a.x)[0];
      if (!领先者) return;
      目标X = Math.max(0, 领先者.x - 擂台宽 * 竞速配置.相机.领先比例);
    }

    const 目标 = Math.max(0, Math.min(目标X, 最大X));
    if (this.当前模式 === 'single') {
      this.相机.x = 目标;
    } else {
      this.相机.x += (目标 - this.相机.x) * 竞速配置.相机.平滑系数;
    }
  }

  执行近战攻击(玩家) {
    const 配置攻击 = this.游戏配置.玩家.攻击;
    const 中心X = 玩家.x + 玩家.朝向 * 配置攻击.偏移X;
    const 中心Y = 玩家.y - 玩家.高度 / 2 + 配置攻击.偏移Y;
    const 半宽 = 配置攻击.宽度 / 2;
    const 半高 = 配置攻击.高度 / 2;

    const 命中框 = {
      x: 中心X - 半宽,
      y: 中心Y - 半高,
      宽度: 配置攻击.宽度,
      高度: 配置攻击.高度,
      来源: 玩家.标识,
      伤害: 配置攻击.伤害,
      伤害倍数: 玩家.伤害倍数 || 1
    };

    this.特效列表.push({
      类型: 'melee',
      经过时间: 0,
      持续时间: 150,
      x: 中心X,
      y: 中心Y,
      宽度: 配置攻击.宽度,
      高度: 配置攻击.高度,
      颜色: 配置攻击.颜色,
      方向: 玩家.朝向,
      命中框,
      已触发: false
    });

    this.触发屏幕震动(0.5);
  }

  使用霓虹冲刺(玩家) {
    const 是竞速 = this.游戏模式 === 'racing';
    const 技能 = 是竞速 ? this.游戏配置.竞速.技能.dash : this.游戏配置.技能.dash;
    const 现在 = performance.now();
    玩家.冲刺结束时间 = 现在 + 技能.持续时间;

    const 方向 = 是竞速 ? 1 : 玩家.朝向;
    const 目标X = 玩家.x + 方向 * 技能.距离;
    const 半宽 = 玩家.宽度 / 2;
    const 最大X = 是竞速 ? this.游戏配置.竞速.赛道长度 + 半宽 : this.游戏配置.擂台.宽度 - 半宽;
    玩家.x = Math.max(半宽, Math.min(最大X, 目标X));
    if (是竞速) {
      玩家.vx = 方向 * (this.游戏配置.竞速.移动速度 * 2);
    }

    this.特效列表.push({
      类型: 'dash',
      经过时间: 0,
      持续时间: 300,
      x: 玩家.x,
      y: 玩家.y - 玩家.高度 / 2,
      朝向: 方向,
      颜色: this.游戏配置.技能.dash.颜色
    });
  }

  使用能量护盾(玩家) {
    const 技能 =
      this.游戏模式 === 'racing' ? this.游戏配置.竞速.技能.shield : this.游戏配置.技能.shield;
    玩家.护盾结束时间 = performance.now() + 技能.持续时间;
  }

  使用震荡波(玩家) {
    const 是竞速 = this.游戏模式 === 'racing';
    const 技能 = 是竞速 ? this.游戏配置.竞速.技能.shockwave : this.游戏配置.技能.shockwave;
    this.特效列表.push({
      类型: 'shockwave',
      经过时间: 0,
      持续时间: 400,
      x: 玩家.x,
      y: 玩家.y - 玩家.高度 / 2,
      半径: 技能.半径,
      伤害: 是竞速 ? 0 : 技能.伤害,
      伤害倍数: 玩家.伤害倍数 || 1,
      击退: 是竞速 ? 技能.击退 : 技能.击退,
      眩晕: 是竞速 ? 技能.眩晕 : 0,
      来源: 玩家.标识,
      颜色: this.游戏配置.技能.shockwave.颜色,
      已触发: false
    });
    this.触发屏幕震动();
  }

  使用时间过载(玩家) {
    const 技能 =
      this.游戏模式 === 'racing'
        ? this.游戏配置.竞速.技能.timeOverload
        : this.游戏配置.技能.timeOverload;
    玩家.时间过载结束时间 = performance.now() + 技能.持续时间;
  }

  尝试使用技能(玩家, 技能标识) {
    if (!this.运行中 || this.已暂停 || this.回合状态 !== 'fighting') return;
    const 技能 = this.游戏配置.技能[技能标识];
    if (!技能) return;

    const 现在 = performance.now();
    if (现在 < 玩家.眩晕结束时间) return;

    const 状态 = 玩家.技能状态[技能标识];
    if (现在 - 状态.最后使用时间 < 技能.冷却) return;
    if (玩家.能量 < 技能.消耗) return;

    玩家.能量 = Math.max(0, 玩家.能量 - 技能.消耗);
    状态.最后使用时间 = 现在;

    switch (技能标识) {
      case 'dash':
        this.使用霓虹冲刺(玩家);
        break;
      case 'shield':
        this.使用能量护盾(玩家);
        break;
      case 'shockwave':
        this.使用震荡波(玩家);
        break;
      case 'timeOverload':
        this.使用时间过载(玩家);
        break;
    }
  }

  检测碰撞() {

    for (const 特效 of this.特效列表) {
      if (特效.类型 === 'melee' && !特效.已触发) {
        特效.已触发 = true;
        for (const 玩家 of this.玩家列表) {
          if (玩家.标识 === 特效.命中框.来源 || 玩家.生命 <= 0) continue;
          if (
            this.矩形相交(
              特效.命中框.x,
              特效.命中框.y,
              特效.命中框.宽度,
              特效.命中框.高度,
              玩家.x - 玩家.宽度 / 2,
              玩家.y - 玩家.高度,
              玩家.宽度,
              玩家.高度
            )
          ) {
            const 来源 = this.玩家列表.find((p) => p.标识 === 特效.命中框.来源);
            this.伤害玩家(玩家, 特效.命中框.伤害, 来源, 特效.命中框.伤害倍数 || 1);
          }
        }
      }

      if (特效.类型 === 'shockwave' && !特效.已触发) {
        特效.已触发 = true;
        for (const 玩家 of this.玩家列表) {
          if (玩家.标识 === 特效.来源 || 玩家.生命 <= 0) continue;
          const dx = 玩家.x - 特效.x;
          const dy = 玩家.y - 玩家.高度 / 2 - 特效.y;
          if (Math.sqrt(dx * dx + dy * dy) <= 特效.半径) {
            const 来源玩家 = this.玩家列表.find((p) => p.标识 === 特效.来源);
            const 伤害倍数 = 来源玩家 ? 来源玩家.伤害倍数 || 1 : 特效.伤害倍数 || 1;
            this.伤害玩家(玩家, 特效.伤害, 来源玩家, 伤害倍数);
            const 击退方向 = Math.sign(dx) || 1;
            玩家.x += 击退方向 * 特效.击退;
            const 擂台宽 = this.游戏配置.擂台.宽度;
            const 半宽 = 玩家.宽度 / 2;
            玩家.x = Math.max(半宽, Math.min(擂台宽 - 半宽, 玩家.x));
          }
        }
      }
    }

    for (const 玩家 of this.玩家列表) {
      if (玩家.生命 <= 0) continue;
      if (performance.now() < 玩家.冲刺结束时间) continue;
      for (const 其他玩家 of this.玩家列表) {
        if (其他玩家 === 玩家 || 其他玩家.生命 <= 0) continue;
        if (performance.now() < 其他玩家.冲刺结束时间) continue;
        if (
          this.矩形相交(
            玩家.x - 玩家.宽度 / 2,
            玩家.y - 玩家.高度,
            玩家.宽度,
            玩家.高度,
            其他玩家.x - 其他玩家.宽度 / 2,
            其他玩家.y - 其他玩家.高度,
            其他玩家.宽度,
            其他玩家.高度
          )
        ) {
          if (玩家.x < 其他玩家.x) {
            玩家.x -= 2;
            其他玩家.x += 2;
          } else {
            玩家.x += 2;
            其他玩家.x -= 2;
          }
        }
      }
    }
  }

  伤害玩家(玩家, 伤害, 来源玩家, 伤害倍数 = 1) {
    if (玩家.生命 <= 0) return;
    if (performance.now() < 玩家.护盾结束时间) return;
    if (performance.now() < 玩家.冲刺结束时间) return;
    const 实际伤害 = Math.round(伤害 * 伤害倍数);
    玩家.生命 -= 实际伤害;
    this.触发屏幕震动(1.4);
    this.顿帧 = 70;
    const 现在 = performance.now();
    if (现在 < this.连击.结束时间) this.连击.次数 += 1;
    else this.连击.次数 = 1;
    this.连击.结束时间 = 现在 + 1500;
    this.生成火花(玩家.x, 玩家.y - 玩家.高度 * 0.55, 玩家.颜色, 实际伤害 >= 25 ? 16 : 10);
    this.特效列表.push({
      类型: 'damage',
      经过时间: 0,
      持续时间: 850,
      x: 玩家.x,
      y: 玩家.y - 玩家.高度 * 0.7,
      数值: 实际伤害,
      颜色: 玩家.颜色,
      暴击: 实际伤害 >= 25
    });
    if (玩家.生命 <= 0) {
      玩家.生命 = 0;
      this.触发KO演出(玩家, 来源玩家);
    }
  }

  生成火花(x, y, 颜色, 数量) {
    for (let i = 0; i < 数量; i++) {
      const 角度 = Math.random() * Math.PI * 2;
      const 速度 = 80 + Math.random() * 260;
      this.特效列表.push({
        类型: 'spark',
        经过时间: 0,
        持续时间: 280 + Math.random() * 260,
        x,
        y,
        颜色,
        大小: 1.5 + Math.random() * 2.5,
        vx: Math.cos(角度) * 速度,
        vy: Math.sin(角度) * 速度 - 60
      });
    }
  }

  触发KO演出(败者, 胜者) {
    const 现在 = performance.now();
    this.KO演出 = {
      结束时间: 现在 + 2400,
      开始时间: 现在,
      败者,
      胜者: 胜者 || this.玩家列表.find((p) => p !== 败者 && p.生命 > 0) || null
    };
    this.时间缩放 = 0.18;
    this.顿帧 = 120;
    this.触发屏幕震动(2.4);
    this.生成火花(败者.x, 败者.y - 败者.高度 * 0.5, 配置.颜色.霓虹黄, 40);
    this.特效列表.push({
      类型: 'explosion',
      经过时间: 0,
      持续时间: 700,
      x: 败者.x,
      y: 败者.y - 败者.高度 * 0.5,
      颜色: 配置.颜色.霓虹黄,
      半径: 败者.宽度 * 2.4
    });
  }

  更新特效(时间差) {
    this.特效列表 = this.特效列表.filter((特效) => {
      特效.经过时间 += 时间差 * 1000;
      if (特效.类型 === 'shockwave') {
        const 进度 = 特效.经过时间 / 特效.持续时间;
        特效.当前半径 = 特效.半径 * Math.min(1, 进度 * 1.5);
      } else if (特效.类型 === 'spark') {
        特效.x += 特效.vx * 时间差;
        特效.y += 特效.vy * 时间差;
        特效.vy += 520 * 时间差;
        特效.vx *= 0.95;
      } else if (特效.类型 === 'explosion') {
        const 进度 = 特效.经过时间 / 特效.持续时间;
        特效.当前半径 = 特效.半径 * Math.min(1, 进度 * 2.2);
      }
      return 特效.经过时间 < 特效.持续时间;
    });
  }

  更新能量恢复(时间差) {
    const 配置玩家 = this.游戏配置.玩家;
    this.玩家列表.forEach((玩家) => {
      if (玩家.生命 <= 0) return;
      if (玩家.能量 < 配置玩家.最大能量) {
        const 恢复倍数 = 玩家.是AI ? 玩家.能量恢复倍数 || 1 : 1;
        玩家.能量 = Math.min(
          配置玩家.最大能量,
          玩家.能量 + 配置玩家.能量恢复每秒 * 恢复倍数 * 时间差
        );
      }
    });
  }

  更新屏幕震动(系数 = 1) {
    if (this.屏幕震动.强度 <= 0.1) {
      this.屏幕震动.x = 0;
      this.屏幕震动.y = 0;
      this.屏幕震动.强度 = 0;
      return;
    }
    const 角度 = Math.random() * Math.PI * 2;
    const 最大偏移 = this.游戏配置.屏幕震动.最大偏移 * 系数;
    this.屏幕震动.x = Math.cos(角度) * Math.min(this.屏幕震动.强度, 最大偏移);
    this.屏幕震动.y = Math.sin(角度) * Math.min(this.屏幕震动.强度, 最大偏移);
    this.屏幕震动.强度 *= this.游戏配置.屏幕震动.衰减;
  }

  应用屏幕震动() {
    if (this.屏幕震动.强度 > 0) {
      this.上下文.translate(this.屏幕震动.x, this.屏幕震动.y);
    }
  }

  触发屏幕震动(系数 = 1) {
    this.屏幕震动.强度 = this.游戏配置.屏幕震动.强度 * 系数;
  }

  处理键盘按下(e) {
    this.键盘状态[e.key] = true;
    if (this.是游戏键(e.key)) {
      e.preventDefault();
    }
    if (!this.运行中 || this.已暂停 || this.回合状态 !== 'fighting') return;

    for (const 玩家 of this.玩家列表) {
      if (玩家.是AI || 玩家.生命 <= 0 || !玩家.控制) continue;
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

  获取玩家技能首键(玩家, 技能标识) {
    const 列表 = 玩家.控制?.技能[技能标识];
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

  绘制擂台() {
    const 擂台宽 = this.游戏配置.擂台.宽度;
    const 擂台高 = this.游戏配置.擂台.高度;
    const 左上 = this.世界到屏幕({ x: 0, y: 0 });
    const 右下 = this.世界到屏幕({ x: 擂台宽, y: 擂台高 });
    const 宽 = 右下.x - 左上.x;
    const 高 = 右下.y - 左上.y;
    const 地面Y = this.游戏配置.擂台.高度 - this.游戏配置.擂台.地面高度;
    const 地面点 = this.世界到屏幕({ x: 0, y: 地面Y });

    this.上下文.save();

    // 渐变夜空背景
    const 天空 = this.上下文.createLinearGradient(左上.x, 左上.y, 左上.x, 右下.y);
    天空.addColorStop(0, 'rgba(28, 8, 54, 0.55)');
    天空.addColorStop(0.45, 'rgba(10, 6, 32, 0.5)');
    天空.addColorStop(1, 'rgba(2, 2, 12, 0.6)');
    this.上下文.fillStyle = 天空;
    this.上下文.fillRect(左上.x, 左上.y, 宽, 高);

    // 视差霓虹天际线
    this.绘制天际线(左上.x, 左上.y, 宽, 地面点.y - 左上.y);

    // 透视地板网格
    this.绘制透视地板(左上.x, 地面点.y, 宽, 右下.y - 地面点.y);

    // 擂台边框
    this.上下文.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    this.上下文.lineWidth = 2;
    this.上下文.shadowBlur = 15;
    this.上下文.shadowColor = 配置.颜色.霓虹青;
    this.上下文.strokeRect(左上.x, 左上.y, 宽, 高);
    this.上下文.shadowBlur = 0;

    // 地面发光线
    this.上下文.strokeStyle = 配置.颜色.霓虹青;
    this.上下文.lineWidth = 2;
    this.上下文.shadowBlur = 14;
    this.上下文.shadowColor = 配置.颜色.霓虹青;
    this.上下文.beginPath();
    this.上下文.moveTo(左上.x, 地面点.y);
    this.上下文.lineTo(左上.x + 宽, 地面点.y);
    this.上下文.stroke();
    this.上下文.shadowBlur = 0;

    this.上下文.restore();
  }

  绘制天际线(左, 上, 宽, 高) {
    if (!this.天际线) {
      const 霓虹 = [配置.颜色.霓虹青, 配置.颜色.霓虹粉, 配置.颜色.霓虹紫];
      let 种子 = 1337;
      const 随机 = () => {
        种子 = (种子 * 1103515245 + 12345) & 0x7fffffff;
        return 种子 / 0x7fffffff;
      };
      const 楼 = [];
      let x = 0;
      while (x < 100) {
        const w = 4 + 随机() * 7;
        const h = 18 + 随机() * 60;
        楼.push({ x, w, h, c: 霓虹[Math.floor(随机() * 霓虹.length)], win: 随机() > 0.4 });
        x += w + 1 + 随机() * 3;
      }
      this.天际线 = 楼;
    }
    const ctx = this.上下文;
    const 视差 = (this.赛博时间 * 0.004) % 12;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let 层 = 0; 层 < 2; 层++) {
      const 缩放 = 层 === 0 ? 0.7 : 1;
      const 偏移 = 层 === 0 ? 视差 * 0.4 : 视差;
      const 底 = 上 + 高 * (层 === 0 ? 0.92 : 1);
      const 亮 = 层 === 0 ? 0.18 : 0.32;
      ctx.globalAlpha = 亮;
      for (const b of this.天际线) {
        const bx = 左 + ((b.x - 偏移) % 100) * (宽 / 100) * 缩放;
        if (bx < 左 - 20 || bx > 左 + 宽 + 20) continue;
        const bh = b.h * 缩放 * (高 / 80);
        ctx.fillStyle = 'rgba(8, 6, 26, 0.9)';
        ctx.fillRect(bx, 底 - bh, b.w * (宽 / 100) * 缩放, bh);
        ctx.strokeStyle = b.c;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 8;
        ctx.shadowColor = b.c;
        ctx.strokeRect(bx, 底 - bh, b.w * (宽 / 100) * 缩放, bh);
        if (b.win) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = b.c;
          for (let wy = 底 - bh + 4; wy < 底 - 4; wy += 6) {
            if ((wy | 0) % 12 < 6)
              ctx.fillRect(bx + 2, wy, Math.max(1, b.w * (宽 / 100) * 缩放 - 4), 2);
          }
        }
      }
    }
    ctx.restore();
  }

  绘制透视地板(左, 上, 宽, 高) {
    const ctx = this.上下文;
    const 消失点X = 左 + 宽 / 2;
    const 消失点Y = 上 - 高 * 0.55;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 6;
    ctx.shadowColor = 配置.颜色.霓虹青;
    // 纵向汇聚线
    const 列数 = 14;
    for (let i = 0; i <= 列数; i++) {
      const fx = 左 + (宽 * i) / 列数;
      ctx.beginPath();
      ctx.moveTo(fx, 上 + 高);
      ctx.lineTo(消失点X, 消失点Y);
      ctx.stroke();
    }
    // 横向递进线（越近越疏）
    const 行数 = 9;
    for (let i = 1; i <= 行数; i++) {
      const t = i / 行数;
      const y = 上 + 高 * (t * t);
      ctx.globalAlpha = 0.25 * (1 - t * 0.4);
      ctx.beginPath();
      ctx.moveTo(左, y);
      ctx.lineTo(左 + 宽, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  绘制赛博氛围(css宽, css高) {
    const ctx = this.上下文;

    // 浮尘粒子（缓慢上浮）
    if (!this.浮尘) {
      this.浮尘 = [];
      for (let i = 0; i < 36; i++) {
        this.浮尘.push({
          x: Math.random() * css宽,
          y: Math.random() * css高,
          r: 0.6 + Math.random() * 1.8,
          s: 6 + Math.random() * 18,
          a: 0.1 + Math.random() * 0.3
        });
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.浮尘) {
      p.y -= p.s * 0.016;
      p.x += Math.sin((this.赛博时间 + p.y) / 600) * 0.3;
      if (p.y < -4) {
        p.y = css高 + 4;
        p.x = Math.random() * css宽;
      }
      ctx.globalAlpha = p.a;
      ctx.fillStyle = 配置.颜色.霓虹青;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 横向扫光
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const 扫光X = ((this.赛博时间 * 0.06) % (css宽 + 240)) - 120;
    const 扫光 = ctx.createLinearGradient(扫光X - 120, 0, 扫光X + 120, 0);
    扫光.addColorStop(0, 'rgba(0,240,255,0)');
    扫光.addColorStop(0.5, 'rgba(0,240,255,0.06)');
    扫光.addColorStop(1, 'rgba(0,240,255,0)');
    ctx.fillStyle = 扫光;
    ctx.fillRect(0, 0, css宽, css高);
    ctx.restore();

    // 扫描线
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#000';
    for (let y = 0; y < css高; y += 3) {
      ctx.fillRect(0, y, css宽, 1);
    }
    ctx.restore();

    // 暗角
    ctx.save();
    const 暗角 = ctx.createRadialGradient(
      css宽 / 2,
      css高 / 2,
      Math.min(css宽, css高) * 0.3,
      css宽 / 2,
      css高 / 2,
      Math.max(css宽, css高) * 0.72
    );
    暗角.addColorStop(0, 'rgba(0,0,0,0)');
    暗角.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = 暗角;
    ctx.fillRect(0, 0, css宽, css高);
    ctx.restore();
  }

  绘制连击HUD(css宽, css高) {
    const 现在 = performance.now();
    if (this.连击.次数 < 2 || 现在 > this.连击.结束时间) return;
    const 剩余 = (this.连击.结束时间 - 现在) / 1500;
    const ctx = this.上下文;
    const 弹 = 1 + Math.sin(this.赛博时间 / 60) * 0.04;
    ctx.save();
    ctx.translate(css宽 / 2, css高 * 0.26);
    ctx.scale(弹, 弹);
    ctx.textAlign = 'center';
    ctx.globalCompositeOperation = 'lighter';
    ctx.font = `bold ${Math.round(40 * this.缩放比)}px "Orbitron", sans-serif`;
    ctx.shadowBlur = 24;
    ctx.shadowColor = 配置.颜色.霓虹粉;
    ctx.fillStyle = 配置.颜色.霓虹粉;
    ctx.globalAlpha = Math.min(1, 剩余 * 2);
    ctx.fillText(`${this.连击.次数} 连击`, 0, 0);
    ctx.restore();
  }

  绘制KO演出(css宽, css高) {
    const 现在 = performance.now();
    if (!this.KO演出) return;
    if (现在 > this.KO演出.结束时间) {
      this.KO演出 = null;
      return;
    }
    const p = (现在 - this.KO演出.开始时间) / (this.KO演出.结束时间 - this.KO演出.开始时间);
    const ctx = this.上下文;
    const 胜者色 = this.KO演出.胜者 ? this.KO演出.胜者.颜色 : 配置.颜色.霓虹黄;
    ctx.save();
    ctx.globalAlpha = Math.min(0.55, p * 2) * 0.6;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, css宽, css高);
    ctx.globalAlpha = 1;
    const 弹入 = p < 0.3 ? 0.4 + 0.6 * (p / 0.3) : 1 + Math.sin((p - 0.3) * 8) * 0.02;
    ctx.translate(css宽 / 2, css高 * 0.42);
    ctx.scale(弹入, 弹入);
    ctx.textAlign = 'center';
    ctx.globalCompositeOperation = 'lighter';
    ctx.font = `bold ${Math.round(120 * this.缩放比)}px "Orbitron", sans-serif`;
    ctx.shadowBlur = 40;
    ctx.shadowColor = 胜者色;
    ctx.fillStyle = 胜者色;
    ctx.fillText('K.O.', 0, 0);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.9;
    ctx.strokeText('K.O.', 0, 0);
    ctx.restore();
  }

  绘制玩家() {
    const 现在 = performance.now();
    for (const 玩家 of this.玩家列表) {
      if (玩家.生命 <= 0) continue;
      const 屏幕点 = this.世界到屏幕({ x: 玩家.x, y: 玩家.y });
      const 放大 = 1.8;
      const 宽 = 玩家.宽度 * this.缩放比 * 放大;
      const 高 = 玩家.高度 * this.缩放比 * 放大;
      const 中心Y = 屏幕点.y - 高 / 2;
      const 护盾激活 = 现在 < 玩家.护盾结束时间;
      const 冲刺激活 = 现在 < 玩家.冲刺结束时间;
      const 时间过载激活 = 现在 < 玩家.时间过载结束时间;
      const 攻击冷却满 = this.游戏配置.玩家.攻击.冷却;
      const 攻击进度 = 玩家.攻击冷却 > 0 ? 1 - 玩家.攻击冷却 / 攻击冷却满 : 0;
      const 移动中 = Math.abs(玩家.vx) > 5 && 攻击进度 === 0;

      // 残影记录（冲刺 / 攻击 / 快速移动时）
      const 残影激活 = 冲刺激活 || 攻击进度 > 0 || (移动中 && Math.random() < 0.25);
      if (残影激活) {
        const 末次 = this.残影列表.length ? this.残影列表[this.残影列表.length - 1] : null;
        if (!末次 || 末次.标识 !== 玩家.标识 || 现在 - 末次.时间 > 22) {
          this.残影列表.push({
            标识: 玩家.标识,
            x: 玩家.x,
            y: 玩家.y,
            朝向: 玩家.朝向,
            颜色: 玩家.颜色,
            宽,
            高,
            攻击进度,
            时间: 现在
          });
          if (this.残影列表.length > 14) this.残影列表.shift();
        }
      }
      // 绘制该玩家的残影
      this.残影列表 = this.残影列表.filter((r) => {
        if (r.标识 !== 玩家.标识) return true;
        const 龄 = (现在 - r.时间) / 300;
        if (龄 >= 1) return false;
        this.绘制机甲残影(r, 1 - 龄);
        return true;
      });

      this.上下文.save();
      this.上下文.translate(屏幕点.x, 中心Y);
      this.上下文.scale(玩家.朝向, 1);

      if (护盾激活) {
        const 护盾配置 =
          this.游戏模式 === 'racing' ? this.游戏配置.竞速.技能.shield : this.游戏配置.技能.shield;
        const 剩余时间 = 玩家.护盾结束时间 - 现在;
        const 进度 = 1 - 剩余时间 / 护盾配置.持续时间;
        const 脉冲 = 1 + Math.sin(进度 * Math.PI * 8) * 0.06;
        this.上下文.beginPath();
        this.上下文.arc(0, 0, (Math.max(宽, 高) + 12 * this.缩放比) * 脉冲, 0, Math.PI * 2);
        this.上下文.strokeStyle = 护盾配置.颜色;
        this.上下文.lineWidth = 2;
        this.上下文.shadowBlur = 20;
        this.上下文.shadowColor = 护盾配置.颜色;
        this.上下文.stroke();
        this.上下文.globalAlpha = 0.12 + 0.08 * Math.sin(进度 * Math.PI * 4);
        this.上下文.fillStyle = 护盾配置.颜色;
        this.上下文.fill();
        this.上下文.globalAlpha = 1;
      }

      if (冲刺激活) {
        this.上下文.globalAlpha = 0.6;
      }

      this.绘制机甲形象(玩家, 宽, 高, 现在, 攻击进度, 时间过载激活);

      this.上下文.restore();
    }
  }

  绘制机甲残影(残影, 透明度) {
    const ctx = this.上下文;
    const 屏幕点 = this.世界到屏幕({ x: 残影.x, y: 残影.y });
    const 宽 = 残影.宽;
    const 高 = 残影.高;
    const 中心Y = 屏幕点.y - 高 / 2;
    ctx.save();
    ctx.translate(屏幕点.x, 中心Y);
    ctx.scale(残影.朝向, 1);
    ctx.globalAlpha = 透明度 * 0.32;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 残影.颜色;
    ctx.shadowBlur = 16;
    ctx.shadowColor = 残影.颜色;
    ctx.fillRect(-宽 * 0.22, -高 * 0.28, 宽 * 0.44, 高 * 0.4);
    ctx.fillRect(-宽 * 0.16, -高 * 0.5, 宽 * 0.32, 高 * 0.18);
    ctx.beginPath();
    ctx.moveTo(-宽 * 0.22, -高 * 0.28);
    ctx.lineTo(-宽 * 0.42, -高 * 0.22);
    ctx.lineTo(-宽 * 0.22, -高 * 0.16);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(宽 * 0.22, -高 * 0.28);
    ctx.lineTo(宽 * 0.42, -高 * 0.22);
    ctx.lineTo(宽 * 0.22, -高 * 0.16);
    ctx.fill();
    ctx.fillRect(-宽 * 0.16, 高 * 0.12, 宽 * 0.14, 高 * 0.36);
    ctx.fillRect(宽 * 0.02, 高 * 0.12, 宽 * 0.14, 高 * 0.36);
    ctx.fillRect(宽 * 0.2, -高 * 0.05, 宽 * (0.3 + 残影.攻击进度 * 0.25), 高 * 0.04);
    ctx.restore();
  }

  绘制机甲形象(玩家, 宽, 高, 现在, 攻击进度, 过载) {
    const ctx = this.上下文;
    const 主色 = 玩家.颜色;
    const 装甲暗 = this.调暗颜色(主色, 0.6);
    const 装甲中 = this.调暗颜色(主色, 0.3);
    const 装甲亮 = this.调亮颜色(主色, 0.55);
    const 白甲 = this.调亮颜色(主色, 0.72);
    const 关节灰 = 'rgb(120,128,146)';
    const 关节亮 = 'rgb(190,198,214)';
    const 脉冲 = 0.6 + 0.4 * Math.sin(现在 / 240);
    const 缓动 = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    const 移动中 = Math.abs(玩家.vx) > 5 && 攻击进度 === 0;
    const 步相 = 现在 / 130;
    const 摆幅 = 移动中 ? 0.32 : 0;
    const 起伏 = 移动中 ? Math.abs(Math.sin(步相)) * 高 * 0.022 : Math.sin(现在 / 560) * 高 * 0.012;

    ctx.save();
    ctx.translate(0, 起伏);

    // 地面投影
    ctx.save();
    ctx.shadowColor = 主色;
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 高 / 2 - 高 * 0.01, 宽 * 0.5, 高 * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 背后推进背包（双喷口）
    const 背包Y = -高 * 0.18;
    this.绘制机甲多边形(
      [
        { x: -宽 * 0.3, y: 背包Y - 高 * 0.1 },
        { x: -宽 * 0.14, y: 背包Y - 高 * 0.1 },
        { x: -宽 * 0.12, y: 背包Y + 高 * 0.12 },
        { x: -宽 * 0.32, y: 背包Y + 高 * 0.12 }
      ],
      装甲暗,
      主色
    );
    [-宽 * 0.26, -宽 * 0.16].forEach((px) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = 装甲亮;
      ctx.shadowBlur = 12;
      ctx.fillStyle = 装甲亮;
      ctx.globalAlpha = 0.7 + 0.3 * 脉冲;
      ctx.beginPath();
      ctx.moveTo(px - 宽 * 0.025, 背包Y + 高 * 0.12);
      ctx.lineTo(px + 宽 * 0.025, 背包Y + 高 * 0.12);
      ctx.lineTo(px, 背包Y + 高 * 0.12 + 高 * 0.06 + 高 * 0.03 * 脉冲);
      ctx.fill();
      ctx.restore();
    });

    // 双腿（粗壮大腿 + 圆膝甲 + 前凸小腿 + 宽脚掌，行走绕髋交替摆动）
    const 腿高 = 高 * 0.3;
    const 腿顶 = 高 / 2 - 腿高;
    const 膝Y = 腿顶 + 腿高 * 0.42;
    [-1, 1].forEach((侧) => {
      const 外 = 侧 * 宽 * 0.26;
      const 内 = 侧 * 宽 * 0.02;
      const 中 = (外 + 内) / 2;
      const 摆 = 移动中 ? Math.sin(步相 + (侧 < 0 ? 0 : Math.PI)) * 摆幅 : 0;
      ctx.save();
      ctx.translate(中, 腿顶);
      ctx.rotate(摆);
      ctx.translate(-中, -腿顶);
      // 大腿
      this.绘制机甲多边形(
        [
          { x: 内, y: 腿顶 },
          { x: 外, y: 腿顶 },
          { x: 外 + 侧 * 宽 * 0.03, y: 膝Y - 高 * 0.04 },
          { x: 内 + 侧 * 宽 * 0.03, y: 膝Y - 高 * 0.04 }
        ],
        装甲中,
        主色
      );
      // 圆膝装甲（高达标志性）
      this.绘制机甲圆(中, 膝Y, 宽 * 0.085, 装甲亮, 主色);
      ctx.save();
      ctx.fillStyle = 装甲暗;
      ctx.beginPath();
      ctx.arc(中, 膝Y, 宽 * 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // 小腿（向前 +x 前凸）
      this.绘制机甲多边形(
        [
          { x: 内 + 侧 * 宽 * 0.01, y: 膝Y + 高 * 0.02 },
          { x: 外 + 侧 * 宽 * 0.04, y: 膝Y + 高 * 0.02 },
          { x: 外 + 侧 * 宽 * 0.06, y: 高 / 2 - 高 * 0.06 },
          { x: 内 + 侧 * 宽 * 0.0, y: 高 / 2 - 高 * 0.06 }
        ],
        装甲暗,
        主色
      );
      // 脚掌（宽掌）
      this.绘制机甲多边形(
        [
          { x: 内 - 侧 * 宽 * 0.02, y: 高 / 2 - 高 * 0.06 },
          { x: 外 + 侧 * 宽 * 0.12, y: 高 / 2 - 高 * 0.06 },
          { x: 外 + 侧 * 宽 * 0.14, y: 高 / 2 },
          { x: 内 - 侧 * 宽 * 0.04, y: 高 / 2 }
        ],
        白甲,
        主色
      );
      ctx.restore();
    });

    // 髋甲（前裙板）
    const 髋Y = 腿顶 - 高 * 0.02;
    this.绘制机甲多边形(
      [
        { x: -宽 * 0.2, y: 髋Y },
        { x: 宽 * 0.2, y: 髋Y },
        { x: 宽 * 0.16, y: 髋Y + 高 * 0.08 },
        { x: -宽 * 0.16, y: 髋Y + 高 * 0.08 }
      ],
      装甲中,
      主色
    );
    this.绘制机甲多边形(
      [
        { x: -宽 * 0.07, y: 髋Y + 高 * 0.04 },
        { x: 宽 * 0.07, y: 髋Y + 高 * 0.04 },
        { x: 宽 * 0.06, y: 髋Y + 高 * 0.12 },
        { x: -宽 * 0.06, y: 髋Y + 高 * 0.12 }
      ],
      装甲暗,
      主色
    );

    // 躯干
    const 躯干顶 = -高 / 2 + 高 * 0.22;
    const 躯干底 = 髋Y;
    const 胸顶宽 = 宽 * 0.46;
    const 胸底宽 = 宽 * 0.38;
    this.绘制机甲多边形(
      [
        { x: -胸顶宽 / 2, y: 躯干顶 },
        { x: 胸顶宽 / 2, y: 躯干顶 },
        { x: 胸底宽 / 2, y: 躯干底 },
        { x: -胸底宽 / 2, y: 躯干底 }
      ],
      装甲中,
      主色
    );
    // 胸甲 V 形进气口（白甲）
    this.绘制机甲多边形(
      [
        { x: -宽 * 0.03, y: 躯干顶 + 高 * 0.02 },
        { x: 宽 * 0.03, y: 躯干顶 + 高 * 0.02 },
        { x: 宽 * 0.06, y: 躯干顶 + 高 * 0.14 },
        { x: 0, y: 躯干底 - 高 * 0.02 },
        { x: -宽 * 0.06, y: 躯干顶 + 高 * 0.14 }
      ],
      白甲,
      主色
    );
    // 驾驶舱舱门（发光块）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 装甲亮;
    ctx.shadowBlur = 14;
    ctx.fillStyle = 装甲亮;
    ctx.globalAlpha = 0.85 + 0.15 * 脉冲;
    this.绘制机甲多边形(
      [
        { x: -宽 * 0.05, y: 躯干顶 + 高 * 0.05 },
        { x: 宽 * 0.05, y: 躯干顶 + 高 * 0.05 },
        { x: 宽 * 0.04, y: 躯干顶 + 高 * 0.11 },
        { x: -宽 * 0.04, y: 躯干顶 + 高 * 0.11 }
      ],
      装甲亮,
      主色
    );
    ctx.restore();
    // 胸口能量核心
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 装甲亮;
    ctx.shadowBlur = 20;
    ctx.fillStyle = 装甲亮;
    ctx.globalAlpha = 0.7 + 0.3 * 脉冲;
    ctx.beginPath();
    ctx.arc(0, 躯干顶 + (躯干底 - 躯干顶) * 0.5, 宽 * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 躯干顶 + (躯干底 - 躯干顶) * 0.5, 宽 * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 肩部（高达宽肩甲）
    const 肩Y = 躯干顶 - 高 * 0.02;
    const 肩高 = 高 * 0.14;
    [-1, 1].forEach((侧) => {
      const 根 = (侧 * 胸顶宽) / 2;
      this.绘制机甲多边形(
        [
          { x: 根 - 侧 * 宽 * 0.03, y: 肩Y + 肩高 },
          { x: 根 - 侧 * 宽 * 0.28, y: 肩Y + 肩高 * 0.25 },
          { x: 根 - 侧 * 宽 * 0.3, y: 肩Y - 高 * 0.02 },
          { x: 根 - 侧 * 宽 * 0.12, y: 肩Y - 高 * 0.04 },
          { x: 根 + 侧 * 宽 * 0.04, y: 肩Y + 肩高 * 0.45 }
        ],
        侧 < 0 ? 装甲暗 : 装甲中,
        主色
      );
      // 肩甲散热槽
      ctx.save();
      ctx.strokeStyle = 装甲亮;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.shadowColor = 装甲亮;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(根 - 侧 * 宽 * 0.28, 肩Y + 肩高 * 0.25);
      ctx.lineTo(根 - 侧 * 宽 * 0.3, 肩Y - 高 * 0.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(根 - 侧 * 宽 * 0.24, 肩Y + 肩高 * 0.35);
      ctx.lineTo(根 - 侧 * 宽 * 0.26, 肩Y + 肩高 * 0.05);
      ctx.stroke();
      ctx.restore();
    });

    // 手臂
    const 臂宽 = 宽 * 0.12;
    const 臂Y = 肩Y + 肩高 * 0.5;
    const 臂长 = 高 * 0.2;
    // 左臂（后摆，行走随步伐摆动）
    const 左肩x = -胸顶宽 / 2 - 宽 * 0.02;
    const 左摆 = 移动中 ? Math.sin(步相 + Math.PI) * 0.22 : 0;
    ctx.save();
    ctx.translate(左肩x, 臂Y);
    ctx.rotate(左摆);
    ctx.translate(-左肩x, -臂Y);
    this.绘制机甲多边形(
      [
        { x: 左肩x, y: 臂Y },
        { x: 左肩x - 臂宽, y: 臂Y },
        { x: 左肩x - 臂宽, y: 臂Y + 臂长 },
        { x: 左肩x, y: 臂Y + 臂长 }
      ],
      装甲暗,
      主色
    );
    this.绘制机甲圆(左肩x - 臂宽 / 2, 臂Y + 臂长, 宽 * 0.05, 关节灰, 关节亮);
    ctx.restore();
    // 右臂（持刃，攻击时三段挥砍：抬手→下劈→收回）
    let 臂角 = 0;
    if (攻击进度 > 0) {
      if (攻击进度 < 0.32) 臂角 = 缓动(攻击进度 / 0.32) * -1.35;
      else if (攻击进度 < 0.62) 臂角 = -1.35 + 缓动((攻击进度 - 0.32) / 0.3) * 2.35;
      else 臂角 = 1.0 + 缓动((攻击进度 - 0.62) / 0.38) * -1.0;
    }
    const 右肩x = 胸顶宽 / 2 - 宽 * 0.02;
    const 右肩y = 臂Y;
    ctx.save();
    ctx.translate(右肩x, 右肩y);
    ctx.rotate(臂角);
    ctx.translate(-右肩x, -右肩y);
    const 前伸 = 攻击进度 > 0 ? 宽 * 0.04 : 0;
    this.绘制机甲多边形(
      [
        { x: 右肩x + 前伸, y: 臂Y },
        { x: 右肩x + 臂宽 + 前伸, y: 臂Y },
        { x: 右肩x + 臂宽 + 前伸, y: 臂Y + 臂长 },
        { x: 右肩x + 前伸, y: 臂Y + 臂长 }
      ],
      装甲中,
      主色
    );
    this.绘制机甲圆(右肩x + 臂宽 / 2 + 前伸, 臂Y + 臂长, 宽 * 0.05, 关节灰, 关节亮);

    // 武器 - 能量刃
    const 武器前伸 = 宽 * 0.42 + (攻击进度 > 0 ? 宽 * 0.2 : 0);
    const 武器Y = 臂Y + 臂长 * 0.4;
    const 武器根X = 右肩x + 臂宽 * 0.5 + 前伸;
    const 武器尖X = 武器根X + 武器前伸;
    this.绘制机甲多边形(
      [
        { x: 武器根X - 宽 * 0.02, y: 武器Y - 宽 * 0.05 },
        { x: 武器根X + 宽 * 0.04, y: 武器Y - 宽 * 0.05 },
        { x: 武器根X + 宽 * 0.04, y: 武器Y + 宽 * 0.05 },
        { x: 武器根X - 宽 * 0.02, y: 武器Y + 宽 * 0.05 }
      ],
      装甲中,
      主色
    );
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 装甲亮;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 装甲亮;
    ctx.lineCap = 'round';
    ctx.lineWidth = 宽 * 0.085;
    ctx.beginPath();
    ctx.moveTo(武器根X + 宽 * 0.02, 武器Y);
    ctx.lineTo(武器尖X, 武器Y);
    ctx.stroke();
    ctx.lineWidth = 宽 * 0.028;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(武器根X + 宽 * 0.02, 武器Y);
    ctx.lineTo(武器尖X, 武器Y);
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // 头部
    const 头宽 = 宽 * 0.42;
    const 头高 = 高 * 0.2;
    const 头Y = -高 / 2;
    this.绘制机甲多边形(
      [
        { x: -头宽 * 0.42, y: 头Y + 头高 },
        { x: 头宽 * 0.42, y: 头Y + 头高 },
        { x: 头宽 * 0.36, y: 头Y + 头高 * 0.25 },
        { x: 头宽 * 0.22, y: 头Y },
        { x: -头宽 * 0.22, y: 头Y },
        { x: -头宽 * 0.36, y: 头Y + 头高 * 0.25 }
      ],
      白甲,
      主色
    );
    // 脸部黑色面罩区域
    this.绘制机甲多边形(
      [
        { x: -头宽 * 0.28, y: 头Y + 头高 },
        { x: 头宽 * 0.28, y: 头Y + 头高 },
        { x: 头宽 * 0.22, y: 头Y + 头高 * 0.35 },
        { x: -头宽 * 0.22, y: 头Y + 头高 * 0.35 }
      ],
      装甲暗,
      主色
    );
    // 独眼相机监视器
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 装甲亮;
    ctx.shadowBlur = 18;
    ctx.fillStyle = 装甲亮;
    ctx.globalAlpha = 0.9 + 0.1 * 脉冲;
    const 眼Y = 头Y + 头高 * 0.62;
    ctx.fillRect(-头宽 * 0.24, 眼Y - 头高 * 0.11, 头宽 * 0.48, 头高 * 0.2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-头宽 * 0.16, 眼Y - 头高 * 0.06, 头宽 * 0.32, 头高 * 0.1);
    ctx.restore();
    // V 字天线（高达标志：从脸颊两侧向上交汇）
    ctx.save();
    ctx.strokeStyle = 装甲亮;
    ctx.shadowColor = 装甲亮;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 宽 * 0.032;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-头宽 * 0.36, 头Y + 头高 * 0.35);
    ctx.lineTo(-头宽 * 0.05, 头Y - 头高 * 0.25);
    ctx.lineTo(头宽 * 0.05, 头Y - 头高 * 0.25);
    ctx.lineTo(头宽 * 0.36, 头Y + 头高 * 0.35);
    ctx.stroke();
    ctx.restore();
    this.绘制机甲点(-头宽 * 0.05, 头Y - 头高 * 0.25, 宽 * 0.022, 装甲亮);
    this.绘制机甲点(头宽 * 0.05, 头Y - 头高 * 0.25, 宽 * 0.022, 装甲亮);

    // 时间过载光环
    if (过载) {
      ctx.save();
      ctx.shadowColor = this.游戏配置.技能.timeOverload.颜色;
      ctx.shadowBlur = 26;
      ctx.strokeStyle = this.游戏配置.技能.timeOverload.颜色;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(现在 / 100);
      ctx.beginPath();
      ctx.arc(0, 0, 宽 * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  绘制机甲圆(x, y, r, 填充, 描边) {
    const ctx = this.上下文;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 填充;
    ctx.fill();
    if (描边) {
      ctx.shadowColor = 描边;
      ctx.shadowBlur = 9;
      ctx.strokeStyle = 描边;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  绘制机甲多边形(点, 填充, 描边) {
    const ctx = this.上下文;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(点[0].x, 点[0].y);
    for (let i = 1; i < 点.length; i++) ctx.lineTo(点[i].x, 点[i].y);
    ctx.closePath();
    ctx.fillStyle = 填充;
    ctx.fill();
    if (描边) {
      ctx.shadowColor = 描边;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 描边;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  绘制机甲点(x, y, r, 颜色) {
    const ctx = this.上下文;
    ctx.save();
    ctx.shadowColor = 颜色;
    ctx.shadowBlur = 10;
    ctx.fillStyle = 颜色;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  解析颜色(十六进制) {
    if (typeof 十六进制 !== 'string' || !十六进制.startsWith('#')) return null;
    let hex = 十六进制.slice(1);
    if (hex.length === 3)
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    const n = Number.parseInt(hex, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  调暗颜色(十六进制, 比例) {
    const rgb = this.解析颜色(十六进制);
    if (!rgb) return 十六进制;
    const f = 1 - 比例;
    return `rgb(${Math.round(rgb.r * f)}, ${Math.round(rgb.g * f)}, ${Math.round(rgb.b * f)})`;
  }

  调亮颜色(十六进制, 比例) {
    const rgb = this.解析颜色(十六进制);
    if (!rgb) return 十六进制;
    return `rgb(${Math.min(255, Math.round(rgb.r + (255 - rgb.r) * 比例))}, ${Math.min(
      255,
      Math.round(rgb.g + (255 - rgb.g) * 比例)
    )}, ${Math.min(255, Math.round(rgb.b + (255 - rgb.b) * 比例))})`;
  }

  绘制特效() {
    this.特效列表.forEach((特效) => {
      const 屏幕点 = this.世界到屏幕({ x: 特效.x, y: 特效.y });
      const 进度 = 特效.经过时间 / 特效.持续时间;

      this.上下文.save();

      if (特效.类型 === 'melee') {
        const w = 特效.宽度 * this.缩放比;
        const h = 特效.高度 * this.缩放比;
        const dir = 特效.方向 || 1;
        this.上下文.save();
        this.上下文.globalCompositeOperation = 'lighter';
        this.上下文.strokeStyle = 特效.颜色;
        this.上下文.lineWidth = Math.max(2, w * 0.12);
        this.上下文.shadowBlur = 18;
        this.上下文.shadowColor = 特效.颜色;
        this.上下文.globalAlpha = 1 - 进度;
        this.上下文.beginPath();
        this.上下文.moveTo(屏幕点.x - dir * w * 0.4, 屏幕点.y - h * 0.65);
        this.上下文.quadraticCurveTo(
          屏幕点.x + dir * w * 0.9,
          屏幕点.y,
          屏幕点.x + dir * w * 0.2,
          屏幕点.y + h * 0.6
        );
        this.上下文.stroke();
        this.上下文.lineWidth = Math.max(1, w * 0.04);
        this.上下文.strokeStyle = '#ffffff';
        this.上下文.beginPath();
        this.上下文.moveTo(屏幕点.x - dir * w * 0.3, 屏幕点.y - h * 0.45);
        this.上下文.quadraticCurveTo(
          屏幕点.x + dir * w * 0.7,
          屏幕点.y,
          屏幕点.x + dir * w * 0.15,
          屏幕点.y + h * 0.45
        );
        this.上下文.stroke();
        this.上下文.restore();
      } else if (特效.类型 === 'shockwave') {
        const 半径 = (特效.当前半径 || 特效.半径) * this.缩放比;
        this.上下文.beginPath();
        this.上下文.arc(屏幕点.x, 屏幕点.y, 半径, 0, Math.PI * 2);
        this.上下文.strokeStyle = 特效.颜色;
        this.上下文.lineWidth = 3;
        this.上下文.shadowBlur = 25;
        this.上下文.shadowColor = 特效.颜色;
        this.上下文.globalAlpha = 1 - 进度;
        this.上下文.stroke();
        this.上下文.globalAlpha = 0.15 * (1 - 进度);
        this.上下文.fillStyle = 特效.颜色;
        this.上下文.fill();
      } else if (特效.类型 === 'dash') {
        this.上下文.strokeStyle = 特效.颜色;
        this.上下文.lineWidth = 2;
        this.上下文.shadowBlur = 15;
        this.上下文.shadowColor = 特效.颜色;
        this.上下文.globalAlpha = 0.5 * (1 - 进度);
        this.上下文.beginPath();
        this.上下文.moveTo(屏幕点.x + 特效.朝向 * 30 * this.缩放比, 屏幕点.y);
        this.上下文.lineTo(屏幕点.x - 特效.朝向 * 30 * this.缩放比, 屏幕点.y);
        this.上下文.stroke();
      } else if (特效.类型 === 'hit') {
        this.上下文.strokeStyle = 特效.颜色;
        this.上下文.lineWidth = 2;
        this.上下文.globalAlpha = 1 - 进度;
        const r = 16 * this.缩放比 * 进度;
        for (let i = 0; i < 6; i++) {
          const 角度 = (i / 6) * Math.PI * 2;
          this.上下文.beginPath();
          this.上下文.moveTo(屏幕点.x, 屏幕点.y);
          this.上下文.lineTo(屏幕点.x + Math.cos(角度) * r, 屏幕点.y + Math.sin(角度) * r);
          this.上下文.stroke();
        }
      } else if (特效.类型 === 'spark') {
        const a = 1 - 进度;
        this.上下文.globalCompositeOperation = 'lighter';
        this.上下文.globalAlpha = a;
        this.上下文.fillStyle = 特效.颜色;
        this.上下文.shadowBlur = 10;
        this.上下文.shadowColor = 特效.颜色;
        this.上下文.beginPath();
        this.上下文.arc(屏幕点.x, 屏幕点.y, 特效.大小 * this.缩放比 * (0.5 + a), 0, Math.PI * 2);
        this.上下文.fill();
      } else if (特效.类型 === 'damage') {
        const a = 进度 < 0.15 ? 进度 / 0.15 : 1 - (进度 - 0.15) / 0.85;
        const 上浮 = 进度 * 46 * this.缩放比;
        this.上下文.globalAlpha = Math.max(0, a);
        this.上下文.font = `bold ${Math.round((特效.暴击 ? 30 : 22) * this.缩放比)}px "Orbitron", sans-serif`;
        this.上下文.textAlign = 'center';
        this.上下文.shadowBlur = 14;
        this.上下文.shadowColor = 特效.暴击 ? 配置.颜色.霓虹黄 : 特效.颜色;
        this.上下文.fillStyle = 特效.暴击 ? 配置.颜色.霓虹黄 : '#ffffff';
        this.上下文.fillText(`-${特效.数值}`, 屏幕点.x, 屏幕点.y - 上浮);
      } else if (特效.类型 === 'explosion') {
        const r = (特效.当前半径 || 特效.半径) * this.缩放比;
        this.上下文.globalCompositeOperation = 'lighter';
        this.上下文.globalAlpha = (1 - 进度) * 0.8;
        this.上下文.strokeStyle = 特效.颜色;
        this.上下文.lineWidth = 6 * (1 - 进度);
        this.上下文.shadowBlur = 30;
        this.上下文.shadowColor = 特效.颜色;
        this.上下文.beginPath();
        this.上下文.arc(屏幕点.x, 屏幕点.y, r, 0, Math.PI * 2);
        this.上下文.stroke();
        this.上下文.globalAlpha = (1 - 进度) * 0.25;
        this.上下文.fillStyle = 特效.颜色;
        this.上下文.fill();
      }

      this.上下文.restore();
    });
  }

  绘制HUD() {
    if (!this.画布) return;
    const css宽 = this.画布.getBoundingClientRect().width;
    const 配置玩家 = this.游戏配置.玩家;

    this.玩家列表.forEach((玩家, 索引) => {
      const 在右 = 索引 === 1;
      const 生命比例 = 玩家.生命 / (玩家.最大生命 || 配置玩家.最大生命);
      const 能量比例 = 玩家.能量 / 配置玩家.最大能量;
      const 条宽 = 160 * this.缩放比;
      const 条高 = 10 * this.缩放比;
      const 能量条高 = 6 * this.缩放比;
      const x = 在右 ? css宽 - 15 * this.缩放比 - 条宽 : 15 * this.缩放比;
      const y = 12 * this.缩放比;

      this.上下文.save();

      this.上下文.fillStyle = 'rgba(0,0,0,0.55)';
      this.上下文.fillRect(x, y, 条宽, 条高);
      this.上下文.fillStyle = 生命比例 > 0.5 ? 配置.颜色.霓虹青 : 配置.颜色.霓虹粉;
      this.上下文.shadowBlur = 10;
      this.上下文.shadowColor = this.上下文.fillStyle;
      this.上下文.fillRect(x, y, 条宽 * 生命比例, 条高);

      this.上下文.fillStyle = 'rgba(0,0,0,0.55)';
      this.上下文.fillRect(x, y + 条高 + 4 * this.缩放比, 条宽, 能量条高);
      this.上下文.fillStyle = 配置.颜色.霓虹黄;
      this.上下文.shadowColor = 配置.颜色.霓虹黄;
      this.上下文.fillRect(x, y + 条高 + 4 * this.缩放比, 条宽 * 能量比例, 能量条高);

      this.上下文.fillStyle = '#fff';
      this.上下文.font = `bold ${Math.max(10, 11 * this.缩放比)}px "Courier New", monospace`;
      this.上下文.textAlign = 在右 ? 'right' : 'left';
      this.上下文.textBaseline = 'top';
      this.上下文.shadowBlur = 0;
      const 文本x = 在右 ? x + 条宽 : x;
      this.上下文.fillText(
        `${t(`game.neonArena.${玩家.标识}`)} ${t('game.neonArena.hp')} ${Math.ceil(玩家.生命)}`,
        文本x,
        y + 条高 + 能量条高 + 6 * this.缩放比
      );
      this.上下文.fillText(
        `${t('game.neonArena.energy')} ${Math.floor(玩家.能量)}`,
        文本x,
        y + 条高 + 能量条高 + (6 + 12 * this.缩放比) * this.缩放比
      );

      this.上下文.restore();
    });
  }

  绘制竞速() {
    const 擂台高 = this.游戏配置.擂台.高度;
    const 地面Y = this.游戏配置.擂台.高度 - this.游戏配置.擂台.地面高度;
    const 赛道长 = this.游戏配置.竞速.赛道长度;
    const 左上 = this.世界到屏幕({ x: 0, y: 0 });
    const 右下 = this.世界到屏幕({ x: 赛道长, y: 擂台高 });
    const 终点左上 = this.世界到屏幕({ x: 赛道长, y: 0 });
    const 地面点 = this.世界到屏幕({ x: 0, y: 地面Y });
    const 宽 = 右下.x - 左上.x;
    const 高 = 右下.y - 左上.y;

    this.上下文.save();

    this.上下文.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.上下文.fillRect(左上.x, 左上.y, 宽, 高);

    this.上下文.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    this.上下文.lineWidth = 1;
    this.上下文.shadowBlur = 0;
    for (let x = 0; x <= 赛道长; x += 200) {
      const p = this.世界到屏幕({ x, y: 0 });
      this.上下文.beginPath();
      this.上下文.moveTo(p.x, 左上.y);
      this.上下文.lineTo(p.x, 右下.y);
      this.上下文.stroke();
    }

    this.上下文.strokeStyle = 配置.颜色.霓虹青;
    this.上下文.lineWidth = 2;
    this.上下文.shadowBlur = 10;
    this.上下文.shadowColor = 配置.颜色.霓虹青;
    this.上下文.beginPath();
    this.上下文.moveTo(左上.x, 地面点.y);
    this.上下文.lineTo(右下.x, 地面点.y);
    this.上下文.stroke();

    this.上下文.fillStyle = 'rgba(250, 255, 0, 0.2)';
    this.上下文.fillRect(终点左上.x, 终点左上.y, 16 * this.缩放比, 高);
    this.上下文.strokeStyle = 配置.颜色.霓虹黄;
    this.上下文.lineWidth = 2;
    this.上下文.shadowColor = 配置.颜色.霓虹黄;
    this.上下文.strokeRect(终点左上.x, 终点左上.y, 16 * this.缩放比, 高);

    this.上下文.shadowBlur = 0;
    this.障碍列表.forEach((障碍) => this.绘制障碍(障碍));

    this.上下文.restore();
  }

  绘制障碍(障碍) {
    const 屏幕点 = this.世界到屏幕({ x: 障碍.x, y: 障碍.y });
    this.上下文.save();
    if (障碍.类型 === 'mine') {
      const r = 障碍.半径 * this.缩放比;
      const 脉冲 = 1 + Math.sin(performance.now() / 150) * 0.15;
      this.上下文.beginPath();
      this.上下文.arc(屏幕点.x, 屏幕点.y, r * 脉冲, 0, Math.PI * 2);
      this.上下文.fillStyle = 'rgba(255, 42, 157, 0.35)';
      this.上下文.fill();
      this.上下文.strokeStyle = 配置.颜色.霓虹粉;
      this.上下文.lineWidth = 2;
      this.上下文.shadowBlur = 12;
      this.上下文.shadowColor = 配置.颜色.霓虹粉;
      this.上下文.stroke();
    } else {
      const w = 障碍.宽度 * this.缩放比;
      const h = 障碍.高度 * this.缩放比;
      this.上下文.fillStyle =
        障碍.类型 === 'low' ? 'rgba(255, 42, 157, 0.3)' : 'rgba(168, 85, 255, 0.3)';
      this.上下文.fillRect(屏幕点.x - w / 2, 屏幕点.y, w, h);
      this.上下文.strokeStyle = 障碍.类型 === 'low' ? 配置.颜色.霓虹粉 : 配置.颜色.霓虹紫;
      this.上下文.lineWidth = 2;
      this.上下文.shadowBlur = 10;
      this.上下文.shadowColor = this.上下文.strokeStyle;
      this.上下文.strokeRect(屏幕点.x - w / 2, 屏幕点.y, w, h);
    }
    this.上下文.restore();
  }

  绘制竞速HUD() {
    if (!this.画布) return;
    const css宽 = this.画布.getBoundingClientRect().width;
    const 赛道长 = this.游戏配置.竞速.赛道长度;

    this.玩家列表.forEach((玩家, 索引) => {
      const 在右 = 索引 === 1;
      const 进度 = Math.min(1, 玩家.x / 赛道长);
      const 能量比例 = 玩家.能量 / this.游戏配置.玩家.最大能量;
      const 条宽 = 140 * this.缩放比;
      const 条高 = 6 * this.缩放比;
      const x = 在右 ? css宽 - 15 * this.缩放比 - 条宽 : 15 * this.缩放比;
      const y = 12 * this.缩放比;

      this.上下文.save();

      this.上下文.fillStyle = 'rgba(0,0,0,0.55)';
      this.上下文.fillRect(x, y, 条宽, 条高);
      this.上下文.fillStyle = 玩家.颜色;
      this.上下文.shadowBlur = 10;
      this.上下文.shadowColor = 玩家.颜色;
      this.上下文.fillRect(x, y, 条宽 * 进度, 条高);

      this.上下文.fillStyle = 'rgba(0,0,0,0.55)';
      this.上下文.fillRect(x, y + 条高 + 4 * this.缩放比, 条宽, 4 * this.缩放比);
      this.上下文.fillStyle = 配置.颜色.霓虹黄;
      this.上下文.shadowColor = 配置.颜色.霓虹黄;
      this.上下文.fillRect(x, y + 条高 + 4 * this.缩放比, 条宽 * 能量比例, 4 * this.缩放比);

      this.上下文.fillStyle = '#fff';
      this.上下文.font = `bold ${Math.max(10, 11 * this.缩放比)}px "Courier New", monospace`;
      this.上下文.textAlign = 在右 ? 'right' : 'left';
      this.上下文.textBaseline = 'top';
      this.上下文.shadowBlur = 0;
      const 文本x = 在右 ? x + 条宽 : x;
      this.上下文.fillText(
        `${t(`game.neonArena.${玩家.标识}`)} ${Math.floor(进度 * 100)}%`,
        文本x,
        y + 条高 + 10 * this.缩放比
      );
      this.上下文.fillText(
        `${t('game.neonArena.energy')} ${Math.floor(玩家.能量)}`,
        文本x,
        y + 条高 + 22 * this.缩放比
      );

      this.上下文.restore();
    });
  }

  绘制子弹() {
    if (this.子弹列表.length === 0) return;
    this.上下文.save();
    for (const 子弹 of this.子弹列表) {
      const 屏幕点 = this.世界到屏幕({ x: 子弹.x, y: 子弹.y });
      const r = 子弹.半径 * this.缩放比;
      this.上下文.beginPath();
      this.上下文.arc(屏幕点.x, 屏幕点.y, r, 0, Math.PI * 2);
      this.上下文.fillStyle = 子弹.颜色;
      this.上下文.shadowBlur = 12;
      this.上下文.shadowColor = 子弹.颜色;
      this.上下文.fill();

      this.上下文.globalAlpha = 0.4;
      this.上下文.beginPath();
      this.上下文.arc(屏幕点.x, 屏幕点.y, r * 2, 0, Math.PI * 2);
      this.上下文.fillStyle = 子弹.颜色;
      this.上下文.fill();
      this.上下文.globalAlpha = 1;
    }
    this.上下文.restore();
  }

  绘制瞄准线() {
    const 现在 = performance.now();
    for (const 玩家 of this.玩家列表) {
      const 蓄力状态 = this.蓄力状态[玩家.标识];
      if (!蓄力状态.激活 || 玩家.生命 <= 0) continue;
      const 蓄力时间 = 现在 - 蓄力状态.开始时间;
      const 射击配置 = this.游戏配置.射击;
      const 子弹配置 = 射击配置.子弹;
      const 蓄力比例 = Math.min(1, 蓄力时间 / 子弹配置.最大蓄力时间);
      const 角度 = 子弹配置.最小角度 + (子弹配置.最大角度 - 子弹配置.最小角度) * 蓄力比例;
      const 长度 = 射击配置.蓄力.瞄准线长度 * this.缩放比;
      const 屏幕点 = this.世界到屏幕({ x: 玩家.x, y: 玩家.y - 玩家.高度 / 2 });
      const 终点x = 屏幕点.x + Math.cos(角度) * 长度 * 玩家.朝向;
      const 终点y = 屏幕点.y - Math.sin(角度) * 长度;

      this.上下文.save();
      this.上下文.strokeStyle = 射击配置.蓄力.颜色;
      this.上下文.lineWidth = 2;
      this.上下文.shadowBlur = 10;
      this.上下文.shadowColor = 射击配置.蓄力.颜色;
      this.上下文.setLineDash([6 * this.缩放比, 4 * this.缩放比]);
      this.上下文.beginPath();
      this.上下文.moveTo(屏幕点.x, 屏幕点.y);
      this.上下文.lineTo(终点x, 终点y);
      this.上下文.stroke();

      this.上下文.globalAlpha = 0.15 + 0.1 * Math.sin(蓄力时间 / 80);
      this.上下文.fillStyle = 射击配置.蓄力.颜色;
      this.上下文.beginPath();
      this.上下文.arc(终点x, 终点y, 5 * this.缩放比, 0, Math.PI * 2);
      this.上下文.fill();
      this.上下文.restore();
    }
  }

  绘制射击HUD() {
    if (!this.画布) return;
    const css宽 = this.画布.getBoundingClientRect().width;
    const 命中所需 = this.游戏配置.射击.命中所需次数;

    this.玩家列表.forEach((玩家, 索引) => {
      const 在右 = 索引 === 1;
      const 已损失 = Math.floor(
        (this.游戏配置.玩家.最大生命 - 玩家.生命) / this.游戏配置.射击.子弹.命中伤害
      );
      const 剩余命中 = Math.max(0, 命中所需 - 已损失);
      const 条宽 = 140 * this.缩放比;
      const 条高 = 8 * this.缩放比;
      const x = 在右 ? css宽 - 15 * this.缩放比 - 条宽 : 15 * this.缩放比;
      const y = 12 * this.缩放比;

      this.上下文.save();

      this.上下文.fillStyle = 'rgba(0,0,0,0.55)';
      this.上下文.fillRect(x, y, 条宽, 条高);
      this.上下文.fillStyle = 玩家.颜色;
      this.上下文.shadowBlur = 10;
      this.上下文.shadowColor = 玩家.颜色;
      for (let i = 0; i < 命中所需; i++) {
        const 单元x = x + (条宽 / 命中所需) * i;
        const 单元宽 = 条宽 / 命中所需 - 2;
        this.上下文.globalAlpha = i < 剩余命中 ? 1 : 0.25;
        this.上下文.fillRect(单元x + 1, y + 1, 单元宽, 条高 - 2);
      }
      this.上下文.globalAlpha = 1;

      this.上下文.fillStyle = '#fff';
      this.上下文.font = `bold ${Math.max(10, 11 * this.缩放比)}px "Courier New", monospace`;
      this.上下文.textAlign = 在右 ? 'right' : 'left';
      this.上下文.textBaseline = 'top';
      this.上下文.shadowBlur = 0;
      const 文本x = 在右 ? x + 条宽 : x;
      this.上下文.fillText(
        `${t(`game.neonArena.${玩家.标识}`)} ${剩余命中}/${命中所需}`,
        文本x,
        y + 条高 + 8 * this.缩放比
      );

      this.上下文.restore();
    });
  }

  矩形相交(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }
}
