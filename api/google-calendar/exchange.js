import { vercel } from '../../server/vercel.js'
import { googleExchange } from '../../server/handlers.js'

export default vercel(googleExchange)
