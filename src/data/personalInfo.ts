import type { PersonalInfo } from './types'
import { careerFocus } from './careerFocus'

export const personalInfo: PersonalInfo = {
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
  salaryKey: careerFocus.salaryKey,
  availabilityKey: 'data.personalInfo.availability',
  education: {
    school: '天津仁爱学院',
    major: '计算机科学与技术',
    degree: '本科',
    period: '2022.09 - 2026.06',
  },
}
