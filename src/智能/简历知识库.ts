import { 个人信息 } from '../数据/个人信息'
import { 求职方向 } from '../数据/职业方向'
import { 技能组表, 量化指标 } from '../数据/技能分组'
import { 项目表 } from '../数据/项目'
import { 经历表 } from '../数据/经历'
import { 教育档案 } from '../数据/教育'
import { 设计数据 } from '../数据/设计'
import { 媒体数据 } from '../数据/媒体'
import { GitHub仓库快照, GitHub快照元信息, GitHub快照生成时间 } from '../数据/GitHub快照'
import { t } from '../国际化/翻译'

export interface 知识块 {
  id: string
  content: string
  元数据: {
    分类: string
    来源: string
  }
}

function 分块(id: string, content: string, 分类: string, 来源: string): 知识块 {
  return {
    id,
    content: content.trim(),
    元数据: { 分类: 分类, 来源: 来源 },
  }
}

function 构建个人信息分块(): 知识块[] {
  const 信息 = 个人信息
  return [
    分块(
      'personal-info-bio',
      `姓名：${信息.name}。年龄：${信息.年龄}岁。所在地：${信息.location}。求职方向：${求职方向()}。期望城市：${t(信息.期望城市键)}。薪资期望：${t(信息.薪资键)}。到岗时间：${t(信息.到岗状态键)}。`,
      'personalInfo',
      'personalInfo.ts'
    ),
    分块(
      'personal-info-contact',
      '联系方式：页面底部联系板块提供五种联系方式，AI问答可点按钮复制或直达主页。',
      'personalInfo',
      'personalInfo.ts'
    ),
    分块(
      'personal-info-education',
      `教育背景：${信息.教育背景.学校}，${信息.教育背景.专业}，${信息.教育背景.学位}，${信息.教育背景.周期}。`,
      'education',
      'personalInfo.ts'
    ),
  ]
}

function 构建项目分块(): 知识块[] {
  return 项目表.map((项目) => {
    const 指标 = 项目.指标键表?.map((key) => t(key)).join('，') ?? ''
    const 链接表 = 项目.链接表?.map((链接) => `${t(链接.标签键)}：${链接.url}`).join('，') ?? ''
    return 分块(
      `project-${项目.id}`,
      `项目：${t(项目.名称键)}。描述：${t(项目.描述键)}。技术标签：${项目.标签表.join('、')}。${指标 ? `关键指标：${指标}。` : ''}${链接表 ? `相关链接：${链接表}。` : ''}`,
      'projects',
      'projects.ts'
    )
  })
}

function 构建技术栈分块(): 知识块[] {
  return [
    分块(
      'tech-stack-core',
      '核心技术栈：Java 25（GraalVM，Spigot/Purpur服务端插件开发，JUnit 6+Mockito测试）、Node.js（Express+TypeScript全栈开发）、Python（自动化脚本、AI Agent工具链）。数据库与中间件：MySQL、Redis、PostgreSQL、SQLite。前端：React 19、Three.js/R3F、Tailwind CSS、Vite。工程化与运维：Docker/docker-compose（多服务编排上线经验）、Git工作流、Gradle Kotlin DSL构建。AI方向：可复用AI工作流模板、多Agent协作、MCP协议、DeepSeek API接入（数量与能力陈述见技能分组条目）。音视频：ffmpeg。',
      'techStack',
      'workspace'
    ),
    分块(
      'tech-stack-frontend',
      '前端技术：React 19+TypeScript+Vite+Tailwind v4，动画用framer-motion，3D用Three.js/@react-three/fiber，平滑滚动用Lenis，命令面板用cmdk，状态用zustand，PWA用vite-plugin-pwa。',
      'techStack',
      'workspace'
    ),
  ]
}

function 构建工作区分块(): 知识块[] {
  return [
    分块(
      'workspace-overview',
      '工作区包含以下项目：暮澜纪元我的世界MMORPG服务端（8世界32职业的服务端，自研Java插件425个源文件、其中测试类159个，Gradle Kotlin DSL多模块）、和我恋爱吧（能直接用的恋爱聊天应用：挑AI对象聊天、军师支招、好友与挑战玩法）、燃烧之陨系列（我的世界多元生存服、粘液科技服、登录服、多服连接）、燃烧之陨资源包、循环工程skill（定个目标就自动拆步骤、自己干活、自己检查直到做完，https://github.com/XuanRuiMu/loop-engineering）、个人简历（本React简历站）、开发需求文档、暮澜纪元小说。',
      'workspace',
      'workspace'
    ),
    分块(
      'workspace-ai-console',
      '循环工程skill是一个任务系统：定个目标，它就自动拆步骤、自己干活、自己检查，直到做完为止。地址https://github.com/XuanRuiMu/loop-engineering。',
      'workspace',
      'workspace'
    ),
  ]
}

function 构建技能分块(): 知识块[] {
  const 指标块 = 分块(
    'skills-metrics',
    `量化指标：${量化指标()
      .map((指标) => `${指标.value}${指标.标签}`)
      .join('；')}。`,
    'skills',
    'skillGroups.ts'
  )
  const 分组块 = 技能组表().map((组) =>
    分块(
      `skill-group-${组.id}`,
      `能力组：${组.标签}。具体能力：${组.条目表.join('；')}。关键词：${组.标签表.join('、')}。`,
      'skills',
      'skillGroups.ts'
    )
  )
  return [指标块, ...分组块]
}

