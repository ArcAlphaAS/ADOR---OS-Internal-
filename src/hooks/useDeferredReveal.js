import { useEffect, useState } from 'react'

// A freshly-mounted `backdrop-filter` element (a portaled dropdown/menu that
// didn't exist a frame ago) shows a brief flash of the raw, unblurred
// background before the browser finishes setting up its compositing layer —
// `will-change: backdrop-filter` only helps an element that's already in the
// tree and about to change, it can't pre-warm a layer that's being created
// this same frame. Waiting two animation frames (one to let the browser
// paint the element invisible-but-composited, one to be safe) before
// starting the entrance animation means the blur is already established by
// the time anything becomes visible, so there's nothing to "pop in."
export default function useDeferredReveal() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [])

  return ready
}
