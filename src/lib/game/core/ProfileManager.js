import { 配置 } from '../config.js';
import { t } from '../i18n.js';
import { 创建元素 } from '../utils.js';

// 头像预设：渐变 + 表情符号（纯 DOM 渲染，无需外部图片资源）
export const 头像预设 = [
  { id: 'avatar-1', 名称: '机械核心', emoji: '🦾', 色1: '#ff2a9d', 色2: '#00f0ff' },
  { id: 'avatar-2', 名称: '霓虹猫', emoji: '🐱', 色1: '#a855ff', 色2: '#00f0ff' },
  { id: 'avatar-3', 名称: '赛博龙', emoji: '🐉', 色1: '#ff2a9d', 色2: '#faff00' },
  { id: 'avatar-4', 名称: '入侵者', emoji: '👾', 色1: '#00f0ff', 色2: '#a855ff' },
  { id: 'avatar-5', 名称: '机甲', emoji: '🤖', 色1: '#a855ff', 色2: '#ff2a9d' },
  { id: 'avatar-6', 名称: '数据狐', emoji: '🦊', 色1: '#faff00', 色2: '#ff2a9d' },
  { id: 'avatar-7', 名称: '暗影狼', emoji: '🐺', 色1: '#64748b', 色2: '#00f0ff' },
  { id: 'avatar-8', 名称: '猎鹰', emoji: '🦅', 色1: '#faff00', 色2: '#00f0ff' },
  { id: 'avatar-9', 名称: '电路蛇', emoji: '🐍', 色1: '#00f0ff', 色2: '#a855ff' },
  { id: 'avatar-10', 名称: '幻光兽', emoji: '🦄', 色1: '#a855ff', 色2: '#faff00' }
];

// 头像框预设：id 直接映射为 CSS 类 pf-frame-<id>
export const 头像框预设 = [
  { id: 'none', 名称: '无' },
  { id: 'cyan', 名称: '青色辉光' },
  { id: 'pink', 名称: '粉色辉光' },
  { id: 'purple', 名称: '紫色辉光' },
  { id: 'gold', 名称: '黄金辉光' },
  { id: 'hex', 名称: '六边形' },
  { id: 'double', 名称: '双重环' },
  { id: 'rotate', 名称: '旋转环' }
];

export class ProfileManager {
  constructor(状态管理器) {
    this.状态 = 状态管理器;
    this.默认 = {
      昵称: 'NEON 特工',
      头像: 'avatar-1',
      头像框: 'cyan',
      默认头像: 配置.档案.默认头像 || ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4'],
      默认头像框: 配置.档案.默认头像框 || ['none', 'cyan', 'pink', 'purple']
    };
  }

  读取档案() {
    const 存 = this.状态.读取('设置.档案', null);
    if (!存 || typeof 存 !== 'object') return { ...this.默认 };
    const 已解锁头像 = this.已解锁头像集合();
    const 已解锁框 = this.已解锁头像框集合();
    const 头像 = 已解锁头像.includes(存.头像) ? 存.头像 : this.默认.头像;
    const 头像框 = 已解锁框.includes(存.头像框) ? 存.头像框 : this.默认.头像框;
    return {
      昵称:
        typeof 存.昵称 === 'string' && 存.昵称.trim().length > 0
          ? 存.昵称.trim().slice(0, 12)
          : this.默认.昵称,
      头像,
      头像框
    };
  }

  保存档案(档案) {
    // 只保存当前已解锁的项，避免把已锁定项写进去
    const 已解锁头像 = this.已解锁头像集合();
    const 已解锁框 = this.已解锁头像框集合();
    this.状态.设置设置项('档案', {
      昵称: 档案.昵称,
      头像: 已解锁头像.includes(档案.头像) ? 档案.头像 : this.默认.头像,
      头像框: 已解锁框.includes(档案.头像框) ? 档案.头像框 : this.默认.头像框
    });
  }

  取头像预设(id) {
    return 头像预设.find((项) => 项.id === id) || 头像预设[0];
  }

  取头像框预设(id) {
    return 头像框预设.find((项) => 项.id === id) || 头像框预设[0];
  }

  // 默认解锁 + 任务解锁 的完整集合
  已解锁头像集合() {
    return [...this.默认.默认头像, ...this.状态.已解锁头像()];
  }

  已解锁头像框集合() {
    return [...this.默认.默认头像框, ...this.状态.已解锁头像框()];
  }

  是头像解锁(id) {
    return this.已解锁头像集合().includes(id);
  }

  是头像框解锁(id) {
    return this.已解锁头像框集合().includes(id);
  }

  // 解锁某头像/框，返回是否本次新解锁
  解锁头像(id) {
    if (this.已解锁头像集合().includes(id)) return false;
    return this.状态.解锁头像(id);
  }

  解锁头像框(id) {
    if (this.已解锁头像框集合().includes(id)) return false;
    return this.状态.解锁头像框(id);
  }

  // 返回解锁该物品所需途径的文字说明（战令 / 每日任务 / 成就）
  解锁说明(类型, 标识) {
    const 匹配 = (奖励) => 奖励 && 奖励.类型 === 类型 && 奖励.物品 === 标识;
    const 途径 = [];
    const 赛季项 = 配置.赛季.奖励档.find((档) => 匹配(档.奖励));
    if (赛季项) 途径.push(t('profile.unlockFrom.season', { lv: 赛季项.等级 }));
    const 每日项 = 配置.每日任务.find((任务) => 匹配(任务.奖励物品));
    if (每日项) 途径.push(t('profile.unlockFrom.daily', { name: t(每日项.名称键) }));
    const 成就项 = Object.entries(配置.平台.成就列表).find(([, 定义]) => 匹配(定义.奖励));
    if (成就项) 途径.push(t('profile.unlockFrom.achievement', { name: t(成就项[1].名称键) }));
    return 途径.join(' · ') || t('profile.unlockFrom.unknown');
  }

  // 构建一个头像 DOM（带框），可直接插入到大厅、游戏头、编辑预览、选择网格
  构建头像元素(档案, 附加类 = '') {
    const 预设 = this.取头像预设(档案.头像);
    const 框 = 档案.头像框 || 'none';
    const 元素 = 创建元素('div', {
      class: `pf-avatar pf-frame-${框}${附加类 ? ` ${附加类}` : ''}`,
      attrs: { 'aria-hidden': 'true' }
    });
    元素.style.setProperty(
      '--avatar-bg',
      `radial-gradient(circle at 50% 35%, ${预设.色2}66, ${预设.色1}cc)`
    );
    元素.style.setProperty('--avatar-c1', 预设.色1);
    元素.style.setProperty('--avatar-c2', 预设.色2);
    元素.appendChild(创建元素('span', { class: 'pf-avatar-emoji', text: 预设.emoji }));
    return 元素;
  }
}
