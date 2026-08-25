import { z } from 'zod'

export const PROJECT_IDS = ['xrm', 'lovewithme', 'aiConsole'] as const
export const TIMELINE_SCOPES = ['experience', 'media', 'education'] as const

export const projectCardComponentSchema = z.object({
  type: z.literal('ProjectCard'),
  projectId: z.enum(PROJECT_IDS),
})

export const timelineComponentSchema = z.object({
  type: z.literal('Timeline'),
  scope: z.enum(TIMELINE_SCOPES).optional(),
})

export const contactFormComponentSchema = z.object({
  type: z.literal('ContactForm'),
})

export const uiComponentSchema = z.union([
  projectCardComponentSchema,
  timelineComponentSchema,
  contactFormComponentSchema,
])

export const assistantPayloadSchema = z.object({
  text: z.string(),
  component: uiComponentSchema.optional(),
})

export type ProjectCardComponent = z.infer<typeof projectCardComponentSchema>
export type TimelineComponent = z.infer<typeof timelineComponentSchema>
export type ContactFormComponent = z.infer<typeof contactFormComponentSchema>
export type UiComponent = z.infer<typeof uiComponentSchema>
export type AssistantPayload = z.infer<typeof assistantPayloadSchema>

export function parseAssistantPayload(raw: unknown): AssistantPayload {
  if (typeof raw === 'string') {
    return { text: raw }
  }

  if (raw === null || typeof raw !== 'object') {
    return { text: String(raw) }
  }

  const candidate = raw as Record<string, unknown>

  if (typeof candidate.text === 'string') {
    const componentResult = uiComponentSchema.safeParse(candidate.component)
    return {
      text: candidate.text,
      component: componentResult.success ? componentResult.data : undefined,
    }
  }

  if (typeof candidate.content === 'string') {
    const componentResult = uiComponentSchema.safeParse(candidate.component)
    return {
      text: candidate.content,
      component: componentResult.success ? componentResult.data : undefined,
    }
  }

  return { text: JSON.stringify(raw) }
}

export function extractJsonFromText(text: string): unknown {
  const trimmed = text.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // fall through to markdown extraction
    }
  }

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch?.[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {
      // fall through
    }
  }

  const inlineObjectMatch = trimmed.match(/\{[\s\S]*\}/)
  if (inlineObjectMatch?.[0]) {
    try {
      return JSON.parse(inlineObjectMatch[0])
    } catch {
      // fall through
    }
  }

  return text
}
