import { vercel } from '../../server/vercel.js'
import { googleRefresh } from '../../server/handlers.js'

export default vercel(googleRefresh)
