import { lazy, Suspense } from 'react'
import { BuJu } from './BuJu'
import { ShouPingBanKuai } from '../功能/首屏/ShouPingBanKuai'

const GuanYuWoBanKuai = lazy(() =>
  import('../功能/关于我/GuanYuWoBanKuai').then((module) => ({ default: module.GuanYuWoBanKuai }))
)
const XiangMuBanKuai = lazy(() =>
  import('../功能/项目/XiangMuBanKuai').then((module) => ({ default: module.XiangMuBanKuai }))
)
const JiNengBanKuai = lazy(() =>
  import('../功能/技能/JiNengBanKuai').then((module) => ({ default: module.JiNengBanKuai }))
)
const JingLiBanKuai = lazy(() =>
  import('../功能/经历/JingLiBanKuai').then((module) => ({ default: module.JingLiBanKuai }))
)
const TuiJianYuBanKuai = lazy(() =>
  import('../功能/推荐语/TuiJianYuBanKuai').then((module) => ({ default: module.TuiJianYuBanKuai }))
)
const ZhanShiBanKuai = lazy(() =>
  import('../功能/展示/ZhanShiBanKuai').then((module) => ({ default: module.ZhanShiBanKuai }))
)
const LianXiBanKuai = lazy(() =>
  import('../功能/联系/LianXiBanKuai').then((module) => ({ default: module.LianXiBanKuai }))
)

function SectionFallback() {
  return <div className="min-h-[12vh] w-full" aria-hidden="true" />
}

export default function App() {
  return (
    <BuJu>
      <ShouPingBanKuai />
      <Suspense fallback={<SectionFallback />}>
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
