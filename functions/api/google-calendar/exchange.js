import { cloudflare } from '../../../server/cloudflare.js'
import { googleExchange } from '../../../server/handlers.js'

export const onRequest = cloudflare(googleExchange)
