import { lazy, Suspense } from 'react'
import { BuJu } from './BuJu'
import { ShouPingBanKuai } from '../功能/首屏/ShouPingBanKuai'

const GuanYuWoBanKuai = lazy(() =>
  import('../功能/关于我/GuanYuWoBanKuai').then((模块) => ({ default: 模块.GuanYuWoBanKuai }))
)
const XiangMuBanKuai = lazy(() =>
  import('../功能/项目/XiangMuBanKuai').then((模块) => ({ default: 模块.XiangMuBanKuai }))
)
const JiNengBanKuai = lazy(() => import('../功能/技能/JiNengBanKuai').then((模块) => ({ default: 模块.JiNengBanKuai })))
const JingLiBanKuai = lazy(() => import('../功能/经历/JingLiBanKuai').then((模块) => ({ default: 模块.JingLiBanKuai })))
const TuiJianYuBanKuai = lazy(() =>
  import('../功能/推荐语/TuiJianYuBanKuai').then((模块) => ({ default: 模块.TuiJianYuBanKuai }))
)
const ZhanShiBanKuai = lazy(() =>
  import('../功能/展示/ZhanShiBanKuai').then((模块) => ({ default: 模块.ZhanShiBanKuai }))
)
const LianXiBanKuai = lazy(() => import('../功能/联系/LianXiBanKuai').then((模块) => ({ default: 模块.LianXiBanKuai })))

function FenQuZhanWei() {
  return <div className="min-h-[12vh] w-full" aria-hidden="true" />
}

export default function YingYongRuKou() {
  return (
    <BuJu>
      <ShouPingBanKuai />
      <Suspense fallback={<FenQuZhanWei />}>
        <GuanYuWoBanKuai />
        <XiangMuBanKuai />
        <JiNengBanKuai />
        <JingLiBanKuai />
        <TuiJianYuBanKuai />
        <ZhanShiBanKuai />
        <LianXiBanKuai />
      </Suspense>
    </BuJu>
  )
}
