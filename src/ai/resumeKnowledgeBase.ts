import { personalInfo } from '../data/personalInfo'
import { projects } from '../data/projects'
import { experiences } from '../data/experience'
import { education } from '../data/education'
import { design } from '../data/design'
import { music } from '../data/music'
import { media } from '../data/media'
import { t } from '../i18n/translations'

export interface KnowledgeChunk {
  id: string
  content: string
  metadata: {
    category: string
    source: string
  }
}

function chunk(id: string, content: string, category: string, source: string): KnowledgeChunk {
  return {
    id,
    content: content.trim(),
    metadata: { category, source },
  }
}

function buildPersonalInfoChunks(): KnowledgeChunk[] {
  const info = personalInfo
  return [
    chunk(
      'personal-info-bio',
      `姓名：${info.name}。年龄：${info.age}岁。所在地：${info.location}。求职方向：Java后端开发/AI应用开发/全栈开发/软件工程师。期望城市：${t(info.expectedCityKey)}。薪资期望：${info.salary}。到岗时间：${t(info.availabilityKey)}。`,
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
      `教育背景：${info.education.school}，${info.education.major}，${info.education.degree}，${info.education.period}。`,
      'education',
      'personalInfo.ts'
    ),
  ]
}

function buildProjectChunks(): KnowledgeChunk[] {
  return projects.map((project) => {
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

function buildTechStackChunks(): KnowledgeChunk[] {
  return [
    chunk(
      'tech-stack-core',
      '核心技术栈：Java 25（GraalVM，Spigot/Purpur服务端插件开发，JUnit 6+Mockito测试）、Node.js（Express+TypeScript全栈开发）、Python（自动化脚本、AI Agent工具链）。数据库与中间件：MySQL、Redis、PostgreSQL、SQLite。前端：React 19、Three.js/R3F、Tailwind CSS、Vite。工程化与运维：Docker/docker-compose（多服务编排上线经验）、Git工作流、Gradle Kotlin DSL构建。AI方向：自定义Skill（85+）、多Agent协作、MCP协议、DeepSeek API接入。音视频：ffmpeg。',
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

function buildWorkspaceChunks(): KnowledgeChunk[] {
  return [
    chunk(
      'workspace-overview',
      '工作区包含以下项目：暮澜纪元我的世界MMORPG服务端（8世界32职业的服务端，自研Java插件400+类，Gradle Kotlin DSL多模块）、和我恋爱吧（能直接用的恋爱聊天应用：挑AI对象聊天、军师支招、好友与挑战玩法）、燃烧之陨系列（我的世界多元生存服、粘液科技服、登录服、多服连接）、燃烧之陨资源包、音乐（曾考取架子鼓九级证书，未创作过歌曲等）、循环工程skill（定个目标就自动拆步骤、自己干活、自己检查直到做完，https://github.com/XuanRuiMu/loop-engineering）、个人简历（本React简历站）、开发需求文档、暮澜纪元小说。',
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

function buildExperienceChunks(): KnowledgeChunk[] {
  return experiences.map((entry) =>
    chunk(
      `experience-${entry.id}`,
      `经历：${t(entry.titleKey)}。机构：${entry.organizationKey ? t(entry.organizationKey) : '个人'}。时间：${t(entry.periodKey)}。描述：${entry.descriptionKeys.map((key) => t(key)).join(' ')}。`,
      'experience',
      'experience.ts'
    )
  )
}

function buildEducationChunks(): KnowledgeChunk[] {
  const summary = education.summary
  const courses = education.courses.map((course) => `${t(course.nameKey)}（${t(course.levelKey)}）`).join('、')
  const achievements = education.achievementKeys.map((key) => t(key)).join('；')

  return [
    chunk(
      'education-summary',
      `教育概览：${summary.school}，${summary.major}，${summary.degree}，${summary.period}。`,
      'education',
      'education.ts'
    ),
    chunk('education-courses', `主修与自学课程：${courses}。`, 'education', 'education.ts'),
    chunk('education-achievements', `教育成果：${achievements}。`, 'education', 'education.ts'),
  ]
}

function buildDesignChunks(): KnowledgeChunk[] {
  const workChunks = design.works.map((work) =>
    chunk(
      `design-work-${work.id}`,
      `设计作品：${t(work.nameKey)}。分类：${t(work.categoryKey)}。描述：${t(work.descKey)}。`,
      'design',
      'design.ts'
    )
  )

  return [
    chunk('design-headline', `${t(design.headlineKey)}：${t(design.introKey)}`, 'design', 'design.ts'),
    chunk('design-tools', `设计工具：${design.toolKeys.map((key) => t(key)).join('、')}。`, 'design', 'design.ts'),
    ...workChunks,
  ]
}

function buildMusicChunks(): KnowledgeChunk[] {
  const trackChunks = music.tracks.map((track) =>
    chunk(
      `music-track-${track.id}`,
      `音乐作品：${t(track.nameKey)}。类型：${t(track.typeKey)}。描述：${t(track.descKey)}。`,
      'music',
      'music.ts'
    )
  )

  return [
    chunk('music-headline', `${t(music.headlineKey)}：${t(music.introKey)}`, 'music', 'music.ts'),
    chunk('music-skills', `音乐技能与工具：${music.skillKeys.map((key) => t(key)).join('、')}。`, 'music', 'music.ts'),
    ...trackChunks,
  ]
}

function buildMediaChunks(): KnowledgeChunk[] {
  const categoryChunks = media.categories.map((category) =>
    chunk(
      `media-category-${category.id}`,
      `${t(category.labelKey)}：${category.itemKeys.map((key) => t(key)).join('、')}。`,
      'media',
      'media.ts'
    )
  )

  const timelineChunks = media.timeline.map((event) =>
    chunk(`media-timeline-${event.year}`, `${event.year}年：${t(event.eventKey)}`, 'media', 'media.ts')
  )

  return [
    chunk('media-headline', `${t(media.headlineKey)}：${t(media.introKey)}`, 'media', 'media.ts'),
    ...categoryChunks,
    ...timelineChunks,
  ]
}

export function buildResumeKnowledgeBase(): KnowledgeChunk[] {
  return [
    ...buildPersonalInfoChunks(),
    ...buildProjectChunks(),
    ...buildTechStackChunks(),
    ...buildWorkspaceChunks(),
    ...buildExperienceChunks(),
    ...buildEducationChunks(),
    ...buildDesignChunks(),
    ...buildMusicChunks(),
    ...buildMediaChunks(),
  ]
}

export const resumeKnowledgeBase: KnowledgeChunk[] = buildResumeKnowledgeBase()
