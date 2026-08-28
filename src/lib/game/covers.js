/**
 * 游戏封面图配置。
 *
 * 每款游戏的封面底色是渐变（见 main.js 的 封面渐变），封面图是可选叠加层：
 * 只有在这里登记了路径的游戏才会追加 background-image。
 * 不登记就只渲染渐变——这样既不会出现 404 请求，也保证新增游戏时不会因为缺图而破版。
 */
export const 封面图 = {};

/** 取封面图的 background-image 声明；没有配图时返回空字符串 */
export function 封面样式(游戏标识) {
  const 路径 = 封面图[游戏标识];
  return 路径 ? `background-image:url('${路径}');background-size:cover;background-position:center;` : '';
}
