import { 配置 } from '../config.js';
import { 安全写存储, 安全解析整数, 安全读存储, 按路径写入, 按路径读取, 深拷贝 } from '../utils.js';

export class StateManager {
  constructor() {
    this.状态 = this.创建默认状态();
    this.订阅者 = {};
    this.存储键 = 配置.平台.状态存储键;
    this.加载();
  }

  创建默认状态() {
    const 成就 = {};
    Object.keys(配置.平台.成就列表).forEach((标识) => {
      成就[标识] = { 已解锁: false };
    });

    const 各游戏最高分 = {};
    const 各游戏统计 = {};
    配置.游戏列表.forEach((游戏) => {
      各游戏最高分[游戏.标识] = 0;
      各游戏统计[游戏.标识] = { 次数: 0, 时长: 0 };
    });

    return {
      版本: 2,
      设置: {
        主题: 配置.主题.默认模式,
        明暗: 配置.主题.明暗默认,
        强调色: 配置.主题.强调色默认,
        减少动画: 配置.功能.减少动画,
        自定义光标: 配置.功能.自定义光标,
        粒子: 配置.功能.粒子,
        皮肤: {
          lightningShooter: 配置.游戏.lightningShooter.默认皮肤,
          mechBattle: 配置.游戏.mechBattle.玩家.默认皮肤
        },
        已解锁头像: [],
        已解锁头像框: [],
        已领战令: []
      },
      总分: 0,
      各游戏最高分,
      成就,
      当前游戏: null,
      当前游戏开始时间: null,
      统计: {
        总游戏时长: 0,
        总游玩次数: 0,
        各游戏: 各游戏统计,
        最近游玩: [],
        每日: { 日期: '', 场数: 0, 分数: 0, 成就: 0 }
      }
    };
  }

  加载() {
    const 原始 = 安全读存储(this.存储键, '');
    if (原始) {
      try {
        const 已存 = JSON.parse(原始);
        this.状态 = this.合并状态(this.创建默认状态(), 已存);
      } catch {
        // 解析失败时使用默认状态
      }
    }
    this.迁移旧最高分();
    this.迁移旧版本();
  }

  合并状态(默认, 已存) {
    const 结果 = 深拷贝(默认);
    if (已存.设置 && typeof 已存.设置 === 'object') {
      Object.assign(结果.设置, 已存.设置);
    }
    if (!结果.设置.皮肤 || typeof 结果.设置.皮肤 !== 'object') {
      结果.设置.皮肤 = 深拷贝(默认.设置.皮肤);
    }
    if (!结果.设置.皮肤.lightningShooter) {
      结果.设置.皮肤.lightningShooter = 默认.设置.皮肤.lightningShooter;
    }
    if (!结果.设置.皮肤.mechBattle) {
      结果.设置.皮肤.mechBattle = 默认.设置.皮肤.mechBattle;
    }
    if (Array.isArray(已存.设置?.已解锁头像)) {
      结果.设置.已解锁头像 = 已存.设置.已解锁头像.filter((x) => typeof x === 'string');
    }
    if (Array.isArray(已存.设置?.已解锁头像框)) {
      结果.设置.已解锁头像框 = 已存.设置.已解锁头像框.filter((x) => typeof x === 'string');
    }
    if (Array.isArray(已存.设置?.已领战令)) {
      结果.设置.已领战令 = 已存.设置.已领战令.filter((x) => typeof x === 'number');
    }
    if (typeof 已存.设置.明暗 === 'string') {
      结果.设置.明暗 = 已存.设置.明暗;
    }
    if (typeof 已存.设置.强调色 === 'string') {
      结果.设置.强调色 = 已存.设置.强调色;
    }
    if (typeof 已存.总分 === 'number') 结果.总分 = 已存.总分;
    if (已存.各游戏最高分 && typeof 已存.各游戏最高分 === 'object') {
      Object.assign(结果.各游戏最高分, 已存.各游戏最高分);
    }
    if (已存.成就 && typeof 已存.成就 === 'object') {
      Object.keys(已存.成就).forEach((键) => {
        if (结果.成就[键]) {
          结果.成就[键] = { ...结果.成就[键], ...已存.成就[键] };
        }
      });
    }
    if (已存.统计 && typeof 已存.统计 === 'object') {
      if (typeof 已存.统计.总游戏时长 === 'number') {
        结果.统计.总游戏时长 = 已存.统计.总游戏时长;
      }
      if (typeof 已存.统计.总游玩次数 === 'number') {
        结果.统计.总游玩次数 = 已存.统计.总游玩次数;
      }
      if (已存.统计.各游戏 && typeof 已存.统计.各游戏 === 'object') {
        Object.assign(结果.统计.各游戏, 已存.统计.各游戏);
      }
      if (Array.isArray(已存.统计.最近游玩)) {
        结果.统计.最近游玩 = 已存.统计.最近游玩.slice(-10);
      }
      if (已存.统计.每日 && typeof 已存.统计.每日 === 'object') {
        结果.统计.每日 = { ...结果.统计.每日, ...已存.统计.每日 };
      }
    }
    return 结果;
  }

