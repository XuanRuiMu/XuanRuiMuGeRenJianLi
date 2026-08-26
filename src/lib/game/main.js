import { 配置 } from './config.js';
import { GameManager } from './core/GameManager.js';
import { ProfileManager, 头像框预设, 头像预设 } from './core/ProfileManager.js';
import { Router } from './core/Router.js';
import { StateManager } from './core/StateManager.js';
import { ViewSwitcher } from './core/ViewSwitcher.js';
import { 获取自定义光标, 销毁自定义光标 } from './cursor.js';
import { 游戏注册表 } from './games/index.js';
import { t, 获取数组 } from './i18n.js';
import { 粒子系统 } from './particles.js';
import { 获取点击射击层, 销毁点击射击层 } from './shot.js';
import { 偏好减少动画, 创建元素 } from './utils.js';

class 霓虹终端 {
  constructor() {
    this.粒子 = null;
    this.光标 = null;
    this.射击层 = null;
    this.提示元素 = null;
    this.提示定时器 = null;
    this.网格可见 = true;
    this.输入序列 = [];
    this.减少动画 = 偏好减少动画();
    配置.功能.减少动画 = this.减少动画;
    this.初始化();
    if (typeof window !== 'undefined') window.__neonArcade终端 = this;
  }

  初始化() {
    this.注入CSS变量();
    this.设置页面元信息();
    this.绑定静态文本();
    this.渲染卡片();
    this.渲染精选();
    this.渲染特性();
    this.初始化平台计数器();
    this.初始化打字机();
    this.初始化粒子();
    this.初始化光标();
    this.初始化状态管理器();
    this.初始化档案系统();
    this.应用持久化设置();
    this.渲染战绩总览();
    this.初始化路由();
    this.初始化视图切换器();
    this.初始化游戏管理器();
    this.初始化控制面板();
    this.初始化卡片交互();
    this.初始化彩蛋();
    this.初始化提示();
    this.初始化公告();
    this.初始化侧边条();
    this.应用减少动画();
    this.处理路由变化(this.路由.获取路由信息());
    this.显示提示(t('toast.welcome'), 配置.hud.提示默认时长);
  }

  注入CSS变量() {
    const root = document.documentElement;
    root.style.setProperty('--neon-pink', 配置.颜色.霓虹粉);
    root.style.setProperty('--neon-cyan', 配置.颜色.霓虹青);
    root.style.setProperty('--neon-purple', 配置.颜色.霓虹紫);
    root.style.setProperty('--neon-yellow', 配置.颜色.霓虹黄);
    root.style.setProperty('--bg-dark', 配置.颜色.背景深);
    root.style.setProperty('--bg-dark-2', 配置.颜色.背景深二);
  }

  设置页面元信息() {
    document.title = t('meta.title');
  }

  绑定静态文本() {
    document.querySelectorAll('[data-i18n]').forEach((元素) => {
      const 键 = 元素.dataset.i18n;
      const 文本 = t(键);
      if (文本 !== 键) 元素.textContent = 文本;
    });
  }

  渲染卡片() {
    const 容器 = document.getElementById('cards');
    if (!容器) return;
    const 卡片数据 = 获取数组('cards');
    容器.innerHTML = '';
    const 封面渐变 = {
      reaction: 'linear-gradient(135deg, rgba(0,240,255,0.25), rgba(255,42,157,0.18))',
      'neon-arena': 'linear-gradient(135deg, rgba(255,42,157,0.28), rgba(168,85,255,0.22))',
      'lightning-shooter': 'linear-gradient(135deg, rgba(250,255,0,0.2), rgba(0,240,255,0.22))',
      'star-ocean': 'linear-gradient(135deg, rgba(168,85,255,0.26), rgba(0,240,255,0.2))',
      'mech-battle': 'linear-gradient(135deg, rgba(255,42,157,0.26), rgba(250,255,0,0.12))',
      'dimension-maze': 'linear-gradient(135deg, rgba(0,240,255,0.24), rgba(168,85,255,0.22))',
      'neon-defense': 'linear-gradient(135deg, rgba(168,85,255,0.28), rgba(255,42,157,0.16))'
    };
    const 难度文本 = { EASY: '简单', NORMAL: '普通', HARD: '困难' };
    卡片数据.forEach((卡片, 索引) => {
      const 卡片元素 = 创建元素('div', {
        class: 'card',
        attrs: {
          tabindex: '0',
          role: 'button',
          'aria-label': 卡片.title,
          'data-card-index': String(索引),
          'data-game-id': 卡片.id || ''
        }
      });
      卡片元素.classList.add(`card-game-${卡片.id || 卡片.title}`);

      const 媒体 = 创建元素('div', { class: 'card-media' });
      const 封面 = 创建元素('div', { class: 'card-cover' });
      const 封面色 = 封面渐变[卡片.id] || 封面渐变.reaction;
      封面.setAttribute(
        'style',
        `background:${封面色};background-image:url('images/games/${卡片.id}.png');background-size:cover;background-position:center;`
      );
      媒体.appendChild(封面);
      媒体.appendChild(创建元素('span', { class: 'card-badge', text: 卡片.icon }));
      if (卡片.rating) {
        媒体.appendChild(
          创建元素('span', { class: 'card-rating', html: `<i>★</i> ${卡片.rating}` })
        );
      }
      卡片元素.appendChild(媒体);

      卡片元素.appendChild(创建元素('h3', { text: 卡片.title }));
      卡片元素.appendChild(创建元素('p', { text: 卡片.desc }));

      const meta = 创建元素('div', { class: 'card-meta' });
      if (卡片.players) {
        meta.appendChild(创建元素('span', { class: 'card-players', text: `👥 ${卡片.players}` }));
      }
      if (卡片.difficulty) {
        meta.appendChild(
          创建元素('span', {
            class: `card-diff diff-${卡片.difficulty.toLowerCase()}`,
            text: 难度文本[卡片.difficulty] || 卡片.difficulty
          })
        );
      }
      卡片元素.appendChild(meta);

      卡片元素.appendChild(创建元素('span', { class: 'tag', text: 卡片.tag }));
      容器.appendChild(卡片元素);
    });
  }

