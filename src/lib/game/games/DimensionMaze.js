import { 配置 } from '../config.js';
import { 游戏基类 } from '../core/GameBase.js';
import { t } from '../i18n.js';
import { 创建元素, 防抖 } from '../utils.js';

export class DimensionMaze extends 游戏基类 {
  constructor(选项) {
    super(选项);
    this.游戏配置 = 配置.游戏.dimensionMaze;
    this.画布 = null;
    this.上下文 = null;
    this.动画帧 = null;
    this.绑定调整尺寸 = 防抖(() => this.调整尺寸(), 200);
    this.绑定处理键盘按下 = (e) => this.处理键盘按下(e);
    this.绑定处理键盘释放 = (e) => this.处理键盘释放(e);

    this.迷宫 = [];
    this.当前关卡 = 0;
    this.玩家 = { x: 1, y: 1 };
    this.当前维度 = 'cyan';
    this.碎片列表 = [];
    this.已收集 = 0;
    this.出口 = { x: 0, y: 0 };
    this.步数 = 0;
    this.开始时间 = 0;
    this.关卡用时 = 0;
    this.总用时 = 0;
    this.总步数 = 0;
    this.剩余时间 = 0;
    this.维度切换冷却结束时间 = 0;
    this.冻结结束时间 = 0;
    this.护盾结束时间 = 0;
    this.裂隙列表 = [];
    this.巡逻敌人列表 = [];
    this.追逐敌人列表 = [];
    this.道具列表 = [];
    this.缩放比 = 1;
    this.偏移 = { x: 0, y: 0 };
    this.上一次移动时间 = 0;
    this.键盘状态 = {};
    this.关卡完成 = false;
    this.游戏结束 = false;
    this.连击 = 0;
    this.最后收集时间 = 0;
    this.连击峰值 = 0;
    this.本关最佳步数 = null;
    this.总最佳步数 = null;

    this.特效参数 = this.读取特效参数();
    this.震动 = { 强度: 0, 结束时间: 0 };
    this.玩家轨迹 = [];
    this.粒子列表 = [];
    this.切换闪光结束时间 = 0;
    this.最后粒子时间 = 0;

    this.小地图布局 = null;

    this.顶栏 = null;
    this.关卡显示 = null;
    this.碎片显示 = null;
    this.步数显示 = null;
    this.时间显示 = null;
    this.维度显示 = null;
    this.维度按钮 = null;
    this.连击显示 = null;
    this.增益显示 = null;
    this.结算画面 = null;
    this.说明元素 = null;
  }

  读取特效参数() {
    const 特效 = this.游戏配置.特效 ?? {};
    return {
      震动时长: 特效.震动时长 ?? 250,
      震动幅度: 特效.震动幅度 ?? 7,
      切换闪光时长: 特效.切换闪光时长 ?? 220,
      切换闪光透明度: 特效.切换闪光透明度 ?? 0.4,
      轨迹上限: 特效.轨迹上限 ?? 6,
      轨迹存活: 特效.轨迹存活 ?? 420,
      粒子数量: 特效.粒子数量 ?? 12,
      粒子存活: 特效.粒子存活 ?? 520,
      粒子上限: 特效.粒子上限 ?? 160,
      粒子初速: 特效.粒子初速 ?? 34,
      粒子速度浮动: 特效.粒子速度浮动 ?? 46
    };
  }

  重置特效状态() {
    this.震动 = { 强度: 0, 结束时间: 0 };
    this.玩家轨迹 = [];
    this.粒子列表 = [];
    this.切换闪光结束时间 = 0;
    this.最后粒子时间 = 0;
  }

  async 初始化() {
    this.总最佳步数 = this.状态管理器.读取('dimensionMaze.bestTotalSteps', null);
    this.渲染();
  }

  渲染() {
    this.容器.innerHTML = '';
    this.容器.className = 'game-instance dimension-maze';

    this.顶栏 = 创建元素('div', { class: 'dimension-maze-top-bar' });
    this.关卡显示 = 创建元素('div', { class: 'dimension-maze-stat', text: '' });
    this.碎片显示 = 创建元素('div', { class: 'dimension-maze-stat', text: '' });
    this.步数显示 = 创建元素('div', { class: 'dimension-maze-stat', text: '' });
    this.时间显示 = 创建元素('div', { class: 'dimension-maze-stat', text: '' });
    this.维度显示 = 创建元素('div', { class: 'dimension-maze-dimension', text: '' });

    this.维度按钮 = 创建元素('button', {
      class: 'neon-btn cyan dimension-maze-switch',
      text: t('game.dimensionMaze.switchDimension')
    });
    this.维度按钮.addEventListener('click', () => this.切换维度());

    this.顶栏.appendChild(this.关卡显示);
    this.顶栏.appendChild(this.碎片显示);
    this.顶栏.appendChild(this.步数显示);
    this.顶栏.appendChild(this.时间显示);
    this.顶栏.appendChild(this.维度显示);
    this.顶栏.appendChild(this.维度按钮);
    this.连击显示 = 创建元素('div', { class: 'dimension-maze-combo', text: '' });
    this.顶栏.appendChild(this.连击显示);
    this.增益显示 = 创建元素('div', { class: 'dimension-maze-buff', text: '' });
    this.顶栏.appendChild(this.增益显示);
    this.容器.appendChild(this.顶栏);

    const 说明文本 = `${t('game.dimensionMaze.instruction')} ${t('game.dimensionMaze.gatedFragmentHint')}`;
    this.说明元素 = 创建元素('div', {
      class: 'game-instruction dimension-maze-instruction',
      text: 说明文本
    });
    this.容器.appendChild(this.说明元素);

    const 画布容器 = 创建元素('div', { class: 'dimension-maze-canvas-wrap' });
    this.画布 = document.createElement('canvas');
    this.画布.setAttribute('aria-label', t('games.dimensionMaze.title'));
    画布容器.appendChild(this.画布);
    this.容器.appendChild(画布容器);

    this.上下文 = this.画布.getContext('2d');
    this.调整尺寸();

    this.结算画面 = this.创建结算画面();
    this.容器.appendChild(this.结算画面);

    window.addEventListener('resize', this.绑定调整尺寸);
    document.addEventListener('keydown', this.绑定处理键盘按下);
    document.addEventListener('keyup', this.绑定处理键盘释放);
  }

