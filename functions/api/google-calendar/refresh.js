import { cloudflare } from '../../../server/cloudflare.js'
import { googleRefresh } from '../../../server/handlers.js'

export const onRequest = cloudflare(googleRefresh)
