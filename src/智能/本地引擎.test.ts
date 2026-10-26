import { describe, it, expect } from 'vitest'
import { 取本地答案, 选择组件, 规则表 } from './本地引擎'
import { 共享意图表 } from './意图表'
import type { 界面组件 } from './结构化输出'
import { 个人信息 } from '../数据/个人信息'
import { 求职方向 } from '../数据/职业方向'
import { t, type 翻译键 } from '../国际化/翻译'

describe('localEngine', () => {
  it('returns text answer for name question', () => {
    const 结果 = 取本地答案('你叫什么')
    expect(结果.role).toBe('assistant')
    expect(结果.content).toContain(个人信息.name)
    expect(结果.组件).toBeUndefined()
  })

  it('returns ContactLinks for contact question', () => {
    const 结果 = 取本地答案('联系方式')
    expect(结果.content).not.toContain(个人信息.邮箱)
    expect(结果.content).not.toContain(个人信息.电话)
    expect(结果.组件).toEqual({ type: 'ContactLinks' })
  })

  it('qq微信手机稳定命中ContactLinks且无直给', () => {
    for (const q of ['怎么联系你', '你的微信是多少', 'qq多少', '手机号多少', '邮箱是什么']) {
      const 结果 = 取本地答案(q)
      expect(结果.组件).toEqual({ type: 'ContactLinks' })
      expect(结果.content).not.toContain(个人信息.邮箱)
      expect(结果.content).not.toContain(个人信息.电话)
    }
  })

  it('github项目问法不被联系意图污染', () => {
    const 结果 = 取本地答案('你的github项目有哪些')
    expect(结果.组件).not.toEqual({ type: 'ContactLinks' })
  })

  it('returns ProjectCard with xrm for project name question', () => {
    const 结果 = 取本地答案('介绍一下暮澜纪元')
    expect(结果.组件).toEqual({ type: 'ProjectCard', 项目编号: 'xrm' })
  })

  it('detects lovewithme project from input', () => {
    const 结果 = 取本地答案('介绍一下和我恋爱吧')
    expect(结果.组件).toEqual({ type: 'ProjectCard', 项目编号: 'lovewithme' })
  })

  it('羊来问法落到羊来项目卡片', () => {
    const 结果 = 取本地答案('羊来是做什么的')
    expect(结果.组件).toEqual({ type: 'ProjectCard', 项目编号: 'yangLai' })
  })

  it('detects aiConsole project from input', () => {
    const 结果 = 取本地答案('介绍一下循环工程skill')
    expect(结果.组件).toEqual({ type: 'ProjectCard', 项目编号: 'aiConsole' })
  })

  it('returns skills text answer (no component) for skill question', () => {
    const 结果 = 取本地答案('你的技术栈')
    expect(结果.role).toBe('assistant')
    expect(结果.组件).toBeUndefined()
  })

  it('returns Timeline with education scope for education question', () => {
    const 结果 = 取本地答案('教育背景')
    expect(结果.组件).toEqual({ type: 'Timeline', scope: 'education' })
  })

  it('returns Timeline with experience scope for experience question', () => {
    const 结果 = 取本地答案('工作经历')
    expect(结果.组件).toEqual({ type: 'Timeline', scope: 'experience' })
  })

  it('returns fallback text for unknown question', () => {
    const 结果 = 取本地答案('宇宙终极答案')
    expect(结果.content).not.toContain(个人信息.邮箱)
    expect(结果.content).not.toContain(个人信息.电话)
    expect(结果.组件).toBeUndefined()
  })

  it('问候语返回问候终态而非没准备答案（你好/您好/hi/hello）', () => {
    const 期望问候 = t('chat.answers.greeting')
    for (const q of ['你好', '您好', 'hi', 'hello']) {
      const 结果 = 取本地答案(q)
      expect(结果.role).toBe('assistant')
      expect(结果.content).toBe(期望问候)
      expect(结果.content).not.toContain('没准备答案')
      expect(结果.组件).toBeUndefined()
    }
  })

  it('谢谢返回感谢终态', () => {
    const 结果 = 取本地答案('谢谢')
    expect(结果.content).toBe(t('chat.answers.thanks'))
    expect(结果.content).not.toContain('没准备答案')
  })

  it('再见返回告别终态', () => {
    const 结果 = 取本地答案('再见')
    expect(结果.content).toBe(t('chat.answers.farewell'))
  })
})

