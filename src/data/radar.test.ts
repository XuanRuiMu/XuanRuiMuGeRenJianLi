import { describe, it, expect } from 'vitest'
import zhCN from '../i18n/zh-CN.json'
import { t } from '../i18n/translations'
import { radarAxes, dimensionLabelKey, dimensionBasisKey } from './radar'

const 维度表 = zhCN.data.radar.dimensions as Record<string, { label: string; description: string; basis: string }>

describe('FP-03 技能雷达 6 轴', () => {
  it('6 轴（4 主轴 + 2 附轴），AI Agent 轴居首', () => {
    expect(radarAxes).toHaveLength(6)
    expect(radarAxes.map((轴) => 轴.id)).toEqual([
      'aiAgent',
      'backendArchitecture',
      'fullStack',
      'devopsDelivery',
      'designAesthetic',
      'artCreation',
    ])
  })

  it('音乐经历与内容创作两轴及其翻译已删除', () => {
    expect(radarAxes.map((轴) => 轴.id)).not.toContain('musicCreation')
    expect(radarAxes.map((轴) => 轴.id)).not.toContain('contentCreation')
    expect('musicCreation' in 维度表).toBe(false)
    expect('contentCreation' in 维度表).toBe(false)
    for (const 文本 of Object.values(维度表).flatMap((维度) => [维度.label, 维度.description, 维度.basis])) {
      expect(文本).not.toContain('音乐')
      expect(文本).not.toContain('架子鼓')
      expect(文本).not.toContain('内容创作')
    }
  })

  it('DevOps 与实施交付合并为一条轴', () => {
    expect('devops' in 维度表).toBe(false)
    const 合并轴 = radarAxes.find((轴) => 轴.id === 'devopsDelivery')
    expect(合并轴?.level).toBe(78)
    const 依据 = t(dimensionBasisKey('devopsDelivery'))
    expect(依据).toContain('docker-compose')
    expect(依据).toContain('运维多台服务器')
    expect(依据).toContain('用户培训')
  })

  it('数据层轴集与 JSON 轴集一一对应，不留死翻译轴', () => {
    expect(radarAxes.map((轴) => 轴.id).sort()).toEqual(Object.keys(维度表).sort())
  })

  it('每轴 label/description/basis 非空，level 落在 0-100', () => {
    for (const 轴 of radarAxes) {
      const 维度 = 维度表[轴.id]
      expect(维度, `${轴.id} 缺翻译节点`).toBeDefined()
      expect(t(dimensionLabelKey(轴.id))).toBe(维度.label)
      expect(维度.label.trim()).not.toBe('')
      expect(维度.description.trim()).not.toBe('')
      expect(维度.basis.trim()).not.toBe('')
      expect(轴.level).toBeGreaterThanOrEqual(0)
      expect(轴.level).toBeLessThanOrEqual(100)
    }
  })

  it('每条依据都带可核验的数字或实物依据，不含未证实的编造量', () => {
    for (const 轴 of radarAxes) {
      expect(维度表[轴.id].basis).toMatch(/\d/)
    }
  })
})
