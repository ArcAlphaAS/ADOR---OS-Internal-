import { useEffect, useState } from 'react'

const STORAGE_LAST_LOGIN = 'ador_last_login_at'
const STORAGE_WELCOME_SHOWN = 'ador_welcome_shown'

// Blocks match the copy buckets in WelcomeScreen: morning, lunch (13-15,
// the "returning" window), afternoon, evening. Used only to make sure the
// welcome screen never repeats twice within the same block/day.
function getBlock(date) {
  const hour = date.getHours()
  if (hour >= 6 && hour < 13) return 'morning'
  if (hour >= 13 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 19) return 'afternoon'
  return 'evening'
}

export function useWelcomeScreen(userId) {
  const [state, setState] = useState({ show: false, isReturning: false, checked: false })

  useEffect(() => {
    if (!userId) {
      setState({ show: false, isReturning: false, checked: false })
      return
    }

    const now = new Date()
    const today = now.toDateString()
    const currentBlock = getBlock(now)

    const lastLoginRaw = localStorage.getItem(STORAGE_LAST_LOGIN)
    const lastLogin = lastLoginRaw ? new Date(lastLoginRaw) : null

    const isFirstLoginToday = !lastLogin || lastLogin.toDateString() !== today
    const isReturningFromLunch =
      !!lastLogin &&
      lastLogin.toDateString() === today &&
      lastLogin.getHours() < 13 &&
      now.getHours() >= 13

    let shownRecord = null
    try {
      shownRecord = JSON.parse(localStorage.getItem(STORAGE_WELCOME_SHOWN) || 'null')
    } catch {
      shownRecord = null
    }
    const alreadyShownThisBlock =
      !!shownRecord && shownRecord.date === today && shownRecord.block === currentBlock

    const show = (isFirstLoginToday || isReturningFromLunch) && !alreadyShownThisBlock

    localStorage.setItem(STORAGE_LAST_LOGIN, now.toISOString())
    if (show) {
      localStorage.setItem(
        STORAGE_WELCOME_SHOWN,
        JSON.stringify({ date: today, block: currentBlock })
      )
    }

    setState({ show, isReturning: isReturningFromLunch, checked: true })
  }, [userId])

  return state
}
