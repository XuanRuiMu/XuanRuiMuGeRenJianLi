import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import zhCN from './i18n/zh-CN.json'
import { t } from './i18n/translations'
import { buildResumeKnowledgeBase } from './ai/resumeKnowledgeBase'

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value !== null && typeof value === 'object')
    return Object.values(value as Record<string, unknown>).flatMap(collectStrings)
  return []
}

const 翻译文本 = collectStrings(zhCN).join('\n')
const 知识库文本 = buildResumeKnowledgeBase()
  .map((chunk) => chunk.content)
  .join('\n')

function 读文件(相对路径: string): string {
  return fs.readFileSync(path.resolve(相对路径), 'utf-8')
}

function 键存在(路径: string): boolean {
  let 节点: unknown = zhCN
  for (const 步 of 路径.split('.')) {
    if (节点 === null || typeof 节点 !== 'object' || !(步 in (节点 as object))) return false
    节点 = (节点 as Record<string, unknown>)[步]
  }
  return true
}

/** 逐个 grep 证明过「src 与 functions 中无任何 t()/ta()/键路径引用」的死文案节点，加回即红 */
const 死键路径表 = [
  'intro',
  'intro.enterButton',
  'intro.audioHint',
  'intro.escHint',
  'intro.hoverHint',
  'contact.copyEmail',
  'showcase.rows',
  'showcase.rows.education',
  'showcase.rows.design',
  'showcase.rows.media',
  'showcase.rows.opensource',
  'showcase.cards.aiToolchain',
  'showcase.cards.aiToolchain.title',
  'showcase.cards.aiToolchain.desc',
  'education.subtitle',
  'education.tabs',
  'education.tabs.summary',
  'education.tabs.courses',
  'education.tabs.achievements',
  'education.paragraph',
  'design',
  'design.title',
  'design.subtitle',
  'design.toolsTitle',
  'design.canvasLabel',
  'design.canvasHint',
]

describe('FP-02内容一致性回归', () => {
  it('群人数多处一致为200人+', () => {
    expect(t('data.experience.entries.educator.description')).toContain('200人+')
    expect(t('data.experience.entries.educator.achievement3')).toContain('200人+')
  })

  it('翻译文本与知识库无旧事实残留', () => {
    for (const 文本 of [翻译文本, 知识库文本]) {
      expect(文本).not.toContain('283')
      expect(文本).not.toContain('逃脱')
      expect(文本).not.toContain('原创歌曲')
      expect(文本).not.toContain('突击课')
      expect(文本).not.toContain('突击辅导')
    }
  })

  it('FP-01：四处暮澜链接均为指定地址', async () => {
    const { projects } = await import('./data/projects')
    const { experiences } = await import('./data/experience')
    const { showcaseRows } = await import('./data/showcase')
    const 指定地址 = 'https://github.com/XuanRuiMu/XRMChaJian'
    expect(projects.find((项目) => 项目.id === 'xrm')?.links[0].url).toBe(指定地址)
    expect(experiences.find((条目) => 条目.id === 'mcserver')?.links?.[0].url).toBe(指定地址)
    const 所有卡片 = showcaseRows.flatMap((行) => 行.cards)
    expect(所有卡片.find((卡片) => 卡片.id === 'xrmUi')?.href).toBe(指定地址)
    expect(所有卡片.find((卡片) => 卡片.id === 'gameWorld')?.href).toBe(指定地址)
  })

  it('教学口径为线下小班课计算机培训', () => {
    expect(t('data.education.achievements.crashCourse')).toContain('线下小班课计算机培训')
    expect(t('data.education.achievements.crashCourse')).toContain('免修考试')
    expect(t('showcase.cards.teaching.desc')).toContain('全链路')
  })

  it('FP-03：音乐与内容创作添头清零，量化指标落在技能板块', async () => {
    expect('music' in zhCN.data).toBe(false)
    expect('skills' in zhCN.data).toBe(false)
    expect('categories' in zhCN.skills).toBe(false)
    expect('radar' in zhCN).toBe(false)
    const 维度表 = zhCN.data.radar.dimensions as Record<string, unknown>
    expect(Object.keys(维度表).sort()).toEqual(
      ['aiAgent', 'artCreation', 'backendArchitecture', 'designAesthetic', 'devopsDelivery', 'fullStack'].sort()
    )
    expect('escape' in zhCN.showcase.cards).toBe(false)
    for (const 残留 of ['架子鼓', '爵士乐', '乐理', '频谱', '音乐经历']) {
      expect(翻译文本, `翻译文本不得残留「${残留}」`).not.toContain(残留)
    }
    const 展示卡id = (await import('./data/showcase')).showcaseRows.flatMap((行) => 行.cards).map((卡) => 卡.id)
    expect(展示卡id).not.toContain('escape')
    expect(fs.existsSync(path.resolve('public/showcase/爵士乐.png'))).toBe(false)
    expect(fs.existsSync(path.resolve('src/data/music.ts'))).toBe(false)
    // 「9」这类单字符在整坨翻译文本里必然命中，等于没断言：改钉 skills.metrics 的真实指标值
    const { javaClasses, aiSkills, agentSkills, serverOps } = zhCN.skills.metrics
    expect([javaClasses.value, aiSkills.value, agentSkills.value, serverOps.value]).toEqual(['400+', '85+', '9', '7年'])
    for (const 指标 of ['400+', '85+', '7年']) {
      expect(翻译文本, `量化指标「${指标}」必须仍在前端文案里`).toContain(指标)
    }
  })

  it('FP-01：AI输入框无视觉占位且保无障碍可用', () => {
    expect(t('ai.empty')).toBe('有什么可以帮你的？')
    expect(t('ai.empty')).not.toContain('例如')
    expect(翻译文本).not.toContain('例如')
    expect(翻译文本).not.toContain(['输入', '问题'].join(''))
  })
})

