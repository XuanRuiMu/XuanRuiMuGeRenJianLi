import { lazy, Suspense } from 'react'
import { Layout } from './layout'
import { HeroSection } from '../features/hero/HeroSection'

const AboutSection = lazy(() =>
  import('../features/about/AboutSection').then((module) => ({ default: module.AboutSection }))
)
const ProjectsSection = lazy(() =>
  import('../features/projects/ProjectsSection').then((module) => ({ default: module.ProjectsSection }))
)
const ExperienceSection = lazy(() =>
  import('../features/experience/ExperienceSection').then((module) => ({ default: module.ExperienceSection }))
)
const ShowcaseSection = lazy(() =>
  import('../features/showcase/ShowcaseSection').then((module) => ({ default: module.ShowcaseSection }))
)
const ContactSection = lazy(() =>
  import('../features/contact/ContactSection').then((module) => ({ default: module.ContactSection }))
)

function SectionFallback() {
  return <div className="min-h-[40vh] w-full" aria-hidden="true" />
}

export default function App() {
  return (
    <Layout>
      <HeroSection />
      <Suspense fallback={<SectionFallback />}>
        <AboutSection />
        <ProjectsSection />
        <ExperienceSection />
        <ShowcaseSection />
        <ContactSection />
      </Suspense>
    </Layout>
  )
}
