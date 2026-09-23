import { t } from '../i18n/translations'

/** 佐证材料包的同源路径；部署时可用 VITE_EVIDENCE_ZIP 覆盖（如改走 CDN 或换文件名）。 */
export const 佐证材料包路径 = import.meta.env.VITE_EVIDENCE_ZIP ?? '/佐证材料.zip'

/** 下载文件名由 download 属性决定，与服务端 URL 编码解耦。 */
export const 佐证材料包文件名 = `${t('evidence.filename')}.zip`

export function 下载佐证材料包(): void {
  const link = document.createElement('a')
  link.href = encodeURI(佐证材料包路径)
  link.download = 佐证材料包文件名
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
