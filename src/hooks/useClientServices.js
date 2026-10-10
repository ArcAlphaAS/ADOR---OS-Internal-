import { useEffect, useState } from 'react'
import { subscribeClientServices } from '../lib/firestore'
import { DEFAULT_SERVICES } from '../lib/clientStages'

// The service types administrators defined (Administración → Servicios),
// or the defaults until they change them.
export function useClientServices() {
  const [types, setTypes] = useState(null)
  useEffect(() => subscribeClientServices(setTypes), [])
  return types && types.length ? types : DEFAULT_SERVICES
}
