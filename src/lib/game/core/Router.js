
export class Router {
  constructor() {
    this.监听者 = [];
    this.基础路径 = this.获取基础路径();
    this.当前路径 = this.解析路径();
    this.绑定事件();
  }

  获取基础路径() {
    const 基础 =
      typeof import.meta.env !== 'undefined' && import.meta.env.BASE_URL
        ? import.meta.env.BASE_URL
        : '/';
    return 基础.replace(/\/$/, '');
  }

  绑定事件() {
    this.popstate处理器 = () => {
      this.当前路径 = this.解析路径();
      this.触发('routechange', this.获取路由信息());
    };
    window.addEventListener('popstate', this.popstate处理器);
  }

  销毁() {
    if (this.popstate处理器) {
      window.removeEventListener('popstate', this.popstate处理器);
      this.popstate处理器 = null;
    }
  }

  解析路径(路径) {
    let 目标 = 路径 ?? window.location.pathname;
    if (this.基础路径 && 目标.startsWith(this.基础路径)) {
      目标 = 目标.slice(this.基础路径.length);
    }
    return 目标.replace(/\/$/, '') || '/';
  }

  获取路由信息() {
    const 路径 = this.当前路径;
    const 匹配游戏 = 路径.match(/^\/game\/([^/]+)$/);
    if (匹配游戏) {
      return { 路径, 视图: 'game', 参数: { id: 匹配游戏[1] } };
    }
    if (路径 === '/' || 路径 === '/lobby') {
      return { 路径, 视图: 'lobby', 参数: {} };
    }
    return { 路径, 视图: 'unknown', 参数: {} };
  }

  导航到(路径, 选项 = {}) {
    const { replace = false } = 选项;
    this.当前路径 = this.解析路径(路径);
    const 状态 = { 路径: this.当前路径 };
    if (replace) {
      window.history.replaceState(状态, '', this.当前路径);
    } else {
      window.history.pushState(状态, '', this.当前路径);
    }
    this.触发('routechange', this.获取路由信息());
  }

  返回() {
    window.history.back();
  }

  监听(事件, 回调) {
    if (!this.监听者[事件]) this.监听者[事件] = [];
    this.监听者[事件].push(回调);
  }

  取消监听(事件, 回调) {
    if (!this.监听者[事件]) return;
    this.监听者[事件] = this.监听者[事件].filter((cb) => cb !== 回调);
  }

  触发(事件, 数据) {
    if (!this.监听者[事件]) return;
    this.监听者[事件].forEach((回调) => {
      try {
        回调(数据);
      } catch {
        // 忽略监听错误
      }
    });
  }
}