  渲染精选() {
    const 容器 = document.getElementById('featured');
    if (!容器) return;
    const 卡片数据 = 获取数组('cards');
    const 索引 = 卡片数据.findIndex((c) => c.featured);
    const 实际索引 = 索引 >= 0 ? 索引 : 0;
    const 卡片 = 卡片数据[实际索引];
    if (!卡片) return;
    容器.innerHTML = '';

    const 内部 = 创建元素('div', { class: 'featured-inner' });

    const 媒体 = 创建元素('div', { class: 'featured-media' });
    const 精选图 = 创建元素('div', { class: 'featured-img' });
    精选图.setAttribute('style', `background-image:url('images/games/${卡片.id}.png')`);
    媒体.appendChild(精选图);
    媒体.appendChild(创建元素('div', { class: 'featured-scrim' }));
    媒体.appendChild(创建元素('span', { class: 'featured-badge', text: t('featured.badge') }));
    媒体.appendChild(创建元素('span', { class: 'featured-emoji', text: 卡片.icon }));
    媒体.appendChild(创建元素('div', { class: 'featured-glow' }));
    内部.appendChild(媒体);

    const 信息 = 创建元素('div', { class: 'featured-info' });
    信息.appendChild(创建元素('span', { class: 'section-kicker', text: t('sections.featured') }));
    信息.appendChild(创建元素('h2', { class: 'featured-title', text: 卡片.title }));
    信息.appendChild(创建元素('p', { class: 'featured-desc', text: 卡片.desc }));
    信息.appendChild(
      创建元素('div', {
        class: 'featured-meta',
        text: t('featured.stats', { players: 卡片.players || '', rating: 卡片.rating || '' })
      })
    );
    信息.appendChild(创建元素('div', { class: 'featured-note', text: t('featured.note') }));
    信息.appendChild(
      创建元素('button', {
        class: 'neon-btn big featured-cta',
        text: t('featured.cta'),
        attrs: { 'data-card-index': String(实际索引) }
      })
    );
    内部.appendChild(信息);

    容器.appendChild(内部);
  }

  渲染特性() {
    const 容器 = document.getElementById('features');
    if (!容器) return;
    const 数据 = 获取数组('features');
    容器.innerHTML = '';
    数据.forEach((项) => {
      const el = 创建元素('div', { class: 'feature' });
      el.appendChild(创建元素('span', { class: 'feature-icon', text: 项.icon }));
      el.appendChild(创建元素('h3', { text: 项.title }));
      el.appendChild(创建元素('p', { text: 项.desc }));
      容器.appendChild(el);
    });
  }

