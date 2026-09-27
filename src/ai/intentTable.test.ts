import { describe, it, expect } from 'vitest'
import {
  共享意图表,
  是否纯问候,
  是否感谢,
  是否告别,
  检测项目卡片,
  命中共享意图,
  命中兜底意图,
  触发词命中,
} from './intentTable'

describe('intentTable（RAG与本地共享意图表）', () => {
  it('无重复暮澜规则（暮澜纪元只出现一次）', () => {
    const 命中数 = 共享意图表.filter((项) => 项.关键词.includes('暮澜纪元')).length
    expect(命中数).toBe(1)
  })

  it('纯问候识别（你好/您好/hi/hello）且不误伤混合问句', () => {
    for (const q of ['你好', '您好', 'hi', 'hello']) expect(是否纯问候(q)).toBe(true)
    expect(是否纯问候('您好，请问你是谁')).toBe(false)
    expect(是否纯问候('介绍一下暮澜纪元')).toBe(false)
    expect(是否纯问候('')).toBe(false)
  })

  it('感谢与告别识别', () => {
    expect(是否感谢('谢谢')).toBe(true)
    expect(是否感谢('谢谢你')).toBe(true)
    expect(是否感谢('你好')).toBe(false)
    expect(是否告别('再见')).toBe(true)
    expect(是否告别('拜拜')).toBe(true)
    expect(是否告别('你好')).toBe(false)
  })

  it('项目卡片检测四型齐全（xrm/lovewithme/aiConsole/fengLai）', () => {
    expect(检测项目卡片('介绍一下暮澜纪元')).toBe('xrm')
    expect(检测项目卡片('介绍一下和我恋爱吧')).toBe('lovewithme')
    expect(检测项目卡片('蜂来是做什么的')).toBe('fengLai')
    expect(检测项目卡片('介绍一下循环工程skill')).toBe('aiConsole')
    expect(检测项目卡片('你好')).toBeUndefined()
  })

  it('项目卡片优先级 xrm > lovewithme > fengLai > aiConsole 不变', () => {
    expect(检测项目卡片('暮澜纪元和循环工程哪个好')).toBe('xrm')
    expect(检测项目卡片('和我恋爱吧与循环工程哪个好')).toBe('lovewithme')
    expect(检测项目卡片('蜂来的循环工程玩法')).toBe('fengLai')
    expect(检测项目卡片('循环工程是什么')).toBe('aiConsole')
  })

  it('问联系稳定命中contact且宽泛词不污染', () => {
    for (const q of ['联系方式', '怎么联系你', '你的邮箱是什么', '电话多少', '微信怎么加', 'qq多少', '手机号多少']) {
      expect(命中共享意图('contact', q)).toBe(true)
    }
    expect(命中共享意图('contact', '介绍一下暮澜纪元')).toBe(false)
    expect(命中共享意图('contact', '你的github项目有哪些')).toBe(false)
    expect(命中共享意图('contact', 'bilibili视频在哪看')).toBe(false)
  })
})

const 意图正例: Record<string, string[]> = {
  name: ['你是谁', '你叫什么', '做个自我介绍'],
  tech: ['你擅长什么技术', '你的技术栈', '你有什么优势', '你会什么'],
  'projects-xrm': ['介绍一下暮澜纪元', 'xrm 用了什么架构'],
  'projects-爱与循环': ['和我恋爱吧是做什么的', '介绍一下循环工程'],
  'projects-蜂来': ['蜂来是做什么的', '蜂来的弹幕刷屏怎么做'],
  'projects-通用': ['你做过什么项目', '你的作品有哪些', '介绍项目', '分享项目', '讲解项目', '说说项目', '介绍项目经历'],
  experience: ['工作经历', '我的工作经历', '有没有实习经历'],
  education: ['教育背景', '你的专业是什么', '什么学历'],
  contact: ['联系方式', '怎么联系你', '你的微信是多少', 'qq多少'],
  target: ['你的目标岗位是什么', '求职方向'],
}

const 无关语句 = [
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
  '你在b站发视频吗',
  '你的视频创作',
  '你的ui设计能力',
  '品牌设计方案',
  '你会乐器吗',
  '架子鼓',
  'loopy',
]

/**
 * 兜底触发词的数据约束（判定本身只是子串匹配，精度全靠词表数据）：
 * 通用单/双字单词一旦独立成项，就会在「项目管理」「电话会议」这类句子里被子串命中，
 * 复现 FP-04 的答非所问，因此必须机器断言拦住。
 */
