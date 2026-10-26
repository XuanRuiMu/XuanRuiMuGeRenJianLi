import type { 教育背景 } from './类型'
import { 个人信息 } from './个人信息'

export const 教育档案: 教育背景 = {
  摘要: {
    学校: 个人信息.教育背景.学校,
    专业: 个人信息.教育背景.专业,
    学位: 个人信息.教育背景.学位,
    周期: 个人信息.教育背景.周期,
  },
  课程表: [
    { id: 'python', 名称键: 'data.education.courses.python.name', 级别键: 'data.education.courses.python.level' },
    { id: 'c', 名称键: 'data.education.courses.c.name', 级别键: 'data.education.courses.c.level' },
    { id: 'network', 名称键: 'data.education.courses.network.name', 级别键: 'data.education.courses.network.level' },
    {
      id: 'computerOrganization',
      名称键: 'data.education.courses.computerOrganization.name',
      级别键: 'data.education.courses.computerOrganization.level',
    },
    {
      id: 'algorithms',
      名称键: 'data.education.courses.algorithms.name',
      级别键: 'data.education.courses.algorithms.level',
    },
    {
      id: 'assembly',
      名称键: 'data.education.courses.assembly.name',
      级别键: 'data.education.courses.assembly.level',
    },
    { id: 'mysql', 名称键: 'data.education.courses.mysql.name', 级别键: 'data.education.courses.mysql.level' },
  ],
  成就键表: [
    'data.education.achievements.crashCourse',
    'data.education.achievements.thesis',
    'data.education.achievements.community',
  ],
}