describe('FP-10 文案错误、口径不一致与死文案守卫', () => {
  it('死文案节点确实不存在（塞回任何一条即红）', () => {
    for (const 路径 of 死键路径表) {
      expect(键存在(路径), `zh-CN.json.${路径} 无消费者，属死文案`).toBe(false)
    }
    // education/media 的板块标题仍是 AI 助手时间线的数据源，不得连带误删
    expect(键存在('education.title')).toBe(true)
    expect(键存在('media.title')).toBe(true)
    expect(Object.keys(zhCN.education)).toEqual(['title'])
  })

  it('五子棋重开按钮：aria-label 前缀、可见文案、CSS 注释三处用词同源', () => {
    const 源码 = 读文件('src/features/contact/Gomoku.tsx')
    const 匹配 = 源码.match(/aria-label="(.+?)重开"\s*>\s*<RotateCcw size=\{12\} \/>\s*(\S+)\s*<\/button>/)
    if (!匹配) throw new Error('未取到重开按钮的 aria-label 与可见文案，断言会空转')
    const [, aria前缀, 可见文案] = 匹配
    expect(aria前缀).toBe(可见文案)
    expect(读文件('src/index.css')).toContain(`${可见文案}：`)
  })

  it('PWA 技能快捷方式说明与技能板块实际小标题同源，且不含已删概念', () => {
    const 内容 = 读文件('public/manifest.json')
    expect(内容).not.toContain(['量化', '结果'].join(''))
    expect(键存在('skills.metricsTitle')).toBe(false)
    // 正向：描述词必须与技能板块实际渲染的两个小标题同源
    expect(内容).toContain(t('skills.groupsTitle'))
    expect(内容).toContain(t('skills.radarTitle'))
  })

  it('关于我第 4 行不再是缺谓语的句子', () => {
    const 第4行 = t('about.introLines.l4.text')
    expect(第4行).toContain('让AI从')
    expect(第4行).not.toContain('——')
  })

  it('推荐语 AI开发者条目与「开源的是编排框架与 Agent 技能」自洽', () => {
    const 开源事实 = [t('about.introLines.l3.text'), t('showcase.cards.repoLoop.desc')].join('\n')
    expect(开源事实).toContain('编排框架')
    expect(开源事实).toContain('Agent技能')
    const role = t('testimonials.items.aiDeveloper.role')
    const quote = t('testimonials.items.aiDeveloper.quote')
    expect(role).toContain('开源')
    expect(role).toContain('开源')
    expect(role).toContain('工具')
    expect(quote).toContain('开源')
    // 站内 85+ 工作流模板从未声明开源，推荐语不得把它说成开源物
    expect(role).not.toContain('工作流模板')
    expect(quote).not.toMatch(/开源[^。]*工作流模板/)
    expect(t('testimonials.items.aiDeveloper.context')).toContain('开源仓库')
  })

  it('模型名拼写为官方写法 CodeGeeX / GPT-6 Astra', () => {
    const 描述 = t('data.experience.entries.aiengineer.description')
    expect(描述).toContain('CodeGeeX')
    expect(描述).toContain('GPT-6 Astra')
    expect(描述).not.toContain('CodeGeex')
    expect(描述).not.toContain('GPT-6-Astra')
  })

  it('中文串内不混入多余半角空格，且 85+ 口径全站统一', () => {
    expect(翻译文本).not.toContain('在B站 ')
    expect(翻译文本).toContain('在B站录课')
    expect(翻译文本).toContain('开始在B站更新计算机课程')
    expect(翻译文本).not.toContain('85多')
    expect(翻译文本.match(/85\+个/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('命令面板提示同时给出 Ctrl 与 ⌘，与实际按键绑定一致', () => {
    const 提示 = t('hero.hint')
    expect(提示).toContain('Ctrl/⌘+K')
    expect(提示).toContain('Ctrl')
    expect(提示).toContain('⌘')
    const 绑定 = 读文件('src/components/command-palette/CommandPalette.tsx')
    expect(绑定).toContain('event.metaKey || event.ctrlKey')
  })

  it('AI 兜底回答引导的联系方式不超过联系板块实际提供的项', () => {
    expect(t('chat.answers.fallback')).not.toContain('手机')
    expect(t('chat.answers.fallback')).toContain('微信QQ')
    const 板块 = 读文件('src/features/contact/ContactSection.tsx')
    expect(板块).not.toContain('contact.info.phone')
    expect(板块).toContain('contact.info.wechat')
    expect(板块).toContain('contact.info.qq')
  })

  it('职业定位.txt 不再自称改了就能改全站', () => {
    const 原文 = 读文件('职业定位.txt')
    expect(原文).not.toContain('改这里即可改站点')
    expect(原文).toContain('career.direction')
    expect(原文).toContain('manifest.json')
  })
})
