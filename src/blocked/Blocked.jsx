import { useEffect, useState } from 'react'
import { formatRemaining } from '../utils.js'
import './Blocked.css'

// background.js redirects here as blocked.html?site=youtube.com
const site = new URLSearchParams(location.search).get('site')

function Blocked() {
  // undefined = still loading from storage, null = no session running
  const [endTime, setEndTime] = useState(undefined)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    chrome.storage.local.get('session').then(({ session }) => {
      setEndTime(session?.endTime ?? null)
    })

    const onChanged = (changes, area) => {
      if (area === 'local' && changes.session) {
        setEndTime(changes.session.newValue?.endTime ?? null)
      }
    }
    chrome.storage.onChanged.addListener(onChanged)

    const id = setInterval(() => setNow(Date.now()), 1000)

    return () => {
      chrome.storage.onChanged.removeListener(onChanged)
      clearInterval(id)
    }
  }, [])

  if (endTime === undefined) return null

  const isActive = endTime !== null && endTime > now

  if (!isActive) {
    return (
      <main className="blocked">
        <p className="blocked__eyebrow">Session complete</p>
        <h1 className="blocked__title">You're free.</h1>
        {site && (
          <p className="blocked__site">
            <a href={`https://${site}`}>Continue to {site}</a>
          </p>
        )}
      </main>
    )
  }

  return (
    <main className="blocked">
      <p className="blocked__eyebrow">Locked in</p>
      <h1 className="blocked__title">Back to work.</h1>
      <p className="blocked__site">
        {site ?? 'This site'} is blocked until your session ends.
      </p>
      <div className="blocked__timer">{formatRemaining(endTime - now)}</div>
      <p className="blocked__hint">Time remaining</p>
    </main>
  )
}

export default Blocked
