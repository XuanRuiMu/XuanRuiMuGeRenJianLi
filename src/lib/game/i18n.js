import 字典 from '../locales/zh-CN.js';

export function t(键, 变量 = {}) {
  const 值 = 键.split('.').reduce((对象, 键段) => 对象?.[键段], 字典);
  if (值 === undefined || 值 === null) return 键;
  if (typeof 值 !== 'string') return 键;
  return 值.replace(/\{(\w+)\}/g, (_, 变量名) => 变量[变量名] ?? '');
}

export function 获取数组(键) {
  const 值 = 键.split('.').reduce((对象, 键段) => 对象?.[键段], 字典);
  return Array.isArray(值) ? 值 : [];
}
