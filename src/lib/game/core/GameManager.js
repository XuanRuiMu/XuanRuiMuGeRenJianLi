import { t } from '../i18n.js';

export class GameManager {
  constructor(选项) {
    this.注册表 = new Map();
    this.当前游戏 = null;
    this.当前回调 = null;
    this.本局最高分 = 0;
    this.粒子系统 = 选项.粒子系统;
    this.状态管理器 = 选项.状态管理器;
    this.国际化 = 选项.国际化;
    this.显示提示 = 选项.显示提示;
    this.重新开始 = 选项.重新开始;
    this.返回 = 选项.返回;
    this.减少动画 = 选项.减少动画 ?? false;
    this.结算遮罩 = null;
    this.游戏容器 = document.getElementById('game-container');
    this.分数面板 = document.getElementById('game-score');
    this.最高分面板 = document.getElementById('game-high-score');
  }

  注册(游戏配置) {
    this.注册表.set(游戏配置.标识, {
      类: 游戏配置.类,
      类型: 游戏配置.类型,
      名称键: 游戏配置.名称键
    });
  }

  批量注册(游戏列表) {
    游戏列表.forEach((游戏) => this.注册(游戏));
  }

  获取游戏元数据(标识) {
    return this.注册表.get(标识);
  }

  获取当前游戏() {
    return this.当前游戏;
  }

  标识存在(标识) {
    return this.注册表.has(标识);
  }

  async 加载游戏(标识) {
    const 元数据 = this.注册表.get(标识);
    if (!元数据) {
      throw new Error(`未找到游戏: ${标识}`);
    }

    await this.卸载当前游戏();

    if (!this.游戏容器) {
      throw new Error('找不到游戏容器 #game-container');
    }
    this.游戏容器.innerHTML = '';

    const 游戏容器 = document.createElement('div');
    游戏容器.className = 'game-instance';
    游戏容器.setAttribute('data-game-id', 标识);
    this.游戏容器.appendChild(游戏容器);

    const 实例 = new 元数据.类({
      标识,
      名称键: 元数据.名称键,
      类型: 元数据.类型,
      容器: 游戏容器,
      粒子系统: this.粒子系统,
      状态管理器: this.状态管理器,
      国际化: this.国际化
    });

    const 分数回调 = (数据) => this.处理分数变化(数据);
    const 结束回调 = (数据) => this.处理游戏结束(数据);
    实例.监听('分数变化', 分数回调);
    实例.监听('游戏结束', 结束回调);
    this.当前回调 = { 分数: 分数回调, 结束: 结束回调 };

    await 实例.初始化();
    await 实例.启动();

    this.当前游戏 = 实例;
    window.__neonArcade游戏 = 实例;
    this.本局最高分 = this.状态管理器.读取(`各游戏最高分.${标识}`, 0);
    this.状态管理器.记录游戏开始(标识);
    this.状态管理器.写入('当前游戏', 标识);
    this.处理分数变化({ 分数: 0 });
    this.更新最高分显示(标识);

    return 实例;
  }

  async 卸载当前游戏() {
    this.移除结算遮罩();
    if (!this.当前游戏) return;
    if (this.状态管理器.读取('当前游戏开始时间', null) !== null) {
      this.状态管理器.记录游戏结束(this.当前游戏.标识, this.当前游戏.分数 ?? 0);
    }
    if (this.当前回调) {
      this.当前游戏.取消监听('分数变化', this.当前回调.分数);
      this.当前游戏.取消监听('游戏结束', this.当前回调.结束);
      this.当前回调 = null;
    }
    await this.当前游戏.停止();
    await this.当前游戏.销毁();
    this.当前游戏 = null;
    window.__neonArcade游戏 = null;
    this.状态管理器.写入('当前游戏', null);
    if (this.游戏容器) this.游戏容器.innerHTML = '';
  }

  处理分数变化(数据) {
    if (this.分数面板) {
      this.分数面板.textContent = t('game.score', { score: 数据.分数 ?? 0 });
    }
  }

  处理游戏结束(数据) {
    const { 标识, 分数 } = 数据;
    this.状态管理器.记录游戏结束(标识, 分数);
    this.更新最高分显示(标识);
    this.移除结算遮罩();
    this.渲染结算遮罩(标识, 分数, this.本局最高分);
    this.本局最高分 = 0;
  }

