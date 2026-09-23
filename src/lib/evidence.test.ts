import { describe, it, expect, vi, afterEach } from 'vitest'
import { t } from '../i18n/translations'
import { 佐证材料包路径, 佐证材料包文件名, 下载佐证材料包 } from './evidence'

interface 假锚点 {
  href: string
  download: string
  rel: string
  click: () => void
}

function 拦截锚点创建(): 假锚点 {
  const 锚点: 假锚点 = { href: '', download: '', rel: '', click: vi.fn() }
  vi.spyOn(document, 'createElement').mockReturnValue(锚点 as unknown as HTMLAnchorElement)
  vi.spyOn(document.body, 'appendChild').mockImplementation((节点) => 节点)
  vi.spyOn(document.body, 'removeChild').mockImplementation((节点) => 节点)
  return 锚点
}

/** 期望值写成字面量：上一版三条断言拿实现自己当期望（`encodeURI(佐证材料包路径)` 等），结构上不可能失败。 */
const 期望同源路径 = '/佐证材料.zip'
const 期望编码路径 = '/%E4%BD%90%E8%AF%81%E6%9D%90%E6%96%99.zip'
const 期望下载文件名 = '玄锐暮-佐证材料.zip'

describe('佐证材料包下载', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('默认走同源路径，文件名与翻译文件的 evidence.filename 对齐', () => {
    expect(佐证材料包路径).toBe(期望同源路径)
    expect(佐证材料包文件名).toBe(期望下载文件名)
    expect(t('evidence.filename')).toBe('玄锐暮-佐证材料')
  })

  it('触发下载：href 为 URI 编码后的同源路径，中文原文不得裸出去', () => {
    const 锚点 = 拦截锚点创建()
    下载佐证材料包()
    expect(锚点.href).toBe(期望编码路径)
    expect(锚点.href).not.toContain('佐证材料')
    expect(锚点.download).toBe(期望下载文件名)
    expect(锚点.rel).toBe('noopener')
    expect(锚点.click).toHaveBeenCalledTimes(1)
  })
})
