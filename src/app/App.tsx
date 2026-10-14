import { lazy, Suspense } from 'react'
import { Layout } from './layout'
import { ShouPingBanKuai } from '../features/hero/ShouPingBanKuai'

const GuanYuWoBanKuai = lazy(() =>
  import('../features/about/GuanYuWoBanKuai').then((module) => ({ default: module.GuanYuWoBanKuai }))
)
const XiangMuBanKuai = lazy(() =>
  import('../features/projects/XiangMuBanKuai').then((module) => ({ default: module.XiangMuBanKuai }))
)
const JiNengBanKuai = lazy(() =>
  import('../features/skills/JiNengBanKuai').then((module) => ({ default: module.JiNengBanKuai }))
)
const JingLiBanKuai = lazy(() =>
  import('../features/experience/JingLiBanKuai').then((module) => ({ default: module.JingLiBanKuai }))
)
const TuiJianYuBanKuai = lazy(() =>
  import('../features/testimonials/TuiJianYuBanKuai').then((module) => ({ default: module.TuiJianYuBanKuai }))
)
const ZhanShiBanKuai = lazy(() =>
  import('../features/showcase/ZhanShiBanKuai').then((module) => ({ default: module.ZhanShiBanKuai }))
)
const LianXiBanKuai = lazy(() =>
  import('../features/contact/LianXiBanKuai').then((module) => ({ default: module.LianXiBanKuai }))
)

function SectionFallback() {
  return <div className="min-h-[12vh] w-full" aria-hidden="true" />
}

export default function App() {
  return (
    <Layout>
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
    </Layout>
  )
}
