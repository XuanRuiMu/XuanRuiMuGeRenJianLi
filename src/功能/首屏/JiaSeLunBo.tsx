import { useEffect, useRef, useState } from 'react'
import { 合并类名 } from '../../库/工具'
import { useJianShaoDongHua } from '../../钩子/useJianShaoDongHua'
import { t } from '../../国际化/翻译'
import { 职业方向, 岗位名表 } from '../../数据/职业方向'
import { 字符渐变色 } from './JiaSeJianBian'

interface 角色轮播属性 {
  角色表?: string[]
  打字速度?: number
  返回速度?: number
  返回延迟?: number
}

const 默认岗位名表 = 岗位名表()

export function JiaSeLunBo({
  角色表 = 默认岗位名表,

  打字速度 = 120,
  返回速度 = 80,
  返回延迟 = 3000,
}: 角色轮播属性) {
  const 减少动画 = useJianShaoDongHua()

  const 有岗位 = 角色表.length > 0
  const 岗位表 = 有岗位 ? 角色表 : [t(职业方向.directionKey)]

  const [打字, 设置打字] = useState(() => ({
    词: 岗位表[0],
    文本: 减少动画 || !有岗位 ? 岗位表[0] : '',
  }))
  const 角色引用 = useRef(0)
  const 字符引用 = useRef(0)
  const 删除中引用 = useRef(false)
  const 定时器引用 = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (减少动画 || 角色表.length === 0) return
    let 已取消 = false

    const 帧步进 = () => {
      if (已取消) return
      const current = 角色表[角色引用.current]
      let 下一个文本: string
      if (!删除中引用.current) {
        字符引用.current += 1
        下一个文本 = current.slice(0, 字符引用.current)
        if (字符引用.current >= current.length) {
          删除中引用.current = true
          定时器引用.current = window.setTimeout(帧步进, 返回延迟)
        } else {
          定时器引用.current = window.setTimeout(帧步进, 打字速度)
        }
      } else {
        字符引用.current -= 1
        下一个文本 = current.slice(0, 字符引用.current)
        if (字符引用.current <= 0) {
          删除中引用.current = false
          角色引用.current = (角色引用.current + 1) % 角色表.length
          定时器引用.current = window.setTimeout(帧步进, 打字速度)
        } else {
          定时器引用.current = window.setTimeout(帧步进, 返回速度)
        }
      }
      设置打字({ 词: current, 文本: 下一个文本 })
    }

    定时器引用.current = window.setTimeout(帧步进, 打字速度)
    return () => {
      已取消 = true
      if (定时器引用.current) window.clearTimeout(定时器引用.current)
    }
  }, [减少动画, 角色表, 打字速度, 返回速度, 返回延迟])

  return (
    <p
      className="mb-4 flex items-center gap-2 text-3xl font-medium text-shadow-readable sm:text-4xl"
      aria-label={`${t(职业方向.roleTickerAriaKey)}${岗位表.join('、')}`}
      data-testid="role-typewriter"
    >
      <span aria-hidden="true" className="font-mono text-primary">
        {'>'}
      </span>
      <span className="inline-flex items-end font-mono" role="status" aria-live="off">
        {}
        {打字.文本.split('').map((字符, 下标) => (
          <span key={`${下标}-${字符}`} className="whitespace-pre" style={{ color: 字符渐变色(下标, 打字.词.length) }}>
            {字符}
          </span>
        ))}
        <span aria-hidden="true" className={合并类名('ml-0.5 text-[#f0abfc]', !减少动画 && 'caret-blink')}>
          {减少动画 ? '' : '|'}
        </span>
      </span>
    </p>
  )
}
