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
      `姓名：${info.name}。年龄：${info.age}岁。所在地：${info.location}。求职方向：全栈开发 / AI 工具开发 / 游戏服务端架构。期望城市：${t(info.expectedCityKey)}。薪资期望：${info.salary}。到岗时间：${t(info.availabilityKey)}。`,
      'personalInfo',
      'personalInfo.ts'
    ),
    chunk(
      'personal-info-contact',
      `联系方式：邮箱 ${info.email}，电话 ${info.phone}，GitHub ${info.github}，B站 ${info.bilibili}。`,
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
      '核心技术栈：Java（Spring Boot / Spigot / Paper 服务端插件开发）、Python（自动化脚本、AI Agent 工具链、FastAPI）、TypeScript / JavaScript（React 19、Vite、Three.js / R3F、Tailwind CSS）、Go、Rust。数据库与中间件：MySQL、Redis、SQLite、PostgreSQL。工程化与运维：Docker、CI/CD、Linux 运维脚本。AI 方向：自定义 Skill（85+）、多 Agent 协作、MCP 协议、DeepSeek API 接入。音视频：ffmpeg、MIDI 编曲。',
      'techStack',
      'workspace'
    ),
    chunk(
      'tech-stack-frontend',
      '前端技术：React 19 + TypeScript + Vite 8 + Tailwind v4，动画用 framer-motion，3D 用 Three.js / @react-three/fiber，平滑滚动用 Lenis，命令面板用 cmdk，状态用 zustand，数据请求用 TanStack Query，PWA 用 vite-plugin-pwa。',
      'techStack',
      'workspace'
    ),
  ]
}

function buildWorkspaceChunks(): KnowledgeChunk[] {
  return [
    chunk(
      'workspace-overview',
      '工作区（D:/xuanr/Desktop/燃烧之陨已删除的经历）包含以下项目：已删除的经历已删除的经历MMORPG服务端（8 世界 32 职业的  1.21.4 整合包，Java/Spigot/MySQL/Redis）、燃烧之陨系列（已删除的经历多元生存服、粘液科技服、登录服、多服连接）、燃烧之陨资源包、音乐开发（原创歌曲《逃脱》词曲编曲母带，ffmpeg/MIDI）、总控制台（Python AI 总控制台，DeepSeek/MiniMax API 接入，多仓库 GitHub 推送封装）、个人简历（本 React 简历站）、个人简历参考合集（多个前端参考实现：react-three-fiber、gsap、code-editor-next 等）、开发需求文档、已删除的经历小说。',
      'workspace',
      'workspace'
    ),
    chunk(
      'workspace-ai-console',
      '总控制台（Python）是 AI 工具链中枢：封装 DeepSeek / MiniMax 等大模型 API，提供非交互式多仓库 git 推送（自带 token 注入、清理 node_modules/dist 等路径），并集中管理 API 凭证（API大全.txt）。',
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