function 构建经历分块(): 知识块[] {
  return 经历表.map((条目) => {
    const 成就 = (条目.成就键表 ?? []).map((key) => t(key)).join('；')
    return 分块(
      `experience-${条目.id}`,
      `经历：${t(条目.标题键)}。机构：${条目.机构键 ? t(条目.机构键) : '个人'}。时间：${t(条目.周期键)}。描述：${条目.描述键表.map((key) => t(key)).join(' ')}。${成就 ? `成就：${成就}。` : ''}`,
      'experience',
      'experience.ts'
    )
  })
}

function 构建教育分块(): 知识块[] {
  const 摘要 = 教育档案.摘要
  const 课程表 = 教育档案.课程表.map((课程) => `${t(课程.名称键)}（${t(课程.级别键)}）`).join('、')
  const 成就表 = 教育档案.成就键表.map((key) => t(key)).join('；')

  return [
    分块(
      'education-summary',
      `教育概览：${摘要.学校}毕业，${摘要.学校}，${摘要.专业}，${摘要.学位}，${摘要.周期}。学校是${摘要.学校}。`,
      'education',
      '教育档案.ts'
    ),
    分块('education-courses', `主修与自学课程：${课程表}。`, 'education', '教育档案.ts'),
    分块('education-achievements', `教育成果：${成就表}。`, 'education', '教育档案.ts'),
  ]
}

function 构建设计分块(): 知识块[] {
  const 作品分块 = 设计数据.作品表.map((作品) =>
    分块(
      `设计-work-${作品.id}`,
      `设计作品：${t(作品.名称键)}。分类：${t(作品.分类键)}。描述：${t(作品.描述键)}。`,
      'design',
      'design.ts'
    )
  )

  return [
    分块('design-headline', `${t(设计数据.标题键)}：${t(设计数据.介绍键)}`, 'design', 'design.ts'),
    分块('design-tools', `设计工具：${设计数据.工具键表.map((key) => t(key)).join('、')}。`, 'design', 'design.ts'),
    ...作品分块,
  ]
}

function 构建媒体分块(): 知识块[] {
  const 分类分块 = 媒体数据.分类表.map((分类) =>
    分块(
      `媒体-category-${分类.id}`,
      `${t(分类.标签键)}：${分类.条目键表.map((key) => t(key)).join('、')}。`,
      'media',
      'media.ts'
    )
  )

  const 时间线分块 = 媒体数据.时间线.map((事件) =>
    分块(`媒体-timeline-${事件.年份}`, `${事件.年份}年：${t(事件.事件键)}`, 'media', 'media.ts')
  )

  return [
    分块('media-headline', `${t(媒体数据.标题键)}：${t(媒体数据.介绍键)}`, 'media', 'media.ts'),
    ...分类分块,
    ...时间线分块,
  ]
}

function 构建GitHub分块(): 知识块[] {
  if (!Array.isArray(GitHub仓库快照) || GitHub仓库快照.length === 0) return []
  const 纳入数 = GitHub快照元信息?.纳入仓库数 ?? GitHub仓库快照.length
  const 总数 = GitHub快照元信息?.公开仓库总数 ?? 纳入数

  const 总览 = 分块(
    'github-overview',
    `GitHub公开仓库快照（生成时间${GitHub快照生成时间}）：账号${GitHub快照元信息?.账号 ?? 'XuanRuiMu'}公开仓库共${总数}个，本次快照纳入${纳入数}个，分别是${GitHub仓库快照.map(
      (仓库) => `${仓库.名称}（${仓库.主语言 || '语言未标注'}，最近推送${仓库.最近推送时间.slice(0, 10)}）`
    ).join('；')}。`,
    'github',
    'githubSnapshot.ts'
  )
  const 仓库块 = GitHub仓库快照.map((仓库) => {
    const 语言构成 = 仓库.语言分布.map((项) => 项.语言).join('、')
    const 摘录 = 仓库.README摘录 ? `README要点：${仓库.README摘录.slice(0, 400)}。` : ''
    return 分块(
      `github-${仓库.名称}`,
      `GitHub仓库${仓库.名称}（${仓库.全名}，${仓库.地址}）。简介：${仓库.简介 || '仓库未填写简介'}。主语言：${仓库.主语言 || '未标注'}。${语言构成 ? `语言构成：${语言构成}。` : ''}最近推送：${仓库.最近推送时间.slice(0, 10)}。Star${仓库.星标数}/Fork${仓库.分叉数}。${仓库.主题.length > 0 ? `主题：${仓库.主题.join('、')}。` : ''}${摘录}`,
      'github',
      'githubSnapshot.ts'
    )
  })
  return [总览, ...仓库块]
}

export function 构建简历知识库(): 知识块[] {
  return [
    ...构建个人信息分块(),
    ...构建项目分块(),
    ...构建技术栈分块(),
    ...构建技能分块(),
    ...构建工作区分块(),
    ...构建经历分块(),
    ...构建教育分块(),
    ...构建设计分块(),
    ...构建媒体分块(),
    ...构建GitHub分块(),
  ]
}

export const 简历知识库: 知识块[] = 构建简历知识库()