  迁移旧最高分() {
    const 旧值 = 安全读存储(配置.游戏.旧存储键, '');
    if (旧值 !== '') {
      const 分数 = 安全解析整数(旧值, 0);
      if (分数 > 0) {
        this.状态.各游戏最高分.reaction = Math.max(this.状态.各游戏最高分.reaction, 分数);
        this.持久化();
      }
      try {
        localStorage.removeItem(配置.游戏.旧存储键);
      } catch {
        // 忽略移除失败
      }
    }
  }

  迁移旧版本() {
    if (this.状态.版本 === 1) {
      this.状态.版本 = 2;
      this.持久化();
    }
  }

  读取(路径, 默认值 = undefined) {
    return 按路径读取(this.状态, 路径, 默认值);
  }

  写入(路径, 值) {
    按路径写入(this.状态, 路径, 值);
    this.通知(路径);
    this.持久化();
  }

  设置设置项(键, 值) {
    this.写入(`设置.${键}`, 值);
  }

  获取设置项(键, 默认值 = undefined) {
    return this.读取(`设置.${键}`, 默认值);
  }

  记录游戏开始(游戏标识) {
    this.状态.当前游戏 = 游戏标识;
    this.状态.当前游戏开始时间 = Date.now();
    this.持久化();
  }

  记录游戏结束(游戏标识, 分数 = 0) {
    const 时长 = this.状态.当前游戏开始时间 ? Date.now() - this.状态.当前游戏开始时间 : 0;
    this.状态.当前游戏 = null;
    this.状态.当前游戏开始时间 = null;
    this.提交分数(游戏标识, 分数, 时长);
    this.记录最近游玩(游戏标识, 分数, 时长);
    this.记录每日(分数);
  }

  记录每日(分数) {
    const 今天 = new Date().toISOString().slice(0, 10);
    if (this.状态.统计.每日.日期 !== 今天) {
      this.状态.统计.每日 = { 日期: 今天, 场数: 0, 分数: 0, 成就: 0 };
    }
    const 每日 = this.状态.统计.每日;
    每日.场数 += 1;
    每日.分数 += 分数;
    每日.成就 = Object.values(this.状态.成就).filter(
      (a) => a.已解锁 && a.解锁时间 && String(a.解锁时间).slice(0, 10) === 今天
    ).length;
    this.写入('统计.每日', 每日);
  }

  记录最近游玩(游戏标识, 分数, 时长) {
    const 记录 = {
      游戏标识,
      分数,
      时长,
      时间: new Date().toISOString()
    };
    this.状态.统计.最近游玩.push(记录);
    if (this.状态.统计.最近游玩.length > 10) {
      this.状态.统计.最近游玩 = this.状态.统计.最近游玩.slice(-10);
    }
    this.持久化();
  }

