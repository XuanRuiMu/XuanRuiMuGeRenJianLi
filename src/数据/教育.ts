import type { 教育背景 } from './类型'
import { 个人信息 } from './个人信息'

// 教育背景摘要与个人信息共用单一数据源，杜绝两份事实各自漂移
export const 教育档案: 教育背景 = {
  summary: {
    school: 个人信息.教育背景.school,
    major: 个人信息.教育背景.major,
    degree: 个人信息.教育背景.degree,
    period: 个人信息.教育背景.period,
  },
  courses: [
    { id: 'python', nameKey: 'data.education.courses.python.name', levelKey: 'data.education.courses.python.level' },
    { id: 'c', nameKey: 'data.education.courses.c.name', levelKey: 'data.education.courses.c.level' },
    { id: 'network', nameKey: 'data.education.courses.network.name', levelKey: 'data.education.courses.network.level' },
    {
      id: 'computerOrganization',
      nameKey: 'data.education.courses.computerOrganization.name',
      levelKey: 'data.education.courses.computerOrganization.level',
    },
    {
      id: 'algorithms',
      nameKey: 'data.education.courses.algorithms.name',
      levelKey: 'data.education.courses.algorithms.level',
    },
    {
      id: 'assembly',
      nameKey: 'data.education.courses.assembly.name',
      levelKey: 'data.education.courses.assembly.level',
    },
    { id: 'mysql', nameKey: 'data.education.courses.mysql.name', levelKey: 'data.education.courses.mysql.level' },
  ],
  achievementKeys: [
    'data.education.achievements.crashCourse',
    'data.education.achievements.thesis',
    'data.education.achievements.community',
  ],
}
