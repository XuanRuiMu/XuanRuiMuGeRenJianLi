import { describe, it, expect } from 'vitest'
import { getLocalAnswer, RULES } from './localEngine'
import { 共享意图表 } from './intentTable'
import type { UiComponent } from './structuredOutput'
import { personalInfo } from '../data/personalInfo'
import { 求职方向 } from '../data/careerFocus'
import { t, type TranslationKey } from '../i18n/translations'

describe('localEngine', () => {
  it('returns text answer for name question', () => {
    const result = getLocalAnswer('你叫什么')
    expect(result.role).toBe('assistant')
    expect(result.content).toContain(personalInfo.name)
    expect(result.component).toBeUndefined()
  })

  it('returns ContactLinks for contact question', () => {
    const result = getLocalAnswer('联系方式')
    expect(result.content).not.toContain(personalInfo.email)
    expect(result.content).not.toContain(personalInfo.phone)
    expect(result.component).toEqual({ type: 'ContactLinks' })
  })

  it('qq微信手机稳定命中ContactLinks且无直给', () => {
    for (const q of ['怎么联系你', '你的微信是多少', 'qq多少', '手机号多少', '邮箱是什么']) {
      const result = getLocalAnswer(q)
      expect(result.component).toEqual({ type: 'ContactLinks' })
      expect(result.content).not.toContain(personalInfo.email)
      expect(result.content).not.toContain(personalInfo.phone)
    }
  })

  it('github项目问法不被联系意图污染', () => {
    const result = getLocalAnswer('你的github项目有哪些')
    expect(result.component).not.toEqual({ type: 'ContactLinks' })
  })

  it('returns ProjectCard with xrm for project name question', () => {
    const result = getLocalAnswer('介绍一下暮澜纪元')
    expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
  })

  it('detects lovewithme project from input', () => {
    const result = getLocalAnswer('介绍一下和我恋爱吧')
    expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'lovewithme' })
  })

  it('蜂来问法落到蜂来项目卡片', () => {
    const result = getLocalAnswer('蜂来是做什么的')
    expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'fengLai' })
  })

  it('detects aiConsole project from input', () => {
    const result = getLocalAnswer('介绍一下循环工程skill')
    expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'aiConsole' })
  })

  it('returns skills text answer (no component) for skill question', () => {
    const result = getLocalAnswer('你的技术栈')
    expect(result.role).toBe('assistant')
    expect(result.component).toBeUndefined()
  })

  it('returns Timeline with education scope for education question', () => {
    const result = getLocalAnswer('教育背景')
    expect(result.component).toEqual({ type: 'Timeline', scope: 'education' })
  })

  it('returns Timeline with experience scope for experience question', () => {
    const result = getLocalAnswer('工作经历')
    expect(result.component).toEqual({ type: 'Timeline', scope: 'experience' })
  })

  it('returns fallback text for unknown question', () => {
    const result = getLocalAnswer('宇宙终极答案')
    expect(result.content).not.toContain(personalInfo.email)
    expect(result.content).not.toContain(personalInfo.phone)
    expect(result.component).toBeUndefined()
  })

  it('问候语返回问候终态而非没准备答案（你好/您好/hi/hello）', () => {
    const 期望问候 = t('chat.answers.greeting')
    for (const q of ['你好', '您好', 'hi', 'hello']) {
      const result = getLocalAnswer(q)
      expect(result.role).toBe('assistant')
      expect(result.content).toBe(期望问候)
      expect(result.content).not.toContain('没准备答案')
      expect(result.component).toBeUndefined()
    }
  })

  it('谢谢返回感谢终态', () => {
    const result = getLocalAnswer('谢谢')
    expect(result.content).toBe(t('chat.answers.thanks'))
    expect(result.content).not.toContain('没准备答案')
  })

  it('再见返回告别终态', () => {
    const result = getLocalAnswer('再见')
    expect(result.content).toBe(t('chat.answers.farewell'))
  })
})