  提交分数(游戏标识, 分数, 时长 = 0) {
    const 当前最高 = this.读取(`各游戏最高分.${游戏标识}`, 0);
    if (分数 > 当前最高) {
      this.写入(`各游戏最高分.${游戏标识}`, 分数);
    }
    const 总分 = this.读取('总分', 0);
    this.写入('总分', 总分 + 分数);

    const 游戏统计 = this.读取(`统计.各游戏.${游戏标识}`, { 次数: 0, 时长: 0 });
    游戏统计.次数 += 1;
    游戏统计.时长 += 时长;
    this.写入(`统计.各游戏.${游戏标识}`, 游戏统计);

    const 总时长 = this.读取('统计.总游戏时长', 0);
    this.写入('统计.总游戏时长', 总时长 + 时长);

    const 总次数 = this.读取('统计.总游玩次数', 0);
    this.写入('统计.总游玩次数', 总次数 + 1);

    this.检查成就(游戏标识, 分数);
  }

  检查成就(_游戏标识, 分数) {
    if (!this.读取('成就.firstGame.已解锁', false)) {
      this.解锁成就('firstGame');
    }
    if (分数 >= 100 && !this.读取('成就.score100.已解锁', false)) {
      this.解锁成就('score100');
    }
    if (分数 >= 500 && !this.读取('成就.score500.已解锁', false)) {
      this.解锁成就('score500');
    }

    const 已玩游戏 = Object.entries(this.读取('统计.各游戏', {})).filter(
      ([, 数据]) => 数据.次数 > 0
    );
    const 游戏总数 = 配置.游戏列表.length;
    if (已玩游戏.length >= 游戏总数 && !this.读取('成就.playAll.已解锁', false)) {
      this.解锁成就('playAll');
    }

    const 总分 = this.读取('总分', 0);
    if (总分 >= 1000 && !this.读取('成就.collector.已解锁', false)) {
      this.解锁成就('collector');
    }

    const 累计时长 = this.读取('统计.总游戏时长', 0);
    if (累计时长 >= 600000 && !this.读取('成就.marathon.已解锁', false)) {
      this.解锁成就('marathon');
    }
  }

  解锁成就(标识) {
    if (!this.状态.成就[标识]) return false;
    if (this.状态.成就[标识].已解锁) return false;
    this.状态.成就[标识].已解锁 = true;
    this.状态.成就[标识].解锁时间 = new Date().toISOString();
    this.通知(`成就.${标识}`);
    this.持久化();
    return true;
  }

  已解锁头像() {
    const 数组 = this.读取('设置.已解锁头像', []);
    return Array.isArray(数组) ? 数组 : [];
  }

  已解锁头像框() {
    const 数组 = this.读取('设置.已解锁头像框', []);
    return Array.isArray(数组) ? 数组 : [];
  }

  解锁头像(标识) {
    const 当前 = this.已解锁头像();
    if (当前.includes(标识)) return false;
    this.写入('设置.已解锁头像', [...当前, 标识]);
    return true;
  }

  解锁头像框(标识) {
    const 当前 = this.已解锁头像框();
    if (当前.includes(标识)) return false;
    this.写入('设置.已解锁头像框', [...当前, 标识]);
    return true;
  }

  订阅(路径, 回调) {
    const 键 = Array.isArray(路径) ? 路径.join('.') : String(路径);
    if (!this.订阅者[键]) this.订阅者[键] = [];
    this.订阅者[键].push(回调);
  }

  取消订阅(路径, 回调) {
    const 键 = Array.isArray(路径) ? 路径.join('.') : String(路径);
    if (!this.订阅者[键]) return;
    this.订阅者[键] = this.订阅者[键].filter((cb) => cb !== 回调);
  }

  通知(路径) {
    const 键 = Array.isArray(路径) ? 路径.join('.') : String(路径);
    if (!this.订阅者[键]) return;
    const 值 = this.读取(路径);
    this.订阅者[键].forEach((回调) => {
      try {
        回调(值, 路径);
      } catch {
        // 忽略订阅者错误
      }
    });
  }

  持久化() {
    try {
      安全写存储(this.存储键, JSON.stringify(this.状态));
    } catch {
      // 忽略写入失败
    }
  }
}