const 禁入兜底的通用词 = [
  '工作',
  '项目',
  '作品',
  '经历',
  '经验',
  '技术',
  '联系',
  '姓名',
  '名字',
  '叫什么',
  '优势',
  '岗位',
  '职位',
  '实习',
  '专业',
  '学校',
  '大学',
  '学历',
  '时间线',
  'timeline',
  '音乐',
  '乐器',
  '视频',
  '创作',
  '设计',
  '小说',
  '邮箱',
  '电话',
  '手机',
  '微信',
  'qq',
  '恋爱',
  'loop',
  '服务端',
  '整蛊',
  '直播间',
  '弹幕刷屏',
  '点赞连击',
  '聊天应用',
  '全栈应用',
  'mmorpg',
]

describe('兜底触发词数据约束（FP-04 根因：兜底作答与 RAG 加权不得共用词表）', () => {
  it('RAG 宽关键词表逐字不变（检索加权行为不得漂移）', () => {
    const 宽关键词快照: Record<string, string[]> = {
      name: ['你是谁', '叫什么', '名字', '姓名', '自我介绍'],
      tech: ['最擅长', '擅长', '优势', '核心竞争力', '技术栈', '用什么技术', '技术', '技能', '会什么', '雷达'],
      'projects-xrm': ['暮澜纪元', 'xrm', 'mmorpg', '服务端'],
      'projects-爱与循环': ['恋爱', 'lovewithme', '聊天应用', '全栈应用', '循环工程', 'loop'],
      'projects-蜂来': ['蜂来', 'fenglai', '整蛊', '直播间', '点赞连击', '拖拽道具', '弹幕刷屏', '战报海报'],
      'projects-通用': ['项目', '作品', '做过什么'],
      experience: ['经历', '经验', '工作', '实习', '时间线', 'timeline'],
      education: ['教育', '学校', '大学', '专业', '学历'],
      design: ['设计', 'ui', 'ux', 'figma', '品牌'],
      music: ['音乐', '架子鼓', '证书', '乐器'],
      media: ['媒体', '视频', 'b站', '小说', '相声', '创作'],
      contact: ['联系方式', '联系', '怎么联系', '邮箱', '电话', '手机', 'qq', '微信'],
      target: ['岗位', '职位', '目标', '求职', '期望'],
      github: ['github', '仓库', '开源', '源码', '代码', '最近提交', '提交记录', 'star', 'readme'],
    }
    expect([...共享意图表.map((项) => 项.id)].sort()).toEqual([...Object.keys(宽关键词快照)].sort())
    for (const 定义 of 共享意图表) {
      expect(定义.关键词, `意图「${定义.id}」的 RAG 宽关键词被改动`).toEqual(宽关键词快照[定义.id])
    }
  })

  it('通用单/双字单词不得独立成项（含项目卡片映射词表）；每条触发词必须是本意图宽关键词的精化', () => {
    for (const 定义 of 共享意图表) {
      expect(new Set(定义.兜底触发词).size, `意图「${定义.id}」兜底触发词重复`).toBe(定义.兜底触发词.length)
      const 全部词表 = [...定义.兜底触发词, ...Object.values(定义.项目卡片映射 ?? {}).flat()]
      for (const 词 of 全部词表) {
        expect(词.trim().length, `意图「${定义.id}」含空触发词`).toBeGreaterThan(0)
        expect(
          定义.关键词.some((宽) => 词.toLowerCase().includes(宽.toLowerCase())),
          `兜底触发词「${词}」不属于意图「${定义.id}」的宽关键词主题`
        ).toBe(true)
        expect(禁入兜底的通用词.includes(词), `通用词「${词}」不得单独作为意图「${定义.id}」的兜底触发词`).toBe(false)
      }
    }
  })

  it('跨意图触发词互斥（同一条词不得同时属于两个意图）', () => {
    const 归属 = new Map<string, string>()
    for (const 定义 of 共享意图表) {
      for (const 词 of 定义.兜底触发词) {
        expect(归属.has(词), `触发词「${词}」同时属于「${归属.get(词)}」与「${定义.id}」`).toBe(false)
        归属.set(词, 定义.id)
      }
    }
  })

  it('项目卡片映射的触发词并集与兜底触发词完全一致（单一数据源）', () => {
    for (const 定义 of 共享意图表) {
      if (定义.兜底触发词.length === 0) {
        expect(定义.项目卡片映射, `意图「${定义.id}」没有兜底触发词却带项目卡片映射`).toBeUndefined()
        continue
      }
      if (!定义.项目卡片映射) continue
      const 映射词表 = Object.values(定义.项目卡片映射).flat()
      expect([...映射词表].sort(), `意图「${定义.id}」项目卡片映射与兜底触发词不一致`).toEqual(
        [...定义.兜底触发词].sort()
      )
    }
    expect(共享意图表.filter((项) => 项.项目卡片映射).map((项) => 项.id)).toEqual([
      'projects-xrm',
      'projects-爱与循环',
      'projects-蜂来',
    ])
  })

  it('每条意图的兜底正例都能命中自身', () => {
    for (const [意图ID, 问句列表] of Object.entries(意图正例)) {
      for (const 问句 of 问句列表) {
        expect(命中兜底意图(意图ID, 问句), `「${问句}」应命中 ${意图ID}`).toBe(true)
      }
    }
  })

  it('跨意图反例：任一意图的正例不得命中其他意图', () => {
    for (const 意图ID of Object.keys(意图正例)) {
      for (const [其他ID, 其他问句列表] of Object.entries(意图正例)) {
        if (其他ID === 意图ID) continue
        for (const 问句 of 其他问句列表) {
          expect(命中兜底意图(意图ID, 问句), `「${问句}」不应命中 ${意图ID}`).toBe(false)
        }
      }
    }
  })

  it('完全无关的闲聊不命中任何意图（只能走诚实兜底）', () => {
    for (const 问句 of 无关语句) {
      for (const 定义 of 共享意图表) {
        expect(命中兜底意图(定义.id, 问句), `「${问句}」不应命中 ${定义.id}`).toBe(false)
      }
      expect(检测项目卡片(问句), `「${问句}」不应弹出项目卡片`).toBeUndefined()
    }
  })

  it('宽关键词对 RAG 加权仍然生效，严词表只收紧兜底作答', () => {
    expect(命中共享意图('experience', '可以胜任文职工作吗')).toBe(true)
    expect(命中共享意图('tech', '这个技术难点怎么攻克')).toBe(true)
    expect(命中共享意图('education', '项目管理是你的核心能力吗')).toBe(false)
    expect(命中兜底意图('experience', '可以胜任文职工作吗')).toBe(false)
    expect(命中兜底意图('tech', '这个技术难点怎么攻克')).toBe(false)
  })
})

