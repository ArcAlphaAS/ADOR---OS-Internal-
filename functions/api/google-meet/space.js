import { cloudflare } from '../../../server/cloudflare.js'
import { meetSpace } from '../../../server/handlers.js'

export const onRequest = cloudflare(meetSpace)
