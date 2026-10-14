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
  metadata: {
    category: string
    source: string
  }
}

function chunk(id: string, content: string, category: string, source: string): 知识块 {
  return {
    id,
    content: content.trim(),
    metadata: { category, source },
  }
}

function buildPersonalInfoChunks(): 知识块[] {
  const info = 个人信息
  return [
    chunk(
      'personal-info-bio',
      `姓名：${info.name}。年龄：${info.age}岁。所在地：${info.location}。求职方向：${求职方向()}。期望城市：${t(info.expectedCityKey)}。薪资期望：${t(info.salaryKey)}。到岗时间：${t(info.availabilityKey)}。`,
      'personalInfo',
      'personalInfo.ts'
    ),
    chunk(
      'personal-info-contact',
      '联系方式：页面底部联系板块提供五种联系方式，AI问答可点按钮复制或直达主页。',
      'personalInfo',
      'personalInfo.ts'
    ),
    chunk(
      'personal-info-education',
      `教育背景：${info.教育背景.school}，${info.教育背景.major}，${info.教育背景.degree}，${info.教育背景.period}。`,
      'education',
      'personalInfo.ts'
    ),
  ]
}

function buildProjectChunks(): 知识块[] {
  return 项目表.map((project) => {
    const metrics = project.metricKeys?.map((key) => t(key)).join('，') ?? ''
    const links = project.links?.map((link) => `${t(link.labelKey)}：${link.url}`).join('，') ?? ''
    return chunk(
      `project-${project.id}`,
      `项目：${t(project.nameKey)}。描述：${t(project.descKey)}。技术标签：${project.tags.join('、')}。${metrics ? `关键指标：${metrics}。` : ''}${links ? `相关链接：${links}。` : ''}`,
      'projects',
      'projects.ts'
    )
  })
}

function buildTechStackChunks(): 知识块[] {
  return [
    chunk(
      'tech-stack-core',
      '核心技术栈：Java 25（GraalVM，Spigot/Purpur服务端插件开发，JUnit 6+Mockito测试）、Node.js（Express+TypeScript全栈开发）、Python（自动化脚本、AI Agent工具链）。数据库与中间件：MySQL、Redis、PostgreSQL、SQLite。前端：React 19、Three.js/R3F、Tailwind CSS、Vite。工程化与运维：Docker/docker-compose（多服务编排上线经验）、Git工作流、Gradle Kotlin DSL构建。AI方向：可复用AI工作流模板、多Agent协作、MCP协议、DeepSeek API接入（数量与能力陈述见技能分组条目）。音视频：ffmpeg。',
      'techStack',
      'workspace'
    ),
    chunk(
      'tech-stack-frontend',
      '前端技术：React 19+TypeScript+Vite+Tailwind v4，动画用framer-motion，3D用Three.js/@react-three/fiber，平滑滚动用Lenis，命令面板用cmdk，状态用zustand，PWA用vite-plugin-pwa。',
      'techStack',
      'workspace'
    ),
  ]
}

function buildWorkspaceChunks(): 知识块[] {
  return [
    chunk(
      'workspace-overview',
      '工作区包含以下项目：暮澜纪元我的世界MMORPG服务端（8世界32职业的服务端，自研Java插件425个源文件、其中测试类159个，Gradle Kotlin DSL多模块）、和我恋爱吧（能直接用的恋爱聊天应用：挑AI对象聊天、军师支招、好友与挑战玩法）、燃烧之陨系列（我的世界多元生存服、粘液科技服、登录服、多服连接）、燃烧之陨资源包、循环工程skill（定个目标就自动拆步骤、自己干活、自己检查直到做完，https://github.com/XuanRuiMu/loop-engineering）、个人简历（本React简历站）、开发需求文档、暮澜纪元小说。',
      'workspace',
      'workspace'
    ),
    chunk(
      'workspace-ai-console',
      '循环工程skill是一个任务系统：定个目标，它就自动拆步骤、自己干活、自己检查，直到做完为止。地址https://github.com/XuanRuiMu/loop-engineering。',
      'workspace',
      'workspace'
    ),
  ]
}