describe('触发词命中 = 朴素子串匹配（不再有词边界启发式）', () => {
  it('触发词出现在句中任意位置都算命中，精度由词表独占性保证', () => {
    expect(触发词命中(['项目经历'], '介绍项目经历')).toBe(true)
    expect(触发词命中(['项目经历'], '我的项目经历怎么写')).toBe(true)
    expect(触发词命中(['工作'], '文职工作')).toBe(true)
    expect(命中兜底意图('experience', '介绍项目经历')).toBe(false)
    expect(命中兜底意图('projects-通用', '介绍项目经历')).toBe(true)
  })

  it('表内不收通用裸词，因此「项目管理」「电话会议」类问句无从命中', () => {
    expect(共享意图表.some((定义) => 定义.兜底触发词.includes('项目'))).toBe(false)
    expect(共享意图表.some((定义) => 定义.兜底触发词.includes('电话'))).toBe(false)
    expect(命中兜底意图('projects-通用', '项目管理是你的核心能力吗')).toBe(false)
    expect(命中兜底意图('contact', '电话会议怎么开')).toBe(false)
    expect(命中兜底意图('education', '这个项目的名字')).toBe(false)
    expect(命中兜底意图('name', '这个项目的名字')).toBe(false)
    expect(命中兜底意图('name', '请问这本书的名字')).toBe(false)
    expect(命中兜底意图('name', '你叫什么名字')).toBe(true)
    expect(命中兜底意图('education', '这个专业术语我不懂')).toBe(false)
    expect(命中兜底意图('education', '你的专业是什么')).toBe(true)
    expect(命中兜底意图('projects-爱与循环', 'loopy')).toBe(false)
    expect(检测项目卡片('loopy')).toBeUndefined()
    expect(检测项目卡片('我的项目名字叫什么')).toBeUndefined()
  })

  it('没有预制答案的意图永不命中兜底', () => {
    for (const 意图ID of ['design', 'music', 'media']) {
      const 定义 = 共享意图表.find((项) => 项.id === 意图ID)
      expect(定义?.兜底触发词, `意图「${意图ID}」应有空兜底触发词`).toEqual([])
      expect(命中兜底意图(意图ID, '你的ui设计能力')).toBe(false)
    }
  })

  it('空输入与未知意图安全返回否', () => {
    expect(命中兜底意图('experience', '')).toBe(false)
    expect(命中兜底意图('不存在的意图', '工作经历')).toBe(false)
    expect(触发词命中([], '工作经历')).toBe(false)
    expect(触发词命中([''], '工作经历')).toBe(false)
  })
})
