export class 游戏基类 {
  constructor(选项) {
    this.标识 = 选项.标识;
    this.名称键 = 选项.名称键;
    this.类型 = 选项.类型;
    this.容器 = 选项.容器;
    this.粒子系统 = 选项.粒子系统;
    this.状态管理器 = 选项.状态管理器;
    this.国际化 = 选项.国际化;
    this.分数 = 0;
    this.运行中 = false;
    this.已暂停 = false;
    this.事件监听者 = {};
  }

  async 初始化() {
    throw new Error('子类必须实现 初始化');
  }
  async 启动() {
    throw new Error('子类必须实现 启动');
  }
  async 暂停() {
    throw new Error('子类必须实现 暂停');
  }
  async 恢复() {
    throw new Error('子类必须实现 恢复');
  }
  async 停止() {
    throw new Error('子类必须实现 停止');
  }
  async 销毁() {
    throw new Error('子类必须实现 销毁');
  }
  渲染() {
    throw new Error('子类必须实现 渲染');
  }

  获取分数() {
    return this.分数;
  }
  重置分数() {
    this.分数 = 0;
  }
  增加分数(增量 = 1) {
    this.分数 += 增量;
    this.触发('分数变化', { 分数: this.分数 });
  }
  结束游戏() {
    this.运行中 = false;
    this.触发('游戏结束', { 标识: this.标识, 分数: this.分数 });
  }

  监听(事件, 回调) {
    if (!this.事件监听者[事件]) this.事件监听者[事件] = [];
    this.事件监听者[事件].push(回调);
  }

  取消监听(事件, 回调) {
    if (!this.事件监听者[事件]) return;
    this.事件监听者[事件] = this.事件监听者[事件].filter((cb) => cb !== 回调);
  }

  触发(事件, 数据 = {}) {
    if (!this.事件监听者[事件]) return;
    this.事件监听者[事件].forEach((回调) => {
      try {
        回调(数据);
      } catch {
        // 静默忽略监听者错误，避免游戏崩溃
      }
    });
  }
}