  创建结算画面() {
    const 画面 = 创建元素('div', { class: 'dimension-maze-game-over hidden' });
    const 标题 = 创建元素('h2', { class: 'dimension-maze-game-over-title', text: '' });
    const 结果 = 创建元素('div', { class: 'dimension-maze-game-over-result', text: '' });
    const 按钮组 = 创建元素('div', { class: 'dimension-maze-game-over-buttons' });
    const 下一关按钮 = 创建元素('button', {
      class: 'neon-btn cyan dimension-maze-next-btn',
      text: t('game.dimensionMaze.nextLevel')
    });
    const 重新开始按钮 = 创建元素('button', {
      class: 'neon-btn pink dimension-maze-restart-btn',
      text: t('game.dimensionMaze.restart')
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

  async 启动() {
    if (this.动画帧) {
      cancelAnimationFrame(this.动画帧);
      this.动画帧 = null;
    }
    this.运行中 = true;
    this.已暂停 = false;
    this.当前关卡 = 0;
    this.总用时 = 0;
    this.总步数 = 0;
    this.游戏结束 = false;
    this.结算画面.classList.add('hidden');
    this.加载关卡(this.当前关卡);
    window.__dm = this;
    this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
  }

  加载关卡(关卡索引) {
    const 关卡 = this.游戏配置.关卡列表[关卡索引];
    if (!关卡) return;

    const 网格 = 关卡.网格;
    this.迷宫 = this.生成迷宫(网格);
    this.分配维度墙();
    this.玩家 = { x: 1, y: 1 };
    this.当前维度 = 'cyan';
    this.已收集 = 0;
    this.步数 = 0;
    this.关卡用时 = 0;
    this.剩余时间 = 关卡.时间限制;
    this.开始时间 = performance.now();
    this.上一次移动时间 = 0;
    this.维度切换冷却结束时间 = 0;
    this.冻结结束时间 = 0;
    this.护盾结束时间 = 0;
    this.关卡完成 = false;
    this.连击 = 0;
    this.最后收集时间 = 0;
    this.连击峰值 = 0;
    this.重置特效状态();
    this.碎片列表 = this.生成碎片位置(关卡.碎片数, 网格);
    this.出口 = this.生成出口位置(网格);
    this.裂隙列表 = this.生成裂隙位置(网格);
    this.巡逻敌人列表 = this.生成巡逻敌人();
    this.追逐敌人列表 = this.生成追逐敌人();
    this.道具列表 = this.生成道具();
    this.本关最佳步数 = this.状态管理器.读取(`dimensionMaze.bestSteps.${关卡索引}`, null);
    this.小地图布局 = null;
    this.更新HUD();
  }

  生成迷宫(大小) {
    const 迷宫 = [];
    for (let y = 0; y < 大小; y++) {
      迷宫[y] = [];
      for (let x = 0; x < 大小; x++) {
        迷宫[y][x] = { 类型: 'wall', 维度: null };
      }
    }

    const 方向 = [
      { x: 0, y: -2 },
      { x: 0, y: 2 },
      { x: -2, y: 0 },
      { x: 2, y: 0 }
    ];

    const 打乱 = (数组) => {
      for (let i = 数组.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [数组[i], 数组[j]] = [数组[j], 数组[i]];
      }
      return 数组;
    };

    const 挖掘 = (x, y) => {
      迷宫[y][x] = { 类型: 'path', 维度: null };
      for (const d of 打乱([...方向])) {
        const nx = x + d.x;
        const ny = y + d.y;
        if (nx > 0 && nx < 大小 - 1 && ny > 0 && ny < 大小 - 1 && 迷宫[ny][nx].类型 === 'wall') {
          迷宫[y + d.y / 2][x + d.x / 2] = { 类型: 'path', 维度: null };
          挖掘(nx, ny);
        }
      }
    };

    挖掘(1, 1);
    return 迷宫;
  }

  分配维度墙() {
    const 大小 = this.迷宫.length;
    for (let y = 1; y < 大小 - 1; y++) {
      for (let x = 1; x < 大小 - 1; x++) {
        const 单元格 = this.迷宫[y][x];
        if (单元格.类型 !== 'wall') continue;

        let 相邻通道 = 0;
        const 方向 = [
          { x: 0, y: -1 },
          { x: 0, y: 1 },
          { x: -1, y: 0 },
          { x: 1, y: 0 }
        ];
        for (const d of 方向) {
          const nx = x + d.x;
          const ny = y + d.y;
          if (
            nx > 0 &&
            nx < 大小 - 1 &&
            ny > 0 &&
            ny < 大小 - 1 &&
            this.迷宫[ny][nx].类型 === 'path'
          ) {
            相邻通道++;
          }
        }

        if (相邻通道 >= 2 && Math.random() < 0.35) {
          单元格.维度 = Math.random() < 0.5 ? 'cyan' : 'pink';
        }
      }
    }
  }

  生成碎片位置(数量, 大小) {
    const 列表 = [];
    const 候选 = [];
    for (let y = 1; y < 大小 - 1; y++) {
      for (let x = 1; x < 大小 - 1; x++) {
        if (this.迷宫[y][x].类型 === 'path' && !(x === 1 && y === 1)) {
          const 距离 = Math.abs(x - 1) + Math.abs(y - 1);
          if (距离 >= 大小 * 0.4) {
            候选.push({ x, y, 距离 });
          }
        }
      }
    }
    候选.sort((a, b) => b.距离 - a.距离);
    const 最大数 = Math.min(数量, 候选.length);
    const 门控概率 = this.游戏配置.碎片门控概率 ?? 0;
    for (let i = 0; i < 最大数; i++) {
      const 索引 = Math.floor(i * (候选.length / 最大数));
      const 位置 = 候选[Math.min(索引, 候选.length - 1)];
      const 维度 = Math.random() < 门控概率 ? (Math.random() < 0.5 ? 'cyan' : 'pink') : null;
      列表.push({ x: 位置.x, y: 位置.y, 维度, 已收集: false });
    }
    return 列表;
  }

  生成出口位置(大小) {
    for (let y = 大小 - 2; y > 1; y--) {
      for (let x = 大小 - 2; x > 1; x--) {
        if (this.迷宫[y][x].类型 === 'path') {
          return { x, y };
        }
      }
    }
    return { x: 大小 - 2, y: 大小 - 2 };
  }

  生成裂隙位置(大小) {
    const 列表 = [];
    const 数量 = Math.max(1, Math.floor(大小 / 5));
    const 候选 = [];
    for (let y = 1; y < 大小 - 1; y++) {
      for (let x = 1; x < 大小 - 1; x++) {
        if (
          this.迷宫[y][x].类型 === 'path' &&
          !(x === 1 && y === 1) &&
          !(x === this.出口.x && y === this.出口.y)
        ) {
          候选.push({ x, y });
        }
      }
    }
    for (let i = 0; i < Math.min(数量, 候选.length); i++) {
      const 索引 = Math.floor(Math.random() * 候选.length);
      const 位置 = 候选.splice(索引, 1)[0];
      列表.push({ x: 位置.x, y: 位置.y });
    }
    return 列表;
  }

  生成巡逻敌人() {
    const 大小 = this.迷宫.length;
    const 数量 = this.游戏配置.敌人.数量;
    const 候选 = [];
    for (let y = 1; y < 大小 - 1; y++) {
      for (let x = 1; x < 大小 - 1; x++) {
        if (
          this.迷宫[y][x].类型 === 'path' &&
          !(x === 1 && y === 1) &&
          Math.abs(x - 1) + Math.abs(y - 1) > 大小 * 0.3
        ) {
          候选.push({ x, y });
        }
      }
    }
    const 列表 = [];
    for (let i = 0; i < 数量 && 候选.length; i++) {
      const 索引 = Math.floor(Math.random() * 候选.length);
      const 位置 = 候选.splice(索引, 1)[0];
      列表.push({
        x: 位置.x,
        y: 位置.y,
        方向x: Math.random() < 0.5 ? 1 : -1,
        方向y: 0,
        最后移动时间: 0
      });
    }
    return 列表;
  }

  生成追逐敌人() {
    const 大小 = this.迷宫.length;
    const 基础数量 = this.游戏配置.敌人.追逐数量 ?? 2;
    const 数量 = Math.max(0, Math.min(基础数量, this.当前关卡 + 1));
    const 候选 = [];
    for (let y = 1; y < 大小 - 1; y++) {
      for (let x = 1; x < 大小 - 1; x++) {
        if (
          this.迷宫[y][x].类型 === 'path' &&
          !(x === 1 && y === 1) &&
          Math.abs(x - 1) + Math.abs(y - 1) > 大小 * 0.25
        ) {
          候选.push({ x, y });
        }
      }
    }
    const 列表 = [];
    for (let i = 0; i < 数量 && 候选.length; i++) {
      const 索引 = Math.floor(Math.random() * 候选.length);
      const 位置 = 候选.splice(索引, 1)[0];
      列表.push({ x: 位置.x, y: 位置.y, 最后移动时间: 0 });
    }
    return 列表;
  }

  更新追逐敌人(时间戳) {
    if (performance.now() < this.冻结结束时间) return;
    const 配置 = this.游戏配置.敌人;
    const 延迟 = 配置.追逐移动延迟 ?? 350;
    for (const 敌 of this.追逐敌人列表) {
      if (时间戳 - 敌.最后移动时间 < 延迟) continue;
      敌.最后移动时间 = 时间戳;
      const 下一步 = this.寻路BFS(敌.x, 敌.y, this.玩家.x, this.玩家.y);
      if (下一步) {
        敌.方向x = 下一步.x - 敌.x;
        敌.方向y = 下一步.y - 敌.y;
        敌.x = 下一步.x;
        敌.y = 下一步.y;
      }
    }
  }

  寻路BFS(起点x, 起点y, 目标x, 目标y) {
    const 大小 = this.迷宫.length;
    if (起点x === 目标x && 起点y === 目标y) return null;
    if (this.迷宫[目标y]?.[目标x]?.类型 !== 'path') return null;
    const 方向 = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    const 队列 = [{ x: 起点x, y: 起点y }];
    const 访问 = new Set();
    访问.add(`${起点x},${起点y}`);
    const 父 = new Map();
    父.set(`${起点x},${起点y}`, null);
    let 到达 = false;
    while (队列.length > 0) {
      const 当前 = 队列.shift();
      if (当前.x === 目标x && 当前.y === 目标y) {
        到达 = true;
        break;
      }
      for (const [dx, dy] of 方向) {
        const nx = 当前.x + dx;
        const ny = 当前.y + dy;
        if (nx <= 0 || ny <= 0 || nx >= 大小 - 1 || ny >= 大小 - 1) continue;
        if (this.迷宫[ny][nx].类型 !== 'path') continue;
        const 键 = `${nx},${ny}`;
        if (访问.has(键)) continue;
        访问.add(键);
        父.set(键, `${当前.x},${当前.y}`);
        队列.push({ x: nx, y: ny });
      }
    }
    if (!到达) return null;
    let 当前键 = `${目标x},${目标y}`;
    let 父键 = 父.get(当前键);
    while (父键 !== null && 父键 !== `${起点x},${起点y}`) {
      当前键 = 父键;
      父键 = 父.get(当前键);
    }
    if (父键 === null) return null;
    const [x, y] = 当前键.split(',').map(Number);
    return { x, y };
  }

  检查追逐碰撞() {
    for (const 敌 of this.追逐敌人列表) {
      if (敌.x === this.玩家.x && 敌.y === this.玩家.y) {
        this.剩余时间 = Math.max(0, this.剩余时间 - this.游戏配置.敌人.惩罚时间);
        this.玩家 = { x: 1, y: 1 };
        // 被送回起点后清空拖尾，避免残影横跨整张地图
        this.玩家轨迹 = [];
        this.触发屏幕震动(0.6);
        break;
      }
    }
  }

  生成道具() {
    const 大小 = this.迷宫.length;
    const 候选 = [];
    for (let y = 1; y < 大小 - 1; y++) {
      for (let x = 1; x < 大小 - 1; x++) {
        if (
          this.迷宫[y][x].类型 === 'path' &&
          !(x === 1 && y === 1) &&
          !(x === this.出口.x && y === this.出口.y)
        ) {
          候选.push({ x, y });
        }
      }
    }
    const 列表 = [];
    const 数量 = this.游戏配置.道具.数量;
    const 类型列表 = ['time', 'freeze', 'shield'];
    for (let i = 0; i < 数量 && 候选.length; i++) {
      const 索引 = Math.floor(Math.random() * 候选.length);
      const 位置 = 候选.splice(索引, 1)[0];
      // 按权重轮流确保各类型都有机会生成；数量>=3 时循环覆盖三种类型
      const 类型 =
        数量 >= 类型列表.length
          ? 类型列表[i % 类型列表.length]
          : 类型列表[Math.floor(Math.random() * 类型列表.length)];
      列表.push({ x: 位置.x, y: 位置.y, 已拾取: false, 类型 });
    }
    return 列表;
  }

  检查道具() {
    const 配置 = this.游戏配置.道具;
    for (const 道具 of this.道具列表) {
      if (道具.已拾取 || 道具.x !== this.玩家.x || 道具.y !== this.玩家.y) continue;
      道具.已拾取 = true;
      this.增加分数(2);
      if (道具.类型 === 'freeze') {
        this.冻结结束时间 = performance.now() + 配置.冻结时长 * 1000;
      } else if (道具.类型 === 'shield') {
        this.护盾结束时间 = performance.now() + 配置.护盾时长 * 1000;
      } else {
        this.剩余时间 += 配置.时间加成;
      }
    }
  }

  检查巡逻碰撞() {
    for (const 敌 of this.巡逻敌人列表) {
      if (敌.x === this.玩家.x && 敌.y === this.玩家.y) {
        this.剩余时间 = Math.max(0, this.剩余时间 - this.游戏配置.敌人.惩罚时间);
        this.玩家 = { x: 1, y: 1 };
        // 被送回起点后清空拖尾，避免残影横跨整张地图
        this.玩家轨迹 = [];
        this.触发屏幕震动(0.6);
        break;
      }
    }
  }

  更新巡逻敌人(时间戳) {
    if (performance.now() < this.冻结结束时间) return;
    const 大小 = this.迷宫.length;
    const 配置 = this.游戏配置.敌人;
    for (const 敌 of this.巡逻敌人列表) {
      if (时间戳 - 敌.最后移动时间 < 配置.移动延迟) continue;
      敌.最后移动时间 = 时间戳;
      const 候选 = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ].filter(([dx, dy]) => {
        const nx = 敌.x + dx;
        const ny = 敌.y + dy;
        return (
          nx > 0 && ny > 0 && nx < 大小 - 1 && ny < 大小 - 1 && this.迷宫[ny][nx].类型 === 'path'
        );
      });
      if (候选.length === 0) continue;
      const 保持 = [敌.方向x, 敌.方向y];
      let 选;
      if (候选.some(([dx, dy]) => dx === 保持[0] && dy === 保持[1]) && Math.random() < 0.7) {
        选 = 保持;
      } else {
        选 = 候选[Math.floor(Math.random() * 候选.length)];
      }
      敌.方向x = 选[0];
      敌.方向y = 选[1];
      敌.x += 选[0];
      敌.y += 选[1];
    }
  }

  调整尺寸() {
    if (!this.画布 || !this.上下文) return;
    const 容器矩形 = this.画布.parentElement.getBoundingClientRect();
    const css宽 = Math.max(1, Math.floor(容器矩形.width));
    const css高 = Math.max(1, Math.floor(容器矩形.height));
    const dpr = window.devicePixelRatio || 1;

    this.画布.width = css宽 * dpr;
    this.画布.height = css高 * dpr;

    const 大小 = this.游戏配置.关卡列表[this.当前关卡]?.网格 || 11;
    const 单元格 = this.游戏配置.单元格尺寸;
    const 迷宫像素 = 大小 * 单元格;
    this.缩放比 = Math.min(css宽 / 迷宫像素, css高 / 迷宫像素);
    this.偏移.x = (css宽 - 迷宫像素 * this.缩放比) / 2;
    this.偏移.y = (css高 - 迷宫像素 * this.缩放比) / 2;

    this.上下文.setTransform(1, 0, 0, 1, 0, 0);
    this.上下文.scale(dpr, dpr);
  }

  切换维度() {
    if (!this.运行中 || this.已暂停 || this.关卡完成 || this.游戏结束) return;
    const 现在 = performance.now();
    if (现在 < this.维度切换冷却结束时间) return;
    this.当前维度 = this.当前维度 === 'cyan' ? 'pink' : 'cyan';
    this.维度切换冷却结束时间 = 现在 + this.游戏配置.维度切换冷却;
    this.切换闪光结束时间 = 现在 + this.特效参数.切换闪光时长;
    this.触发屏幕震动(0.25);
    this.更新HUD();
  }

  处理键盘按下(e) {
    this.键盘状态[e.key] = true;
    if (this.是游戏键(e.key)) {
      e.preventDefault();
    }
    if (e.key === ' ' || e.code === 'Space') {
      this.切换维度();
    }
  }

  处理键盘释放(e) {
    this.键盘状态[e.key] = false;
  }

  是游戏键(键) {
    const 移动键 = [
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
    ];
    return 移动键.includes(键) || 键 === ' ';
  }

  尝试移动(方向x, 方向y, 时间戳) {
    if (!this.运行中 || this.已暂停 || this.关卡完成 || this.游戏结束) return;
    const 延迟 = this.游戏配置.玩家.移动延迟;
    if (时间戳 - this.上一次移动时间 < 延迟) return;

    const 新x = this.玩家.x + 方向x;
    const 新y = this.玩家.y + 方向y;
    if (!this.可通行(新x, 新y)) return;

    this.记录轨迹点(this.玩家.x, this.玩家.y);
    this.玩家.x = 新x;
    this.玩家.y = 新y;
    this.步数++;
    this.总步数++;
    this.上一次移动时间 = 时间戳;
    this.检查裂隙();
    this.检查收集();
    this.检查道具();
    this.检查出口();
    this.检查巡逻碰撞();
    this.更新HUD();
  }

  可通行(x, y) {
    if (x < 0 || y < 0 || y >= this.迷宫.length || x >= this.迷宫[0].length) return false;
    const 单元格 = this.迷宫[y][x];
    if (单元格.类型 === 'wall') {
      // 护盾激活期间：维度墙（带维度标记）可无视维度穿行；普通 null 墙仍不可走
      if (单元格.维度 !== null && performance.now() < this.护盾结束时间) return true;
      if (单元格.维度 === null) return false;
      return 单元格.维度 !== this.当前维度;
    }
    return true;
  }

  检查裂隙() {
    const 裂隙 = this.裂隙列表.find((r) => r.x === this.玩家.x && r.y === this.玩家.y);
    if (裂隙) {
      this.当前维度 = this.当前维度 === 'cyan' ? 'pink' : 'cyan';
      this.维度切换冷却结束时间 = 0;
      this.切换闪光结束时间 = performance.now() + this.特效参数.切换闪光时长;
    }
  }

  检查收集() {
    const 现在 = performance.now();
    const 配置 = this.游戏配置;
    for (const 碎片 of this.碎片列表) {
      if (碎片.已收集) continue;
      if (碎片.维度 !== null && 碎片.维度 !== this.当前维度) continue;
      if (碎片.x === this.玩家.x && 碎片.y === this.玩家.y) {
        碎片.已收集 = true;
        this.已收集++;
        if (现在 - this.最后收集时间 < 配置.连击间隔) {
          this.连击++;
        } else {
          this.连击 = 1;
        }
        this.最后收集时间 = 现在;
        this.连击峰值 = Math.max(this.连击峰值, this.连击);
        const 倍数 = Math.min(this.连击, 配置.连击上限);
        this.增加分数(倍数);
        this.生成收集粒子(碎片.x, 碎片.y, 配置.碎片.颜色);
        this.触发屏幕震动(0.3);
      }
    }
  }

  是幽灵碎片(碎片) {
    return 碎片.维度 !== null && 碎片.维度 !== this.当前维度;
  }

  检查出口() {
    if (this.玩家.x !== this.出口.x || this.玩家.y !== this.出口.y) return;
    if (this.已收集 < this.碎片列表.length) return;
    this.关卡完成 = true;
    this.总用时 += this.关卡用时;
    this.增加分数(10);
    this.更新关卡最佳步数();
    this.显示关卡结算();
  }

  更新关卡最佳步数() {
    const 当前关卡最佳 = this.状态管理器.读取(`dimensionMaze.bestSteps.${this.当前关卡}`, null);
    if (当前关卡最佳 === null || this.步数 < 当前关卡最佳) {
      this.状态管理器.写入(`dimensionMaze.bestSteps.${this.当前关卡}`, this.步数);
      this.本关最佳步数 = this.步数;
    }
  }

  更新总最佳步数() {
    const 总最佳 = this.状态管理器.读取('dimensionMaze.bestTotalSteps', null);
    if (总最佳 === null || this.总步数 < 总最佳) {
      this.状态管理器.写入('dimensionMaze.bestTotalSteps', this.总步数);
      this.总最佳步数 = this.总步数;
    }
  }

  计算星级() {
    const 关卡 = this.游戏配置.关卡列表[this.当前关卡];
    if (!关卡) return 1;
    const 网格 = 关卡.网格;
    const 时间限制 = 关卡.时间限制;
    const 星级配置 = this.游戏配置.星级;
    const 时间三星 = 时间限制 * 星级配置.时间三星比例;
    const 时间二星 = 时间限制 * 星级配置.时间二星比例;
    const 步数三星 = 网格 * 网格 * 星级配置.步数三星比例;
    const 步数二星 = 网格 * 网格 * 星级配置.步数二星比例;

    let 用时星 = 1;
    if (this.关卡用时 <= 时间三星) 用时星 = 3;
    else if (this.关卡用时 <= 时间二星) 用时星 = 2;

    let 步数星 = 1;
    if (this.步数 <= 步数三星) 步数星 = 3;
    else if (this.步数 <= 步数二星) 步数星 = 2;

    return Math.min(用时星, 步数星);
  }

  星级文本(星级) {
    const 点亮 = Math.max(0, Math.min(3, 星级));
    return '★'.repeat(点亮) + '☆'.repeat(3 - 点亮);
  }

  持久化最佳星级() {
    const 星级 = this.计算星级();
    const 键 = `dimensionMaze.bestStars.${this.当前关卡}`;
    const 原值 = this.状态管理器.读取(键, null);
    if (原值 === null || 星级 > 原值) {
      this.状态管理器.写入(键, 星级);
    }
    return 星级;
  }

  触发屏幕震动(系数) {
    const 强度 = Math.max(0, Math.min(1, Number(系数) || 0));
    if (强度 <= 0) return;
    this.震动 = { 强度, 结束时间: performance.now() + this.特效参数.震动时长 };
  }

  生成收集粒子(格x, 格y, 颜色) {
    const 单元格 = this.游戏配置.单元格尺寸;
    const 参数 = this.特效参数;
    const 中心x = 格x * 单元格 + 单元格 / 2;
    const 中心y = 格y * 单元格 + 单元格 / 2;
    for (let i = 0; i < 参数.粒子数量; i++) {
      const 角度 = (Math.PI * 2 * i) / 参数.粒子数量 + Math.random() * 0.5;
      const 速度 = 参数.粒子初速 + Math.random() * 参数.粒子速度浮动;
      this.粒子列表.push({
        x: 中心x,
        y: 中心y,
        vx: Math.cos(角度) * 速度,
        vy: Math.sin(角度) * 速度,
        存活: 参数.粒子存活,
        最大存活: 参数.粒子存活,
        颜色
      });
    }
    // 粒子总量封顶，避免长时间游玩后列表无限增长
    if (this.粒子列表.length > 参数.粒子上限) {
      this.粒子列表.splice(0, this.粒子列表.length - 参数.粒子上限);
    }
  }

  更新粒子(时间戳) {
    const 参数 = this.特效参数;
    const 上次 = this.最后粒子时间 || 时间戳;
    // 标签页切回或暂停恢复时时间差可能极大，截断避免粒子瞬移
    const 间隔 = Math.min(100, Math.max(0, 时间戳 - 上次));
    this.最后粒子时间 = 时间戳;

    if (this.粒子列表.length > 0) {
      const 秒 = 间隔 / 1000;
      const 衰减 = Math.max(0, 1 - 秒 * 2.4);
      const 存活列表 = [];
      for (const 粒子 of this.粒子列表) {
        粒子.x += 粒子.vx * 秒;
        粒子.y += 粒子.vy * 秒;
        粒子.vx *= 衰减;
        粒子.vy *= 衰减;
        粒子.存活 -= 间隔;
        if (粒子.存活 > 0) 存活列表.push(粒子);
      }
      this.粒子列表 = 存活列表;
    }

    if (this.玩家轨迹.length > 0) {
      const 现在 = performance.now();
      this.玩家轨迹 = this.玩家轨迹.filter((点) => 现在 - 点.时间 < 参数.轨迹存活);
    }
  }

  记录轨迹点(x, y) {
    this.玩家轨迹.push({ x, y, 时间: performance.now() });
    if (this.玩家轨迹.length > this.特效参数.轨迹上限) {
      this.玩家轨迹.shift();
    }
  }

  当前维度颜色() {
    const 墙配置 = this.游戏配置.墙;
    return this.当前维度 === 'cyan' ? 墙配置.青维度颜色 : 墙配置.粉维度颜色;
  }

  显示时间到() {
    if (this.游戏结束 || this.关卡完成) return;
    this.游戏结束 = true;
    if (!this.结算画面) return;
    const 标题 = this.结算画面.querySelector('.dimension-maze-game-over-title');
    const 结果 = this.结算画面.querySelector('.dimension-maze-game-over-result');
    const 下一关按钮 = this.结算画面.querySelector('.dimension-maze-next-btn');
    if (标题) 标题.textContent = t('game.dimensionMaze.timeUp');
    const 星级 = this.持久化最佳星级();
    if (结果)
      结果.textContent = `${t('game.dimensionMaze.finalStats', {
        time: Math.floor(this.关卡用时),
        steps: this.总步数
      })}  ${t('game.dimensionMaze.stars', { stars: this.星级文本(星级) })}`;
    if (下一关按钮) 下一关按钮.style.display = 'none';
    this.结算画面.classList.remove('hidden');
    this.结束游戏();
  }

  显示关卡结算() {
    if (!this.结算画面) return;
    const 标题 = this.结算画面.querySelector('.dimension-maze-game-over-title');
    const 结果 = this.结算画面.querySelector('.dimension-maze-game-over-result');
    const 下一关按钮 = this.结算画面.querySelector('.dimension-maze-next-btn');
    const 总数 = this.游戏配置.关卡列表.length;

    if (this.当前关卡 >= 总数 - 1) {
      if (标题) 标题.textContent = t('game.dimensionMaze.gameOver');
      const 最终星级 = this.持久化最佳星级();
      if (结果)
        结果.textContent = `${t('game.dimensionMaze.finalStatsWithBest', {
          time: Math.floor(this.总用时),
          steps: this.总步数,
          best: this.总最佳步数 ?? '-'
        })}  ${t('game.dimensionMaze.stars', { stars: this.星级文本(最终星级) })}`;
      if (下一关按钮) 下一关按钮.style.display = 'none';
      this.游戏结束 = true;
      this.更新总最佳步数();
      this.结束游戏();
    } else {
      if (标题)
        标题.textContent = t('game.dimensionMaze.levelComplete', { level: this.当前关卡 + 1 });
      const 关卡星级 = this.持久化最佳星级();
      let 星行 = `  ${t('game.dimensionMaze.stars', { stars: this.星级文本(关卡星级) })}`;
      if (this.连击峰值 > 1) {
        星行 += `  ${t('game.dimensionMaze.comboPeak', { n: this.连击峰值 })}`;
      }
      if (结果)
        结果.textContent =
          t('game.dimensionMaze.levelStatsWithBest', {
            time: Math.floor(this.关卡用时),
            steps: this.步数,
            best: this.本关最佳步数 ?? '-'
          }) + 星行;
      if (下一关按钮) 下一关按钮.style.display = '';
    }
    this.结算画面.classList.remove('hidden');
  }

  下一关() {
    this.结算画面.classList.add('hidden');
    this.当前关卡++;
    if (this.当前关卡 < this.游戏配置.关卡列表.length) {
      this.加载关卡(this.当前关卡);
    }
  }

  重新开始() {
    this.结算画面.classList.add('hidden');
    this.启动();
  }

  async 暂停() {
    this.已暂停 = true;
  }

  async 恢复() {
    if (!this.运行中) return;
    this.已暂停 = false;
    this.开始时间 = performance.now() - this.关卡用时 * 1000;
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
    if (this.维度按钮) {
      this.维度按钮.removeEventListener('click', () => this.切换维度());
    }
    this.容器.innerHTML = '';
  }

  更新HUD() {
    const 关卡 = this.游戏配置.关卡列表[this.当前关卡];
    if (!关卡) return;
    const 维度键 = this.当前维度 === 'cyan' ? 'dimensionCyan' : 'dimensionPink';
    const 现在 = performance.now();
    const 冷却中 = 现在 < this.维度切换冷却结束时间;

    if (this.关卡显示)
      this.关卡显示.textContent = t('game.dimensionMaze.level', {
        level: this.当前关卡 + 1,
        total: this.游戏配置.关卡列表.length
      });
    if (this.碎片显示)
      this.碎片显示.textContent = t('game.dimensionMaze.fragments', {
        current: this.已收集,
        total: this.碎片列表.length
      });
    if (this.步数显示)
      this.步数显示.textContent = t('game.dimensionMaze.steps', { steps: this.步数 });
    if (this.时间显示) {
      const 时间文本 = t('game.dimensionMaze.timeLeft', { time: Math.ceil(this.剩余时间) });
      this.时间显示.textContent = 时间文本;
      this.时间显示.classList.toggle('warning', this.剩余时间 <= 10 && this.剩余时间 > 0);
    }
    if (this.维度显示)
      this.维度显示.textContent = t('game.dimensionMaze.dimension', {
        dimension: t(`game.dimensionMaze.${维度键}`)
      });

    if (this.维度按钮) {
      this.维度按钮.className = `neon-btn ${this.当前维度 === 'cyan' ? 'pink' : 'cyan'} dimension-maze-switch`;
      this.维度按钮.disabled = 冷却中;
      this.维度按钮.textContent = 冷却中
        ? t('game.dimensionMaze.switchCooldown', {
            time: Math.ceil((this.维度切换冷却结束时间 - 现在) / 1000)
          })
        : t('game.dimensionMaze.switchDimension');
    }

    if (this.增益显示) {
      const 增益文本 = [];
      if (performance.now() < this.冻结结束时间) {
        增益文本.push(
          t('game.dimensionMaze.buffFreeze', {
            time: Math.ceil((this.冻结结束时间 - 现在) / 1000)
          })
        );
      }
      if (performance.now() < this.护盾结束时间) {
        增益文本.push(
          t('game.dimensionMaze.buffShield', {
            time: Math.ceil((this.护盾结束时间 - 现在) / 1000)
          })
        );
      }
      this.增益显示.textContent = 增益文本.join('  ');
      this.增益显示.classList.toggle('active', 增益文本.length > 0);
    }

    if (this.连击显示) {
      if (this.连击 > 1) {
        this.连击显示.textContent = t('game.dimensionMaze.combo', { n: this.连击 });
        this.连击显示.classList.add('active');
      } else {
        this.连击显示.textContent = '';
        this.连击显示.classList.remove('active');
      }
    }
  }

  渲染循环(时间戳) {
    if (!this.运行中 || !this.上下文 || !this.画布) return;

    if (!this.已暂停 && !this.关卡完成 && !this.游戏结束) {
      this.关卡用时 = (时间戳 - this.开始时间) / 1000;
      const 关卡 = this.游戏配置.关卡列表[this.当前关卡];
      this.剩余时间 = Math.max(0, (关卡?.时间限制 || 0) - this.关卡用时);
      if (this.剩余时间 <= 0) {
        this.剩余时间 = 0;
        this.显示时间到();
        return;
      }
      this.处理输入(时间戳);
      this.更新巡逻敌人(时间戳);
      this.更新追逐敌人(时间戳);
      this.检查追逐碰撞();
      this.更新粒子(时间戳);
      this.更新HUD();
    } else {
      // 暂停/结算期间冻结特效推进，仅保持时间基准
      this.最后粒子时间 = 时间戳;
    }

    this.绘制();
    this.动画帧 = requestAnimationFrame((时间戳) => this.渲染循环(时间戳));
  }

  处理输入(时间戳) {
    let dx = 0;
    let dy = 0;
    if (this.键是否按下(['w', 'W', 'ArrowUp'])) dy -= 1;
    if (this.键是否按下(['s', 'S', 'ArrowDown'])) dy += 1;
    if (this.键是否按下(['a', 'A', 'ArrowLeft'])) dx -= 1;
    if (this.键是否按下(['d', 'D', 'ArrowRight'])) dx += 1;

    if (dx !== 0 || dy !== 0) {
      if (dx !== 0 && dy !== 0) {
        dy = 0;
      }
      this.尝试移动(dx, dy, 时间戳);
    }
  }

  键是否按下(键列表) {
    if (!Array.isArray(键列表)) return !!this.键盘状态[键列表];
    return 键列表.some((键) => this.键盘状态[键]);
  }

  绘制() {
    if (!this.画布 || !this.上下文) return;
    const css宽 = this.画布.getBoundingClientRect().width;
    const css高 = this.画布.getBoundingClientRect().height;
    const 现在 = performance.now();

    this.上下文.clearRect(0, 0, css宽, css高);
    this.上下文.save();

    // 震动只作用于绘制变换，不修改 this.偏移，避免影响任何坐标判定
    const 震动偏移 = this.计算震动偏移(现在);
    this.上下文.translate(this.偏移.x + 震动偏移.x, this.偏移.y + 震动偏移.y);
    this.上下文.scale(this.缩放比, this.缩放比);

    this.绘制迷宫();
    this.绘制裂隙(现在);
    this.绘制碎片(现在);
    this.绘制出口(现在);
    this.绘制巡逻敌人();
    this.绘制追逐敌人();
    this.绘制道具(现在);
    this.绘制粒子();
    this.绘制玩家轨迹(现在);
    this.绘制玩家();

    this.上下文.restore();

    this.绘制切换闪光(现在, css宽, css高);

    this.绘制小地图();
  }

  计算震动偏移(现在) {
    if (现在 >= this.震动.结束时间) return { x: 0, y: 0 };
    const 时长 = this.特效参数.震动时长;
    const 剩余比例 = Math.max(0, Math.min(1, (this.震动.结束时间 - 现在) / 时长));
    const 幅度 = this.特效参数.震动幅度 * this.震动.强度 * 剩余比例;
    return {
      x: (Math.random() * 2 - 1) * 幅度,
      y: (Math.random() * 2 - 1) * 幅度
    };
  }

  绘制切换闪光(现在, css宽, css高) {
    if (现在 >= this.切换闪光结束时间) return;
    const 参数 = this.特效参数;
    const 剩余比例 = Math.max(0, Math.min(1, (this.切换闪光结束时间 - 现在) / 参数.切换闪光时长));
    this.上下文.save();
    this.上下文.globalAlpha = 参数.切换闪光透明度 * 剩余比例;
    this.上下文.fillStyle = this.当前维度颜色();
    this.上下文.fillRect(0, 0, css宽, css高);
    this.上下文.restore();
  }

  绘制小地图() {
    const 大小 = this.迷宫.length;
    if (!大小) return;
    const css宽 = this.画布.getBoundingClientRect().width;
    const css高 = this.画布.getBoundingClientRect().height;
    if (css宽 < 10 || css高 < 10) return;

    const 边距 = 12;
    const mm = Math.max(2, Math.floor(Math.min(css宽, css高) / (大小 * 6)));
    const 地图宽 = mm * 大小;
    const 地图高 = mm * 大小;
    const x0 = css宽 - 地图宽 - 边距;
    const y0 = css高 - 地图高 - 边距;

    const ctx = this.上下文;
    ctx.save();

    // 半透明背景面板（与画布其余区域独立坐标，不受迷宫变换影响）
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(5, 3, 15, 0.72)';
    ctx.fillRect(x0 - 4, y0 - 4, 地图宽 + 8, 地图高 + 8);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 4, y0 - 4, 地图宽 + 8, 地图高 + 8);

    // 迷宫精简格：墙/路用低对比色区分
    for (let y = 0; y < 大小; y++) {
      for (let x = 0; x < 大小; x++) {
        const 单元格数据 = this.迷宫[y][x];
        ctx.fillStyle =
          单元格数据.类型 === 'wall' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(x0 + x * mm, y0 + y * mm, mm, mm);
      }
    }

    // 出口：解锁青 / 锁定紫（取配置 getter 颜色）
    const 出口配置 = this.游戏配置.出口;
    const 已解锁 = this.已收集 >= this.碎片列表.length;
    const 出口颜色 = 已解锁 ? 出口配置.颜色 : 出口配置.锁定颜色;
    ctx.fillStyle = 出口颜色;
    ctx.shadowBlur = 6;
    ctx.shadowColor = 出口颜色;
    ctx.beginPath();
    ctx.arc(
      x0 + this.出口.x * mm + mm / 2,
      y0 + this.出口.y * mm + mm / 2,
      Math.max(1.5, mm * 0.4),
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // 未收集碎片：黄点
    const 碎片配置 = this.游戏配置.碎片;
    ctx.fillStyle = 碎片配置.颜色;
    for (const 碎片 of this.碎片列表) {
      if (碎片.已收集) continue;
      ctx.beginPath();
      ctx.arc(
        x0 + 碎片.x * mm + mm / 2,
        y0 + 碎片.y * mm + mm / 2,
        Math.max(1, mm * 0.28),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 敌人：巡逻红点 + 追逐橙点
    const 敌人配置 = this.游戏配置.敌人;
    ctx.fillStyle = 敌人配置.颜色;
    for (const 敌 of this.巡逻敌人列表) {
      ctx.beginPath();
      ctx.arc(
        x0 + 敌.x * mm + mm / 2,
        y0 + 敌.y * mm + mm / 2,
        Math.max(1, mm * 0.3),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.fillStyle = 敌人配置.追逐颜色;
    for (const 敌 of this.追逐敌人列表) {
      ctx.beginPath();
      ctx.arc(
        x0 + 敌.x * mm + mm / 2,
        y0 + 敌.y * mm + mm / 2,
        Math.max(1, mm * 0.3),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // 玩家：亮点 + 光圈
    const 玩家配置 = this.游戏配置.玩家;
    const px = x0 + this.玩家.x * mm + mm / 2;
    const py = y0 + this.玩家.y * mm + mm / 2;
    ctx.fillStyle = 玩家配置.颜色;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 玩家配置.颜色;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1.5, mm * 0.42), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    // 仅记录本次绘制布局用于白盒断言，严禁修改任何游戏状态
    this.小地图布局 = {
      玩家: { x: this.玩家.x, y: this.玩家.y },
      出口: { x: this.出口.x, y: this.出口.y },
      碎片: this.碎片列表.filter((f) => !f.已收集).map((f) => ({ x: f.x, y: f.y })),
      敌人: [
        ...this.巡逻敌人列表.map((e) => ({ x: e.x, y: e.y })),
        ...this.追逐敌人列表.map((e) => ({ x: e.x, y: e.y }))
      ]
    };
  }

  绘制粒子() {
    if (this.粒子列表.length === 0) return;
    this.上下文.save();
    for (const 粒子 of this.粒子列表) {
      const 比例 = Math.max(0, Math.min(1, 粒子.存活 / 粒子.最大存活));
      this.上下文.globalAlpha = 比例;
      this.上下文.fillStyle = 粒子.颜色;
      this.上下文.shadowBlur = 8;
      this.上下文.shadowColor = 粒子.颜色;
      this.上下文.beginPath();
      this.上下文.arc(粒子.x, 粒子.y, 1 + 2.4 * 比例, 0, Math.PI * 2);
      this.上下文.fill();
    }
    this.上下文.restore();
  }

  绘制玩家轨迹(现在) {
    if (this.玩家轨迹.length === 0) return;
    const 单元格 = this.游戏配置.单元格尺寸;
    const 玩家配置 = this.游戏配置.玩家;
    const 存活 = this.特效参数.轨迹存活;

    this.上下文.save();
    this.上下文.fillStyle = 玩家配置.颜色;
    for (const 点 of this.玩家轨迹) {
      const 年龄 = 现在 - 点.时间;
      if (年龄 >= 存活) continue;
      const 比例 = 1 - 年龄 / 存活;
      this.上下文.globalAlpha = 0.4 * 比例;
      this.上下文.beginPath();
      this.上下文.arc(
        点.x * 单元格 + 单元格 / 2,
        点.y * 单元格 + 单元格 / 2,
        (玩家配置.尺寸 / 2) * (0.3 + 0.5 * 比例),
        0,
        Math.PI * 2
      );
      this.上下文.fill();
    }
    this.上下文.restore();
  }

  绘制迷宫() {
    const 单元格 = this.游戏配置.单元格尺寸;
    const 大小 = this.迷宫.length;
    const 墙配置 = this.游戏配置.墙;

    this.上下文.fillStyle = 'rgba(0, 0, 0, 0.35)';
    this.上下文.fillRect(0, 0, 大小 * 单元格, 大小 * 单元格);

    for (let y = 0; y < 大小; y++) {
      for (let x = 0; x < 大小; x++) {
        const 单元格数据 = this.迷宫[y][x];
        if (单元格数据.类型 !== 'wall') continue;

        let 颜色 = 墙配置.固定颜色;
        let 半透明 = false;
        if (单元格数据.维度 === 'cyan') {
          颜色 = this.当前维度 === 'cyan' ? 墙配置.青维度颜色 : 'rgba(0, 240, 255, 0.18)';
          半透明 = this.当前维度 !== 'cyan';
        } else if (单元格数据.维度 === 'pink') {
          颜色 = this.当前维度 === 'pink' ? 墙配置.粉维度颜色 : 'rgba(255, 42, 157, 0.18)';
          半透明 = this.当前维度 !== 'pink';
        }

        this.上下文.fillStyle = 颜色;
        this.上下文.globalAlpha = 半透明 ? 0.35 : 1;
        this.上下文.fillRect(x * 单元格 + 1, y * 单元格 + 1, 单元格 - 2, 单元格 - 2);
      }
    }
    this.上下文.globalAlpha = 1;

    this.上下文.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    this.上下文.lineWidth = 1;
    for (let i = 0; i <= 大小; i++) {
      this.上下文.beginPath();
      this.上下文.moveTo(i * 单元格, 0);
      this.上下文.lineTo(i * 单元格, 大小 * 单元格);
      this.上下文.stroke();
      this.上下文.beginPath();
      this.上下文.moveTo(0, i * 单元格);
      this.上下文.lineTo(大小 * 单元格, i * 单元格);
      this.上下文.stroke();
    }
  }

  绘制裂隙(现在) {
    const 单元格 = this.游戏配置.单元格尺寸;
    const 配置裂隙 = this.游戏配置.裂隙;
    const 脉冲 = 1 + Math.sin(现在 / 200) * 0.25;

    this.上下文.save();
    this.上下文.fillStyle = 配置裂隙.颜色;
    this.上下文.shadowBlur = 15;
    this.上下文.shadowColor = 配置裂隙.颜色;
    for (const 裂隙 of this.裂隙列表) {
      const x = 裂隙.x * 单元格 + 单元格 / 2;
      const y = 裂隙.y * 单元格 + 单元格 / 2;
      this.上下文.beginPath();
      this.上下文.arc(x, y, 配置裂隙.半径 * 脉冲, 0, Math.PI * 2);
      this.上下文.fill();
    }
    this.上下文.restore();
  }

  绘制碎片(现在) {
    const 单元格 = this.游戏配置.单元格尺寸;
    const 配置碎片 = this.游戏配置.碎片;
    const 脉冲 = 1 + Math.sin(现在 / 配置碎片.脉冲速度) * 0.2;

    for (const 碎片 of this.碎片列表) {
      if (碎片.已收集) continue;
      const x = 碎片.x * 单元格 + 单元格 / 2;
      const y = 碎片.y * 单元格 + 单元格 / 2;
      const 幽灵 = this.是幽灵碎片(碎片);

      this.上下文.save();
      if (幽灵) {
        this.上下文.globalAlpha = 0.3;
        this.上下文.fillStyle = 碎片.维度 === 'cyan' ? 配置碎片.幽灵颜色青 : 配置碎片.幽灵颜色粉;
      } else {
        this.上下文.fillStyle = 配置碎片.颜色;
      }
      this.上下文.shadowBlur = 15;
      this.上下文.shadowColor = 配置碎片.颜色;
      this.上下文.beginPath();
      this.上下文.arc(x, y, 配置碎片.半径 * 脉冲, 0, Math.PI * 2);
      this.上下文.fill();
      this.上下文.restore();
    }
  }

  绘制出口(现在) {
    const 单元格 = this.游戏配置.单元格尺寸;
    const 出口配置 = this.游戏配置.出口;
    const x = this.出口.x * 单元格 + 单元格 / 2;
    const y = this.出口.y * 单元格 + 单元格 / 2;
    const 已解锁 = this.已收集 >= this.碎片列表.length;
    const 颜色 = 已解锁 ? 出口配置.颜色 : 出口配置.锁定颜色;
    const 脉冲 = 已解锁 ? 1 + Math.sin(现在 / 300) * 0.1 : 1;

    this.上下文.save();
    this.上下文.translate(x, y);
    this.上下文.rotate(Math.PI / 4);
    this.上下文.fillStyle = 颜色;
    this.上下文.shadowBlur = 20;
    this.上下文.shadowColor = 颜色;
    this.上下文.globalAlpha = 已解锁 ? 1 : 0.5;
    const 尺寸 = 出口配置.尺寸 * 脉冲;
    this.上下文.fillRect(-尺寸 / 2, -尺寸 / 2, 尺寸, 尺寸);
    this.上下文.restore();

    if (!已解锁) {
      this.上下文.fillStyle = '#fff';
      this.上下文.font = `10px "Courier New", monospace`;
      this.上下文.textAlign = 'center';
      this.上下文.textBaseline = 'middle';
      this.上下文.fillText('🔒', x, y);
    }
  }

  绘制玩家() {
    const 单元格 = this.游戏配置.单元格尺寸;
    const 玩家配置 = this.游戏配置.玩家;
    const x = this.玩家.x * 单元格 + 单元格 / 2;
    const y = this.玩家.y * 单元格 + 单元格 / 2;

    this.上下文.fillStyle = 玩家配置.颜色;
    this.上下文.shadowBlur = 20;
    this.上下文.shadowColor = 玩家配置.颜色;
    this.上下文.beginPath();
    this.上下文.arc(x, y, 玩家配置.尺寸 / 2, 0, Math.PI * 2);
    this.上下文.fill();
    this.上下文.shadowBlur = 0;

    this.上下文.strokeStyle = '#fff';
    this.上下文.lineWidth = 2;
    this.上下文.beginPath();
    this.上下文.arc(x, y, 玩家配置.尺寸 / 2 + 3, 0, Math.PI * 2);
    this.上下文.stroke();
  }

  绘制巡逻敌人() {
    const 单元格 = this.游戏配置.单元格尺寸;
    const 配置 = this.游戏配置.敌人;
    this.上下文.save();
    for (const 敌 of this.巡逻敌人列表) {
      const x = 敌.x * 单元格 + 单元格 / 2;
      const y = 敌.y * 单元格 + 单元格 / 2;
      this.上下文.fillStyle = 配置.颜色;
      this.上下文.shadowBlur = 12;
      this.上下文.shadowColor = 配置.颜色;
      this.上下文.beginPath();
      this.上下文.arc(x, y, 配置.半径, 0, Math.PI * 2);
      this.上下文.fill();
    }
    this.上下文.restore();
  }

  绘制追逐敌人() {
    const 单元格 = this.游戏配置.单元格尺寸;
    const 配置 = this.游戏配置.敌人;
    this.上下文.save();
    for (const 敌 of this.追逐敌人列表) {
      const x = 敌.x * 单元格 + 单元格 / 2;
      const y = 敌.y * 单元格 + 单元格 / 2;
      this.上下文.fillStyle = 配置.追逐颜色;
      this.上下文.shadowBlur = 14;
      this.上下文.shadowColor = 配置.追逐颜色;
      this.上下文.beginPath();
      this.上下文.arc(x, y, 配置.半径 + 2, 0, Math.PI * 2);
      this.上下文.fill();
      this.上下文.shadowBlur = 0;
      this.上下文.fillStyle = '#fff';
      this.上下文.beginPath();
      this.上下文.arc(x - 3, y - 2, 2, 0, Math.PI * 2);
      this.上下文.arc(x + 3, y - 2, 2, 0, Math.PI * 2);
      this.上下文.fill();
    }
    this.上下文.restore();
  }

  绘制道具(现在) {
    const 单元格 = this.游戏配置.单元格尺寸;
    const 配置 = this.游戏配置.道具;
    const 脉冲 = 1 + Math.sin(现在 / 250) * 0.2;
    this.上下文.save();
    for (const 道具 of this.道具列表) {
      if (道具.已拾取) continue;
      const x = 道具.x * 单元格 + 单元格 / 2;
      const y = 道具.y * 单元格 + 单元格 / 2;
      const 类型 = 道具.类型 || 'time';
      const 颜色 =
        类型 === 'freeze' ? 配置.冻结颜色 : 类型 === 'shield' ? 配置.护盾颜色 : 配置.颜色;
      this.上下文.fillStyle = 颜色;
      this.上下文.shadowBlur = 15;
      this.上下文.shadowColor = 颜色;
      this.上下文.beginPath();
      this.上下文.arc(x, y, 配置.半径 * 脉冲, 0, Math.PI * 2);
      this.上下文.fill();
      // 类型标记：time 空心点、freeze 雪花、shield 盾形符号
      this.上下文.shadowBlur = 0;
      this.上下文.fillStyle = '#fff';
      this.上下文.font = `bold ${Math.floor(配置.半径 * 1.4)}px "Courier New", monospace`;
      this.上下文.textAlign = 'center';
      this.上下文.textBaseline = 'middle';
      const 标记 = 类型 === 'freeze' ? '❄' : 类型 === 'shield' ? '🛡' : '+';
      this.上下文.fillText(标记, x, y);
    }
    this.上下文.restore();
  }
}
