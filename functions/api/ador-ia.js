import { cloudflare } from '../../server/cloudflare.js'
import { adorIA } from '../../server/handlers.js'

export const onRequest = cloudflare(adorIA)
