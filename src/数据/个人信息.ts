import type { 个人信息类型 } from './类型'
import { 职业方向 } from './职业方向'

export const 个人信息: 个人信息类型 = {
  name: '玄锐暮',
  年龄: 22,
  location: '天津',
  电话: '16622370059',
  邮箱: '1319676572@qq.com',
  QQ: '2760688515',
  wechat: 'XuanRuiMu',
  GitHub: 'https://github.com/XuanRuiMu',
  哔哩哔哩: 'https://space.bilibili.com/383504924',
  期望城市键: 'data.personalInfo.expectedCity',
  薪资键: 职业方向.salaryKey,
  到岗状态键: 'data.personalInfo.availability',
  教育背景: {
    学校: '天津仁爱学院',
    专业: '计算机科学与技术',
    学位: '本科',
    周期: '2022.09 - 2026.06',
  },
}
