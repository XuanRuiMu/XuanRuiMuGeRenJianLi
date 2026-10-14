/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly VITE_LOG_LEVEL?: string
  readonly VITE_ERROR_REPORT_ENDPOINT?: string
  readonly VITE_ENABLE_ANALYTICS?: string
  readonly VITE_RAG_MIN_SCORE?: string
  readonly VITE_CHAT_TIMEOUT_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
