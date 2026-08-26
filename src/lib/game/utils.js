export function 安全读存储(键, 默认值 = '') {
  try {
    const 值 = localStorage.getItem(键);
    return 值 === null ? 默认值 : 值;
  } catch {
    return 默认值;
  }
}

export function 安全写存储(键, 值) {
  try {
    localStorage.setItem(键, 值);
    return true;
  } catch {
    return false;
  }
}

export function 安全解析整数(值, 默认值 = 0) {
  const 数字 = Number.parseInt(值, 10);
  return Number.isNaN(数字) ? 默认值 : 数字;
}

export function 创建元素(标签, 选项 = {}) {
  const 元素 = document.createElement(标签);
  if (选项.class) 元素.className = 选项.class;
  if (选项.text !== undefined) 元素.textContent = 选项.text;
  if (选项.html !== undefined) 元素.innerHTML = 选项.html;
  if (选项.attrs) {
    Object.entries(选项.attrs).forEach(([属性名, 属性值]) => {
      元素.setAttribute(属性名, 属性值);
    });
  }
  if (选项.子元素) {
    选项.子元素.forEach((子) => {
      if (子 instanceof Node) 元素.appendChild(子);
    });
  }
  return 元素;
}

export function 是触摸设备() {
  return window.matchMedia('(pointer: coarse)').matches;
}

export function 偏好减少动画() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function 深拷贝(对象) {
  if (对象 === null || typeof 对象 !== 'object') return 对象;
  if (对象 instanceof Date) return new Date(对象.getTime());
  if (Array.isArray(对象)) return 对象.map((项) => 深拷贝(项));
  const 副本 = {};
  Object.keys(对象).forEach((键) => {
    副本[键] = 深拷贝(对象[键]);
  });
  return 副本;
}

export function 按路径读取(对象, 路径, 默认值 = undefined) {
  if (!路径) return 对象;
  const 段 = Array.isArray(路径) ? 路径 : String(路径).split('.');
  let 当前 = 对象;
  for (const 键 of 段) {
    if (当前 === null || 当前 === undefined || !(键 in 当前)) return 默认值;
    当前 = 当前[键];
  }
  return 当前 === undefined ? 默认值 : 当前;
}

export function 按路径写入(对象, 路径, 值) {
  const 段 = Array.isArray(路径) ? 路径 : String(路径).split('.');
  let 当前 = 对象;
  for (let i = 0; i < 段.length - 1; i++) {
    const 键 = 段[i];
    if (当前[键] === null || typeof 当前[键] !== 'object') {
      当前[键] = {};
    }
    当前 = 当前[键];
  }
  当前[段[段.length - 1]] = 值;
  return 对象;
}

export function 路径合并(...段) {
  return 段
    .filter((段) => 段 !== '' && 段 !== undefined && 段 !== null)
    .flatMap((段) => (Array.isArray(段) ? 段 : String(段).split('.')))
    .filter((段) => 段 !== '')
    .join('.');
}

export function 节流(函数, 等待) {
  let 上次 = 0;
  return function (...参数) {
    const 现在 = Date.now();
    if (现在 - 上次 >= 等待) {
      上次 = 现在;
      return 函数.apply(this, 参数);
    }
  };
}

export function 防抖(函数, 等待) {
  let 定时器 = null;
  return function (...参数) {
    if (定时器) clearTimeout(定时器);
    定时器 = setTimeout(() => {
      函数.apply(this, 参数);
    }, 等待);
  };
}
