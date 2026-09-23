import type { Education } from './types'

export const education: Education = {
  summary: {
    school: '天津仁爱学院',
    major: '计算机科学与技术',
    degree: '本科',
    period: '2022.09 - 2026.06',
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