describe('本地兜底答非所问根因（FP-04b）：只认话题独占的问法短语', () => {
  const 诚实兜底 = t('chat.answers.fallback')

  function 期望答案(key: 'name' | 'target' | 'contact' | 'projects' | 'skills' | 'education' | 'experience'): string {
    return t(`chat.answers.${key}` as unknown as TranslationKey)
      .replace('{name}', personalInfo.name)
      .replace('{direction}', 求职方向())
      .replace('{school}', personalInfo.education.school)
      .replace('{major}', personalInfo.education.major)
      .replace('{degree}', personalInfo.education.degree)
      .replace('{period}', personalInfo.education.period)
  }

  const 答非所问句 = [
    '你好。请问，玄锐暮可以胜任文职工作吗',
    '可以胜任文职工作吗',
    '项目管理是你的核心能力吗',
    '电话会议怎么开',
    '今天天气怎么样',
    '我在找工作',
    '工作的意义是什么',
    '我的手机壳丢了',
    '这个组件的时间线怎么画',
    '这个技术难点怎么攻克',
    '联系不到他怎么办',
    '这个专业术语我不懂',
    '推荐几首歌',
    '宇宙终极答案',
    '帮我写一首诗',
    'loopy',
  ]

  const 真实简历意图问句: Array<{
    问句: string
    key: 'name' | 'target' | 'contact' | 'projects' | 'skills' | 'education' | 'experience'
    component?: UiComponent
  }> = [
    { 问句: '你是谁', key: 'name' },
    { 问句: '你的目标岗位是什么', key: 'target' },
    { 问句: '介绍项目', key: 'projects', component: { type: 'ProjectCard', projectId: 'xrm' } },
    { 问句: '分享项目', key: 'projects', component: { type: 'ProjectCard', projectId: 'xrm' } },
    { 问句: '讲解项目', key: 'projects', component: { type: 'ProjectCard', projectId: 'xrm' } },
    { 问句: '说说项目', key: 'projects', component: { type: 'ProjectCard', projectId: 'xrm' } },
    { 问句: '介绍项目经历', key: 'projects', component: { type: 'ProjectCard', projectId: 'xrm' } },
    { 问句: '介绍项目经历', key: 'projects', component: { type: 'ProjectCard', projectId: 'xrm' } },
    { 问句: '你做过哪些项目', key: 'projects', component: { type: 'ProjectCard', projectId: 'xrm' } },
    { 问句: '你的作品有哪些', key: 'projects', component: { type: 'ProjectCard', projectId: 'xrm' } },
    { 问句: '我的工作经历', key: 'experience', component: { type: 'Timeline', scope: 'experience' } },
    { 问句: '有没有实习经历', key: 'experience', component: { type: 'Timeline', scope: 'experience' } },
    { 问句: '教育背景', key: 'education', component: { type: 'Timeline', scope: 'education' } },
    { 问句: '什么学历', key: 'education', component: { type: 'Timeline', scope: 'education' } },
    { 问句: '他是哪个学校毕业的?', key: 'education', component: { type: 'Timeline', scope: 'education' } },
    { 问句: '你的技术栈', key: 'skills' },
    { 问句: '你擅长什么', key: 'skills' },
    { 问句: '怎么联系你', key: 'contact', component: { type: 'ContactLinks' } },
    { 问句: '你微信多少', key: 'contact', component: { type: 'ContactLinks' } },
    { 问句: '邮箱是什么', key: 'contact', component: { type: 'ContactLinks' } },
    { 问句: '介绍一下暮澜纪元', key: 'projects', component: { type: 'ProjectCard', projectId: 'xrm' } },
    { 问句: '和我恋爱吧是做什么的', key: 'projects', component: { type: 'ProjectCard', projectId: 'lovewithme' } },
    { 问句: '蜂来是做什么的', key: 'projects', component: { type: 'ProjectCard', projectId: 'fengLai' } },
    { 问句: '循环工程是什么', key: 'projects', component: { type: 'ProjectCard', projectId: 'aiConsole' } },
  ]

  it('答非所问类问句全部落到诚实兜底且不弹任何组件', () => {
    for (const 问句 of 答非所问句) {
      const result = getLocalAnswer(问句)
      expect(result.content, `「${问句}」应诚实兜底`).toBe(诚实兜底)
      expect(result.component, `「${问句}」不应弹组件`).toBeUndefined()
    }
  })

  it('真实简历意图问句全部命中对应预制答案与组件契约', () => {
    for (const 项 of 真实简历意图问句) {
      const result = getLocalAnswer(项.问句)
      expect(result.content, `「${项.问句}」应给出 ${项.key} 预制答案`).toBe(期望答案(项.key))
      expect(result.component, `「${项.问句}」组件契约不符`).toEqual(项.component)
    }
  })

  it('联系方式预制答案不直给邮箱与电话', () => {
    for (const 问句 of ['联系方式', '怎么联系你', '你的微信是多少', '邮箱是什么']) {
      const result = getLocalAnswer(问句)
      expect(result.content).not.toContain(personalInfo.email)
      expect(result.content).not.toContain(personalInfo.phone)
    }
  })
})

describe('兜底意图与预制答案的一致性不变量（FP-04b：不留死数据）', () => {
  const 诚实兜底 = t('chat.answers.fallback')
  const 规则覆盖意图 = RULES.flatMap((规则) => [规则.意图ID, ...(规则.聚合意图ID ?? [])])
  const 有触发词意图 = 共享意图表.filter((项) => 项.兜底触发词.length > 0).map((项) => 项.id)

  it('兜底触发词非空的意图 ⇔ RULES 里有对应规则（双向）', () => {
    expect(规则覆盖意图.every((意图ID) => 共享意图表.some((项) => 项.id === 意图ID))).toBe(true)
    expect(new Set(规则覆盖意图).size, 'RULES 里同一意图被重复覆盖').toBe(规则覆盖意图.length)
    expect([...规则覆盖意图].sort(), '有触发词却没规则、或有规则却没触发词的意图').toEqual([...有触发词意图].sort())
  })

  it('每条兜底触发词都能产出非诚实兜底的预制答案', () => {
    for (const 定义 of 共享意图表) {
      for (const 词 of 定义.兜底触发词) {
        const result = getLocalAnswer(词)
        expect(result.content, `触发词「${词}」命中了意图却落回诚实兜底`).not.toBe(诚实兜底)
        expect(result.content.length).toBeGreaterThan(0)
      }
    }
  })

  it('无预制答案的意图（design/music/media）永不走兜底作答', () => {
    for (const 意图ID of ['design', 'music', 'media']) {
      expect(规则覆盖意图.includes(意图ID), `意图「${意图ID}」不该出现在 RULES 里`).toBe(false)
    }
    expect(getLocalAnswer('你的ui设计能力').content).toBe(诚实兜底)
    expect(getLocalAnswer('你会乐器吗').content).toBe(诚实兜底)
    expect(getLocalAnswer('你在b站发视频吗').content).toBe(诚实兜底)
  })
})
