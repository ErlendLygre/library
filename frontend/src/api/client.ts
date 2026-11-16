import { demoApi } from './demo'
import { httpApi, type Api } from './http'

export { ApiError } from './errors'

// VITE_DEMO is replaced at build time, so the production bundle drops the demo backend.
export const isDemo = import.meta.env.VITE_DEMO === 'true'

export const api: Api = isDemo ? demoApi : httpApi