describe('本地兜底答非所问根因（FP-04b）：只认话题独占的问法短语', () => {
  const 诚实兜底 = t('chat.answers.fallback')

  function 期望答案(key: 'name' | 'target' | 'contact' | 'projects' | 'skills' | 'education' | 'experience'): string {
    return t(`chat.answers.${key}` as unknown as 翻译键)
      .replace('{name}', 个人信息.name)
      .replace('{direction}', 求职方向())
      .replace('{school}', 个人信息.教育背景.学校)
      .replace('{major}', 个人信息.教育背景.专业)
      .replace('{degree}', 个人信息.教育背景.学位)
      .replace('{period}', 个人信息.教育背景.周期)
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
    组件?: 界面组件
  }> = [
    { 问句: '你是谁', key: 'name' },
    { 问句: '你的目标岗位是什么', key: 'target' },
    { 问句: '介绍项目', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'xrm' } },
    { 问句: '分享项目', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'xrm' } },
    { 问句: '讲解项目', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'xrm' } },
    { 问句: '说说项目', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'xrm' } },
    { 问句: '介绍项目经历', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'xrm' } },
    { 问句: '介绍项目经历', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'xrm' } },
    { 问句: '你做过哪些项目', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'xrm' } },
    { 问句: '你的作品有哪些', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'xrm' } },
    { 问句: '我的工作经历', key: 'experience', 组件: { type: 'Timeline', scope: 'experience' } },
    { 问句: '有没有实习经历', key: 'experience', 组件: { type: 'Timeline', scope: 'experience' } },
    { 问句: '教育背景', key: 'education', 组件: { type: 'Timeline', scope: 'education' } },
    { 问句: '什么学历', key: 'education', 组件: { type: 'Timeline', scope: 'education' } },
    { 问句: '他是哪个学校毕业的?', key: 'education', 组件: { type: 'Timeline', scope: 'education' } },
    { 问句: '你的技术栈', key: 'skills' },
    { 问句: '你擅长什么', key: 'skills' },
    { 问句: '怎么联系你', key: 'contact', 组件: { type: 'ContactLinks' } },
    { 问句: '你微信多少', key: 'contact', 组件: { type: 'ContactLinks' } },
    { 问句: '邮箱是什么', key: 'contact', 组件: { type: 'ContactLinks' } },
    { 问句: '介绍一下暮澜纪元', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'xrm' } },
    { 问句: '和我恋爱吧是做什么的', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'lovewithme' } },
    { 问句: '羊来是做什么的', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'yangLai' } },
    { 问句: '循环工程是什么', key: 'projects', 组件: { type: 'ProjectCard', 项目编号: 'aiConsole' } },
  ]

  it('答非所问类问句全部落到诚实兜底且不弹任何组件', () => {
    for (const 问句 of 答非所问句) {
      const 结果 = 取本地答案(问句)
      expect(结果.content, `「${问句}」应诚实兜底`).toBe(诚实兜底)
      expect(结果.组件, `「${问句}」不应弹组件`).toBeUndefined()
    }
  })

  it('真实简历意图问句全部命中对应预制答案与组件契约', () => {
    for (const 项 of 真实简历意图问句) {
      const 结果 = 取本地答案(项.问句)
      expect(结果.content, `「${项.问句}」应给出 ${项.key} 预制答案`).toBe(期望答案(项.key))
      expect(结果.组件, `「${项.问句}」组件契约不符`).toEqual(项.组件)
    }
  })

  it('联系方式预制答案不直给邮箱与电话', () => {
    for (const 问句 of ['联系方式', '怎么联系你', '你的微信是多少', '邮箱是什么']) {
      const 结果 = 取本地答案(问句)
      expect(结果.content).not.toContain(个人信息.邮箱)
      expect(结果.content).not.toContain(个人信息.电话)
    }
  })
})

describe('兜底意图与预制答案的一致性不变量（FP-04b：不留死数据）', () => {
  const 诚实兜底 = t('chat.answers.fallback')
  const 规则覆盖意图 = 规则表.flatMap((规则) => [规则.意图ID, ...(规则.聚合意图ID ?? [])])
  const 有触发词意图 = 共享意图表.filter((项) => 项.兜底触发词.length > 0).map((项) => 项.id)

  it('兜底触发词非空的意图 ⇔ RULES 里有对应规则（双向）', () => {
    expect(规则覆盖意图.every((意图ID) => 共享意图表.some((项) => 项.id === 意图ID))).toBe(true)
    expect(new Set(规则覆盖意图).size, 'RULES 里同一意图被重复覆盖').toBe(规则覆盖意图.length)
    expect([...规则覆盖意图].sort(), '有触发词却没规则、或有规则却没触发词的意图').toEqual([...有触发词意图].sort())
  })

  it('每条兜底触发词都能产出非诚实兜底的预制答案', () => {
    for (const 定义 of 共享意图表) {
      for (const 词 of 定义.兜底触发词) {
        const 结果 = 取本地答案(词)
        expect(结果.content, `触发词「${词}」命中了意图却落回诚实兜底`).not.toBe(诚实兜底)
        expect(结果.content.length).toBeGreaterThan(0)
      }
    }
  })

  it('无预制答案的意图（design/music/media）永不走兜底作答', () => {
    for (const 意图ID of ['design', 'music', 'media']) {
      expect(规则覆盖意图.includes(意图ID), `意图「${意图ID}」不该出现在 规则表 里`).toBe(false)
    }
    expect(取本地答案('你的ui设计能力').content).toBe(诚实兜底)
    expect(取本地答案('你会乐器吗').content).toBe(诚实兜底)
    expect(取本地答案('你在b站发视频吗').content).toBe(诚实兜底)
  })
})

