import { 配置 } from '../config.js';
import { 封面图 } from '../covers.js';
import { 获取数组 } from '../i18n.js';

/** 只有登记了封面图才追加图层，否则只保留渐变底，避免发出无谓的 404 请求 */
const 背景图 = (游戏标识) =>
  封面图[游戏标识] ? `, url('${封面图[游戏标识]}')` : '';

const 游戏主题色 = {
  reaction: '#ff2a9d',
  'neon-arena': '#ff2a9d',
  'lightning-shooter': '#00f0ff',
  'star-ocean': '#a855ff',
  'mech-battle': '#ff6600',
  'dimension-maze': '#a855ff',
  'neon-defense': '#00ff88'
};

export class ViewSwitcher {
  constructor(选项) {
    this.路由 = 选项.路由;
    this.游戏管理器 = 选项.游戏管理器;
    this.显示提示 = 选项.显示提示;
    this.国际化 = 选项.国际化;
    this.大厅视图 = document.getElementById('view-lobby');
    this.游戏视图 = document.getElementById('view-game');
    this.游戏标题 = document.getElementById('game-title');
    this.游戏容器 = document.getElementById('game-container');
    this.返回按钮 = document.getElementById('btnBackToLobby');
    this.暂停按钮 = document.getElementById('btnPause');
    this.重新开始按钮 = document.getElementById('btnRestart');
    this.动画时长 = 配置.平台.视图切换动画时长;
    this.绑定事件();
  }

  绑定事件() {
    if (this.返回按钮) {
      this.返回按钮.addEventListener('click', () => {
        this.路由.导航到('/');
      });
    }

    if (this.暂停按钮) {
      this.暂停按钮.addEventListener('click', () => {
        const 游戏 = this.游戏管理器.获取当前游戏();
        if (!游戏) return;
        if (游戏.已暂停) {
          游戏.恢复();
          this.暂停按钮.textContent = this.获取文本('game.pause');
        } else {
          游戏.暂停();
          this.暂停按钮.textContent = this.获取文本('game.resume');
        }
      });
    }

    if (this.重新开始按钮) {
      this.重新开始按钮.addEventListener('click', () => {
        const 游戏 = this.游戏管理器.获取当前游戏();
        if (!游戏) return;
        // 结算遮罩必须移除，否则重开后旧结算层仍盖在画面上
        this.游戏管理器.移除结算遮罩();
        // 游戏尚未结束就手动重开时，把本局得分计入统计，避免丢分
        if (游戏.运行中 && (游戏.分数 ?? 0) > 0) {
          this.游戏管理器.状态管理器.记录游戏结束(游戏.标识, 游戏.分数 ?? 0);
        }
        游戏.停止();
        游戏.重置分数();
        游戏.启动();
      });
    }

    this.可见性处理器 = () => {
      const 游戏 = this.游戏管理器.获取当前游戏();
      if (!游戏 || !游戏.运行中) return;
      if (document.hidden) {
        游戏.暂停();
      } else {
        游戏.恢复();
      }
    };
    document.addEventListener('visibilitychange', this.可见性处理器);
  }

  销毁() {
    if (this.可见性处理器) {
      document.removeEventListener('visibilitychange', this.可见性处理器);
      this.可见性处理器 = null;
    }
  }

  获取文本(键, 变量 = {}) {
    return this.国际化 ? this.国际化(键, 变量) : 键;
  }

  显示大厅() {
    document.body.classList.remove('in-game');
    if (this.游戏视图) {
      this.游戏视图.classList.remove('active');
      this.游戏视图.removeAttribute('data-game-id');
      this.游戏视图.style.removeProperty('--accent');
      this.游戏视图.querySelectorAll('.game-bg, .game-intro').forEach((el) => el.remove());
    }
    if (this.大厅视图) {
      this.大厅视图.classList.add('active');
      const 标题 = this.大厅视图.querySelector('header');
      if (标题) 标题.focus({ preventScroll: true });
    }
  }

  async 显示游戏(游戏标识) {
    document.body.classList.add('in-game');
    const 游戏元数据 = this.游戏管理器.获取游戏元数据(游戏标识);
    if (this.游戏标题 && 游戏元数据) {
      this.游戏标题.textContent = this.获取游戏标题(游戏元数据);
    }

    if (this.大厅视图) this.大厅视图.classList.remove('active');
    if (this.游戏视图) {
      this.游戏视图.classList.add('active');
      this.游戏视图.setAttribute('data-game-id', 游戏标识);
    }

    this.应用游戏主题(游戏标识);

    if (this.暂停按钮) {
      this.暂停按钮.textContent = this.获取文本('game.pause');
    }

    setTimeout(() => {
      if (this.返回按钮) this.返回按钮.focus({ preventScroll: true });
    }, this.动画时长);
  }

  应用游戏主题(游戏标识) {
    const 视图 = this.游戏视图;
    if (!视图) return;

    视图.querySelectorAll('.game-bg, .game-intro').forEach((el) => el.remove());
    视图.style.setProperty('--accent', 游戏主题色[游戏标识] || '#00f0ff');

    const 背景 = document.createElement('div');
    背景.className = 'game-bg';
    背景.style.backgroundImage = `linear-gradient(180deg, rgba(5, 3, 15, 0.72) 0%, rgba(5, 3, 15, 0.9) 100%)${背景图(游戏标识)}`;
    视图.insertBefore(背景, 视图.firstChild);

    const 卡片 = (获取数组('cards') || []).find((c) => c.id === 游戏标识);
    const 图标 = 卡片?.icon || '🎮';
    const 标题文本 = this.游戏标题?.textContent || '';
    const 开场 = document.createElement('div');
    开场.className = 'game-intro';
    开场.innerHTML = `
      <div class="intro-grid"></div>
      <div class="intro-panel">
        <div class="intro-emoji">${图标}</div>
        <h2 class="intro-title">${标题文本}</h2>
        <div class="intro-tagline">${this.获取文本('game.enterTagline')}</div>
        <div class="intro-bar"><i></i></div>
        <div class="intro-status">INITIALIZING SYSTEM</div>
      </div>`;
    视图.appendChild(开场);
    requestAnimationFrame(() => 开场.classList.add('play'));
    setTimeout(() => 开场.remove(), 1600);
  }

  获取游戏标题(元数据) {
    if (!元数据) return '';
    const 键 = typeof 元数据.名称键 === 'function' ? 元数据.名称键() : 元数据.名称键 || '';
    return this.国际化 ? this.国际化(键) : 键;
  }
}