  渲染结算遮罩(标识, 分数, 旧最佳) {
    const 视图 = document.getElementById('view-game');
    if (!视图) return;
    this.移除结算遮罩();
    const 遮罩 = document.createElement('div');
    const 是新纪录 = 分数 > 旧最佳 && 旧最佳 > 0;
    const 首次 = 旧最佳 === 0;
    const 目标 = Math.max(分数, 旧最佳, 1);
    const 当前填充 = this.夹取(分数 / (目标 * 1.25), 0, 1);
    const 旧填充 = 旧最佳 > 0 ? this.夹取(旧最佳 / (目标 * 1.25), 0, 1) : 0;
    const 状态文字 = 是新纪录
      ? t('game.newRecordFlag')
      : 首次
        ? t('game.firstClear')
        : t('game.missionComplete');
    const 比较文案 = 是新纪录
      ? t('game.beatBest', { score: 分数 - 旧最佳 })
      : t('game.bestLabel', { score: Math.max(分数, 旧最佳) });

    遮罩.className = 'result-overlay';
    if (是新纪录) 遮罩.classList.add('is-record');
    遮罩.innerHTML = `
      <div class="result-panel">
        <div class="result-scan" aria-hidden="true"></div>
        <div class="result-status">${状态文字}</div>
        <div class="result-score">
          <span class="result-score-num" data-target="${分数}">0</span>
          <span class="result-score-label">${t('game.scoreLabel')}</span>
        </div>
        <div class="result-rating">
          <span class="result-rating-label">${t('game.ratingLabel')}</span>
          <div class="rating-bars" aria-hidden="true">
            <i></i><i></i><i></i><i></i><i></i>
          </div>
          <span class="result-rating-letter" data-letter="D">D</span>
        </div>
        <div class="result-compare">${比较文案}</div>
        <div class="result-actions">
          <button class="neon-btn result-restart" type="button">${t('game.resultRestart')}</button>
          <button class="neon-btn result-back" type="button">${t('game.backToLobby')}</button>
        </div>
      </div>`;
    视图.appendChild(遮罩);
    this.结算遮罩 = 遮罩;

    const 重开按钮 = 遮罩.querySelector('.result-restart');
    const 返回按钮 = 遮罩.querySelector('.result-back');
    if (重开按钮)
      重开按钮.addEventListener('click', () => {
        this.移除结算遮罩();
        this.重新开始?.(标识);
      });
    if (返回按钮)
      返回按钮.addEventListener('click', () => {
        this.移除结算遮罩();
        this.返回?.();
      });

    this.播放结算动画(遮罩, 分数, 旧填充, 当前填充);
  }

  播放结算动画(遮罩, 分数, 旧填充, 当前填充) {
    const 数字元素 = 遮罩.querySelector('.result-score-num');
    const 字母元素 = 遮罩.querySelector('.result-rating-letter');
    const 段 = 遮罩.querySelectorAll('.rating-bars i');
    const 旧等级 = Math.round(旧填充 * 5);
    const 新等级 = Math.round(当前填充 * 5);
    const 字母表 = ['—', 'D', 'C', 'B', 'A', 'S'];

    const 应用等级 = (等级) => {
      const 限定 = this.夹取(等级, 0, 5);
      段.forEach((s, i) => s.classList.toggle('on', i < 限定));
      if (字母元素) 字母元素.textContent = 字母表[限定] ?? 'D';
    };

    if (this.减少动画) {
      if (数字元素) 数字元素.textContent = String(分数);
      应用等级(新等级);
      return;
    }

    const 时长 = 1100;
    const 起始 = performance.now();
    const 步进 = (现在) => {
      const 进度 = Math.min((现在 - 起始) / 时长, 1);
      const 缓动 = 1 - (1 - 进度) ** 3;
      if (数字元素) 数字元素.textContent = String(Math.floor(缓动 * 分数));
      应用等级(Math.round(旧等级 + (新等级 - 旧等级) * 缓动));
      if (进度 < 1) requestAnimationFrame(步进);
      else {
        if (数字元素) 数字元素.textContent = String(分数);
        应用等级(新等级);
      }
    };
    requestAnimationFrame(步进);
  }

  移除结算遮罩() {
    if (this.结算遮罩?.parentNode) {
      this.结算遮罩.parentNode.removeChild(this.结算遮罩);
    }
    this.结算遮罩 = null;
  }

  夹取(值, 最小, 最大) {
    return Math.max(最小, Math.min(最大, 值));
  }

  更新最高分显示(标识) {
    if (!this.最高分面板) return;
    const 最高分 = this.状态管理器.读取(`各游戏最高分.${标识}`, 0);
    this.最高分面板.textContent = t('game.highScore', { score: 最高分 });
  }
}