function buildSkillChunks(): 知识块[] {
  const 指标块 = chunk(
    'skills-metrics',
    `量化指标：${量化指标()
      .map((指标) => `${指标.value}${指标.label}`)
      .join('；')}。`,
    'skills',
    'skillGroups.ts'
  )
  const 分组块 = 技能组表().map((组) =>
    chunk(
      `skill-group-${组.id}`,
      `能力组：${组.label}。具体能力：${组.items.join('；')}。关键词：${组.tags.join('、')}。`,
      'skills',
      'skillGroups.ts'
    )
  )
  return [指标块, ...分组块]
}

function buildExperienceChunks(): 知识块[] {
  return 经历表.map((entry) => {
    const 成就 = (entry.achievementKeys ?? []).map((key) => t(key)).join('；')
    return chunk(
      `experience-${entry.id}`,
      `经历：${t(entry.titleKey)}。机构：${entry.organizationKey ? t(entry.organizationKey) : '个人'}。时间：${t(entry.periodKey)}。描述：${entry.descriptionKeys.map((key) => t(key)).join(' ')}。${成就 ? `成就：${成就}。` : ''}`,
      'experience',
      'experience.ts'
    )
  })
}

function buildEducationChunks(): 知识块[] {
  const summary = 教育档案.summary
  const courses = 教育档案.courses.map((course) => `${t(course.nameKey)}（${t(course.levelKey)}）`).join('、')
  const achievements = 教育档案.achievementKeys.map((key) => t(key)).join('；')

  return [
    chunk(
      'education-summary',
      `教育概览：${summary.school}毕业，${summary.school}，${summary.major}，${summary.degree}，${summary.period}。学校是${summary.school}。`,
      'education',
      '教育档案.ts'
    ),
    chunk('education-courses', `主修与自学课程：${courses}。`, 'education', '教育档案.ts'),
    chunk('education-achievements', `教育成果：${achievements}。`, 'education', '教育档案.ts'),
  ]
}

function buildDesignChunks(): 知识块[] {
  const workChunks = 设计数据.works.map((work) =>
    chunk(
      `设计-work-${work.id}`,
      `设计作品：${t(work.nameKey)}。分类：${t(work.categoryKey)}。描述：${t(work.descKey)}。`,
      'design',
      'design.ts'
    )
  )

  return [
    chunk('design-headline', `${t(设计数据.headlineKey)}：${t(设计数据.introKey)}`, 'design', 'design.ts'),
    chunk('design-tools', `设计工具：${设计数据.toolKeys.map((key) => t(key)).join('、')}。`, 'design', 'design.ts'),
    ...workChunks,
  ]
}

function buildMediaChunks(): 知识块[] {
  const categoryChunks = 媒体数据.categories.map((category) =>
    chunk(
      `媒体-category-${category.id}`,
      `${t(category.labelKey)}：${category.itemKeys.map((key) => t(key)).join('、')}。`,
      'media',
      'media.ts'
    )
  )

  const timelineChunks = 媒体数据.timeline.map((event) =>
    chunk(`媒体-timeline-${event.year}`, `${event.year}年：${t(event.eventKey)}`, 'media', 'media.ts')
  )

  return [
    chunk('media-headline', `${t(媒体数据.headlineKey)}：${t(媒体数据.introKey)}`, 'media', 'media.ts'),
    ...categoryChunks,
    ...timelineChunks,
  ]
}

/**
 * GitHub 仓库快照chunk（构建期由 scripts/同步GitHub快照.js 拉取）。
 * 只写快照里有的字段：没有 README 或没有语言的仓库不补空话，避免 AI 拿空字段编故事。
 */
function buildGitHubChunks(): 知识块[] {
  if (!Array.isArray(GitHub仓库快照) || GitHub仓库快照.length === 0) return []
  const 纳入数 = GitHub快照元信息?.纳入仓库数 ?? GitHub仓库快照.length
  const 总数 = GitHub快照元信息?.公开仓库总数 ?? 纳入数
  // 纳入数可能小于总数（被排除清单过滤或当次被限流），两个数都写清楚，避免 AI 把"纳入数"说成仓库总数
  const 总览 = chunk(
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
    return chunk(
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
    ...buildPersonalInfoChunks(),
    ...buildProjectChunks(),
    ...buildTechStackChunks(),
    ...buildSkillChunks(),
    ...buildWorkspaceChunks(),
    ...buildExperienceChunks(),
    ...buildEducationChunks(),
    ...buildDesignChunks(),
    ...buildMediaChunks(),
    ...buildGitHubChunks(),
  ]
}

export const 简历知识库: 知识块[] = 构建简历知识库()
