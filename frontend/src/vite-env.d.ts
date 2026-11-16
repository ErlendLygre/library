/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" builds the static demo that runs entirely in the browser (GitHub Pages). */
  readonly VITE_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
