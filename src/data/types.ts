import type { TranslationKey } from '../i18n/translations'

export interface PersonalInfo {
  name: string
  age: number
  location: string
  phone: string
  email: string
  github: string
  bilibili: string
  expectedCityKey: TranslationKey
  salary: string
  availabilityKey: TranslationKey
  education: EducationSummary
}

export interface EducationSummary {
  school: string
  major: string
  degree: string
  period: string
}

export interface ProjectLink {
  labelKey: TranslationKey
  url: string
}

export interface Project {
  id: string
  nameKey: TranslationKey
  descKey: TranslationKey
  tags: string[]
  links?: ProjectLink[]
  metricKeys?: TranslationKey[]
}

export interface ExperienceEntry {
  id: string
  titleKey: TranslationKey
  organizationKey?: TranslationKey
  periodKey: TranslationKey
  descriptionKeys: TranslationKey[]
  achievementKeys?: TranslationKey[]
}

export interface Course {
  id: string
  nameKey: TranslationKey
  levelKey: TranslationKey
}

export interface Education {
  summary: EducationSummary
  courses: Course[]
  achievementKeys: TranslationKey[]
}

export interface DesignWork {
  id: string
  nameKey: TranslationKey
  categoryKey: TranslationKey
  descKey: TranslationKey
}

export interface Design {
  headlineKey: TranslationKey
  introKey: TranslationKey
  works: DesignWork[]
  toolKeys: TranslationKey[]
}

export interface MusicTrack {
  id: string
  nameKey: TranslationKey
  typeKey: TranslationKey
  descKey: TranslationKey
}

export interface LaunchpadNote {
  note: string
  color: string
}

export interface Music {
  headlineKey: TranslationKey
  introKey: TranslationKey
  tracks: MusicTrack[]
  toolKeys: TranslationKey[]
  skillKeys: TranslationKey[]
  launchpadNotes: LaunchpadNote[]
}

export interface MediaCategory {
  id: string
  labelKey: TranslationKey
  itemKeys: TranslationKey[]
}

export interface MediaTimelineEvent {
  year: string
  eventKey: TranslationKey
}

export interface Media {
  headlineKey: TranslationKey
  introKey: TranslationKey
  categories: MediaCategory[]
  timeline: MediaTimelineEvent[]
}
