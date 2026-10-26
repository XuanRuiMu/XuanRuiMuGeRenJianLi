import { t } from '../国际化/翻译'
import { 资源路径 } from './资源路径'

export const 佐证材料包路径 = import.meta.env.VITE_EVIDENCE_ZIP ?? 资源路径('/佐证材料.zip')

export const 佐证材料包文件名 = `${t('evidence.filename')}.zip`

export function 下载佐证材料包(): void {
  const 链接 = document.createElement('a')
  链接.href = encodeURI(佐证材料包路径)
  链接.download = 佐证材料包文件名
  链接.rel = 'noopener'
  document.body.appendChild(链接)
  链接.click()
  document.body.removeChild(链接)
}
