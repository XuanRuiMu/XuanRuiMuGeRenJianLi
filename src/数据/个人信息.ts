import type { 个人信息类型 } from './类型'
import { 职业方向 } from './职业方向'

export const 个人信息: 个人信息类型 = {
  name: '玄锐暮',
  age: 22,
  location: '天津',
  phone: '16622370059',
  email: '1319676572@qq.com',
  qq: '2760688515',
  wechat: 'XuanRuiMu',
  github: 'https://github.com/XuanRuiMu',
  bilibili: 'https://space.bilibili.com/383504924',
  expectedCityKey: 'data.personalInfo.expectedCity',
  salaryKey: 职业方向.salaryKey,
  availabilityKey: 'data.personalInfo.availability',
  教育背景: {
    school: '天津仁爱学院',
    major: '计算机科学与技术',
    degree: '本科',
    period: '2022.09 - 2026.06',
  },
}