  初始化平台计数器() {
    const 容器 = document.getElementById('platformStats');
    if (!容器) return;
    const 数字元素 = 容器.querySelectorAll('.pstat-num');
    const 已动画 = new Set();
    const 动画 = (元素) => {
      if (已动画.has(元素)) return;
      已动画.add(元素);
      const 目标 = Number.parseInt(元素.dataset.target, 10) || 0;
      if (this.减少动画) {
        元素.textContent = 目标.toLocaleString('en-US');
        return;
      }
      const 时长 = 1400;
      const 起始 = performance.now();
      const 步进 = (现在) => {
        const 进度 = Math.min((现在 - 起始) / 时长, 1);
        const 缓动 = 1 - (1 - 进度) ** 3;
        元素.textContent = Math.floor(缓动 * 目标).toLocaleString('en-US');
        if (进度 < 1) requestAnimationFrame(步进);
        else 元素.textContent = 目标.toLocaleString('en-US');
      };
      requestAnimationFrame(步进);
    };
    if ('IntersectionObserver' in window) {
      const 观察器 = new IntersectionObserver(
        (条目) => {
          条目.forEach((项) => {
            if (项.isIntersecting) {
              动画(项.target);
              观察器.unobserve(项.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
      );
      数字元素.forEach((el) => 观察器.observe(el));
    }
    setTimeout(() => 数字元素.forEach(动画), 200);
  }

  初始化打字机() {
    const 元素 = document.getElementById('typingText');
    if (!元素) return;
    const 文本列表 = 获取数组('header.typing');
    if (文本列表.length === 0) return;
    let 文本索引 = 0;
    let 字符索引 = 0;
    let 删除中 = false;
    let 定时器 = null;

    const 输入 = () => {
      if (配置.功能.减少动画) {
        元素.textContent = 文本列表[文本索引];
        定时器 = setTimeout(() => {
          文本索引 = (文本索引 + 1) % 文本列表.length;
          输入();
        }, 配置.打字机.停顿);
        return;
      }
      const 当前文本 = 文本列表[文本索引];
      if (!删除中) {
        if (字符索引 < 当前文本.length) {
          元素.textContent = 当前文本.substring(0, 字符索引 + 1);
          字符索引++;
          定时器 = setTimeout(输入, 配置.打字机.输入速度);
        } else {
          定时器 = setTimeout(() => {
            删除中 = true;
            输入();
          }, 配置.打字机.停顿);
        }
      } else {
        if (字符索引 > 0) {
          元素.textContent = 当前文本.substring(0, 字符索引 - 1);
          字符索引--;
          定时器 = setTimeout(输入, 配置.打字机.删除速度);
        } else {
          删除中 = false;
          文本索引 = (文本索引 + 1) % 文本列表.length;
          定时器 = setTimeout(输入, 配置.打字机.切换停顿);
        }
      }
    };

    this.停止打字机 = () => {
      if (定时器) {
        clearTimeout(定时器);
        定时器 = null;
      }
    };

    this.打字机可见性处理器 = () => {
      if (document.hidden) {
        this.停止打字机();
      } else {
        输入();
      }
    };

    document.addEventListener('visibilitychange', this.打字机可见性处理器);

    输入();
  }

  初始化粒子() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    this.粒子 = new 粒子系统(canvas);
  }

  初始化光标() {
    this.光标 = 获取自定义光标();
    if (配置.功能.点击射击) {
      this.射击层 = 获取点击射击层();
    }
  }

  初始化状态管理器() {
    this.状态管理器 = new StateManager();
    this.更新大厅统计();
  }

  // 档案就绪后调用：把「当前已达等级 / 已完成」的战令与每日奖励真正发放到位，
  // 避免「等级够了却没到账」。静默补发（不批量弹提示），正式升级时的提示仍由渲染逻辑负责。
  同步已领战令() {
    if (!this.档案) return;
    const 总分 = this.状态管理器.读取('总分', 0);
    const 每级 = 配置.赛季.每级经验;
    const 等级 = Math.max(1, Math.floor(总分 / 每级) + 1);
    const 已领 = this.状态管理器.读取('设置.已领战令', []);
    let 变化 = false;
    配置.赛季.奖励档.forEach((档) => {
      if (档.等级 <= 等级) {
        // 已达等级：以「档案是否真正解锁」为准补发，避免历史被误标记已领却从未到账
        this.发放奖励(档.奖励.类型, 档.奖励.物品);
        if (!已领.includes(档.等级)) {
          已领.push(档.等级);
          变化 = true;
        }
      }
    });
    if (变化) this.状态管理器.写入('设置.已领战令', 已领);
  }

  同步已领每日() {
    if (!this.档案) return;
    const 每日 = this.状态管理器.读取('统计.每日', { 日期: '', 场数: 0, 分数: 0, 成就: 0 });
    const 今天 = new Date().toISOString().slice(0, 10);
    if (每日.日期 !== 今天) return; // 非今日数据：等待游戏按天重置，不补发
    const 已领 = 每日.已领 || [];
    let 变化 = false;
    配置.每日任务.forEach((任务) => {
      const 当前 = 每日[任务.字段] ?? 0;
      if (当前 >= 任务.目标) {
        // 已完成：以「档案是否真正解锁」为准补发，避免历史被误标记已领却从未到账
        this.发放奖励(任务.奖励物品.类型, 任务.奖励物品.标识);
        if (!已领.includes(任务.标识)) {
          已领.push(任务.标识);
          变化 = true;
        }
      }
    });
    if (变化) {
      每日.已领 = 已领;
      this.状态管理器.写入('统计.每日', 每日);
    }
  }

  // 发放一个头像/头像框奖励；返回新解锁的物品展示名，已拥有则返回 null
  发放奖励(类型, 标识) {
    if (!this.档案) return null;
    const 是头像 = 类型 === 'avatar';
    const 名称 = 是头像 ? this.档案.取头像预设(标识).名称 : this.档案.取头像框预设(标识).名称;
    const 新解锁 = 是头像 ? this.档案.解锁头像(标识) : this.档案.解锁头像框(标识);
    if (新解锁) {
      this.渲染档案显示();
      return 名称;
    }
    return null;
  }

  奖励物品标签(类型, 标识) {
    if (类型 === 'avatar') {
      const 预设 = 头像预设.find((项) => 项.id === 标识) || { emoji: '🎁', 名称: 标识 };
      return `${预设.emoji} ${预设.名称} 头像`;
    }
    const 框 = 头像框预设.find((项) => 项.id === 标识) || { 名称: 标识 };
    return `${框.名称} 头像框`;
  }

  初始化路由() {
    this.路由 = new Router();
    this.路由.监听('routechange', (信息) => this.处理路由变化(信息));
  }

  初始化视图切换器() {
    this.视图切换器 = new ViewSwitcher({
      路由: this.路由,
      游戏管理器: this.游戏管理器 ?? { 获取当前游戏: () => null, 获取游戏元数据: () => null },
      显示提示: (键, 变量) => this.显示提示(t(键, 变量)),
      国际化: (键, 变量) => t(键, 变量)
    });
  }

  初始化游戏管理器() {
    this.游戏管理器 = new GameManager({
      粒子系统: this.粒子,
      状态管理器: this.状态管理器,
      国际化: (键, 变量) => t(键, 变量),
      显示提示: (键, 变量) => this.显示提示(t(键, 变量)),
      减少动画: 配置.功能.减少动画 ?? false,
      重新开始: async (标识) => {
        await this.游戏管理器.卸载当前游戏();
        await this.游戏管理器.加载游戏(标识);
      },
      返回: () => this.路由.导航到('/')
    });
    this.游戏管理器.批量注册(游戏注册表);

    // 视图切换器依赖游戏管理器，创建后重新赋值
    this.视图切换器.游戏管理器 = this.游戏管理器;
  }

  初始化公告() {
    const 轨道 = document.getElementById('marqueeTrack');
    if (!轨道) return;
    const 公告 = 获取数组('announcements');
    if (!公告 || 公告.length === 0) return;
    const 片段 = 公告
      .map(
        (项, 索引) =>
          `<span class="marquee-item" role="button" tabindex="0" data-announce="${索引}">${项.title}</span>`
      )
      .join('');
    // 复制一份实现无缝循环
    轨道.innerHTML = 片段 + 片段;
    轨道.querySelectorAll('.marquee-item').forEach((元素) => {
      const 索引 = Number.parseInt(元素.dataset.announce, 10);
      元素.addEventListener('click', () => this.打开公告(索引));
      元素.addEventListener('keydown', (事件) => {
        if (事件.key === 'Enter' || 事件.key === ' ') {
          事件.preventDefault();
          this.打开公告(索引);
        }
      });
    });

    const 弹窗 = document.getElementById('announceModal');
    if (弹窗 && !弹窗.dataset.bound) {
      弹窗.dataset.bound = '1';
      const 关闭 = () => this.关闭公告();
      弹窗.addEventListener('click', (事件) => {
        if (事件.target === 弹窗) 关闭();
      });
      const 关闭按钮 = document.getElementById('announceModalClose');
      if (关闭按钮) 关闭按钮.addEventListener('click', 关闭);
      this.公告按键处理器 = (事件) => {
        if (事件.key === 'Escape' && 弹窗.classList.contains('open')) 关闭();
      };
      document.addEventListener('keydown', this.公告按键处理器);
    }
  }

  打开公告(索引) {
    const 公告 = 获取数组('announcements');
    const 项 = 公告?.[索引];
    const 弹窗 = document.getElementById('announceModal');
    const 标题 = document.getElementById('announceModalHead');
    const 正文 = document.getElementById('announceModalText');
    if (!弹窗 || !项) return;
    if (标题) 标题.textContent = 项.title;
    if (正文) 正文.textContent = 项.body;
    弹窗.classList.add('open');
    弹窗.setAttribute('aria-hidden', 'false');
  }

  关闭公告() {
    const 弹窗 = document.getElementById('announceModal');
    if (!弹窗) return;
    弹窗.classList.remove('open');
    弹窗.setAttribute('aria-hidden', 'true');
  }

  处理路由变化(信息) {
    const { 视图, 参数 } = 信息;
    if (视图 === 'lobby') {
      this.游戏管理器.卸载当前游戏();
      this.视图切换器.显示大厅();
      this.更新大厅统计();
    } else if (视图 === 'game') {
      const 标识 = 参数.id;
      if (!this.游戏管理器.标识存在(标识)) {
        this.显示提示(t('router.unknown'));
        this.路由.导航到('/', { replace: true });
        return;
      }
      this.视图切换器.显示游戏(标识);
      this.游戏管理器.加载游戏(标识).catch((错误) => {
        console.error(错误);
        this.显示提示(t('game.unknown'));
      });
    } else {
      this.显示提示(t('router.unknown'));
      this.路由.导航到('/', { replace: true });
    }
  }

  更新大厅统计() {
    this.渲染战绩总览();
    this.渲染最近游玩();
    this.渲染排行榜();
    this.渲染侧边条();
  }

  渲染战绩总览() {
    const 总分 = this.状态管理器.读取('总分', 0);
    const 成就 = this.状态管理器.读取('成就', {});
    const 总数 = Object.keys(成就).length;
    const 已解锁 = Object.values(成就).filter((a) => a.已解锁).length;
    const 统计 = this.状态管理器.读取('统计', {});
    const 总次数 = 统计.总游玩次数 ?? 0;
    const 总时长 = 统计.总游戏时长 ?? 0;

    const 军衔元素 = document.getElementById('profileRank');
    if (军衔元素) 军衔元素.textContent = this.计算军衔(总分);
    const 等级元素 = document.getElementById('profileLevel');
    if (等级元素) 等级元素.textContent = String(this.计算等级(总分));

    this.动画数字(document.getElementById('profileScore'), 总分);
    this.动画数字(document.getElementById('profilePlays'), 总次数);
    const 时长元素 = document.getElementById('profileTime');
    if (时长元素) 时长元素.textContent = this.格式化时长(总时长);
    const 成就元素 = document.getElementById('profileAch');
    if (成就元素) 成就元素.textContent = `${已解锁}/${总数}`;

    this.渲染成就徽章(成就);
  }

  计算军衔(总分) {
    if (总分 >= 6000) return t('profile.rankLegend');
    if (总分 >= 3000) return t('profile.rankAce');
    if (总分 >= 1000) return t('profile.rankElite');
    if (总分 >= 500) return t('profile.rankVeteran');
    if (总分 >= 100) return t('profile.rankRookie');
    return t('profile.rankNewbie');
  }

  计算等级(总分) {
    return Math.max(1, Math.floor(总分 / 250) + 1);
  }

  动画数字(元素, 目标) {
    if (!元素) return;
    if (this.减少动画) {
      元素.textContent = 目标.toLocaleString('en-US');
      元素.dataset.current = String(目标);
      return;
    }
    const 起始值 = Number.parseInt(元素.dataset.current ?? '0', 10) || 0;
    const 时长 = 1200;
    const 开始 = performance.now();
    const 步进 = (现在) => {
      const 进度 = Math.min((现在 - 开始) / 时长, 1);
      const 缓动 = 1 - (1 - 进度) ** 3;
      const 当前 = Math.floor(起始值 + (目标 - 起始值) * 缓动);
      元素.textContent = 当前.toLocaleString('en-US');
      if (进度 < 1) requestAnimationFrame(步进);
      else {
        元素.textContent = 目标.toLocaleString('en-US');
        元素.dataset.current = String(目标);
      }
    };
    requestAnimationFrame(步进);
  }

  渲染成就徽章(成就) {
    const 容器 = document.getElementById('profileAchievements');
    if (!容器) return;
    容器.innerHTML = '';
    const 图标 = {
      firstGame: '🎮',
      score100: '💯',
      score500: '🔥',
      playAll: '🌐',
      collector: '🏆',
      marathon: '⏱️'
    };
    Object.entries(配置.平台.成就列表).forEach(([标识, 定义]) => {
      const 数据 = 成就[标识] ?? { 已解锁: false };
      const 项 = 创建元素('div', {
        class: `achievement-item${数据.已解锁 ? ' unlocked' : ' locked'}`,
        attrs: { title: 数据.已解锁 ? t('profile.achUnlocked') : t('profile.achLocked') }
      });
      项.appendChild(创建元素('div', { class: 'achievement-icon', text: 图标[标识] ?? '⭐' }));
      const 文本区 = 创建元素('div', { class: 'achievement-text' });
      文本区.appendChild(创建元素('div', { class: 'achievement-name', text: t(定义.名称键) }));
      文本区.appendChild(创建元素('div', { class: 'achievement-desc', text: t(定义.描述键) }));
      项.appendChild(文本区);
      if (数据.已解锁) 项.appendChild(创建元素('div', { class: 'achievement-flag', text: '✓' }));
      容器.appendChild(项);
    });
  }

  格式化时长(毫秒) {
    const 秒 = Math.floor(毫秒 / 1000);
    const 分 = Math.floor(秒 / 60);
    const 时 = Math.floor(分 / 60);
    if (时 > 0) return t('stats.timeHours', { h: 时, m: 分 % 60, s: 秒 % 60 });
    if (分 > 0) return t('stats.timeMinutes', { m: 分, s: 秒 % 60 });
    return t('stats.timeSeconds', { s: 秒 });
  }

  游戏名(标识) {
    const 卡片 = 获取数组('cards').find((c) => c.id === 标识);
    return 卡片 ? 卡片.title : 标识;
  }

  相对时间(时间ISO) {
    const 时间 = new Date(时间ISO).getTime();
    if (Number.isNaN(时间)) return '';
    const 差值 = Date.now() - 时间;
    const 分 = Math.floor(差值 / 60000);
    if (分 < 1) return t('stats.timeSeconds', { s: Math.floor(差值 / 1000) || 1 });
    if (分 < 60) return t('stats.timeMinutes', { m: 分, s: 0 });
    const 时 = Math.floor(分 / 60);
    if (时 < 24) return t('stats.timeHours', { h: 时, m: 分 % 60, s: 0 });
    const 天 = Math.floor(时 / 24);
    return `${天} 天前`;
  }

  渲染最近游玩() {
    const 容器 = document.getElementById('recentList');
    if (!容器) return;
    容器.innerHTML = '';
    const 记录 = this.状态管理器.读取('统计.最近游玩', []);
    if (!记录 || 记录.length === 0) {
      容器.appendChild(创建元素('div', { class: 'empty-hint', text: t('profile.noRecent') }));
      return;
    }
    记录
      .slice(-5)
      .reverse()
      .forEach((项) => {
        const 行 = 创建元素('div', { class: 'recent-item' });
        行.appendChild(创建元素('span', { class: 'recent-name', text: this.游戏名(项.游戏标识) }));
        const 右 = 创建元素('div', { class: 'recent-right' });
        右.appendChild(创建元素('span', { class: 'recent-score', text: `${项.分数}分` }));
        右.appendChild(创建元素('span', { class: 'recent-time', text: this.相对时间(项.时间) }));
        行.appendChild(右);
        容器.appendChild(行);
      });
  }

  渲染排行榜() {
    const 容器 = document.getElementById('leaderboard');
    if (!容器) return;
    容器.innerHTML = '';
    const 高分 = this.状态管理器.读取('各游戏最高分', {});
    const 列表 = Object.entries(高分)
      .map(([标识, 分]) => ({ 标识, 分, 名称: this.游戏名(标识) }))
      .filter((项) => 项.分 > 0)
      .sort((a, b) => b.分 - a.分)
      .slice(0, 5);
    if (列表.length === 0) {
      容器.appendChild(创建元素('div', { class: 'empty-hint', text: t('profile.lbEmpty') }));
      return;
    }
    const 最高 = 列表[0].分;
    列表.forEach((项, 索引) => {
      const 行 = 创建元素('div', { class: 'lb-item' });
      行.appendChild(
        创建元素('span', { class: `lb-rank rank-${索引 + 1}`, text: String(索引 + 1) })
      );
      行.appendChild(创建元素('span', { class: 'lb-name', text: 项.名称 }));
      const 分容器 = 创建元素('div', { class: 'lb-score-wrap' });
      const 条 = 创建元素('div', { class: 'lb-bar' });
      const 填充 = 创建元素('div', { class: 'lb-fill' });
      填充.style.width = `${最高 > 0 ? Math.max(8, (项.分 / 最高) * 100) : 0}%`;
      条.appendChild(填充);
      分容器.appendChild(条);
      分容器.appendChild(创建元素('span', { class: 'lb-score', text: String(项.分) }));
      行.appendChild(分容器);
      容器.appendChild(行);
    });
  }

  渲染侧边条() {
    this.渲染赛季通行证();
    this.渲染每日任务();
  }

  渲染赛季通行证() {
    const 等级元素 = document.getElementById('seasonLevel');
    const 填充元素 = document.getElementById('seasonFill');
    const 经验元素 = document.getElementById('seasonXp');
    const 奖励容器 = document.getElementById('seasonRewards');
    if (!等级元素 || !填充元素) return;

    const 总分 = this.状态管理器.读取('总分', 0);
    const 每级 = 配置.赛季.每级经验;
    const 等级 = Math.max(1, Math.floor(总分 / 每级) + 1);
    const 当前级进度 = 总分 - (等级 - 1) * 每级;
    const 比例 = Math.min(100, (当前级进度 / 每级) * 100);

    等级元素.textContent = String(等级);
    填充元素.style.width = `${比例}%`;
    if (经验元素) 经验元素.textContent = t('side.seasonXp', { cur: 当前级进度, next: 每级 });

    if (奖励容器) {
      奖励容器.innerHTML = '';
      const 已领 = this.状态管理器.读取('设置.已领战令', []);
      const 新得 = [];
      配置.赛季.奖励档.forEach((档) => {
        const 已解锁 = 等级 >= 档.等级;
        // 达到等级但尚未领取：发放奖励并记录
        if (已解锁 && !已领.includes(档.等级)) {
          const 名称 = this.发放奖励(档.奖励.类型, 档.奖励.物品);
          if (名称) 新得.push(this.奖励物品标签(档.奖励.类型, 档.奖励.物品));
          已领.push(档.等级);
        }
        const 项 = 创建元素('div', {
          class: `season-reward${已解锁 ? ' unlocked' : ''}`,
          attrs: { title: this.奖励物品标签(档.奖励.类型, 档.奖励.物品) }
        });
        项.appendChild(创建元素('span', { class: 'reward-lv', text: `Lv.${档.等级}` }));
        项.appendChild(
          创建元素('span', {
            class: 'reward-name',
            text: this.奖励物品标签(档.奖励.类型, 档.奖励.物品)
          })
        );
        项.appendChild(创建元素('span', { class: 'reward-flag', text: 已解锁 ? '✓' : '🔒' }));
        奖励容器.appendChild(项);
      });
      if (新得.length > 0) {
        this.状态管理器.写入('设置.已领战令', 已领);
        const 提示 =
          新得.length > 2
            ? t('side.battlePassMany', { n: 新得.length })
            : t('side.battlePassGot', { items: 新得.join('、') });
        this.显示提示(提示);
      }
    }
  }

  渲染每日任务() {
    const 容器 = document.getElementById('dailyList');
    if (!容器) return;
    容器.innerHTML = '';
    const 每日 = this.状态管理器.读取('统计.每日', { 日期: '', 场数: 0, 分数: 0, 成就: 0 });
    const 已领 = 每日.已领 || [];
    const 新得 = [];
    配置.每日任务.forEach((任务) => {
      const 当前 = 每日[任务.字段] ?? 0;
      const 完成 = 当前 >= 任务.目标;
      // 已完成但尚未领取：发放奖励并记录到当日已领
      if (完成 && !已领.includes(任务.标识)) {
        const 名称 = this.发放奖励(任务.奖励物品.类型, 任务.奖励物品.标识);
        if (名称) 新得.push(this.奖励物品标签(任务.奖励物品.类型, 任务.奖励物品.标识));
        已领.push(任务.标识);
      }
      const 比例 = Math.min(100, (当前 / 任务.目标) * 100);
      const 已领取 = 已领.includes(任务.标识);
      const 项 = 创建元素('div', {
        class: `daily-item${完成 ? ' done' : ''}${已领取 ? ' claimed' : ''}`
      });
      const 头部 = 创建元素('div', { class: 'daily-head' });
      头部.appendChild(创建元素('span', { class: 'daily-name', text: t(任务.名称键) }));
      头部.appendChild(创建元素('span', { class: 'daily-reward', text: 任务.奖励 }));
      项.appendChild(头部);
      const 条 = 创建元素('div', { class: 'daily-bar' });
      const 填充 = 创建元素('div', { class: 'daily-fill' });
      填充.style.width = `${比例}%`;
      条.appendChild(填充);
      项.appendChild(条);
      项.appendChild(
        创建元素('div', {
          class: 'daily-progress',
          text: t(任务.进度键, { n: Math.min(当前, 任务.目标) })
        })
      );
      项.appendChild(
        创建元素('div', {
          class: `daily-status ${完成 ? 'done' : ''}`,
          text: 已领取 ? t('side.claimed') : 完成 ? t('side.done') : t('side.claim')
        })
      );
      容器.appendChild(项);
    });
    if (新得.length > 0) {
      每日.已领 = 已领;
      this.状态管理器.写入('统计.每日', 每日);
      const 提示 =
        新得.length > 2
          ? t('side.dailyMany', { n: 新得.length })
          : t('side.dailyGot', { items: 新得.join('、') });
      this.显示提示(提示);
    }
  }

  初始化控制面板() {
    const 状态显示 = document.getElementById('statusDisplay');
    const 设置状态 = (文本) => {
      if (状态显示) 状态显示.textContent = 文本;
    };

    const 绑定按钮 = (id, 处理函数) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', 处理函数);
    };

    绑定按钮('btnCyan', () => this.设置主题模式('青', t('controlPanel.buttons.cyan')));
    绑定按钮('btnPink', () => this.设置主题模式('粉', t('controlPanel.buttons.pink')));
    绑定按钮('btnPurple', () => this.设置主题模式('紫', t('controlPanel.buttons.purple')));

    绑定按钮('btnTheme', () => {
      const 当前 = this.状态管理器.获取设置项('明暗', 配置.主题.明暗默认);
      const 目标 = 当前 === 'dark' ? 'light' : 'dark';
      this.状态管理器.设置设置项('明暗', 目标);
      this.应用主题();
      const btn = document.getElementById('btnTheme');
      if (btn) {
        const 浅色 = 目标 === 'light';
        btn.textContent = t(
          浅色 ? 'controlPanel.buttons.themeDark' : 'controlPanel.buttons.themeLight'
        );
      }
      this.显示提示(t(目标 === 'light' ? 'toast.themeLight' : 'toast.themeDark'));
    });

    document.querySelectorAll('.swatch').forEach((色块) => {
      色块.addEventListener('click', () => {
        const 颜色 = 色块.dataset.color;
        this.状态管理器.设置设置项('强调色', 颜色);
        this.应用主题();
        const 选择器 = document.getElementById('accentPicker');
        if (选择器) 选择器.value = 颜色;
        this.显示提示(t('toast.accent'));
      });
    });

    const 取色器 = document.getElementById('accentPicker');
    if (取色器) {
      取色器.addEventListener('input', () => {
        const 颜色 = 取色器.value;
        this.状态管理器.设置设置项('强调色', 颜色);
        this.应用主题();
        this.显示提示(t('toast.accent'));
      });
    }

    绑定按钮('btnGrid', () => {
      this.网格可见 = !this.网格可见;
      document.body.classList.toggle('no-grid', !this.网格可见);
      设置状态(this.网格可见 ? t('status.gridOn') : t('status.gridOff'));
      this.显示提示(this.网格可见 ? t('toast.gridOn') : t('toast.gridOff'));
    });

    绑定按钮('btnTime', () => {
      const 现在 = new Date();
      const 时间 = 现在.toLocaleTimeString('zh-CN', { hour12: false });
      const 日期 = 现在.toLocaleDateString('zh-CN');
      设置状态(t('status.time', { date: 日期, time: 时间 }));
      this.显示提示(t('toast.time'));
    });

    绑定按钮('btnCursor', () => {
      const 开启 = this.光标.开关();
      this.状态管理器.设置设置项('自定义光标', 开启);
      设置状态(t(开启 ? 'accessibility.cursorOn' : 'accessibility.cursorOff'));
      this.显示提示(t(开启 ? 'accessibility.cursorOn' : 'accessibility.cursorOff'));
    });

    绑定按钮('btnReducedMotion', () => {
      配置.功能.减少动画 = !配置.功能.减少动画;
      this.状态管理器.设置设置项('减少动画', 配置.功能.减少动画);
      this.应用减少动画();
      设置状态(
        t(配置.功能.减少动画 ? 'accessibility.reducedMotionOn' : 'accessibility.reducedMotionOff')
      );
      this.显示提示(
        t(配置.功能.减少动画 ? 'accessibility.reducedMotionOn' : 'accessibility.reducedMotionOff')
      );
    });
  }

  应用减少动画() {
    document.body.classList.toggle('reduced-motion', 配置.功能.减少动画);
  }

  应用持久化设置() {
    const 主题 = this.状态管理器.获取设置项('主题', 配置.主题.默认模式);
    const 主题颜色 = 配置.模式颜色[主题];
    if (主题颜色 && this.粒子) {
      this.粒子.设置颜色(主题颜色);
    }

    const 减少动画 = this.状态管理器.获取设置项('减少动画', 配置.功能.减少动画);
    if (减少动画 !== 配置.功能.减少动画) {
      配置.功能.减少动画 = 减少动画;
      this.减少动画 = 减少动画;
      this.应用减少动画();
    }

    const 自定义光标 = this.状态管理器.获取设置项('自定义光标', 配置.功能.自定义光标);
    if (this.光标 && this.光标.启用中 !== 自定义光标) {
      this.光标.开关();
    }

    this.应用主题();
  }

  应用主题() {
    const 明暗 = this.状态管理器.获取设置项('明暗', 配置.主题.明暗默认);
    const 强调色 = this.状态管理器.获取设置项('强调色', '');
    const 模式 = this.状态管理器.获取设置项('主题', 配置.主题.默认模式);
    const 颜色 = 强调色 || 配置.模式颜色[模式] || 配置.主题.强调色默认;
    document.documentElement.setAttribute('data-theme', 明暗);
    document.documentElement.style.setProperty('--accent', 颜色);
    if (this.粒子) this.粒子.设置颜色(颜色);
  }

  设置主题模式(模式, 提示键) {
    const 颜色 = 配置.模式颜色[模式];
    if (this.粒子) this.粒子.设置颜色(颜色);
    this.状态管理器.设置设置项('主题', 模式);
    this.状态管理器.设置设置项('强调色', '');
    this.应用主题();
    const 状态显示 = document.getElementById('statusDisplay');
    if (状态显示) 状态显示.textContent = t('status.mode', { mode: 提示键 });
    this.显示提示(t('toast.mode', { mode: 提示键 }));
  }

  初始化卡片交互() {
    const 容器 = document.getElementById('cards');
    if (!容器) return;
    const 卡片数据 = 获取数组('cards');
    容器.addEventListener('click', (e) => {
      const 卡片 = e.target.closest('.card');
      if (!卡片) return;
      const 索引 = Number.parseInt(卡片.dataset.cardIndex, 10);
      const 数据 = 卡片数据[索引];
      if (!数据 || !数据.id) return;
      this.粒子.生成爆炸(e.clientX, e.clientY);
      this.路由.导航到(`/game/${数据.id}`);
    });

    容器.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const 卡片 = e.target.closest('.card');
      if (!卡片) return;
      e.preventDefault();
      卡片.click();
    });

    const 精选容器 = document.getElementById('featured');
    if (精选容器) {
      精选容器.addEventListener('click', (e) => {
        const 按钮 = e.target.closest('.featured-cta');
        if (!按钮) return;
        const 索引 = Number.parseInt(按钮.dataset.cardIndex, 10);
        const 数据 = 获取数组('cards')[索引];
        if (!数据 || !数据.id) return;
        this.粒子.生成爆炸(e.clientX, e.clientY);
        this.路由.导航到(`/game/${数据.id}`);
      });
    }
  }

  初始化彩蛋() {
    const 目标 = 配置.彩蛋.代码;
    this.彩蛋处理器 = (e) => {
      this.输入序列.push(e.key);
      if (this.输入序列.length > 目标.length) this.输入序列.shift();
      if (this.输入序列.join(',') === 目标.join(',')) {
        e.preventDefault();
        this.显示提示(t('toast.easterEgg'));
        document.body.style.animation = 'bgPulse 0.3s ease-in-out infinite alternate';
        setTimeout(() => {
          document.body.style.animation = '';
        }, 3000);
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            this.粒子.生成爆炸(
              Math.random() * window.innerWidth,
              Math.random() * window.innerHeight
            );
          }, i * 200);
        }
        this.输入序列 = [];
      }
    };
    document.addEventListener('keydown', this.彩蛋处理器);
  }

  初始化提示() {
    this.提示元素 = document.getElementById('toast');
  }

  初始化侧边条() {
    const 面板 = document.getElementById('sidePanel');
    const 切换 = document.getElementById('sideToggle');
    if (面板 && 切换) {
      切换.addEventListener('click', () => {
        面板.classList.toggle('collapsed');
        const 收起 = 面板.classList.contains('collapsed');
        切换.setAttribute('aria-label', 收起 ? '展开侧边条' : '收起侧边条');
        切换.textContent = 收起 ? '›' : '‹';
      });
    }

    const 主题按钮 = document.getElementById('btnTheme');
    if (主题按钮) {
      const 浅色 = this.状态管理器.获取设置项('明暗', 配置.主题.明暗默认) === 'light';
      主题按钮.textContent = t(
        浅色 ? 'controlPanel.buttons.themeDark' : 'controlPanel.buttons.themeLight'
      );
    }

    const 取色器 = document.getElementById('accentPicker');
    if (取色器) {
      const 强调色 = this.状态管理器.获取设置项('强调色', '');
      if (强调色) 取色器.value = 强调色;
    }
  }

  初始化档案系统() {
    this.档案 = new ProfileManager(this.状态管理器);
    this.渲染档案显示();
    this.初始化档案奖励订阅();
    this.初始化档案编辑器();
    // 档案就绪后再补发历史已达等级 / 已完成的奖励（静默解锁，不打扰）
    this.同步已领战令();
    this.同步已领每日();
  }

  // 订阅成就解锁事件，解锁时发放对应头像/头像框奖励
  初始化档案奖励订阅() {
    Object.entries(配置.平台.成就列表).forEach(([标识, 定义]) => {
      if (!定义.奖励) return;
      this.状态管理器.订阅(`成就.${标识}`, (数据) => {
        if (数据?.已解锁) {
          const 名称 = this.发放奖励(定义.奖励.类型, 定义.奖励.标识);
          if (名称) {
            this.显示提示(
              t('profile.rewardUnlocked', {
                type: t(定义.奖励.类型 === 'avatar' ? 'profile.itemAvatar' : 'profile.itemFrame'),
                name: 名称
              })
            );
          }
        }
      });
    });
  }

  渲染档案显示() {
    const 档案 = this.档案.读取档案();
    const 头像容器 = document.getElementById('profileAvatarWrap');
    if (头像容器) {
      头像容器.innerHTML = '';
      头像容器.appendChild(this.档案.构建头像元素(档案));
    }
    const 昵称元素 = document.getElementById('profileName');
    if (昵称元素) 昵称元素.textContent = 档案.昵称;
    const 芯片 = document.getElementById('hudProfileBtn');
    if (芯片) {
      芯片.innerHTML = '';
      芯片.appendChild(this.档案.构建头像元素(档案, 'small'));
      芯片.appendChild(创建元素('span', { class: 'hud-profile-name', text: 档案.昵称 }));
    }
  }

  初始化档案编辑器() {
    const 遮罩 = 创建元素('div', {
      class: 'modal-overlay profile-modal',
      attrs: { id: 'profileModal', 'aria-hidden': 'true' }
    });
    const 卡片 = 创建元素('div', {
      class: 'modal-card profile-modal-card',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'profileModalTitle' }
    });

    卡片.appendChild(
      创建元素('button', {
        class: 'modal-close',
        attrs: { id: 'profileModalClose', 'aria-label': '关闭' },
        text: '✕'
      })
    );
    卡片.appendChild(
      创建元素('h3', {
        class: 'modal-title',
        attrs: { id: 'profileModalTitle' },
        text: '// 个人资料 //'
      })
    );

    const 预览区 = 创建元素('div', { class: 'pf-preview' });
    预览区.appendChild(
      创建元素('div', { class: 'pf-preview-avatar', attrs: { id: 'pfPreviewAvatar' } })
    );
    预览区.appendChild(
      创建元素('div', {
        class: 'pf-preview-name',
        attrs: { id: 'pfPreviewName' },
        text: 'NEON 特工'
      })
    );
    卡片.appendChild(预览区);

    卡片.appendChild(
      创建元素('div', {
        class: 'pf-tip',
        text: '🔒 灰色项为需解锁内容：完成战令等级、每日任务或成就即可获得对应头像 / 头像框。'
      })
    );

    const 昵称区 = 创建元素('div', { class: 'pf-field' });
    昵称区.appendChild(
      创建元素('label', { class: 'pf-label', attrs: { for: 'pfNickname' }, text: '游戏昵称' })
    );
    昵称区.appendChild(
      创建元素('input', {
        class: 'pf-input',
        attrs: {
          id: 'pfNickname',
          type: 'text',
          maxlength: '12',
          placeholder: '输入昵称（最多 12 字）'
        }
      })
    );
    卡片.appendChild(昵称区);

    const 头像区 = 创建元素('div', { class: 'pf-field' });
    头像区.appendChild(创建元素('div', { class: 'pf-label', text: '游戏头像' }));
    const 头像网格 = 创建元素('div', { class: 'pf-grid', attrs: { id: 'pfAvatarGrid' } });
    this.构建档案网格(头像网格, 头像预设, 'avatar', (预设) => ({
      头像: 预设.id,
      头像框: 'frame-none'
    }));
    头像区.appendChild(头像网格);
    卡片.appendChild(头像区);

    const 框区 = 创建元素('div', { class: 'pf-field' });
    框区.appendChild(创建元素('div', { class: 'pf-label', text: '头像框' }));
    const 框网格 = 创建元素('div', { class: 'pf-grid', attrs: { id: 'pfFrameGrid' } });
    this.构建档案网格(框网格, 头像框预设, 'frame', (框) => ({
      头像: this.档案.默认.头像,
      头像框: 框.id
    }));
    框区.appendChild(框网格);
    卡片.appendChild(框区);

    this.头像网格 = 头像网格;
    this.框网格 = 框网格;

    const 操作区 = 创建元素('div', { class: 'pf-actions' });
    操作区.appendChild(
      创建元素('button', {
        class: 'neon-btn',
        attrs: { id: 'pfCancelBtn', type: 'button' },
        text: '取消'
      })
    );
    操作区.appendChild(
      创建元素('button', {
        class: 'neon-btn pink',
        attrs: { id: 'pfSaveBtn', type: 'button' },
        text: '保存资料'
      })
    );
    卡片.appendChild(操作区);

    遮罩.appendChild(卡片);
    document.body.appendChild(遮罩);
    this.档案弹窗 = 遮罩;

    const 关闭 = () => this.关闭档案编辑器();
    遮罩.addEventListener('click', (e) => {
      if (e.target === 遮罩) 关闭();
    });
    卡片.querySelector('#profileModalClose').addEventListener('click', 关闭);
    this.档案按键处理器 = (e) => {
      if (e.key === 'Escape' && 遮罩.classList.contains('open')) 关闭();
    };
    document.addEventListener('keydown', this.档案按键处理器);

    [document.getElementById('btnEditProfile'), document.getElementById('hudProfileBtn')].forEach(
      (btn) => {
        if (btn) btn.addEventListener('click', () => this.打开档案编辑器());
      }
    );

    头像网格.addEventListener('click', (e) => {
      const 项 = e.target.closest('.pf-option');
      if (!项) return;
      if (项.dataset.locked === '1') {
        this.显示提示(
          `🔒 ${this.档案.取头像预设(项.dataset.avatar).名称}：${this.档案.解锁说明('avatar', 项.dataset.avatar)}`
        );
        return;
      }
      this.编辑草稿.头像 = 项.dataset.avatar;
      this.刷新编辑选择();
    });
    框网格.addEventListener('click', (e) => {
      const 项 = e.target.closest('.pf-option');
      if (!项) return;
      if (项.dataset.locked === '1') {
        this.显示提示(
          `🔒 ${this.档案.取头像框预设(项.dataset.frame).名称}：${this.档案.解锁说明('frame', 项.dataset.frame)}`
        );
        return;
      }
      this.编辑草稿.头像框 = 项.dataset.frame;
      this.刷新编辑选择();
    });
    const 昵称输入 = 卡片.querySelector('#pfNickname');
    昵称输入.addEventListener('input', () => {
      this.编辑草稿.昵称 = 昵称输入.value;
      this.刷新编辑预览();
    });

    卡片.querySelector('#pfCancelBtn').addEventListener('click', 关闭);
    卡片.querySelector('#pfSaveBtn').addEventListener('click', () => this.保存档案());
  }

  // 构建/重建选择网格；会按当前解锁状态刷新锁定样式、锁标与解锁提示
  构建档案网格(网格, 列表, 类型, 取档案) {
    if (!网格) return;
    网格.innerHTML = '';
    列表.forEach((预设) => {
      const 锁定 =
        类型 === 'avatar' ? !this.档案.是头像解锁(预设.id) : !this.档案.是头像框解锁(预设.id);
      const 项 = 创建元素('button', {
        class: `pf-option${锁定 ? ' locked' : ''}`,
        attrs: {
          type: 'button',
          'data-avatar': 类型 === 'avatar' ? 预设.id : undefined,
          'data-frame': 类型 === 'frame' ? 预设.id : undefined,
          title: 预设.名称,
          'data-locked': 锁定 ? '1' : ''
        }
      });
      项.appendChild(this.档案.构建头像元素({ 昵称: '', ...取档案(预设) }, 'grid'));
      if (锁定) {
        项.appendChild(创建元素('div', { class: 'pf-lock', text: '🔒' }));
        项.appendChild(
          创建元素('div', { class: 'pf-lock-hint', text: this.档案.解锁说明(类型, 预设.id) })
        );
      }
      网格.appendChild(项);
    });
  }

  打开档案编辑器() {
    if (!this.档案弹窗) return;
    this.编辑草稿 = { ...this.档案.读取档案() };
    const 昵称输入 = document.getElementById('pfNickname');
    if (昵称输入) 昵称输入.value = this.编辑草稿.昵称;
    // 重新构建网格，使游戏过程中新解锁的项实时可点
    this.构建档案网格(this.头像网格, 头像预设, 'avatar', (预设) => ({
      头像: 预设.id,
      头像框: 'frame-none'
    }));
    this.构建档案网格(this.框网格, 头像框预设, 'frame', (框) => ({
      头像: this.档案.默认.头像,
      头像框: 框.id
    }));
    this.刷新编辑选择();
    this.刷新编辑预览();
    this.档案弹窗.classList.add('open');
    this.档案弹窗.setAttribute('aria-hidden', 'false');
    if (昵称输入) setTimeout(() => 昵称输入.focus(), 50);
  }

  关闭档案编辑器() {
    if (!this.档案弹窗) return;
    this.档案弹窗.classList.remove('open');
    this.档案弹窗.setAttribute('aria-hidden', 'true');
  }

  刷新编辑选择() {
    const 头像网格 = document.getElementById('pfAvatarGrid');
    if (头像网格) {
      头像网格.querySelectorAll('.pf-option').forEach((项) => {
        项.classList.toggle('selected', 项.dataset.avatar === this.编辑草稿.头像);
      });
    }
    const 框网格 = document.getElementById('pfFrameGrid');
    if (框网格) {
      框网格.querySelectorAll('.pf-option').forEach((项) => {
        项.classList.toggle('selected', 项.dataset.frame === this.编辑草稿.头像框);
      });
    }
  }

  刷新编辑预览() {
    const 预览头像 = document.getElementById('pfPreviewAvatar');
    const 预览名称 = document.getElementById('pfPreviewName');
    if (预览头像) {
      预览头像.innerHTML = '';
      预览头像.appendChild(this.档案.构建头像元素(this.编辑草稿));
    }
    if (预览名称) 预览名称.textContent = this.编辑草稿.昵称 || this.档案.默认.昵称;
  }

  保存档案() {
    const 昵称 = (this.编辑草稿.昵称 || '').trim();
    if (昵称.length === 0) {
      this.显示提示('昵称不能为空');
      return;
    }
    const 档案 = {
      昵称: 昵称.slice(0, 12),
      头像: this.编辑草稿.头像,
      头像框: this.编辑草稿.头像框
    };
    this.档案.保存档案(档案);
    this.渲染档案显示();
    this.关闭档案编辑器();
    this.显示提示('资料已保存');
  }

  显示提示(消息, 持续时间 = 配置.hud.提示默认时长) {
    if (!this.提示元素) return;
    this.提示元素.textContent = `// ${消息} //`;
    this.提示元素.classList.add('show');
    if (this.提示定时器) clearTimeout(this.提示定时器);
    this.提示定时器 = setTimeout(() => {
      this.提示元素.classList.remove('show');
    }, 持续时间);
  }
  销毁() {
    // 卸载进行中的游戏，停止其内部循环
    try {
      this.游戏管理器?.卸载当前游戏?.();
    } catch {}
    // 停止粒子系统（含 rAF 与全局监听）
    try {
      this.粒子?.销毁?.();
    } catch {}
    this.粒子 = null;
    // 销毁点击射击层：移除 document 级 pointerdown 监听与 DOM 节点
    try {
      销毁点击射击层();
    } catch {}
    this.射击层 = null;
    // 销毁自定义光标：移除全局监听与 DOM 节点，并恢复系统光标
    try {
      销毁自定义光标();
    } catch {}
    this.光标 = null;
    document.body.style.cursor = '';
    // 移除个人资料编辑弹窗（曾以 appendChild 挂到 body，是返回简历后残留的根因）
    if (this.档案弹窗 && this.档案弹窗.parentNode) {
      this.档案弹窗.remove();
    }
    this.档案弹窗 = null;
    // 清理全部 document 级监听与自递归定时器，避免跨页泄漏
    if (this.彩蛋处理器) {
      document.removeEventListener('keydown', this.彩蛋处理器);
      this.彩蛋处理器 = null;
    }
    if (this.打字机可见性处理器) {
      document.removeEventListener('visibilitychange', this.打字机可见性处理器);
      this.打字机可见性处理器 = null;
    }
    this.停止打字机?.();
    if (this.公告按键处理器) {
      document.removeEventListener('keydown', this.公告按键处理器);
      this.公告按键处理器 = null;
    }
    if (this.档案按键处理器) {
      document.removeEventListener('keydown', this.档案按键处理器);
      this.档案按键处理器 = null;
    }
    this.输入序列 = [];
    if (this.提示定时器) clearTimeout(this.提示定时器);
  }
}

export { 霓虹终端 };

document.addEventListener('DOMContentLoaded', () => {
  new 霓虹终端();
});
