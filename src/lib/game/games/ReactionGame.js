import { 配置 } from '../config.js';
import { 游戏基类 } from '../core/GameBase.js';
import { t } from '../i18n.js';
import { 创建元素 } from '../utils.js';

export class ReactionGame extends 游戏基类 {
  constructor(选项) {
    super(选项);
    this.最高分 = 0;
    this.分数元素 = null;
    this.最高分元素 = null;
    this.时间元素 = null;
    this.游戏区域 = null;
    this.目标按钮 = null;
    this.游戏结束画面 = null;
    this.剩余时间 = 0;
    this.计时器 = null;
    this.最后更新时间 = 0;
    this.计时已开始 = false;
  }

  async 初始化() {
    this.最高分 = this.状态管理器.读取(`各游戏最高分.${this.标识}`, 0);
    this.渲染();
  }

  async 启动() {
    this.运行中 = true;
    this.已暂停 = false;
    this.计时已开始 = false;
    this.重置分数();
    this.剩余时间 = 配置.游戏.reaction.时间限制;
    this.最后更新时间 = performance.now();
    this.更新分数显示();
    this.更新时间显示();
    this.隐藏游戏结束画面();
    this.随机定位目标按钮();
  }

  async 暂停() {
    this.已暂停 = true;
    this.停止计时();
  }

  async 恢复() {
    if (!this.运行中 || !this.计时已开始) return;
    this.已暂停 = false;
    this.最后更新时间 = performance.now();
    this.开始计时();
  }

  async 停止() {
    this.运行中 = false;
    this.已暂停 = false;
    this.计时已开始 = false;
    this.停止计时();
  }

  async 销毁() {
    this.停止计时();
    this.容器.innerHTML = '';
  }

  渲染() {
    this.容器.innerHTML = '';
    this.容器.className = 'game-instance reaction-game';

    const 标题 = 创建元素('h2', { class: 'game-title', text: t('games.reaction.title') });
    const 说明 = 创建元素('div', { class: 'game-instruction', text: t('games.reaction.desc') });
    this.时间元素 = 创建元素('div', {
      class: 'reaction-time',
      text: t('game.timeLeft', { time: 配置.游戏.reaction.时间限制 })
    });
    this.分数元素 = 创建元素('div', { class: 'score-display', text: '0' });
    this.最高分元素 = 创建元素('div', {
      class: 'high-score',
      text: t('game.highScore', { score: this.最高分 })
    });
    this.游戏区域 = 创建元素('div', { class: 'reaction-play-area' });
    this.目标按钮 = 创建元素('button', { class: 'target-btn', text: t('game.targetBtn') });

    this.目标按钮.addEventListener('click', (e) => this.处理点击(e));

    this.容器.appendChild(标题);
    this.容器.appendChild(说明);
    this.容器.appendChild(this.时间元素);
    this.容器.appendChild(this.分数元素);
    this.游戏区域.appendChild(this.目标按钮);
    this.容器.appendChild(this.游戏区域);
    this.容器.appendChild(this.最高分元素);

    this.游戏结束画面 = 创建元素('div', { class: 'reaction-game-over hidden' });
    const 结束标题 = 创建元素('div', { class: 'reaction-game-over-title', text: t('game.timeUp') });
    const 结束分数 = 创建元素('div', { class: 'reaction-game-over-score', text: '' });
    const 再玩按钮 = 创建元素('button', { class: 'neon-btn', text: t('game.restart') });
    再玩按钮.addEventListener('click', () => this.重新开始());

    this.游戏结束画面.appendChild(结束标题);
    this.游戏结束画面.appendChild(结束分数);
    this.游戏结束画面.appendChild(再玩按钮);
    this.游戏结束画面.结束分数元素 = 结束分数;
    this.容器.appendChild(this.游戏结束画面);
  }

  处理点击(e) {
    if (!this.运行中 || this.已暂停) return;

    if (!this.计时已开始) {
      this.计时已开始 = true;
      this.最后更新时间 = performance.now();
      this.开始计时();
    }

    this.增加分数(1);
    this.粒子系统?.生成爆炸(e.clientX, e.clientY);

    if (this.分数 > this.最高分) {
      this.最高分 = this.分数;
      this.最高分元素.textContent = t('game.highScore', { score: this.最高分 });
      this.状态管理器.写入(`各游戏最高分.${this.标识}`, this.最高分);
    }

    if (this.分数 % 配置.游戏.里程碑间隔 === 0) {
      this.国际化?.('game.milestone', { score: this.分数 });
    }

    this.随机定位目标按钮();
  }

  随机定位目标按钮() {
    if (!this.游戏区域 || !this.目标按钮) return;

    const 区域宽度 = this.游戏区域.clientWidth;
    const 区域高度 = this.游戏区域.clientHeight;
    const 按钮宽度 = this.目标按钮.offsetWidth;
    const 按钮高度 = this.目标按钮.offsetHeight;
    const 边距 = 8;

    if (区域宽度 <= 按钮宽度 || 区域高度 <= 按钮高度) return;

    const 最大左 = 区域宽度 - 按钮宽度 - 边距 * 2;
    const 最大顶 = 区域高度 - 按钮高度 - 边距 * 2;
    const 左 = 边距 + Math.random() * 最大左;
    const 顶 = 边距 + Math.random() * 最大顶;

    this.目标按钮.style.left = `${左}px`;
    this.目标按钮.style.top = `${顶}px`;
  }

  增加分数(增量 = 1) {
    super.增加分数(增量);
    this.更新分数显示();
  }

  更新分数显示() {
    if (!this.分数元素) return;
    this.分数元素.textContent = String(this.分数);
    this.分数元素.classList.add('pop');
    setTimeout(() => this.分数元素.classList.remove('pop'), 配置.hud.分数弹出时长);
  }

  开始计时() {
    this.停止计时();
    this.计时器 = requestAnimationFrame((时间戳) => this.计时循环(时间戳));
  }

  停止计时() {
    if (this.计时器 !== null) {
      cancelAnimationFrame(this.计时器);
      this.计时器 = null;
    }
  }

  计时循环(时间戳) {
    if (!this.运行中 || this.已暂停) return;

    const 增量 = (时间戳 - this.最后更新时间) / 1000;
    this.最后更新时间 = 时间戳;
    this.剩余时间 = Math.max(0, this.剩余时间 - 增量);
    this.更新时间显示();

    if (this.剩余时间 <= 0) {
      this.时间结束();
      return;
    }

    this.计时器 = requestAnimationFrame((下一时间戳) => this.计时循环(下一时间戳));
  }

  更新时间显示() {
    if (!this.时间元素) return;
    const 显示时间 = Math.ceil(this.剩余时间);
    this.时间元素.textContent = t('game.timeLeft', { time: 显示时间 });
    this.时间元素.classList.toggle('warning', 显示时间 <= 配置.游戏.reaction.时间警告阈值);
  }

  时间结束() {
    this.停止计时();
    this.结束游戏();
    this.显示游戏结束画面();
  }

  显示游戏结束画面() {
    if (!this.游戏结束画面) return;
    this.游戏结束画面.结束分数元素.textContent = t('game.score', { score: this.分数 });
    this.游戏结束画面.classList.remove('hidden');
  }

  隐藏游戏结束画面() {
    if (!this.游戏结束画面) return;
    this.游戏结束画面.classList.add('hidden');
  }

  重新开始() {
    this.重置分数();
    this.启动();
  }
}