describe('选择组件：在线与本地兜底共用的唯一组件判定（单一权威不变量）', () => {
  it('与 getLocalAnswer 的 component 永不分叉（同一份意图表、同一次判定）', () => {
    const 问句集 = [
      '你是谁',
      '介绍一下暮澜纪元',
      '介绍一下和我恋爱吧',
      '羊来是做什么的',
      '介绍一下循环工程skill',
      '介绍项目',
      '你做过哪些项目',
      '怎么联系你',
      '你的微信是多少',
      '邮箱是什么',
      '教育背景',
      '他是哪个学校毕业的?',
      '我的工作经历',
      '你的技术栈',
      '你擅长什么技术',
      '你的目标岗位是什么',
      '你好',
      '谢谢',
      '再见',
      '今天天气怎么样',
      '项目管理是你的核心能力吗',
      '推荐几首歌',
      '我没做过什么项目',
      '我不想公开联系方式',
    ]
    for (const 问句 of 问句集) {
      expect(选择组件(问句), `「${问句}」组件判定与本地兜底分叉`).toEqual(取本地答案(问句).组件)
    }
  })

  it('否定句与比较句不挂组件（模型会按提示词说「简历未体现」，卡片会与正文自相矛盾）', () => {
    for (const 问句 of [
      '我没做过什么项目，能胜任大厂前端吗',
      '我没有工作经验，能做前端吗',
      '我不想公开联系方式，可以匿名联系吗',
      '不愿透露我的隐私信息，怎么联系你',
      '你的项目经验和技术栈哪个更重要',
    ]) {
      expect(选择组件(问句), `「${问句}」不应挂组件`).toBeUndefined()
    }
  })

  it('闸门只挡组件不挡答案（访客说「我没做过项目」问的是他自己，答案不矛盾）', () => {
    const 结果 = 取本地答案('我没做过什么项目，能胜任大厂前端吗')
    expect(结果.组件).toBeUndefined()

    expect(结果.content).toContain('暮澜纪元')
  })

  it('疑问式「有没有」不算否定（正常提问仍要弹卡片）', () => {
    expect(选择组件('有没有实习经历')).toEqual({ type: 'Timeline', scope: 'experience' })
  })

  it('通用连接词「还是/相比」不得当成否定（复审实测误伤的真卡片）', () => {
    expect(选择组件('微信还是邮箱都行，怎么联系你')).toEqual({ type: 'ContactLinks' })
    expect(选择组件('相比之下，你做过哪些项目')).toEqual({ type: 'ProjectCard', 项目编号: 'xrm' })
    expect(选择组件('相比之下你的教育背景如何')).toEqual({ type: 'Timeline', scope: 'education' })
    expect(选择组件('我还是更关心项目，怎么联系你')).toEqual({ type: 'ContactLinks' })
  })

  it('组件被闸门抑制时联系方式文案不得承诺不存在的按钮（复审确认缺陷）', () => {
    const 结果 = 取本地答案('我不想公开联系方式，可以匿名联系吗')
    expect(结果.组件).toBeUndefined()
    expect(结果.content).toBe(t('chat.answers.contactNoButton' as never))
    expect(结果.content).not.toContain('点下方按钮')
  })

  it('未触发闸门时联系方式文案与按钮卡片同时给出', () => {
    const 结果 = 取本地答案('怎么联系你')
    expect(结果.组件).toEqual({ type: 'ContactLinks' })
    expect(结果.content).toBe(t('chat.answers.contact'))
  })

  it('无组件意图恒为 undefined（技术栈/姓名/目标岗位/闲聊都不弹卡片）', () => {
    for (const 问句 of ['你是谁', '你的技术栈', '你的目标岗位是什么', '今天天气怎么样', '你好']) {
      expect(选择组件(问句), `「${问句}」不应有组件`).toBeUndefined()
    }
  })
})
